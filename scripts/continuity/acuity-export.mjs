// One-time export of what the new system needs from Acuity, before Acuity
// is switched off: services, class times, package and gift-certificate codes
// with their balances, and bookings from today on.
//
//   node scripts/continuity/acuity-export.mjs
//
// Reads ACUITY_USER_ID and ACUITY_API_KEY from .secrets/acuity.env and writes
// JSON files into data/acuity/api/. Both folders are git-ignored: the output
// holds client data and must never be committed. Prints counts only.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".secrets/acuity.env", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);
const auth = "Basic " + Buffer.from(`${env.ACUITY_USER_ID}:${env.ACUITY_API_KEY}`).toString("base64");
const OUT = "data/acuity/api";
mkdirSync(OUT, { recursive: true });

async function get(path) {
  const res = await fetch(`https://acuityscheduling.com/api/v1${path}`, { headers: { authorization: auth } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function save(name, data) {
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2), { mode: 0o600 });
  console.log(`${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length}`);
}

const today = new Date().toISOString().slice(0, 10);

save("appointment-types", await get("/appointment-types?includeDeleted=false"));
save("calendars", await get("/calendars"));
save("products", await get("/products?deleted=false"));
save("certificates", await get("/certificates"));
save("appointments-upcoming", await get(`/appointments?minDate=${today}&max=5000&direction=ASC`));

// Scheduled class times (group classes) for the next 12 months.
const classes = [];
for (let i = 0; i < 12; i++) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + i);
  const month = d.toISOString().slice(0, 7);
  classes.push(...(await get(`/availability/classes?month=${month}&includeUnavailable=true`)));
}
save("classes", classes);
