// Reads rūsc's class timetable from Acuity's public scheduling API (what the
// public booking page shows: dates, times, places left; no client data), so
// the same timetable can be rebuilt in Cal.
//
//   node scripts/continuity/acuity-classes.mjs
//
// Writes data/acuity/public-classes.json and prints a summary per class:
// the weekly pattern (weekday + time) and one-off dates.

import { mkdirSync, writeFileSync } from "node:fs";

const API = "https://app.acuityscheduling.com/api/scheduling/v1/availability";
const OWNER = "c0f63bc8"; // public owner key of the rūsc booking page
const CALENDAR = "3688112"; // "r ū s c team", the only calendar

// Acuity appointment type ID → our offer key (lib/cal.ts), or a new key.
const TYPES = {
  95579518: "decor-a-cru-1h",
  96726687: "atelier-libre-1h",
  98575999: "pot-and-wine",
  78615626: "porcelaine",
  37545405: "atelier-ceramique-2h",
  37557593: "atelier-ceramique-1j",
  37557627: "atelier-ceramique-2j",
  83689322: "atelier-modelage-2h",
  83714176: "modelage-enfant",
};
// Weekly classes: 8 weeks show the pattern. Stages are one-off dates: a year.
const MONTHS = { weekly: 2, dated: 12 };
const DATED = new Set(["porcelaine", "atelier-ceramique-1j", "atelier-ceramique-2j", "pot-and-wine"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path, params) {
  const qs = new URLSearchParams({ owner: OWNER, calendarId: CALENDAR, timezone: "Europe/Paris", ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/${path}?${qs}`);
    if (res.ok) return res.json();
    if (res.status !== 429) throw new Error(`${path} ${JSON.stringify(params)}: HTTP ${res.status}`);
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`${path}: rate limited`);
}

const months = (n) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d.toISOString().slice(0, 8) + "01";
  });

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const out = {};
for (const [id, key] of Object.entries(TYPES)) {
  const dates = [];
  for (const month of months(DATED.has(key) ? MONTHS.dated : MONTHS.weekly)) {
    const days = await get("month", { appointmentTypeId: id, month });
    dates.push(...Object.keys(days).filter((d) => days[d]));
    await sleep(150);
  }
  const slots = [];
  for (const date of dates) {
    const times = await get("times", { appointmentTypeId: id, startDate: date });
    for (const t of times[date] ?? []) slots.push({ time: t.time, left: t.slotsAvailable });
    await sleep(150);
  }
  out[key] = { acuityTypeId: Number(id), slots };

  // Summary: weekday + start time → how many occurrences.
  const pattern = {};
  for (const s of slots) {
    const d = new Date(s.time);
    const local = s.time.slice(11, 16);
    const k = `${WEEKDAYS[d.getUTCDay() === 0 && local < "02:00" ? 6 : new Date(s.time.slice(0, 10) + "T12:00:00Z").getUTCDay()]} ${local}`;
    pattern[k] = (pattern[k] ?? 0) + 1;
  }
  const first = slots[0]?.time.slice(0, 10), last = slots.at(-1)?.time.slice(0, 10);
  console.log(`${key}: ${slots.length} slots ${first ?? ""}…${last ?? ""} | ${Object.entries(pattern).map(([k, n]) => `${k}×${n}`).join(", ")}`);
}

mkdirSync("data/acuity", { recursive: true });
writeFileSync("data/acuity/public-classes.json", JSON.stringify(out, null, 2));
