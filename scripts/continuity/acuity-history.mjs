// Sends Acuity's history to rūsc admin, so nothing is lost at the switch:
// every appointment (past and planned), the orders, and the client list with
// the studio's notes. Reads the owner's Acuity exports in data/acuity/:
//   schedule*.csv          Appointments → Export (all dates), comma-separated
//   Orders*.csv            Orders export
//   *client list*.csv      Clients export (semicolon-separated)
// The newest file of each kind is used; pass paths to override:
//   node scripts/continuity/acuity-history.mjs [--dry-run] [schedule.csv] [orders.csv] [clients.csv]
//
// It posts them to POST /import/acuity?source=acuity-history (open only while
// the Fly secret IMPORT_TOKEN is set; the token is read from
// .secrets/import-token). Then run acuity-history.sql to load them into the
// admin's tables. Prints counts only: the files hold client data.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ADMIN = process.env.RUSC_ADMIN ?? "https://rusc-admin.fly.dev";
const DIR = "data/acuity";

function newest(pattern) {
  const files = readdirSync(DIR).filter((f) => pattern.test(f)).map((f) => join(DIR, f));
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!files.length) throw new Error(`no file matching ${pattern} in ${DIR}`);
  return files[0];
}

// RFC 4180-style CSV: quoted fields, doubled quotes, CRLF, line breaks in quotes.
function parse(text, separator = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === separator) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((r) => r.some((v) => v.trim()));
  const names = header.map((h) => h.replace(/^﻿/, "").trim());
  return data.map((r) => Object.fromEntries(names.map((n, i) => [n, (r[i] ?? "").trim()])));
}

const read = (file) => readFileSync(file, "utf8").replace(/^﻿/, "");
const phone = (v) => v.replace(/^'+/, "").trim(); // Excel's text guard

const DRY = process.argv.includes("--dry-run");
const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [scheduleFile, ordersFile, clientsFile] = [
  paths[0] ?? newest(/^schedule.*\.csv$/i),
  paths[1] ?? newest(/^orders.*\.csv$/i),
  paths[2] ?? newest(/client list.*\.csv$/i),
];

const appointments = parse(read(scheduleFile)).map((r) => ({
  id: r["Appointment ID"],
  start: r["Start Time"],
  end: r["End Time"],
  timezone: r["Timezone"],
  firstName: r["First Name"],
  lastName: r["Last Name"],
  phone: phone(r["Phone"] ?? ""),
  email: r["Email"],
  type: r["Type"],
  calendar: r["Calendar"],
  price: r["Appointment Price"],
  paid: r["Paid?"],
  amountPaid: r["Amount Paid Online"],
  certificate: r["Certificate Code"],
  notes: r["Notes"],
  scheduled: r["Date Scheduled"],
  label: r["Label"],
  scheduledBy: r["Scheduled By"],
  rescheduled: r["Date Rescheduled"],
  canceled: r["Canceled"],
  canceledOn: r["Date Canceled"],
}));
const orders = parse(read(ordersFile)).map((r) => ({
  date: r["Date"],
  firstName: r["First Name"],
  lastName: r["Last Name"],
  phone: phone(r["Phone"] ?? ""),
  email: r["Email"],
  total: r["Total"],
  status: r["Status"],
  notes: r["Notes"],
  products: r["Products"],
}));
const clients = parse(read(clientsFile), ";").map((r) => ({
  firstName: r["First Name"],
  lastName: r["Last Name"],
  phone: phone(r["Phone"] ?? ""),
  email: r["Email"],
  notes: r["Notes"],
}));

console.log(`read: ${appointments.length} appointments, ${orders.length} orders, ${clients.length} clients`);
if (DRY) process.exit(0);

let token = process.env.IMPORT_TOKEN;
if (!token) token = readFileSync(".secrets/import-token", "utf8").trim();
const res = await fetch(`${ADMIN}/import/acuity?source=acuity-history`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-import-token": token },
  body: JSON.stringify({ exportedAt: new Date().toISOString(), files: [scheduleFile, ordersFile, clientsFile].map((f) => f.split("/").pop()), appointments, orders, clients }),
});
console.log(`rūsc admin answered ${res.status}:`, await res.text());
