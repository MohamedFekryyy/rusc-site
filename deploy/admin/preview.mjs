// Local preview of rūsc admin with made-up people: no database, no password.
//
//   node deploy/admin/preview.mjs        → http://localhost:8191/admin/cours
//   (or preview_start "admin-preview" from .claude/launch.json)
//
// It loads server.mjs as it is, with two swaps: a stand-in for pg that answers
// from the sample data below, and the sign-in check lifted. Use it to check a
// page change (list, calendar, day, codes, orders; FR and EN) before
// `fly deploy`. Forms don't save. Never deployed: the Dockerfile only copies
// server.mjs and logo.webp.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const here = new URL(".", import.meta.url);
let source = readFileSync(new URL("server.mjs", here), "utf8");
const swap = (from, to) => {
  if (!source.includes(from)) throw new Error(`preview.mjs: server.mjs no longer has ${JSON.stringify(from)}`);
  source = source.replace(from, to);
};
swap('import pg from "pg";', "const pg = { Pool: class { async query(sql, params) { return globalThis.__sample(sql, params); } async connect() { return this; } release() {} }, types: { setTypeParser() {} } };");
swap("if (!signedIn(req)) return", "if (false) return");
swap('new URL("./logo.webp", import.meta.url)', `new URL(${JSON.stringify(new URL("logo.webp", here).href)})`);

// ------------------------------------------------------------------ sample data
// Days around today (Paris), so the calendar always has something to show.
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const day = (n) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const parisDay = (date) => date.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
// A Paris wall-clock time as a Date (good enough outside the DST switch hours).
const at = (d, hm) => {
  const guess = new Date(`${d}T${hm}:00Z`);
  const offset = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Paris" })) - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - offset);
};
const T = { slug: "atelier-ceramique-2h", title: "tournage 2h", seats: 7 };
const M = { slug: "atelier-modelage-2h", title: "modelage 2h", seats: 8 };
const L = { slug: "atelier-libre-1h", title: "atelier libre", seats: 7 };
const person = (i, more = {}) => ({ name: `Personne ${i}`, email: `personne${i}@example.invalid`, phone: null, seat_uid: `seat-${i}`, code: null, paid_order: null, acuity_pay: null, ...more });
const bookings = [
  { starts: at(day(-1), "18:00"), ...T, ...person(1, { code: "RUSC-AB12-CD34", code_amount: "1", code_unit: "sessions" }) },
  { starts: at(day(0), "14:00"), ...L, ...person(2, { acuity_pay: "code ABCD1234" }) },
  { starts: at(day(1), "17:00"), ...T, ...person(3, { paid_order: "cs_sample_1", phone: "+33 6 12 34 56 78" }) },
  { starts: at(day(1), "17:00"), ...T, ...person(4, { acuity_pay: "payé 50.00" }) },
  { starts: at(day(2), "16:00"), ...M, ...person(5, { acuity_pay: "à régler" }) },
  ...[6, 7, 8, 9, 10, 11, 12].map((i) => ({ starts: at(day(3), "18:30"), ...T, ...person(i) })),
];
const weekly = (slug, title, seats, days, start, end) => ({ slug, title, seats, days, date: null, start: `${start}:00`, end: `${end}:00` });
const timetable = [
  weekly("atelier-ceramique-2h", "tournage 2h", 7, [1], "16:00", "18:00"),
  weekly("atelier-ceramique-2h", "tournage 2h", 7, [2], "18:30", "20:30"),
  weekly("atelier-ceramique-2h", "tournage 2h", 7, [3], "18:00", "20:00"),
  weekly("atelier-ceramique-2h", "tournage 2h", 7, [4], "17:00", "19:00"),
  weekly("atelier-modelage-2h", "modelage 2h", 8, [1, 4], "16:00", "18:00"),
  weekly("decor-a-cru-1h", "décor à cru", 8, [1, 2, 3], "18:00", "19:00"),
  weekly("modelage-enfant", "cours enfant 2h", 8, [3], "14:00", "16:00"),
  { slug: "pot-and-wine", title: "pot & wine", seats: 8, days: [], date: day(9), start: "18:00:00", end: "20:30:00" },
  { slug: "atelier-ceramique-2h", title: "tournage 2h", seats: 7, days: [], date: day(12), start: "00:00:00", end: "00:00:00" }, // closed that day
];
const code = { key: "RUSCAB12CD34", display: "RUSC-AB12-CD34", label: "Carnet 10 cours 2h", unit: "sessions", remaining: "6", initial: "10", expires_on: day(280), holder: "Personne 1", note: "payé en espèces", source: "studio", active: true, offers: ["atelier-ceramique-2h", "atelier-modelage-2h"], bookings: "4" };
const codes = [
  code,
  { ...code, key: "ABCD1234", display: "ABCD1234", label: "Carnet 5 x 2H", remaining: "2.5", initial: "5", holder: "Personne 2", source: "acuity", bookings: "0" },
  { ...code, key: "RUSCZZZZYYYY", display: "RUSC-ZZZZ-YYYY", label: "Bon cadeau · 1 cours 2h", remaining: "1", initial: "1", holder: "Personne 3", source: "online", active: false, bookings: "0" },
];

// Acuity's history (before the switch), clients, orders; the timetable as
// Horaires reads it.
const history = [
  { acuity_id: "h1", starts_at: at(day(-2), "18:00"), offer: "atelier-ceramique-2h", type: "atelier céramique 2 H", name: "Personne 13", email: "personne13@example.invalid", phone: null, paid: false, amount_paid: "0", certificate: "ABCD1234", canceled: false },
  { acuity_id: "h2", starts_at: at(day(-2), "18:00"), offer: "atelier-ceramique-2h", type: "atelier céramique 2 H", name: "Personne 14", email: "personne14@example.invalid", phone: null, paid: true, amount_paid: "50", certificate: null, canceled: false },
  { acuity_id: "h3", starts_at: at(day(-5), "10:00"), offer: null, type: "Stage raku (ancien)", name: "Personne 15", email: "personne15@example.invalid", phone: null, paid: false, amount_paid: "0", certificate: null, canceled: false },
];
const clients = [1, 2, 3, 13, 14, 15].map((i) => ({ id: i, email: `personne${i}@example.invalid`, first_name: "Personne", last_name: String(i), phone: i === 3 ? "+33 6 12 34 56 78" : null, notes: i === 13 ? "Préfère le tour 3. Allergique au latex." : null, source: i > 12 ? "acuity" : "cal", visits: String(i % 5), last_visit: at(day(-i), "18:00"), member_until: i === 1 ? day(200) : null }));
const acuityOrders = [{ id: "o1", ordered: at(day(-40), "12:00"), first_name: "Personne", last_name: "13", email: "personne13@example.invalid", total: "210", status: "Paid", products: "Carnet 5 x 2H", client_id: 13 }];
const classes = [
  { id: 11, slug: "atelier-ceramique-2h", title: "tournage 2h", length: 120, seats: 7, schedule_id: 1 },
  { id: 12, slug: "atelier-libre-1h", title: "atelier libre 1h", length: 60, seats: 7, schedule_id: 2 },
  { id: 13, slug: "pot-and-wine", title: "pot & wine", length: 150, seats: 8, schedule_id: 3 },
];
const availability = [
  { id: 101, schedule_id: 1, days: [1], date: null, start: "16:00:00", end: "18:00:00" },
  { id: 102, schedule_id: 1, days: [2], date: null, start: "18:30:00", end: "20:30:00" },
  { id: 103, schedule_id: 1, days: [], date: day(12), start: "00:00:00", end: "00:00:00" },
  { id: 104, schedule_id: 2, days: [2], date: null, start: "09:00:00", end: "14:00:00" },
  { id: 105, schedule_id: 3, days: [], date: day(9), start: "18:00:00", end: "20:30:00" },
  { id: 106, schedule_id: 3, days: [], date: day(-30), start: "18:00:00", end: "20:30:00" },
];

globalThis.__sample = (sql, params = []) => {
  if (sql.includes("FROM rusc.history h") && sql.includes("rusc.acuity_seats")) return { rows: history.filter((h) => parisDay(h.starts_at) >= params[0] && parisDay(h.starts_at) < params[1]) };
  if (sql.includes("SELECT * FROM rusc.history")) return { rows: history.filter((h) => h.email === params[0]) };
  if (sql.includes("SELECT count(*) FROM rusc.clients")) return { rows: [{ count: String(clients.length) }] };
  if (sql.includes("FROM rusc.clients c LEFT JOIN rusc.members")) return { rows: clients };
  if (sql.includes("SELECT * FROM rusc.clients WHERE id")) return { rows: clients.filter((c) => String(c.id) === String(params[0])) };
  if (sql.includes("FROM rusc.acuity_orders o LEFT JOIN")) return { rows: acuityOrders };
  if (sql.includes("FROM rusc.acuity_orders WHERE")) return { rows: acuityOrders.filter((o) => o.email === params[0]) };
  if (sql.includes("FROM rusc.members WHERE")) return { rows: params[0] === "personne1@example.invalid" ? [{ since: day(-165), until: day(200) }] : [] };
  if (sql.includes("FROM rusc.accounts WHERE lower(email)")) return { rows: params[0] === "personne3@example.invalid" ? [{ id: 7, name: "Personne 3", created_at: new Date(), last_login_at: new Date() }] : [] };
  if (sql.includes('e."scheduleId" IS NOT NULL ORDER BY e.id')) return { rows: classes };
  if (sql.includes('FROM public."Availability" v WHERE')) return { rows: availability };
  if (sql.includes("FROM public.\"Attendee\" a JOIN public.\"Booking\" b") && sql.includes("lower(a.email) = $1")) return { rows: bookings.filter((b) => b.email === params[0]).map((b) => ({ starts: b.starts, status: "accepted", slug: b.slug, title: b.title, code: b.code, paid_order: b.paid_order })) };
  if (sql.includes('FROM public."Booking" b')) return { rows: bookings.filter((b) => parisDay(b.starts) >= params[0] && parisDay(b.starts) < params[1]) };
  if (sql.includes('JOIN public."Availability"')) return { rows: timetable };
  if (sql.includes("FROM rusc.codes c")) return { rows: codes };
  if (sql.includes("SELECT * FROM rusc.codes WHERE key")) return { rows: codes.filter((c) => c.key === params[0]) };
  if (sql.includes("SELECT * FROM rusc.uses WHERE key")) return { rows: [{ at: new Date(), seat_uid: "seat-1", offer: "atelier-ceramique-2h", starts_at: bookings[0].starts, attendee: "Personne 1", amount: "1", cancelled_at: null }] };
  if (sql.includes("SELECT * FROM rusc.orders")) return { rows: [{ id: "cs_sample_1", created_at: new Date(), name: "Personne 3", email: "personne3@example.invalid", amount: "50", items: "atelier-ceramique-2hx1@seat-3", livemode: false }] };
  return { rows: [], rowCount: 0 };
};

process.env.PORT ??= "8191";
process.env.CODES_ADMIN_PASSWORD ??= "preview-only"; // lets /login render; nothing checks it here
const file = join(mkdtempSync(join(tmpdir(), "rusc-admin-preview-")), "server.mjs");
writeFileSync(file, source);
await import(pathToFileURL(file).href);
console.log(`rūsc admin preview (sample data): http://localhost:${process.env.PORT}/admin/cours`);
