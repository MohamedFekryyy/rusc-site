// rūsc admin: the studio's one back office, and the codes behind it.
// Runs on Fly as rusc-admin (deploy/admin/README.md).
//
// Studio pages (sign in at /login with CODES_ADMIN_PASSWORD):
//   /admin/cours   the classes: who's coming, places left, how each paid; as a
//                  list of the coming days, a month calendar, or one day
//   /admin/codes   carnets, gift vouchers and codes the studio issues itself (a
//                  carnet paid in cash at the studio…): create, adjust, pause
//   /admin/clients everyone the studio knows (Acuity's list and history, then
//                  bookings, orders, accounts): contact, notes, visits, codes
//   /admin/commandes  online orders (carnets and vouchers bought get their
//                  code), then Acuity's orders
//   /admin/horaires   the classes' hours in Cal: weekly slots, dates, closed days
//   /admin/cours/nouveau  a new class: its Cal event type, price, photo, hours
//   /admin/cours/offre/<key>  the same form for any class, built-in or new
//                  ("Modifier" in Horaires; see "classes made here")
// Stripe calls POST /stripe/webhook (checkout.session.completed), checked with
// the endpoint's signing secret STRIPE_WEBHOOK_SECRET.
// Public API, called by the booking page (components/BookingEmbed.tsx):
//   GET  /api/classes                  the classes made here (the site adds them to its own)
//   POST /api/check   {code, offer}    what's left, and whether it covers that class
//   POST /api/redeem  {code, seatUid}  takes the class just booked in Cal off the code
//   GET  /api/order?id=cs_…            the codes an online order created (thank-you screen)
//   /api/places …  the places of a class in the cart: held unpaid for a while,
//                  extra places for friends, freed when removed (see "places")
//   /api/auth/…  the site's member accounts (signup, login, logout, session,
//                account, codes, reset), with a Bearer token
//
// Data: schema "rusc" of the Cal.diy database (schema.sql). Of Cal's own
// tables it reads bookings, seats, event types and attendees, and writes only:
// the timetable (Availability), extra places and freed places (Attendee,
// BookingSeat), a booking's status once paid or empty (Booking), and the
// classes made here (EventType, Schedule, EventTypeTranslation).

import { AsyncLocalStorage } from "node:async_hooks";
import http from "node:http";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 8080);
const ADMIN_PASSWORD = process.env.CODES_ADMIN_PASSWORD ?? "";
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
// Dates (expiry) as "YYYY-MM-DD" strings, not Dates shifted by the time zone.
pg.types.setTypeParser(1082, (value) => value);

// The studio pages speak French or English (cookie rusc_lang, switched with
// the FR · EN links in their header). tr("français", "English") picks one.
const request = new AsyncLocalStorage();
const lang = () => request.getStore()?.lang ?? "fr";
const tr = (fr, en) => (lang() === "en" ? en : fr);
const LOCALE = () => (lang() === "en" ? "en-GB" : "fr-FR");

// The classes a code can be used for: the offers of kind "session" in the
// site's lib/cal.ts (same keys; each is one Cal event type, slug = key).
// Keep in sync with it. Prices (TTC, euros) matter for codes worth an amount.
// The classes made here (rusc.classes) join them in OFFERS at run time
// (syncClasses).
const BUILTIN = {
  "atelier-ceramique-2h": { label: "tournage 2h", en: "wheel throwing 2h", price: 50 },
  "atelier-modelage-2h": { label: "modelage 2h", en: "hand-building 2h", price: 50 },
  "decor-a-cru-1h": { label: "décor à cru 1h", en: "raw-glaze decoration 1h", price: 20 },
  "modelage-enfant": { label: "cours enfant 2h", en: "children’s course 2h", price: 50 },
  "atelier-libre-1h": { label: "atelier libre 1h", en: "open studio 1h", price: 22.5 },
  "atelier-ceramique-1j": { label: "céramique 1 jour", en: "ceramics 1 day", price: 180 },
  "atelier-ceramique-2j": { label: "céramique 2 jours", en: "ceramics 2 days", price: 280 },
  porcelaine: { label: "porcelaine 1 jour", en: "porcelain 1 day", price: 230 },
  "pot-and-wine": { label: "pot & wine", en: "pot & wine", price: 75 },
};
const OFFERS = { ...BUILTIN };
const offerLabel = (key) => (OFFERS[key] ? tr(OFFERS[key].label, OFFERS[key].en) : key);
const TWO_HOUR = ["atelier-ceramique-2h", "atelier-modelage-2h"];

// What the studio usually issues, to pre-fill the "new code" form.
// label is what the customer sees on the code (French), en its English version.
const PRESETS = [
  { id: "carnet5", label: "Carnet 5 cours 2h", en: "5-class card, 2h classes", unit: "sessions", amount: 5, offers: TWO_HOUR, months: 6 },
  { id: "carnet10", label: "Carnet 10 cours 2h", en: "10-class card, 2h classes", unit: "sessions", amount: 10, offers: TWO_HOUR, months: 12 },
  { id: "libre10", label: "Atelier libre 10 h", en: "Open studio, 10 hours", unit: "hours", amount: 10, offers: ["atelier-libre-1h"], months: 6 },
  { id: "libre20", label: "Atelier libre 20 h", en: "Open studio, 20 hours", unit: "hours", amount: 20, offers: ["atelier-libre-1h"], months: 12 },
  { id: "cadeau2h", label: "Bon cadeau · cours 2h", en: "Gift voucher · 2h class", unit: "sessions", amount: 1, offers: TWO_HOUR, months: 6 },
  { id: "cadeau1j", label: "Bon cadeau · stage 1 jour", en: "Gift voucher · 1-day intensive", unit: "sessions", amount: 1, offers: ["atelier-ceramique-1j"], months: 6 },
  { id: "cadeau2j", label: "Bon cadeau · stage 2 jours", en: "Gift voucher · 2-day intensive", unit: "sessions", amount: 1, offers: ["atelier-ceramique-2j"], months: 6 },
  { id: "montant", label: "Bon cadeau · montant", en: "Gift voucher · amount", unit: "euros", amount: 50, offers: Object.keys(BUILTIN), months: 6 },
];
// A preset's classes, with the classes made here that its codes pay for, as
// chosen when each was made: gift vouchers in euros, or 2-hour class cards.
function presetOffers(preset) {
  const extra = madeClasses().filter((c) => (preset.unit === "euros" ? c.euro_codes : preset.offers === TWO_HOUR && c.class_cards));
  return [...preset.offers, ...extra.map((c) => c.key)];
}
// The cart's products (lib/cal.ts, kind "product") and what an online
// purchase of each creates: a code from a preset above, or a membership.
const PRODUCTS = {
  adhesion: { label: "adhésion annuelle", en: "annual membership" },
  "carnet-5-cours": { label: "carnet 5 cours", en: "5-class card", preset: "carnet5" },
  "carnet-10-cours": { label: "carnet 10 cours", en: "10-class card", preset: "carnet10" },
  "atelier-libre-10h": { label: "carnet atelier libre 10 h", en: "open studio 10h card", preset: "libre10" },
  "atelier-libre-20h": { label: "carnet atelier libre 20 h", en: "open studio 20h card", preset: "libre20" },
  "bon-cadeau-cours-2h": { label: "bon cadeau · un cours de 2h", en: "gift voucher · one 2h class", preset: "cadeau2h" },
  "bon-cadeau-carnet-5": { label: "bon cadeau · carnet 5 cours", en: "gift voucher · 5-class card", preset: "carnet5", codeLabel: ["Bon cadeau · carnet 5 cours 2h", "Gift voucher · 5-class card"] },
  "bon-cadeau-carnet-10": { label: "bon cadeau · carnet 10 cours", en: "gift voucher · 10-class card", preset: "carnet10", codeLabel: ["Bon cadeau · carnet 10 cours 2h", "Gift voucher · 10-class card"] },
  "bon-cadeau-stage-1j": { label: "bon cadeau · stage 1 jour", en: "gift voucher · 1-day intensive", preset: "cadeau1j" },
  "bon-cadeau-stage-2j": { label: "bon cadeau · stage 2 jours", en: "gift voucher · 2-day intensive", preset: "cadeau2j" },
  // Any amount, chosen by the buyer (the order says it: key:<cents>x<qty>).
  "bon-cadeau-montant": { label: "bon cadeau · montant libre", en: "gift voucher · any amount", preset: "montant" },
};
// Where a code comes from (rusc.codes.source).
const SOURCES = { studio: ["building-storefront", "Atelier", "Studio"], acuity: ["arrow-down-tray", "Acuity", "Acuity"], online: ["globe-alt", "En ligne", "Online"] };
const sourceLabel = (source) => {
  const [name, fr, en] = SOURCES[source] ?? [null, source, source];
  return `<span class="st muted">${name ? icon(name) : ""}${esc(tr(fr, en))}</span>`;
};
const productLabel = (key) => (PRODUCTS[key] ? tr(PRODUCTS[key].label, PRODUCTS[key].en) : key);
const UNIT = {
  sessions: { one: ["séance", "session"], many: ["séances", "sessions"] },
  hours: { one: ["heure", "hour"], many: ["heures", "hours"] },
  euros: { one: ["€", "€"], many: ["€", "€"] },
};

// ---------------------------------------------------------------- classes made here
// Cours → Nouveau cours: a class beyond those of lib/cal.ts. rūsc admin makes
// its Cal event type (slug = key), schedule and English translation the way
// deploy/cal/seed-classes.mjs makes the others, and keeps the rest in
// rusc.classes: names, price, photo, which codes pay for it, whether the site
// lists it. Its length and places live in Cal. The site reads them all from
// GET /api/classes: its booking page lists the active ones, and its checkout
// takes their price from there, never from the browser.
// The nine built-in classes have a row too (builtin, filled by schema.sql), so
// the studio edits them with the same form; the site lays it over lib/cal.ts.
let CLASSES = new Map(); // key → rusc.classes row, with Cal's length, seats and schedule
let classesAt = 0;
async function syncClasses(force = false) {
  if (!force && Date.now() - classesAt < 30_000) return;
  try {
    const { rows } = await db.query(
      `SELECT c.*, e.length, e."seatsPerTimeSlot" AS seats, e."scheduleId" AS schedule_id
         FROM rusc.classes c JOIN public."EventType" e ON e.id = c.event_type_id ORDER BY c.builtin DESC, c.created_at`,
    );
    classesAt = Date.now();
    CLASSES = new Map(rows.map((row) => [row.key, row]));
    for (const key of Object.keys(OFFERS)) delete OFFERS[key];
    for (const [key, offer] of Object.entries(BUILTIN)) OFFERS[key] = { ...offer };
    for (const c of rows) OFFERS[c.key] = { label: c.title_fr, en: c.title_en, price: c.price_cents / 100, ...(c.builtin ? {} : { made: true }) };
  } catch (error) {
    console.error("classes", error.message);
  }
}
// The classes made here, without the built-in ones.
const madeClasses = () => [...CLASSES.values()].filter((c) => !c.builtin);

// The member price the site shows and charges (MEMBER_DISCOUNT_PERCENT's default, lib/pricing.ts).
const MEMBER_PERCENT = 10;
// The line under a class's name: price, member price, then the note ("/ heure"
// follows the price without a dot); without the price, the note alone.
function priceLine(c, english) {
  const money = (cents) => {
    const euros = cents / 100;
    const digits = { minimumFractionDigits: euros % 1 ? 2 : 0 };
    return english ? `€${euros.toLocaleString("en-GB", digits)}` : `${euros.toLocaleString("fr-FR", digits)} €`;
  };
  const parts = c.show_price ? [money(c.price_cents)] : [];
  if (c.show_price && c.show_member_price) parts.push(`${english ? "member" : "membre"} ${money(Math.round((c.price_cents * (100 - MEMBER_PERCENT)) / 100))}`);
  const line = parts.join(" · ");
  const note = english ? c.note_en : c.note_fr;
  if (!note) return line;
  return !line ? note : note.startsWith("/") ? `${line} ${note}` : `${line} · ${note}`;
}

// What the site needs to show and sell a class (lib/cal.ts, ClassOffer).
function publicClass(c) {
  return {
    key: c.key,
    builtin: c.builtin,
    price: c.price_cents,
    minutes: c.length,
    seats: c.seats,
    image: c.image,
    active: c.active,
    fr: { tag: c.tag_fr, title: c.title_fr, unit: priceLine(c, false), cta: "Réserver" },
    en: { tag: c.tag_en, title: c.title_en, unit: priceLine(c, true), cta: "Book" },
  };
}
const apiClasses = () => ({ classes: [...CLASSES.values()].map(publicClass) });

// ---------------------------------------------------------------- helpers

const normalize = (raw) => String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
function newCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const display = `RUSC-${part()}-${part()}`;
  return { key: normalize(display), display };
}
const parisToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);
const num = (v) => Number(v);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtAmount = (unit, n) => {
  const v = num(n);
  if (unit === "euros") return `${v.toLocaleString(LOCALE(), { minimumFractionDigits: v % 1 ? 2 : 0 })} €`;
  const [fr, en] = v === 1 ? UNIT[unit].one : UNIT[unit].many;
  return `${v.toLocaleString(LOCALE())} ${tr(fr, en)}`;
};
const fmtDate = (d) => (d ? new Date(`${isoDate(d)}T12:00:00Z`).toLocaleDateString(LOCALE(), { dateStyle: "medium" }) : "—");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(LOCALE(), { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" }) : "—";

// How much of a code one booking takes.
function needed(unit, offerKey, minutes) {
  if (unit === "sessions") return 1;
  if (unit === "hours") return Math.max(1, Math.round(minutes / 30) / 2);
  return OFFERS[offerKey].price;
}

// Why a code can't pay for this class, or null if it can.
function refusal(code, offerKey, amount) {
  if (!code || !code.active) return "unknown";
  if (code.expires_on && isoDate(code.expires_on) < parisToday()) return "expired";
  if (!code.offers.includes(offerKey)) return "not_for_this_class";
  if (num(code.remaining) < amount) return num(code.remaining) > 0 ? "insufficient" : "empty";
  return null;
}

// The kind of a code/carnet, for the studio copy: "card10" (35 €/séance),
// "card5" (42 €/séance), "gift" (bon cadeau), or null (not a carnet slip).
function codeKind(code, offerKey) {
  if (!code || code.unit !== "sessions") return null;
  const n = num(code.initial);
  if (n >= 10) return "card10";
  if (n >= 5) return "card5";
  return "gift";
}

async function readBody(req, limit = 16 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, body, headers = {}) {
  if (status === 204) {
    res.writeHead(204, headers);
    return res.end();
  }
  const isText = typeof body === "string";
  const isFile = Buffer.isBuffer(body); // then headers give its content-type
  res.writeHead(status, {
    "content-type": isText ? "text/html; charset=utf-8" : "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    ...headers,
  });
  res.end(isText || isFile ? body : JSON.stringify(body));
}

// A few requests per visitor per window: codes can't be guessed by trying.
const hits = new Map();
function limited(req, max, bucket = "") {
  const ip = bucket + (req.headers["fly-client-ip"] ?? req.socket.remoteAddress ?? "?");
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 10 * 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

// Bookings cancelled in Cal give their class back to the code. Run at most
// every few minutes, when requests come in.
let lastReconcile = 0;
async function reconcile() {
  if (Date.now() - lastReconcile < 5 * 60_000) return;
  lastReconcile = Date.now();
  // Everyone who books in Cal, buys online or opens an account joins the
  // clients (Acuity's list came in with its history).
  await db.query(
    `INSERT INTO rusc.clients (email, first_name, phone, source)
     SELECT DISTINCT ON (lower(email)) lower(email), name, phone, source FROM (
       SELECT a.email, a.name, a."phoneNumber" AS phone, 'cal' AS source, 1 AS rank FROM public."Attendee" a
       UNION ALL SELECT o.email, o.name, NULL, 'online', 2 FROM rusc.orders o
       UNION ALL SELECT ac.email, ac.name, NULL, 'account', 3 FROM rusc.accounts ac
     ) x
     WHERE email ~ '@' AND email NOT LIKE '%@clients.studio-rusc.com' AND email NOT LIKE '%@anonymous.invalid'
     ORDER BY lower(email), rank
     ON CONFLICT (lower(email)) WHERE email IS NOT NULL DO NOTHING`,
  ).catch((e) => console.error("clients", e.message));
  const { rows } = await db.query(`
    SELECT u.id FROM rusc.uses u
    WHERE u.cancelled_at IS NULL AND u.amount > 0 AND u.seat_uid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public."BookingSeat" s JOIN public."Booking" b ON b.id = s."bookingId"
        WHERE s."referenceUid" = u.seat_uid AND b.status IN ('accepted', 'pending'))`);
  for (const { id } of rows) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const use = await client.query(
        "UPDATE rusc.uses SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL RETURNING key, amount",
        [id],
      );
      if (use.rowCount) {
        await client.query("UPDATE rusc.codes SET remaining = remaining + $2 WHERE key = $1", [use.rows[0].key, use.rows[0].amount]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("reconcile", id, error.message);
    } finally {
      client.release();
    }
  }
}

// ---------------------------------------------------------------- public API

function cors(req) {
  const origin = req.headers.origin;
  return origin && ORIGINS.has(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, OPTIONS", vary: "origin" }
    : {};
}

function publicCode(code) {
  return {
    code: code.display,
    label: code.label,
    unit: code.unit,
    remaining: num(code.remaining),
    expiresOn: isoDate(code.expires_on),
    offers: code.offers,
  };
}

async function apiCheck(input) {
  const key = normalize(input.code);
  const offerKey = String(input.offer ?? "");
  if (!key || !OFFERS[offerKey]) return { ok: false, reason: "unknown" };
  const { rows } = await db.query("SELECT * FROM rusc.codes WHERE key = $1", [key]);
  const code = rows[0];
  // Hours are checked against one hour here; the booking decides the rest.
  const reason = refusal(code, offerKey, needed(code?.unit, offerKey, 60));
  if (reason === "unknown") return { ok: false, reason };
  return { ok: !reason, reason: reason ?? undefined, ...publicCode(code), need: needed(code.unit, offerKey, 60) };
}

async function apiRedeem(input) {
  const key = normalize(input.code);
  const seatUid = String(input.seatUid ?? "").slice(0, 100);
  if (!key || !seatUid) return { ok: false, reason: "unknown" };

  // The booking just made in Cal: this attendee's seat.
  const booking = await db.query(
    `SELECT s."referenceUid" AS seat_uid, b.uid AS booking_uid, b."startTime" AS start_time,
            b."endTime" AS end_time, b.status, e.slug, a.name, a.email, a."phoneNumber" AS phone
       FROM public."BookingSeat" s
       JOIN public."Booking" b ON b.id = s."bookingId"
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       LEFT JOIN public."Attendee" a ON a.id = s."attendeeId"
      WHERE s."referenceUid" = $1`,
    [seatUid],
  );
  const seat = booking.rows[0];
  if (!seat || !["accepted", "pending"].includes(seat.status)) return { ok: false, reason: "booking_not_found" };
  if (new Date(seat.end_time) < new Date()) return { ok: false, reason: "past" };
  const offerKey = seat.slug.replace(/-(fr|en)$/, "");
  if (!OFFERS[offerKey]) return { ok: false, reason: "not_for_this_class" };
  const minutes = (new Date(seat.end_time) - new Date(seat.start_time)) / 60_000;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM rusc.codes WHERE key = $1 FOR UPDATE", [key]);
    const code = rows[0];
    const amount = code ? needed(code.unit, offerKey, minutes) : 0;
    const reason = refusal(code, offerKey, amount);
    if (reason) {
      await client.query("ROLLBACK");
      return { ok: false, reason };
    }
    const used = await client.query(
      `INSERT INTO rusc.uses (key, seat_uid, booking_uid, offer, starts_at, amount, attendee)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (seat_uid) DO NOTHING`,
      [key, seat.seat_uid, seat.booking_uid, offerKey, seat.start_time, amount, [seat.name, seat.email].filter(Boolean).join(" · ")],
    );
    if (!used.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "already_used" };
    }
    const after = await client.query("UPDATE rusc.codes SET remaining = remaining - $2 WHERE key = $1 RETURNING *", [key, amount]);
    // Paid with the code: the place is confirmed, as a card payment would.
    await client.query(`UPDATE public."Booking" SET status = 'accepted' WHERE uid = $1 AND status = 'pending'`, [seat.booking_uid]);
    await client.query("COMMIT");
    // Confirm by email to the student (and a copy to the studio), matching the
    // card-payment path in recordOrder.
    if (seat.email) await sendBookingConfirmation(seat, seat.name, seat.email, null, null, codeKind(code, seat.slug));
    return { ok: true, used: amount, ...publicCode(after.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- places

// A class booked on the site goes to the cart unpaid. Its places are held for
// HOLD_MINUTES (longer while the person pays), then freed in Cal unless paid,
// so unpaid places never fill a class. Whoever booked can add places for
// friends, up to the class's seats, or remove them: the booker's "number of
// places" and the cart's + and −. Extra places are anonymous seats of the same
// Cal booking, linked to the booker's seat (BookingSeat.data.rusc_holder). The
// booker's seat reference is the proof: only they have it.
//   POST /api/places          {seat, op: "hold", places} | {seat, op: "add" | "remove" | "release"}
//   GET  /api/places?seats=a,b  the cart's lines, as they stand
//   POST /api/places/checkout {seats}  what to charge for each; holds them while paying
const HOLD_MINUTES = 30;
// The checkout route's Stripe session lasts 30 minutes: hold a little longer.
const CHECKOUT_MINUTES = 40;
const ANONYMOUS = "@anonymous.invalid"; // e-mail of an extra place

// A place counts as paid by card, by a code, at the studio (Cours →
// Encaisser), or on Acuity before the switch.
const PAID_SEAT = `(EXISTS (SELECT 1 FROM rusc.paid_seats ps WHERE ps.seat_uid = s."referenceUid")
  OR EXISTS (SELECT 1 FROM rusc.uses u WHERE u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL)
  OR EXISTS (SELECT 1 FROM rusc.desk_payments dp WHERE dp.seat_uid = s."referenceUid")
  OR EXISTS (SELECT 1 FROM rusc.acuity_seats x WHERE x.seat_uid = s."referenceUid"))`;

// The booker's seat, its class, and the places of its group (the booker's
// first, then the extras in the order they were added). With lock, the class's
// booking is locked first, as Cal does when it adds a seat.
async function placeGroup(client, seatUid, lock = false) {
  const head = await client.query(
    `SELECT s.data->>'rusc_holder' AS holder, b.id AS booking_id, b.uid AS booking_uid, b.status,
            b."startTime" AT TIME ZONE 'UTC' AS start_time, b."endTime" AT TIME ZONE 'UTC' AS end_time,
            e.slug, e."seatsPerTimeSlot" AS capacity, a.name, a.email, a."phoneNumber" AS phone, a."timeZone" AS time_zone, a.locale
       FROM public."BookingSeat" s
       JOIN public."Booking" b ON b.id = s."bookingId"
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       LEFT JOIN public."Attendee" a ON a.id = s."attendeeId"
      WHERE s."referenceUid" = $1`,
    [seatUid],
  );
  const group = head.rows[0];
  // Unknown, cancelled, or an extra place's own seat (only the booker's counts).
  if (!group || group.holder || !["accepted", "pending"].includes(group.status)) return null;
  if (lock) await client.query(`SELECT id FROM public."Booking" WHERE id = $1 FOR UPDATE`, [group.booking_id]);
  // One after the other: a pg client runs one query at a time.
  const seats = await client.query(
    `SELECT s.id, s."referenceUid" AS uid, s."attendeeId" AS attendee_id, ${PAID_SEAT} AS paid
       FROM public."BookingSeat" s
      WHERE s."bookingId" = $1 AND (s."referenceUid" = $2 OR s.data->>'rusc_holder' = $2)
      ORDER BY s."referenceUid" = $2 DESC, s.id`,
    [group.booking_id, seatUid],
  );
  const taken = await client.query(`SELECT count(*)::int AS n FROM public."BookingSeat" WHERE "bookingId" = $1`, [group.booking_id]);
  const hold = await client.query("SELECT expires_at, released_at FROM rusc.holds WHERE seat_uid = $1", [seatUid]);
  return { ...group, seat_uid: seatUid, seats: seats.rows, taken: taken.rows[0].n, hold: hold.rows[0] ?? null };
}

function placeState(group) {
  const unpaid = group.seats.filter((s) => !s.paid).length;
  return {
    ok: true,
    seat: group.seat_uid,
    offer: OFFERS[group.slug] ? group.slug : null,
    start: new Date(group.start_time).toISOString(),
    end: new Date(group.end_time).toISOString(),
    places: group.seats.length,
    unpaid,
    // Places still free in the class (for the cart's + button).
    left: group.capacity ? Math.max(0, group.capacity - group.taken) : 0,
    // The unpaid extra places, so a code can pay for them too (booking page).
    extras: group.seats.filter((s) => !s.paid && s.uid !== group.seat_uid).map((s) => s.uid),
    expiresAt: unpaid && group.hold && !group.hold.released_at ? new Date(group.hold.expires_at).toISOString() : null,
  };
}

// Removes places (attendee and seat) from a Cal booking. When nobody is left,
// the booking is cancelled, as Cal does, so the slot is free again.
async function dropSeats(client, group, seats) {
  if (!seats.length) return;
  await client.query(`DELETE FROM public."BookingSeat" WHERE id = ANY($1::int[])`, [seats.map((s) => s.id)]);
  await client.query(`DELETE FROM public."Attendee" WHERE id = ANY($1::int[])`, [seats.map((s) => s.attendee_id)]);
  const left = await client.query(`SELECT count(*)::int AS n FROM public."Attendee" WHERE "bookingId" = $1`, [group.booking_id]);
  if (!left.rows[0].n) {
    await client.query(`UPDATE public."Booking" SET status = 'cancelled', "idempotencyKey" = NULL WHERE id = $1`, [group.booking_id]);
  }
}

// Adds up to `count` extra places to the group, within the class's seats.
async function addSeats(client, group, count) {
  const free = group.capacity ? group.capacity - group.taken : 0;
  for (let i = 0; i < Math.min(count, free); i++) {
    const uid = randomUUID();
    const number = group.seats.length + 1;
    const attendee = await client.query(
      `INSERT INTO public."Attendee" (email, name, "timeZone", locale, "bookingId") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`place-${uid}${ANONYMOUS}`, `${group.name ?? "?"} +${number - 1}`, group.time_zone ?? "Europe/Paris", group.locale ?? "fr", group.booking_id],
    );
    const seat = await client.query(
      `INSERT INTO public."BookingSeat" ("referenceUid", "bookingId", "attendeeId", data) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uid, group.booking_id, attendee.rows[0].id, { rusc_holder: group.seat_uid }],
    );
    group.seats.push({ id: seat.rows[0].id, uid, attendee_id: attendee.rows[0].id, paid: false });
    group.taken += 1;
  }
}

// Frees the group's unpaid places (the booker's too, if unpaid) and closes its hold.
async function releaseGroup(client, group) {
  const unpaid = group.seats.filter((s) => !s.paid);
  await dropSeats(client, group, unpaid);
  group.seats = group.seats.filter((s) => s.paid);
  group.taken -= unpaid.length;
  await client.query(
    `INSERT INTO rusc.holds (seat_uid, booking_uid, offer, expires_at, released_at) VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (seat_uid) DO UPDATE SET released_at = now()`,
    [group.seat_uid, group.booking_uid, group.slug],
  );
  group.hold = { expires_at: new Date(), released_at: new Date() };
}

async function apiPlaces(input) {
  const seatUid = String(input.seat ?? "").slice(0, 100);
  const op = String(input.op ?? "");
  if (!seatUid || !["hold", "add", "remove", "release"].includes(op)) return { ok: false, reason: "unknown" };
  await releaseExpired();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const group = await placeGroup(client, seatUid, true);
    // Gone: freed (expired, or removed in another tab) or cancelled.
    if (!group || (group.hold?.released_at && op !== "release")) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "gone" };
    }
    if (op !== "release" && new Date(group.end_time) < new Date()) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "past" };
    }
    let reason;
    if (op === "release") {
      await releaseGroup(client, group);
    } else {
      // Every place change keeps (or starts) the hold on the group's unpaid places.
      await client.query(
        `INSERT INTO rusc.holds (seat_uid, booking_uid, offer, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4))
         ON CONFLICT (seat_uid) DO NOTHING`,
        [seatUid, group.booking_uid, group.slug, HOLD_MINUTES],
      );
      if (!group.hold) group.hold = { expires_at: new Date(Date.now() + HOLD_MINUTES * 60_000), released_at: null };
      if (op === "hold") {
        const wanted = Math.min(Math.max(Math.floor(Number(input.places)) || 1, 1), 20);
        await addSeats(client, group, wanted - group.seats.length);
        if (group.seats.length < wanted) reason = "full";
      } else if (op === "add") {
        const before = group.seats.length;
        await addSeats(client, group, 1);
        if (group.seats.length === before) reason = "full";
      } else {
        // The last unpaid extra place; the booker's own is removed with "release".
        const extra = group.seats.filter((s) => !s.paid && s.uid !== seatUid).pop();
        if (extra) {
          await dropSeats(client, group, [extra]);
          group.seats = group.seats.filter((s) => s !== extra);
          group.taken -= 1;
        } else reason = "last";
      }
    }
    await client.query("COMMIT");
    return { ...placeState(group), ...(reason ? { note: reason } : {}) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// The cart's lines as they stand: places, unpaid, still held or gone.
async function apiPlacesState(seats) {
  await releaseExpired();
  const client = await db.connect();
  try {
    const result = [];
    for (const seat of seats) {
      const group = await placeGroup(client, seat);
      result.push(group && !group.hold?.released_at ? placeState(group) : { ok: false, seat, reason: "gone" });
    }
    return { places: result };
  } finally {
    client.release();
  }
}

// Checkout (the site's /api/checkout route, before it opens Stripe): the class
// and number of unpaid places of each line, from Cal, never from the browser.
// Their hold lasts while the person pays.
async function apiPlacesCheckout(seats) {
  const before = await apiPlacesState(seats);
  const held = before.places.filter((p) => p.ok && p.unpaid).map((p) => p.seat);
  if (!held.length) return before;
  await db.query(
    `UPDATE rusc.holds SET expires_at = greatest(expires_at, now() + make_interval(mins => $2))
      WHERE seat_uid = ANY($1::text[]) AND released_at IS NULL`,
    [held, CHECKOUT_MINUTES],
  );
  return apiPlacesState(seats);
}

// Frees the places whose hold ran out unpaid. Runs every minute while rūsc
// admin is awake; Cal's cron loop wakes it (GET /tasks/release-places).
let lastRelease = 0;
async function releaseExpired() {
  if (Date.now() - lastRelease < 20_000) return;
  lastRelease = Date.now();
  const { rows } = await db.query("SELECT seat_uid FROM rusc.holds WHERE released_at IS NULL AND expires_at < now()");
  for (const { seat_uid: seatUid } of rows) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const group = await placeGroup(client, seatUid, true);
      if (group) await releaseGroup(client, group);
      else await client.query("UPDATE rusc.holds SET released_at = now() WHERE seat_uid = $1", [seatUid]);
      await client.query("COMMIT");
      if (group) console.log("places released", seatUid.slice(0, 8));
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("release", seatUid.slice(0, 8), error.message);
    } finally {
      client.release();
    }
  }
  // Orphan clean-up: a booking still PENDING but never paid (no card, no code),
  // whose hold has expired (or already released) and that is more than
  // HOLD_MINUTES old, is cancelled and its seats removed so the slot frees.
  // Without this, a client who books but never pays keeps the slot indefinitely.
  // Its failure must not fail the places API and checkout that call this
  // (2026-10-06: it threw on every run, "rows is not iterable", so most holds
  // and checkouts answered 500). Fixing that loop turns the clean-up on, which
  // would cancel the unpaid 22 October booking: the owner's call.
  await cancelUnpaidPending().catch((error) => console.error("cancel pending", error.message));
}

// Cancels Cal bookings that are still PENDING and unpaid, whose oldest hold has
// expired and is older than the release tolerance. Covers the gap where a hold
// was already marked released but the booking was never cancelled.
async function cancelUnpaidPending() {
  const rows = await db.query(
    `SELECT DISTINCT b.id AS booking_id
       FROM public."Booking" b
       JOIN public."BookingSeat" s ON s."bookingId" = b.id
       WHERE b.status = 'pending'
         AND NOT EXISTS (SELECT 1 FROM rusc.paid_seats ps WHERE ps.seat_uid = s."referenceUid")
         AND NOT EXISTS (SELECT 1 FROM rusc.uses u WHERE u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL)
         AND NOT EXISTS (SELECT 1 FROM rusc.desk_payments dp WHERE dp.seat_uid = s."referenceUid")
         AND NOT EXISTS (SELECT 1 FROM rusc.acuity_seats x WHERE x.seat_uid = s."referenceUid")
         AND b."createdAt" < now() - make_interval(mins => 60)`,
  );
  for (const { booking_id } of rows) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE public."Booking" SET status = 'cancelled', "idempotencyKey" = NULL WHERE id = $1 AND status = 'pending'`, [booking_id]);
      await client.query("COMMIT");
      console.log("cancelled unpaid pending booking", booking_id);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("cancel pending", booking_id, error.message);
    } finally {
      client.release();
    }
  }
}

// ---------------------------------------------------------------- online orders

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
// Key that guards the public calendar feed (/cal.ics). A random value in the
// URL keeps the student list private while letting phones load it without a
// login password. Set it once as a Fly secret CAL_FEED_KEY.
const CAL_FEED_KEY = process.env.CAL_FEED_KEY ?? "";
// One-off import from the Acuity admin page (scripts/continuity/): only open
// while the Fly secret IMPORT_TOKEN is set, and only from Acuity's admin.
const IMPORT_TOKEN = process.env.IMPORT_TOKEN ?? "";
const IMPORT_ORIGIN = "https://secure.acuityscheduling.com";
// The public site, for the password links the studio sends to members.
const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://rusc-preview.vercel.app";

// Stripe's signature: header "t=<time>,v1=<hex>…", HMAC-SHA256 of "<t>.<body>".
// Stripe's signature check; `problem` says why a delivery is refused (for the log).
function stripeCheck(body, header) {
  if (!WEBHOOK_SECRET) return { problem: "no STRIPE_WEBHOOK_SECRET set" };
  if (!header) return { problem: "no Stripe-Signature header" };
  const time = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|,)v1=([0-9a-f]+)/g)].map((m) => m[1]);
  if (!time || !signatures.length) return { problem: "malformed Stripe-Signature header" };
  if (Math.abs(Date.now() / 1000 - Number(time)) > 300) return { problem: "timestamp older than 5 minutes" };
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(`${time}.${body}`).digest("hex");
  if (!signatures.some((signature) => sameText(signature, expected))) return { problem: "signature doesn't match STRIPE_WEBHOOK_SECRET" };
  return { event: JSON.parse(body) };
}

const addMonths = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
};

// A paid cart: record it once (Stripe may send the event more than once),
// mark the places it paid, create the codes for carnets and vouchers, and
// the membership.
async function recordOrder(session) {
  if (!["paid", "no_payment_required"].includes(session.payment_status)) return;
  const metadata = session.metadata ?? {};
  const items = Object.keys(metadata)
    .filter((k) => /^items_\d+$/.test(k))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((k) => metadata[k])
    .join("");
  const email = session.customer_details?.email ?? null;
  const name = session.customer_details?.name ?? null;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO rusc.orders (id, email, name, amount, lang, items, livemode, code_key, code_covered_cents) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [session.id, email, name, (session.amount_total ?? 0) / 100, metadata.lang ?? null, items, Boolean(session.livemode), metadata.code_key ?? null, metadata.code_covered_cents ? Number(metadata.code_covered_cents) : null],
    );
    if (!inserted.rowCount) {
      await client.query("ROLLBACK");
      return;
    }
    // A code that paid for part of the cart: finalize its hold now that the
    // payment is confirmed (the money is truly spent). The hold was created
    // by /api/cover with pending = true.
    const holdId = Number(metadata.hold_id);
    if (Number.isFinite(holdId) && holdId > 0) {
      await client.query(
        "UPDATE rusc.uses SET pending = false, order_id = $2 WHERE id = $1 AND pending = true",
        [holdId, session.id],
      );
    }
    const holder = [name, email].filter(Boolean).join(" · ") || null;
    const note = `Commande en ligne du ${fmtDate(parisToday())}`;
    const english = metadata.lang === "en"; // the code's label in the buyer's language
    for (const token of items.split(/\s+/).filter(Boolean)) {
      const match = token.match(/^([a-z0-9-]+)(?::(\d+))?x(\d+)(?:@(.+))?$/);
      if (!match) continue;
      const [, key, cents, qtyText, ref] = match;
      const qty = Math.min(Number(qtyText) || 1, 20);
      if (OFFERS[key]) {
        if (ref) {
          // The booker's seat and the extra places of its group (/api/places):
          // qty of its unpaid places are paid, the booker's first.
          const group = await placeGroup(client, ref, true);
          const seats = group ? group.seats.filter((s) => !s.paid).slice(0, qty).map((s) => s.uid) : [ref];
          if (!group || seats.length < qty) console.error("order paid more places than are held", session.id, ref.slice(0, 8));
          for (const seat of seats) {
            await client.query("INSERT INTO rusc.paid_seats (seat_uid, order_id, offer) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [seat, session.id, key]);
          }
          // Payment confirms the class: Cal books it PENDING (requiresConfirmation)
          // until someone pays. Who paid is per place (paid_seats), since everyone
          // in a class shares one Cal booking.
          if (group) await client.query(`UPDATE public."Booking" SET status = 'accepted', paid = true WHERE id = $1`, [group.booking_id]);
          // Confirm to the student by email (as the old Acuity system did),
          // with the amount actually paid for the seat, and CC the studio.
          if (group && email) await sendBookingConfirmation(group, name, email, cents ? Number(cents) / 100 : null, metadata.lang);
        }
        continue;
      }
      if (key === "adhesion" && email) {
        await client.query(
          `INSERT INTO rusc.members (email, name, until, order_id, note) VALUES (lower($1), $2, (current_date + interval '1 year')::date, $3, $4)
           ON CONFLICT (email) DO UPDATE SET name = coalesce(EXCLUDED.name, rusc.members.name),
             until = greatest(rusc.members.until, current_date) + interval '1 year', order_id = EXCLUDED.order_id`,
          [email, name, session.id, note],
        );
        continue;
      }
      const product = PRODUCTS[key];
      const preset = product?.preset && PRESETS.find((x) => x.id === product.preset);
      if (!preset) continue;
      // A voucher of any amount carries the amount paid; the others, their preset's.
      const euros = cents ? Number(cents) / 100 : null;
      const amount = euros ?? preset.amount;
      const label = euros
        ? english ? `Gift voucher · €${euros}` : `Bon cadeau · ${euros} €`
        : product.codeLabel?.[english ? 1 : 0] ?? (english ? preset.en : preset.label);
      for (let i = 0; i < qty; i++) {
        const { key: codeKey, display } = newCode();
        await client.query(
          `INSERT INTO rusc.codes (key, display, label, unit, offers, initial, remaining, expires_on, holder, note, source, order_id)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, 'online', $10)`,
          [codeKey, display, label, preset.unit, presetOffers(preset), amount, addMonths(preset.months), holder, note, session.id],
        );
      }
    }
    await client.query("COMMIT");
    console.log("order recorded", session.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Code payment for cart products (W3): a euro-valued code can cover part of a
// cart's total. The cover reserves the amount immediately (a pending use that
// lowers the balance), finalized when Stripe confirms payment, rolled back when
// the checkout is abandoned or fails. Only euro codes cover (sessions/hours pay
// for classes, not products); the checkout route never trusts the browser's
// prices — it sends the server-computed total in cents.
async function apiCover(input) {
  const key = normalize(input.code);
  const amountCents = Math.floor(Number(input.amountCents));
  if (!key || !Number.isFinite(amountCents) || amountCents <= 0) return { ok: false, reason: "bad_amount" };
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM rusc.codes WHERE key = $1 FOR UPDATE", [key]);
    const code = rows[0];
    if (!code) { await client.query("ROLLBACK"); return { ok: false, reason: "unknown" }; }
    if (!code.active) { await client.query("ROLLBACK"); return { ok: false, reason: "inactive" }; }
    if (code.expires_on && isoDate(code.expires_on) < parisToday()) { await client.query("ROLLBACK"); return { ok: false, reason: "expired" }; }
    if (code.unit !== "euros") { await client.query("ROLLBACK"); return { ok: false, reason: "not_euros", unit: code.unit }; }
    // remaining is in euros (numeric); work in whole cents to avoid float drift.
    const remainingCents = Math.round(num(code.remaining) * 100);
    const coveredCents = Math.min(remainingCents, amountCents);
    if (coveredCents <= 0) { await client.query("ROLLBACK"); return { ok: false, reason: "empty" }; }
    const newRemaining = (remainingCents - coveredCents) / 100;
    await client.query("UPDATE rusc.codes SET remaining = $2 WHERE key = $1", [key, newRemaining]);
    const use = await client.query(
      "INSERT INTO rusc.uses (key, amount, note, pending) VALUES ($1, $2, $3, true) RETURNING id",
      [key, coveredCents / 100, "Paiement panier (code) — en attente"],
    );
    await client.query("COMMIT");
    return { ok: true, coveredCents, holdId: Number(use.rows[0].id), code: code.display, remaining: newRemaining };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Roll a pending hold back (the balance is returned). Only pending, non-cancelled
// holds can be released: once finalized or cancelled it is a no-op.
async function apiRelease(input) {
  const holdId = Math.floor(Number(input.holdId));
  if (!Number.isFinite(holdId) || holdId <= 0) return { ok: false, reason: "unknown" };
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM rusc.uses WHERE id = $1 FOR UPDATE", [holdId]);
    const use = rows[0];
    if (!use) { await client.query("ROLLBACK"); return { ok: false, reason: "unknown" }; }
    if (!use.pending || use.cancelled_at) { await client.query("ROLLBACK"); return { ok: false, reason: "already_final" }; }
    await client.query("UPDATE rusc.codes SET remaining = remaining + $2 WHERE key = $1", [use.key, num(use.amount)]);
    await client.query("UPDATE rusc.uses SET cancelled_at = now(), pending = false WHERE id = $1", [holdId]);
    await client.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function apiOrder(id) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return { paid: false, codes: [] };
  const order = await db.query("SELECT id FROM rusc.orders WHERE id = $1", [id]);
  if (!order.rowCount) return { paid: false, codes: [] };
  const { rows } = await db.query("SELECT * FROM rusc.codes WHERE order_id = $1 ORDER BY created_at, key", [id]);
  return { paid: true, codes: rows.map((c) => ({ code: c.display, label: c.label, unit: c.unit, remaining: num(c.remaining), expiresOn: isoDate(c.expires_on) })) };
}

// Rebuild the pending hold left by /api/cover when a checkout session is
// abandoned (checkout.session.expired) or fails (async_payment_failed). The
// metadata carries the hold id; released only if still pending and not yet
// cancelled. Idempotent: a duplicate webhook is a no-op.
async function releaseHold(session) {
  const holdId = Number(session.metadata?.hold_id);
  if (!Number.isFinite(holdId) || holdId <= 0) return;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM rusc.uses WHERE id = $1 FOR UPDATE", [holdId]);
    const use = rows[0];
    if (use && use.pending && !use.cancelled_at) {
      await client.query("UPDATE rusc.codes SET remaining = remaining + $2 WHERE key = $1", [use.key, num(use.amount)]);
      await client.query("UPDATE rusc.uses SET cancelled_at = now(), pending = false WHERE id = $1", [holdId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("releaseHold", holdId, error.message);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- studio admin

// Studio sign-in: one password (the Fly secret CODES_ADMIN_PASSWORD), then a
// signed cookie for 30 days. Changing the password signs everyone out.
const SESSION_MS = 30 * 24 * 3600_000;
const sessionKey = () => createHmac("sha256", ADMIN_PASSWORD).update("rusc-admin-session").digest();
const sign = (value) => createHmac("sha256", sessionKey()).update(value).digest("base64url");
const sameText = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
function sessionCookie() {
  const expires = String(Date.now() + SESSION_MS);
  return `rusc_admin=${expires}.${sign(expires)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}
function signedIn(req) {
  if (!ADMIN_PASSWORD) return false;
  const cookie = (req.headers.cookie ?? "").split(/;\s*/).find((c) => c.startsWith("rusc_admin="));
  const [expires, signature] = (cookie?.slice("rusc_admin=".length) ?? "").split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return sameText(signature, sign(expires));
}

const STYLE = `
  /* rūsc admin's look (utility mode): a warm off-white canvas, white cards
     with hairline borders, Geist, one accent (the studio's green), tinted
     badges for states. Tokens first; everything below uses them. */
  :root{--bg:#f6f5f1;--surface:#fff;--sunken:#efede7;--ink:#1b1b19;--muted:#6c6a63;--faint:#9a978f;--line:#e7e4dc;--line-strong:#d7d3c8;
    --accent:#3b4e3e;--accent-hover:#2f3f32;--accent-soft:#e8eee6;--warn:#9a4b2b;--warn-soft:#f7ebe4;--ring:0 0 0 3px rgba(59,78,62,.18);
    --r:12px;--r-s:8px;--shadow:0 1px 2px rgba(27,27,25,.05);--shadow-lg:0 12px 32px -12px rgba(27,27,25,.18);--ease:cubic-bezier(.22,1,.36,1);
    --font:"Geist",ui-sans-serif,system-ui,-apple-system,sans-serif;--mono:"Geist Mono",ui-monospace,Menlo,monospace}
  *{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.55 var(--font);-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
  main{max-width:1000px;margin:0 auto;padding:28px 20px 72px}body:has(.cal) main{max-width:1240px}
  h1{font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}h2{font-size:16px;font-weight:600;letter-spacing:-.01em;margin:36px 0 12px}h3{font-weight:600}
  a{color:var(--accent);text-underline-offset:3px;text-decoration-thickness:1px}a:hover{color:var(--accent-hover)}
  p.muted,.muted{color:var(--muted)}.small{font-size:13px}.cap::first-letter{text-transform:uppercase}.off{color:var(--warn)}.ok{color:var(--accent)}
  .i{flex:none;vertical-align:-3px}
  :focus-visible{outline:2px solid var(--accent);outline-offset:2px}

  /* Header: sticky, blurred, the menu as a pill switcher. */
  header.top{position:sticky;top:0;z-index:20;background:rgba(246,245,241,.82);-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--line)}
  header.top .bar{max-width:1000px;margin:0 auto;padding:10px 20px;display:grid;grid-template-columns:1fr auto 1fr;gap:10px 16px;align-items:center}
  body:has(.cal) header.top .bar{max-width:1240px}
  header.top .brand{justify-self:start}header.top .right{justify-self:end;display:flex;gap:8px;align-items:center}
  header.top nav{display:flex;gap:2px;padding:3px;background:var(--sunken);border-radius:999px}
  header.top nav a{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;color:var(--muted);text-decoration:none;font-weight:500;font-size:14px;transition:color .2s,background .2s,box-shadow .2s}
  header.top nav a:hover{color:var(--ink)}header.top nav a[aria-current]{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(27,27,25,.08),0 0 0 1px rgba(27,27,25,.04)}
  header.top nav a[aria-current] .i{color:var(--accent)}
  .brand{display:inline-flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none}.brand .logo{display:block}
  .brand span{color:var(--muted);font-weight:500;font-size:13px;padding:1px 8px;border:1px solid var(--line-strong);border-radius:999px}
  .lang{display:inline-flex;padding:2px;background:var(--sunken);border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.02em}
  .lang a,.lang b{padding:3px 9px;border-radius:999px;text-decoration:none;color:var(--muted)}.lang b{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(27,27,25,.08)}
  .soon{color:var(--muted);opacity:.6}

  /* Controls. */
  button,a.action,a.button,details>summary.button{font:500 14px/1.2 var(--font);display:inline-flex;align-items:center;justify-content:center;gap:7px;background:var(--accent);color:#fff;border:1px solid var(--accent);border-radius:999px;padding:9px 16px;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .2s,border-color .2s,color .2s,box-shadow .2s}
  button:hover,a.action:hover,a.button:hover{background:var(--accent-hover);border-color:var(--accent-hover);color:#fff}
  button.plain,a.action.plain,a.button.plain{background:var(--surface);color:var(--ink);border-color:var(--line-strong)}
  button.plain:hover,a.action.plain:hover,a.button.plain:hover{background:var(--surface);border-color:var(--accent);color:var(--accent)}
  button.small,a.button.small{padding:5px 11px;font-size:13px;gap:5px}button.ghost{background:none;border-color:transparent;color:var(--muted)}button.ghost:hover{background:var(--sunken);border-color:transparent;color:var(--ink)}
  button.danger:hover{border-color:var(--warn);color:var(--warn)}
  .ibtn{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);cursor:pointer;text-decoration:none;transition:border-color .2s,color .2s,background .2s}
  .ibtn:hover{border-color:var(--accent);color:var(--accent);background:var(--surface)}
  label{display:grid;gap:5px;font-size:12.5px;font-weight:500;color:var(--muted)}
  input,select,textarea{font:inherit;font-size:14px;padding:8px 11px;min-height:38px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink);transition:border-color .2s,box-shadow .2s}
  input:hover,select:hover,textarea:hover{border-color:var(--faint)}input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--ring)}
  input[type=checkbox],input[type=radio]{min-height:0;accent-color:var(--accent);width:16px;height:16px}
  fieldset{border:1px solid var(--line);border-radius:10px;grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;padding:10px 14px 12px;margin:0}
  fieldset legend{font-size:12.5px;font-weight:500;color:var(--muted);padding:0 4px}fieldset label{display:flex;gap:7px;color:var(--ink);align-items:center;font-size:14px;font-weight:400}

  /* Cards and forms. */
  form.box{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:20px;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
  form.box label>input,form.box label>select,form.box label>textarea{width:100%;min-width:0}
  form.box .wide{grid-column:1/-1}form.box textarea{resize:vertical}@media (min-width:860px){form.box .two{grid-column:span 2}}
  form.box h3{grid-column:1/-1;margin:8px 0 -4px;font-size:13px;color:var(--muted);font-weight:600}
  .code{font:600 24px/1.2 var(--mono);letter-spacing:.06em;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:12px 18px;display:inline-block}
  .codebox{display:flex;gap:10px;align-items:center}
  .copy .i+.i,.copy.done .i:first-child{display:none}.copy.done .i+.i{display:block}.copy.done{border-color:var(--accent);color:var(--accent)}
  .linkbox{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.linkbox code{font-family:var(--mono);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12.5px;word-break:break-all}
  .flash{display:flex;gap:8px;align-items:center;color:var(--accent);font-weight:500;background:var(--accent-soft);border-radius:10px;padding:10px 14px;margin:12px 0}
  .search{display:flex;gap:8px;margin:0 0 14px}.search input{flex:1}
  .field{position:relative;flex:1;display:flex}.field .i{position:absolute;left:12px;top:50%;margin-top:-8px;color:var(--faint);pointer-events:none}.field input{flex:1;padding-left:36px;border-radius:999px}
  .titlebar{display:flex;gap:10px 16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.titlebar h1,.titlebar h2{margin:0}
  .titlebar:has(>h2){margin:36px 0 12px}

  /* Badges: a state at a glance (paid, to pay, full, where a code comes from). */
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;background:var(--sunken);color:var(--muted);padding:2px 9px;border-radius:999px;white-space:nowrap}
  .pill.full{background:var(--warn-soft);color:var(--warn)}.pill.some{background:var(--accent-soft);color:var(--accent)}
  .st{display:inline-flex;align-items:center;gap:6px}.st.ok,.st.off,.st.muted{padding:3px 10px 3px 8px;border-radius:8px;font-size:13px;line-height:1.4}
  .st.ok{background:var(--accent-soft);color:var(--accent)}.st.off{background:var(--warn-soft);color:var(--warn)}.st.muted{background:var(--sunken);color:var(--muted)}
  a.st.ok{text-decoration:none}a.st.ok:hover{background:#dde6db}
  p.st{display:flex}

  /* List tables: one white card, sentence-case headers, quiet hover. */
  table{width:100%;border-collapse:separate;border-spacing:0;font-size:14px}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-weight:500;color:var(--muted);font-size:12.5px;background:#fbfaf7}
  table:has(>thead){background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
  table:has(>thead) tbody tr:last-child td{border-bottom:0}
  tbody tr{transition:background .15s}table:has(>thead) tbody tr:hover{background:#fbfaf7}

  /* Cours: each class a card; a class nobody booked yet is one quiet line. */
  .toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 18px}.toolbar .action{margin-left:auto}
  .seg{display:inline-flex;gap:2px;padding:3px;background:var(--sunken);border-radius:999px}
  .seg a{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;color:var(--muted);text-decoration:none;font-weight:500;font-size:14px}
  .seg a:hover{color:var(--ink)}.seg a[aria-current]{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(27,27,25,.08)}
  .day{margin:30px 0 10px;font-size:13px;font-weight:600;color:var(--muted);letter-spacing:.01em}.day::first-letter{text-transform:uppercase}
  .session{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:14px 16px;margin:0 0 10px;scroll-margin-top:90px}
  .session .head{display:flex;gap:8px 10px;align-items:center;flex-wrap:wrap}.session .head b{font-weight:600}.session .head .t{font-variant-numeric:tabular-nums}
  .session .head .grow{flex:1}.session table.people{margin-top:10px}
  .session.empty{background:transparent;box-shadow:none;padding:9px 16px;margin-bottom:8px}.session.empty .head b{font-weight:500}
  .session:target{border-color:var(--accent);box-shadow:var(--ring)}
  table.people td{font-size:14px;padding:10px 0;border-bottom:1px solid var(--line)}table.people td+td{padding-left:12px}table.people tr:last-child td{border-bottom:0}
  table.people td.act{text-align:right;white-space:nowrap;width:1%}
  .session table:not(.people){margin-top:8px}.session table:not(.people) td{padding:8px 0}.session table tr:last-child td{border-bottom:0}
  .contact{display:flex;flex-wrap:wrap;gap:2px 14px;margin-top:2px;font-size:13px}.contact a{display:inline-flex;align-items:center;gap:5px;color:var(--muted);text-decoration:none}.contact a:hover{color:var(--accent)}
  .person{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  /* Attendance: came / no-show, a two-way switch per person. */
  .att{display:inline-flex;gap:2px;padding:2px;background:var(--sunken);border-radius:999px;vertical-align:middle}
  .att button{background:none;border:0;color:var(--faint);padding:4px 9px;font-size:12.5px;gap:4px}.att button:hover{background:var(--surface);color:var(--ink)}
  .att button[aria-pressed=true].came{background:var(--accent);color:#fff}.att button[aria-pressed=true].gone{background:var(--warn);color:#fff}
  /* Forms that fold away: Horaires' "add hours", Codes' "new code", Cours'
     "add someone" and "paid at the studio". */
  details>summary{list-style:none;cursor:pointer}details>summary::-webkit-details-marker{display:none}
  details.add>summary,details.new>summary,details.inline>summary{display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-weight:500;font-size:14px;margin-top:10px;padding:6px 12px 6px 10px;border-radius:999px;transition:background .2s}
  details.add>summary:hover,details.new>summary:hover,details.inline>summary:hover{background:var(--accent-soft)}
  details.new>summary{background:var(--accent);color:#fff;margin:4px 0 0;padding:9px 16px 9px 13px}details.new>summary:hover{background:var(--accent-hover)}details.new[open]>summary{margin-bottom:14px}
  details.inline>summary{margin:0;font-size:13px;padding:4px 10px 4px 8px}details.inline[open]>summary{background:var(--accent-soft)}
  details.inline form{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px}
  details.inline form label{font-size:12px}details.inline form input,details.inline form select{min-height:34px;padding:6px 10px}details.inline form button{min-height:34px}
  form.box.compact{box-shadow:none;background:#fbfaf7;padding:14px;margin-top:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .inline-form{display:inline}
  .paycell{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}.paycell details.inline[open]{flex-basis:100%}
  .session{position:relative}.session>details.addp>summary{position:absolute;top:11px;right:12px;margin:0;font-size:13px;padding:4px 10px 4px 8px}
  .session.empty>details.addp>summary{top:6px}.session:has(>details.addp) .head{padding-right:92px}.session>details.addp[open]>summary{background:var(--accent-soft)}

  /* Calendar: a month as one card, 1px hairlines between days. */
  .calnav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.calnav h2{margin:0 6px}.calnav a:not(.ibtn){text-decoration:none;font-weight:500;font-size:14px}.calnav .muted{margin-left:auto}
  .cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
  .cal .dow{font-size:12px;font-weight:500;color:var(--muted);padding:8px 10px;background:#fbfaf7}
  .cal .cell{min-height:110px;min-width:0;padding:6px;display:flex;flex-direction:column;gap:3px;background:var(--surface)}
  .cal .cell.out{background:#faf9f6}.cal .out .date,.cal .past .date{color:var(--faint)}
  .cal .date{align-self:flex-start;font-size:13px;font-weight:500;color:var(--ink);text-decoration:none;padding:1px 4px;border-radius:999px;min-width:24px;text-align:center}
  .cal .date:hover{background:var(--sunken)}.cal .today .date{background:var(--accent);color:#fff}.cal .w{display:none}.cal .past .chip{opacity:.6}
  .chip{display:flex;gap:5px;align-items:baseline;min-width:0;padding:3px 7px;font-size:12px;line-height:1.35;color:var(--ink);text-decoration:none;background:var(--sunken);border-radius:6px;transition:filter .15s}
  .chip:hover{filter:brightness(.97);color:var(--ink)}.chip .l{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chip b{font-weight:600}
  .chip.some{background:var(--accent-soft)}.chip.some b{color:var(--accent)}.chip.full{background:var(--warn-soft)}.chip.full b{color:var(--warn)}

  /* Class form: the site's photos to pick from. */
  fieldset.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}fieldset.photos legend{margin-bottom:4px}
  fieldset.photos label{display:block;position:relative;cursor:pointer}fieldset.photos input{position:absolute;opacity:0;pointer-events:none}
  fieldset.photos img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;outline:2px solid transparent;outline-offset:1px;transition:outline-color .2s}
  fieldset.photos input:checked+img{outline-color:var(--accent)}fieldset.photos input:focus-visible+img{outline-color:var(--ink)}

  /* A code's balance at a glance: a notch per class or hour, or a bar. */
  .meter{display:flex;gap:2px;max-width:150px;margin-top:6px}.meter i{flex:1;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--accent) var(--f),var(--line-strong) var(--f))}
  .meter-wide .meter{max-width:320px;margin:0 0 12px}

  /* Sign-in: one centred card. */
  .login{max-width:380px;margin:12vh auto 0}.login .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
  .login form.box{grid-template-columns:1fr;box-shadow:var(--shadow-lg)}.login form.box button{width:100%}
  h1.brand{margin:0}h1.brand span{font-size:13px}

  /* Motion: saved notes and opened forms settle in; nothing for reduced motion. */
  @media (prefers-reduced-motion:no-preference){
    @keyframes admin-in{from{opacity:0;translate:0 4px}to{opacity:1;translate:0 0}}
    .flash,details[open]>form,details[open]>.box{animation:admin-in .3s var(--ease) both}
  }

  /* Phones: the menu becomes a tab bar under the logo; list tables stack into
     rows, each cell labelled with its column (page()'s script copies the
     headers into data-label); a class's people put how each paid under their
     name. */
  @media (max-width:700px){
    main{padding:20px 16px 64px}h1{font-size:22px}
    header.top .bar{grid-template-columns:1fr auto;padding:8px 16px 6px}
    header.top nav{grid-column:1/-1;grid-row:2;display:grid;grid-template-columns:repeat(5,1fr);background:none;padding:0;gap:0}
    header.top nav a{flex-direction:column;gap:2px;padding:6px 2px;font-size:11px;border-radius:10px}
    header.top nav a .i{width:20px;height:20px}header.top nav a[aria-current]{box-shadow:none;background:var(--surface)}
    .toolbar .action{margin-left:0}
    .cal{display:block;border:0;background:none;box-shadow:none;border-radius:0}.cal .dow,.cal .cell.empty,.cal .cell.out{display:none}
    .cal .cell{min-height:0;padding:12px 0;background:none;border-bottom:1px solid var(--line)}.cal .today .date{background:none;color:var(--accent)}
    .cal .n{display:none}.cal .w{display:block;font-weight:600;margin-bottom:4px}.cal .date{text-align:left;padding:0}.chip{padding:7px 10px;font-size:14px}
    table:has(>thead) thead{display:none}
    table:has(>thead),table:has(>thead) tbody,table:has(>thead) tr,table:has(>thead) td{display:block;width:100%}
    table:has(>thead) tr{padding:10px 14px;border-bottom:1px solid var(--line)}table:has(>thead) tr:last-child{border-bottom:0}
    table:has(>thead) td{border:0;padding:2px 0}table:has(>thead) td:empty{display:none}
    table:has(>thead) td[data-label]:not(:first-child)::before{content:attr(data-label) " · ";color:var(--faint);font-size:12px}
    table.people tr{display:block;padding:10px 0;border-bottom:1px solid var(--line)}table.people tr:last-child{border-bottom:0}
    table.people td{display:block;border:0;padding:3px 0}table.people td+td{padding-left:0}table.people td.act{text-align:left;width:auto;padding-top:6px}
  }
`;
// Icons: Iconsax, Linear set (MIT, iconsax-reactjs, as on the site), inlined.
// Only where they carry meaning: the menu, a payment state, a control, a kind
// of contact, where a code comes from. The keys name what they show.
const ICONS = {
  "check-circle": '<path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z"></path><path d="m7.75 12 2.83 2.83 5.67-5.66"></path>',
  "ticket": '<path d="M19.5 12.5A2.5 2.5 0 0 1 22 10V9c0-4-1-5-5-5H7C3 4 2 5 2 9v.5a2.5 2.5 0 0 1 0 5v.5c0 4 1 5 5 5h10c4 0 5-1 5-5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M10 4v16" stroke-dasharray="5 5"></path>',
  "exclamation-circle": '<path d="M12 7.75V13M21.08 8.58v6.84c0 1.12-.6 2.16-1.57 2.73l-5.94 3.43c-.97.56-2.17.56-3.15 0l-5.94-3.43a3.15 3.15 0 0 1-1.57-2.73V8.58c0-1.12.6-2.16 1.57-2.73l5.94-3.43c.97-.56 2.17-.56 3.15 0l5.94 3.43c.97.57 1.57 1.6 1.57 2.73Z"></path><path d="M12 16.2v.1" stroke-width="2"></path>',
  "exclamation-triangle": '<path d="M12 9v5M12 21.41H5.94c-3.47 0-4.92-2.48-3.24-5.51l3.12-5.62L8.76 5c1.78-3.21 4.7-3.21 6.48 0l2.94 5.29 3.12 5.62c1.68 3.03.22 5.51-3.24 5.51H12v-.01Z"></path><path d="M11.995 17h.009" stroke-width="2"></path>',
  "question-mark-circle": '<path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10ZM12 8v5"></path><path d="M11.995 16h.009" stroke-width="2"></path>',
  "info": '<path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10ZM12 8v5"></path><path d="M11.995 16h.009" stroke-width="2"></path>',
  "clock": '<path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z"></path><path d="m15.71 15.18-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1"></path>',
  "envelope": '<path d="M17 20.5H7c-3 0-5-1.5-5-5v-7c0-3.5 2-5 5-5h10c3 0 5 1.5 5 5v7c0 3.5-2 5-5 5Z"></path><path d="m17 9-3.13 2.5c-1.03.82-2.72.82-3.75 0L7 9"></path>',
  "phone": '<path d="M21.97 18.33c0 .36-.08.73-.25 1.09-.17.36-.39.7-.68 1.02-.49.54-1.03.93-1.64 1.18-.6.25-1.25.38-1.95.38-1.02 0-2.11-.24-3.26-.73s-2.3-1.15-3.44-1.98a28.75 28.75 0 0 1-3.28-2.8 28.414 28.414 0 0 1-2.79-3.27c-.82-1.14-1.48-2.28-1.96-3.41C2.24 8.67 2 7.58 2 6.54c0-.68.12-1.33.36-1.93.24-.61.62-1.17 1.15-1.67C4.15 2.31 4.85 2 5.59 2c.28 0 .56.06.81.18.26.12.49.3.67.56l2.32 3.27c.18.25.31.48.4.7.09.21.14.42.14.61 0 .24-.07.48-.21.71-.13.23-.32.47-.56.71l-.76.79c-.11.11-.16.24-.16.4 0 .08.01.15.03.23.03.08.06.14.08.2.18.33.49.76.93 1.28.45.52.93 1.05 1.45 1.58.54.53 1.06 1.02 1.59 1.47.52.44.95.74 1.29.92.05.02.11.05.18.08.08.03.16.04.25.04.17 0 .3-.06.41-.17l.76-.75c.25-.25.49-.44.72-.56.23-.14.46-.21.71-.21.19 0 .39.04.61.13.22.09.45.22.7.39l3.31 2.35c.26.18.44.39.55.64.1.25.16.5.16.78Z"></path>',
  "magnifying-glass": '<path d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2"></path>',
  "building-storefront": '<path d="M3.01 11.22v4.49C3.01 20.2 4.81 22 9.3 22h5.39c4.49 0 6.29-1.8 6.29-6.29v-4.49"></path><path d="M12 12c1.83 0 3.18-1.49 3-3.32L14.34 2H9.67L9 8.68C8.82 10.51 10.17 12 12 12Z"></path><path d="M18.31 12c2.02 0 3.5-1.64 3.3-3.65l-.28-2.75C20.97 3 19.97 2 17.35 2H14.3l.7 7.01c.17 1.65 1.66 2.99 3.31 2.99ZM5.64 12c1.65 0 3.14-1.34 3.3-2.99l.22-2.21.48-4.8H6.59C3.97 2 2.97 3 2.61 5.6l-.27 2.75C2.14 10.36 3.62 12 5.64 12ZM12 17c-1.67 0-2.5.83-2.5 2.5V22h5v-2.5c0-1.67-.83-2.5-2.5-2.5Z"></path>',
  "globe-alt": '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"></path><path d="M8 3h1a28.424 28.424 0 0 0 0 18H8M15 3a28.424 28.424 0 0 1 0 18"></path><path d="M3 16v-1a28.424 28.424 0 0 0 18 0v1M3 9a28.424 28.424 0 0 1 18 0"></path>',
  "arrow-down-tray": '<path d="M9.32 11.68l2.56 2.56 2.56-2.56M11.88 4v10.17"></path><path d="M20 12.18c0 4.42-3 8-8 8s-8-3.58-8-8"></path>',
  "list-bullet": '<path d="M19.9 13.5H4.1c-1.5 0-2.1.64-2.1 2.23v4.04C2 21.36 2.6 22 4.1 22h15.8c1.5 0 2.1-.64 2.1-2.23v-4.04c0-1.59-.6-2.23-2.1-2.23ZM19.9 2H4.1C2.6 2 2 2.64 2 4.23v4.04c0 1.59.6 2.23 2.1 2.23h15.8c1.5 0 2.1-.64 2.1-2.23V4.23C22 2.64 21.4 2 19.9 2Z"></path>',
  "calendar-days": '<path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z"></path><path d="M15.695 13.7h.009M15.695 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.294 13.7h.01M8.294 16.7h.01" stroke-width="2"></path>',
  "chevron-left": '<path d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08"></path>',
  "chevron-right": '<path d="M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08"></path>',
  "clipboard-document": '<path d="M16 12.9v4.2c0 3.5-1.4 4.9-4.9 4.9H6.9C3.4 22 2 20.6 2 17.1v-4.2C2 9.4 3.4 8 6.9 8h4.2c3.5 0 4.9 1.4 4.9 4.9z"></path><path d="M22 6.9v4.2c0 3.5-1.4 4.9-4.9 4.9H16v-3.1C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2h4.2C20.6 2 22 3.4 22 6.9z"></path>',
  "check": '<path d="M9 22h6c5 0 7-2 7-7V9c0-5-2-7-7-7H9C4 2 2 4 2 9v6c0 5 2 7 7 7Z"></path><path d="m7.75 12 2.83 2.83 5.67-5.66"></path>',
  "people": '<path d="M18 7.16a.605.605 0 0 0-.19 0 2.573 2.573 0 0 1-2.48-2.58c0-1.43 1.15-2.58 2.58-2.58a2.58 2.58 0 0 1 2.58 2.58A2.589 2.589 0 0 1 18 7.16ZM16.97 14.44c1.37.23 2.88-.01 3.94-.72 1.41-.94 1.41-2.48 0-3.42-1.07-.71-2.6-.95-3.97-.71M5.97 7.16c.06-.01.13-.01.19 0a2.573 2.573 0 0 0 2.48-2.58C8.64 3.15 7.49 2 6.06 2a2.58 2.58 0 0 0-2.58 2.58c.01 1.4 1.11 2.53 2.49 2.58ZM7 14.44c-1.37.23-2.88-.01-3.94-.72-1.41-.94-1.41-2.48 0-3.42 1.07-.71 2.6-.95 3.97-.71M12 14.63a.605.605 0 0 0-.19 0 2.573 2.573 0 0 1-2.48-2.58c0-1.43 1.15-2.58 2.58-2.58a2.58 2.58 0 0 1 2.58 2.58c-.01 1.4-1.11 2.54-2.49 2.58ZM9.09 17.78c-1.41.94-1.41 2.48 0 3.42 1.6 1.07 4.22 1.07 5.82 0 1.41-.94 1.41-2.48 0-3.42-1.59-1.06-4.22-1.06-5.82 0Z"></path>',
  "bag": '<path d="M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67a4.5 4.5 0 0 1 4.94 4.48v1.38M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22Z"></path><path d="M15.495 12h.01M8.495 12h.008" stroke-width="2"></path>',
  "add": '<path d="M6 12h12M12 18V6"></path>',
  "edit": '<path d="m13.26 3.6-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z"></path><path d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15M3 22h18"></path>',
  "trash": '<path d="M21 5.98c-3.33-.33-6.68-.5-10.02-.5-1.98 0-3.96.1-5.94.3L3 5.98M8.5 4.97l.22-1.31C8.88 2.71 9 2 10.69 2h2.62c1.69 0 1.82.75 1.97 1.67l.22 1.3M18.85 9.14l-.65 10.07C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14M10.33 16.5h3.33M9.5 12.5h5"></path>',
  "logout": '<path d="M8.9 7.56c.31-3.6 2.16-5.07 6.21-5.07h.13c4.47 0 6.26 1.79 6.26 6.26v6.52c0 4.47-1.79 6.26-6.26 6.26h-.13c-4.02 0-5.87-1.45-6.2-4.99M15 12H3.62M5.85 8.65L2.5 12l3.35 3.35"></path>',
  "cash": '<path d="M19.3 7.92v5.15c0 3.08-1.76 4.4-4.4 4.4H6.11c-.45 0-.88-.04-1.28-.13-.25-.04-.49-.11-.71-.19-1.5-.56-2.41-1.86-2.41-4.08V7.92c0-3.08 1.76-4.4 4.4-4.4h8.79c2.24 0 3.85.95 4.28 3.12.07.4.12.81.12 1.28Z"></path><path d="M22.301 10.92v5.15c0 3.08-1.76 4.4-4.4 4.4h-8.79c-.74 0-1.41-.1-1.99-.32-1.19-.44-2-1.35-2.29-2.81.4.09.83.13 1.28.13h8.79c2.64 0 4.4-1.32 4.4-4.4V7.92c0-.47-.04-.89-.12-1.28 1.9.4 3.12 1.74 3.12 4.28Z"></path><path d="M10.498 13.14a2.64 2.64 0 1 0 0-5.28 2.64 2.64 0 0 0 0 5.28ZM4.78 8.3v4.4M16.222 8.3v4.4"></path>',
  "card": '<path d="M2 8.505h20M6 16.505h2M10.5 16.505h4"></path><path d="M6.44 3.505h11.11c3.56 0 4.45.88 4.45 4.39v8.21c0 3.51-.89 4.39-4.44 4.39H6.44c-3.55.01-4.44-.87-4.44-4.38v-8.22c0-3.51.89-4.39 4.44-4.39Z"></path>',
  "gift": '<path d="M19.97 10h-16v8c0 3 1 4 4 4h8c3 0 4-1 4-4v-8ZM21.5 7v1c0 1.1-.53 2-2 2h-15c-1.53 0-2-.9-2-2V7c0-1.1.47-2 2-2h15c1.47 0 2 .9 2 2ZM11.64 5H6.12a.936.936 0 0 1 .03-1.3l1.42-1.42a.96.96 0 0 1 1.35 0L11.64 5ZM17.87 5h-5.52l2.72-2.72a.96.96 0 0 1 1.35 0l1.42 1.42c.36.36.37.93.03 1.3Z"></path><path d="M8.94 10v5.14c0 .8.88 1.27 1.55.84l.94-.62a1 1 0 0 1 1.1 0l.89.6a.997.997 0 0 0 1.55-.83V10H8.94Z"></path>',
  "user-add": '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3.41 22c0-3.87 3.85-7 8.59-7 .96 0 1.89.13 2.76.37"></path><path d="M22 18c0 .32-.04.63-.12.93-.09.4-.25.79-.46 1.13A3.97 3.97 0 0 1 18 22a3.92 3.92 0 0 1-2.66-1.03c-.3-.26-.56-.57-.76-.91A3.92 3.92 0 0 1 14 18a3.995 3.995 0 0 1 4-4c1.18 0 2.25.51 2.97 1.33.64.71 1.03 1.65 1.03 2.67ZM19.49 17.98h-2.98M18 16.52v2.99"></path>',
  "came": '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3.41 22c0-3.87 3.85-7 8.59-7 .96 0 1.89.13 2.76.37"></path><path d="M22 18c0 .75-.21 1.46-.58 2.06-.21.36-.48.68-.79.94-.7.63-1.62 1-2.63 1a3.97 3.97 0 0 1-3.42-1.94A3.92 3.92 0 0 1 14 18c0-1.26.58-2.39 1.5-3.12A3.999 3.999 0 0 1 22 18Z"></path><path d="m16.44 18 .99.99 2.13-1.97"></path>',
  "no-show": '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3.41 22c0-3.87 3.85-7 8.59-7 .96 0 1.89.13 2.76.37"></path><path d="M22 18c0 .32-.04.63-.12.93-.09.4-.25.79-.46 1.13A3.97 3.97 0 0 1 18 22a3.92 3.92 0 0 1-2.66-1.03c-.3-.26-.56-.57-.76-.91A3.92 3.92 0 0 1 14 18a3.995 3.995 0 0 1 4-4c1.18 0 2.25.51 2.97 1.33.64.71 1.03 1.65 1.03 2.67ZM19.03 16.94l-2.11 2.11M16.94 16.96l2.12 2.11"></path>',
  "undo": '<path d="M7.25 22h4.5C15.5 22 17 20.5 17 16.75v-4.5C17 8.5 15.5 7 11.75 7h-4.5C3.5 7 2 8.5 2 12.25v4.5C2 20.5 3.5 22 7.25 22ZM22 9c0-3.87-3.13-7-7-7l1.05 1.75"></path>',
  "pause": '<path d="M11.97 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10Z"></path><path d="M10.72 14.53V9.47c0-.48-.2-.67-.71-.67h-1.3c-.51 0-.71.19-.71.67v5.06c0 .48.2.67.71.67H10c.52 0 .72-.19.72-.67ZM16 14.53V9.47c0-.48-.2-.67-.71-.67H14c-.51 0-.71.19-.71.67v5.06c0 .48.2.67.71.67h1.29c.51 0 .71-.19.71-.67Z"></path>',
  "play": '<path d="M11.97 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10Z"></path><path d="M8.74 12.23v-1.67c0-2.08 1.47-2.93 3.27-1.89l1.45.84 1.45.84c1.8 1.04 1.8 2.74 0 3.78l-1.45.84-1.45.84c-1.8 1.04-3.27.19-3.27-1.89v-1.69Z"></path>',
  "link": '<path d="M13.5 12c0 3.18-2.57 5.75-5.75 5.75S2 15.18 2 12s2.57-5.75 5.75-5.75"></path><path d="M10 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6"></path>',
  "eye": '<path d="M15.58 12c0 1.98-1.6 3.58-3.58 3.58S8.42 13.98 8.42 12s1.6-3.58 3.58-3.58 3.58 1.6 3.58 3.58Z"></path><path d="M12 20.27c3.53 0 6.82-2.08 9.11-5.68.9-1.41.9-3.78 0-5.19-2.29-3.6-5.58-5.68-9.11-5.68-3.53 0-6.82 2.08-9.11 5.68-.9 1.41-.9 3.78 0 5.19 2.29 3.6 5.58 5.68 9.11 5.68Z"></path>',
  "eye-slash": '<path d="m14.53 9.47-5.06 5.06a3.576 3.576 0 1 1 5.06-5.06Z"></path><path d="M17.82 5.77C16.07 4.45 14.07 3.73 12 3.73c-3.53 0-6.82 2.08-9.11 5.68-.9 1.41-.9 3.78 0 5.19.79 1.24 1.71 2.31 2.71 3.17M8.42 19.53c1.14.48 2.35.74 3.58.74 3.53 0 6.82-2.08 9.11-5.68.9-1.41.9-3.78 0-5.19-.33-.52-.69-1.01-1.06-1.47"></path><path d="M15.51 12.7a3.565 3.565 0 0 1-2.82 2.82M9.47 14.53 2 22M22 2l-7.47 7.47"></path>',
  "close": '<path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10ZM9.17 14.83l5.66-5.66M14.83 14.83 9.17 9.17"></path>',
  "crown": '<path d="M16.7 18.98H7.3c-.42 0-.89-.33-1.03-.73L2.13 6.67c-.59-1.66.1-2.17 1.52-1.15l3.9 2.79c.65.45 1.39.22 1.67-.51l1.76-4.69c.56-1.5 1.49-1.5 2.05 0l1.76 4.69c.28.73 1.02.96 1.66.51l3.66-2.61c1.56-1.12 2.31-.55 1.67 1.26l-4.04 11.31c-.15.38-.62.71-1.04.71ZM6.5 22h11M9.5 14h5"></path>',
  "export": '<path d="M16.44 8.9c3.6.31 5.07 2.16 5.07 6.21v.13c0 4.47-1.79 6.26-6.26 6.26H8.74c-4.47 0-6.26-1.79-6.26-6.26v-.13c0-4.02 1.45-5.87 4.99-6.2M12 15V3.62M15.35 5.85L12 2.5 8.65 5.85"></path>',
};
const icon = (name, label, size = 16) => {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : `aria-hidden="true"`;
  return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${ICONS[name]}</svg>`;
};

// The studio's logo (the site's assets/logo-rusc-trim.webp, 719 × 118), in
// place of the word rūsc on the sign-in page and in the header.
const LOGO = readFileSync(new URL("./logo.webp", import.meta.url));
const brand = (height) =>
  `<img class="logo" src="/logo.webp" alt="rūsc" width="${Math.round((height * 719) / 118)}" height="${height}"><span>admin</span>`;

// Each table cell gets its column's header as data-label, for the phone
// layout (STYLE, max-width 700px).
const LABEL_CELLS = `document.querySelectorAll("table").forEach(function(t){var h=[].map.call(t.querySelectorAll("thead th"),function(th){return th.textContent.trim()});if(!h.length)return;t.querySelectorAll("tbody tr").forEach(function(tr){[].forEach.call(tr.children,function(td,i){if(h[i])td.setAttribute("data-label",h[i])})})})`;

// Geist and Geist Mono (OFL), from Google Fonts; the system font until they load.
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap">`;
const page = (title, body, top = "") =>
  `<!doctype html><html lang="${lang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#f6f5f1"><title>${esc(title)} · rūsc admin</title>${FONTS}<style>${STYLE}</style></head><body>${top}<main>${body}</main><script>${LABEL_CELLS}</script></body></html>`;

// FR · EN links: the page's own address comes back after the switch.
function langSwitch() {
  const back = encodeURIComponent(request.getStore()?.path ?? "/admin/cours");
  return ["fr", "en"]
    .map((l) => (l === lang() ? `<b>${l.toUpperCase()}</b>` : `<a href="/lang?to=${l}&back=${back}" hreflang="${l}">${l.toUpperCase()}</a>`))
    .join("");
}

// Every studio page: the same header and menu. SOON items are next.
const MENU = [["cours", "calendar-days", "Cours", "Classes"], ["clients", "people", "Clients", "Clients"], ["codes", "ticket", "Codes", "Codes"], ["commandes", "bag", "Commandes", "Orders"], ["horaires", "clock", "Horaires", "Timetable"]];
const SOON = new Set(); // menu items not ready yet: shown greyed out
function shell(active, title, body) {
  const menu = MENU.map(([key, name, fr, en]) =>
    SOON.has(key)
      ? `<span class="soon" title="${tr("Bientôt", "Soon")}">${icon(name)}${tr(fr, en)}</span>`
      : `<a href="/admin/${key}"${key === active ? ' aria-current="page"' : ""}>${icon(name)}${tr(fr, en)}</a>`,
  ).join("");
  const out = tr("Déconnexion", "Sign out");
  return page(
    title,
    body,
    `<header class="top"><div class="bar"><a class="brand" href="/admin/cours">${brand(18)}</a><nav aria-label="Menu">${menu}</nav><div class="right"><span class="lang">${langSwitch()}</span><a class="ibtn" href="/logout" title="${out}">${icon("logout", out)}</a></div></div></header>`,
  );
}

const loginPage = (error, next) =>
  page(
    tr("Connexion", "Sign in"),
    `<div class="login"><div class="top"><h1 class="brand">${brand(26)}</h1><span class="lang">${langSwitch()}</span></div>
     <form class="box" method="post" action="/login"><input type="hidden" name="next" value="${esc(next)}">
       <div><p style="margin:0;font-weight:600;font-size:17px;letter-spacing:-.01em">${tr("Connexion", "Sign in")}</p>
         <p class="muted small" style="margin:2px 0 0">${tr("L’espace de l’atelier : cours, codes, commandes.", "The studio’s back office: classes, codes, orders.")}</p></div>
       ${error ? `<p class="st off" style="margin:0">${icon("exclamation-triangle")}<span>${esc(error)}</span></p>` : ""}
       <label>${tr("Mot de passe", "Password")}<input type="password" name="password" required autofocus autocomplete="current-password"></label>
       <div><button type="submit">${tr("Entrer", "Sign in")}</button></div></form></div>`,
  );

// ---------------------------------------------------------------- Cours

const weekday = (date) => new Intl.DateTimeFormat(LOCALE(), { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(date);
const parisParts = (date) => {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const [day, time] = f.format(date).split(" ");
  return { day, time: time.slice(0, 5) };
};
// Days as "YYYY-MM-DD" (Paris), moved by whole days; noon UTC keeps clear of DST.
const noon = (day) => new Date(`${day}T12:00:00Z`);
const addDays = (day, n) => {
  const date = noon(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};
const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(noon(value).getTime()) && noon(value).toISOString().startsWith(value);

// The classes from one day (included) to another (excluded): each one that
// takes place (from its Cal timetable, or from its bookings), who's coming,
// and how each person paid. A past class only shows if someone was booked.
// Returns a Map "YYYY-MM-DD" → that day's classes, in order.
async function loadSessions(from, to) {
  await releaseExpired().catch((e) => console.error("release", e.message));
  const bookings = await db.query(
    `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, e.slug, e.title, e."seatsPerTimeSlot" AS seats,
            a.name, a.email, a."phoneNumber" AS phone, s."referenceUid" AS seat_uid,
            c.display AS code, u.amount AS code_amount, c.unit AS code_unit, c.initial AS code_initial, ps.order_id AS paid_order, x.pay AS acuity_pay,
            h.expires_at AS held_until, dp.method AS desk_method, dp.amount_cents AS desk_cents, att.came, s.data->>'rusc_added' AS added
       FROM public."Booking" b
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       JOIN public."Attendee" a ON a."bookingId" = b.id
       LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
       LEFT JOIN rusc.uses u ON u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL
       LEFT JOIN rusc.codes c ON c.key = u.key
       LEFT JOIN rusc.paid_seats ps ON ps.seat_uid = s."referenceUid"
       LEFT JOIN rusc.acuity_seats x ON x.seat_uid = s."referenceUid"
       LEFT JOIN rusc.holds h ON h.seat_uid = coalesce(s.data->>'rusc_holder', s."referenceUid") AND h.released_at IS NULL
       LEFT JOIN rusc.desk_payments dp ON dp.seat_uid = s."referenceUid"
       LEFT JOIN rusc.attendance att ON att.seat_uid = s."referenceUid"
      WHERE b.status IN ('accepted', 'pending')
        AND b."startTime" AT TIME ZONE 'UTC' >= $1::date::timestamp AT TIME ZONE 'Europe/Paris'
        AND b."startTime" AT TIME ZONE 'UTC' < $2::date::timestamp AT TIME ZONE 'Europe/Paris'
      ORDER BY 1, e.slug, a.name`,
    [from, to],
  );
  // The timetable, so classes nobody has booked yet show too (not open-studio
  // hours). As in Cal, a date override replaces the weekly hours that day, and
  // one from 00:00 to 00:00 means closed.
  const schedule = await db.query(
    `SELECT e.slug, e.title, e."seatsPerTimeSlot" AS seats, v.days, v.date::text AS date,
            v."startTime"::text AS start, v."endTime"::text AS "end"
       FROM public."EventType" e JOIN public."Availability" v ON v."scheduleId" = e."scheduleId"
      WHERE e."seatsPerTimeSlot" IS NOT NULL AND e.slug <> 'atelier-libre-1h'`,
  );
  const timetable = new Map(); // slug → its timetable rows
  for (const row of schedule.rows) timetable.set(row.slug, [...(timetable.get(row.slug) ?? []), row]);

  const sessions = new Map(); // "YYYY-MM-DD HH:MM|slug" → class
  const at = (day, time, slug, title, seats) => {
    const key = `${day} ${time}|${slug}`;
    if (!sessions.has(key)) sessions.set(key, { day, time, slug, title, seats, people: [] });
    return sessions.get(key);
  };
  for (let day = from; day < to; day = addDays(day, 1)) {
    const dow = noon(day).getUTCDay();
    for (const rows of timetable.values()) {
      const overrides = rows.filter((row) => row.date === day);
      for (const row of overrides.length ? overrides : rows.filter((r) => !r.date && r.days.includes(dow))) {
        if (row.start !== row.end) at(day, row.start.slice(0, 5), row.slug, row.title, row.seats);
      }
    }
  }
  for (const row of bookings.rows) {
    const { day, time } = parisParts(new Date(row.starts));
    at(day, time, row.slug, row.title, row.seats).people.push(row);
  }

  // Before the switch: Acuity's appointments (rusc.history), for times already
  // past, except those copied into Cal (rusc.acuity_seats). Types we don't run
  // any more keep their Acuity name.
  const now = parisParts(new Date());
  if (from <= now.day) {
    const history = await db.query(
      `SELECT h.acuity_id, h.starts_at, h.offer, h.type, trim(concat_ws(' ', h.first_name, h.last_name)) AS name,
              h.email, h.phone, h.paid, h.amount_paid, h.certificate
         FROM rusc.history h
        WHERE NOT h.canceled AND h.starts_at < now()
          AND h.starts_at >= $1::date::timestamp AT TIME ZONE 'Europe/Paris'
          AND h.starts_at < $2::date::timestamp AT TIME ZONE 'Europe/Paris'
          AND NOT EXISTS (SELECT 1 FROM rusc.acuity_seats x WHERE x.acuity_id = h.acuity_id)
        ORDER BY h.starts_at, 5`,
      [from, to],
    );
    for (const row of history.rows) {
      const { day, time } = parisParts(new Date(row.starts_at));
      const seats = row.offer ? (timetable.get(row.offer)?.[0]?.seats ?? null) : null;
      at(day, time, row.offer ?? `acuity:${row.type}`, row.type, seats).people.push({ ...row, history: true });
    }
  }

  const byDay = new Map();
  for (const session of [...sessions.values()].sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`) || a.title.localeCompare(b.title))) {
    if (!session.people.length && (session.day < now.day || (session.day === now.day && session.time < now.time))) continue;
    if (!byDay.has(session.day)) byDay.set(session.day, []);
    byDay.get(session.day).push(session);
  }
  return byDay;
}

// The per-session money value of a place paid by a code/carnet, so the studio
// sees at a glance whether it's a drop-in (full price) or a card (reduced),
// before the 50/50 split with the teacher. Returns null when unknown.
function perSessionValue(p) {
  // Payé à la séance (card online, or Acuity "payé 50"): the offer's own price.
  if (p.paid_order || (p.acuity_pay && p.acuity_pay.startsWith("payé"))) {
    return null; // already shown as amount elsewhere
  }
  if (!p.code) return null;
  // A carnet (sessions): initial courses bought, price known per card size.
  if (p.code_unit === "sessions" && p.code_initial != null) {
    const n = num(p.code_initial);
    // Carnet 10 = 350 € (35 €/séance) ; carnet 5 = 210 € (42 €/séance).
    if (n >= 10) return tr("abonnement · 35 € la séance", "card · €35 per class");
    if (n >= 5) return tr("abonnement · 42 € la séance", "card · €42 per class");
    return tr("bon cadeau · 1 séance", "gift voucher · 1 class");
  }
  return null;
}

// How one person paid for their place.
function payment(p) {
  if (p.history) {
    // An appointment from Acuity's history: a code, paid online, or neither.
    if (p.certificate) return `<span class="st ok">${icon("ticket")}<span>Code ${esc(p.certificate)} · Acuity</span></span>`;
    if (p.paid) return `<span class="st ok">${icon("check-circle")}<span>${tr("Payé sur Acuity", "Paid on Acuity")}${num(p.amount_paid) > 0 ? ` (${esc(fmtAmount("euros", num(p.amount_paid)))})` : ""}</span></span>`;
    return `<span class="st muted">${tr("Acuity · réglé à l’atelier ou non renseigné", "Acuity · paid at the studio or not recorded")}</span>`;
  }
  if (p.code) {
    // A code/carnet pays for the place: show which, and the per-session value
    // (what the studio actually earns before the 50/50 split with the teacher).
    const part = `<span>Code ${esc(p.code)}</span>`;
    const per = perSessionValue(p);
    return `<span class="st ok">${icon("ticket")}${part}${per ? ` · <span class="muted">${esc(per)}</span>` : ""}</span>`;
  }
  if (p.paid_order) return `<a class="st ok" href="/admin/commandes#${esc(p.paid_order)}">${icon("check-circle")}${tr("Payé en ligne", "Paid online")}</a>`;
  if (p.desk_method) return deskPaid(p);
  if (p.acuity_pay) {
    // Booked on Acuity before the switch: "code XXXX", "payé 50.00" or "à régler".
    const code = p.acuity_pay.match(/^code (.+)$/)?.[1];
    if (code) return `<span class="st ok">${icon("ticket")}<span>Code ${esc(code)} · ${tr("réservé sur Acuity", "booked on Acuity")}</span></span>`;
    if (p.acuity_pay.startsWith("payé")) {
      const amount = Number(p.acuity_pay.replace(/[^0-9.,]/g, "").replace(",", "."));
      return `<span class="st ok">${icon("check-circle")}<span>${tr("Payé sur Acuity", "Paid on Acuity")}${amount > 0 ? ` (${esc(fmtAmount("euros", amount))})` : ""}</span></span>`;
    }
    return `<span class="st off">${icon("exclamation-circle")}<span>${tr("à régler (réservé sur Acuity)", "to pay (booked on Acuity)")}</span></span>`;
  }
  // In someone's cart on the site, not paid yet: freed at that time unless paid.
  if (p.held_until) {
    const at = new Date(p.held_until).toLocaleTimeString(LOCALE(), { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    return `<span class="st muted">${icon("clock")}<span>${tr(`dans un panier, pas encore payé · libéré à ${at} sinon`, `in a cart, not paid yet · freed at ${at} otherwise`)}</span></span>`;
  }
  // Added by the studio (Cours → Ajouter): paid at the desk later.
  if (p.added === "admin") return `<span class="st off">${icon("exclamation-circle")}<span>${tr("à régler à l’atelier", "to pay at the studio")}</span></span>`;
  return WEBHOOK_SECRET
    ? `<span class="st off">${icon("exclamation-circle")}<span>${tr("à régler (panier non payé, ou sur place)", "to pay (cart not paid, or at the studio)")}</span></span>`
    : `<span class="st muted">${icon("question-mark-circle")}<span>${tr("à vérifier (paiement en ligne pas encore relié)", "to check (online payment not linked yet)")}</span></span>`;
}

const people = (list, s) =>
  list.length
    ? `<table class="people"><tbody>${list
        .map((p) => {
          // An extra place booked for a friend has no contact of its own.
          const reachable = p.email && !String(p.email).endsWith(ANONYMOUS);
          const contact = [
            reachable ? `<a href="mailto:${esc(p.email)}">${icon("envelope")}${esc(p.email)}</a>` : "",
            p.phone ? `<a href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ""))}">${icon("phone")}${esc(p.phone)}</a>` : "",
          ].join("");
          const presence = s ? attendanceSwitch(p, s) : "";
          return `<tr><td><b>${esc(p.name)}</b>${contact ? `<span class="contact">${contact}</span>` : ""}</td><td><div class="paycell">${payment(p)}${s ? payActions(p, s) : ""}</div></td>${presence ? `<td class="act">${presence}</td>` : ""}</tr>`;
        })
        .join("")}</tbody></table>`
    : `<p class="muted" style="margin:0">${tr("Personne pour l’instant.", "Nobody yet.")}</p>`;

// A class's name: ours, or Acuity's for a type we don't run any more.
const sessionLabel = (s) => (OFFERS[s.slug] ? offerLabel(s.slug) : s.title);
const placesTaken = (s) => (s.seats ? `${s.people.length}/${s.seats}` : `${s.people.length}`);

// One class, with its people; the calendar links to it by its id.
// The day is part of it: the list shows the same class on several days.
const sessionId = (s) => `c${s.day.replaceAll("-", "")}-${s.time.replace(":", "")}-${s.slug.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;
// A class nobody has booked yet is one quiet line; a full one says so.
const sessionBox = (s) => {
  const taken = s.people.length;
  const full = s.seats && taken >= s.seats;
  const count = s.seats ? `${taken} / ${s.seats} ${tr("places", "places")}` : `${taken} ${tr("inscrits", "booked")}`;
  const came = s.people.filter((p) => p.came === true).length;
  const gone = s.people.filter((p) => p.came === false).length;
  const presence = came || gone
    ? `<span class="pill${gone ? " full" : " some"}">${[
        came ? `${came} ${tr(came > 1 ? "venu·es" : "venu·e", "came")}` : "",
        gone ? `${gone} ${tr(gone > 1 ? "absent·es" : "absent·e", gone > 1 ? "no-shows" : "no-show")}` : "",
      ].filter(Boolean).join(" · ")}</span>`
    : "";
  return `<div class="session${taken ? "" : " empty"}" id="${esc(sessionId(s))}"><div class="head"><b><span class="t">${esc(s.time)}</span> · ${esc(sessionLabel(s))}</b>
     <span class="pill${full ? " full" : ""}">${full ? `${tr("complet", "full")} · ` : ""}${count}</span>${presence}${taken ? "" : `<span class="muted small">${tr("personne pour l’instant", "nobody yet")}</span>`}</div>${taken ? people(s.people, s) : ""}${addPersonForm(s)}</div>`;
};

// ---------------------------------------------------------------- at the desk
// What the studio does with a place, from Cours: takes payment at the desk
// (cash, card, or offered), ticks who came, and adds someone to a class (a
// phone or walk-in booking) without going through Cal's booker. Each place is
// a Cal seat (its reference); rusc.desk_payments and rusc.attendance hold one
// row per seat.
const DESK = { cash: ["cash", "espèces", "cash"], card: ["card", "carte", "card"], free: ["gift", "offert", "offered"] };
const deskPaid = (p) => {
  const [name, fr, en] = DESK[p.desk_method];
  const amount = p.desk_method !== "free" && p.desk_cents != null ? ` · ${esc(fmtAmount("euros", num(p.desk_cents) / 100))}` : "";
  return `<span class="st ok">${icon(name)}<span>${p.desk_method === "free" ? tr("Offert à l’atelier", "Offered at the studio") : `${tr("Payé à l’atelier", "Paid at the studio")} · ${tr(fr, en)}`}${amount}</span></span>`;
};
// Still to pay: not online, no code, not at the desk, not on Acuity.
const toPay = (p) => !p.history && p.seat_uid && !p.code && !p.paid_order && !p.desk_method && !/^(code |payé)/.test(p.acuity_pay ?? "");
// Every Cours form returns to the page it was sent from, on its class.
const returnFields = (s) =>
  `<input type="hidden" name="back" value="${esc(request.getStore()?.path ?? "/admin/cours")}"><input type="hidden" name="at" value="${esc(sessionId(s))}">`;

// "Encaisser" on a place still to pay; "Annuler" on one paid at the desk.
function payActions(p, s) {
  const seat = `<input type="hidden" name="seat" value="${esc(p.seat_uid ?? "")}">${returnFields(s)}`;
  if (p.desk_method) {
    const ask = tr("Annuler ce paiement à l’atelier ? La place redevient à régler.", "Undo this payment at the studio? The place goes back to unpaid.");
    return `<form class="inline-form" method="post" action="/admin/places/unpaid" onsubmit="return confirm(${esc(JSON.stringify(ask))})">${seat}<button class="ghost small" type="submit" title="${tr("Annuler ce paiement", "Undo this payment")}">${icon("undo")}${tr("Annuler", "Undo")}</button></form>`;
  }
  if (!toPay(p)) return "";
  const price = OFFERS[s.slug]?.price;
  const methods = Object.entries(DESK).map(([key, [, fr, en]]) => `<option value="${key}">${esc(tr(fr, en)).replace(/^./, (c) => c.toUpperCase())}</option>`).join("");
  return `<details class="inline"><summary>${icon("cash")}${tr("Encaisser", "Take payment")}</summary>
    <form method="post" action="/admin/places/paid">${seat}
      <label>${tr("Moyen", "Method")}<select name="method">${methods}</select></label>
      <label>${tr("Montant (€)", "Amount (€)")}<input name="amount" inputmode="decimal" size="7" value="${price != null ? esc(String(price).replace(".", tr(",", "."))) : ""}"></label>
      <button class="small" type="submit">${tr("Enregistrer", "Save")}</button></form></details>`;
}

// Came / no-show, from the day of the class on. Pressing the lit one clears it.
function attendanceSwitch(p, s) {
  if (p.history || !p.seat_uid || s.day > parisToday()) return "";
  const button = (came, cls, name, label) =>
    `<button type="submit" name="came" value="${p.came === came ? "clear" : came ? "1" : "0"}" class="${cls}" aria-pressed="${p.came === came}" title="${label}">${icon(name)}${label}</button>`;
  return `<form class="inline-form" method="post" action="/admin/places/presence"><input type="hidden" name="seat" value="${esc(p.seat_uid)}">${returnFields(s)}
    <span class="att" role="group" aria-label="${tr("Présence", "Attendance")}">${button(true, "came", "came", tr("Venu·e", "Came"))}${button(false, "gone", "no-show", tr("Absent·e", "No-show"))}</span></form>`;
}

// "Ajouter quelqu’un": a class of ours (a Cal event type), today or later,
// with places left.
function addPersonForm(s) {
  const free = s.seats ? s.seats - s.people.length : 0;
  if (!OFFERS[s.slug] || s.day < parisToday() || free < 1) return "";
  const methods = Object.entries(DESK).map(([key, [, fr, en]]) => `<option value="${key}">${tr("Payé", "Paid")} · ${esc(tr(fr, en))}</option>`).join("");
  return `<details class="add addp"><summary>${icon("user-add")}${tr("Ajouter", "Add")}</summary>
    <form class="box compact" method="post" action="/admin/cours/ajouter">${returnFields(s)}
      <input type="hidden" name="slug" value="${esc(s.slug)}"><input type="hidden" name="day" value="${esc(s.day)}"><input type="hidden" name="time" value="${esc(s.time)}">
      <label>${tr("Nom", "Name")}<input name="name" required maxlength="120" autocomplete="off"></label>
      <label>${tr("E-mail (facultatif)", "E-mail (optional)")}<input name="email" type="email" maxlength="200" autocomplete="off"></label>
      <label>${tr("Téléphone (facultatif)", "Phone (optional)")}<input name="phone" type="tel" maxlength="40" autocomplete="off"></label>
      <label>${tr("Places", "Places")}<input name="places" type="number" min="1" max="${free}" value="1" required></label>
      <label>${tr("Paiement", "Payment")}<select name="pay"><option value="">${tr("À régler plus tard", "To pay later")}</option>${methods}</select></label>
      <label>${tr("Ou un code (carnet, bon)", "Or a code (card, voucher)")}<input name="code" maxlength="40" autocomplete="off" spellcheck="false" style="font-family:var(--mono);text-transform:uppercase"></label>
      <div class="wide"><button type="submit">${icon("user-add")}${tr("Ajouter au cours", "Add to the class")}</button></div>
    </form></details>`;
}

// Where a Cours form goes back to: its page (list, calendar or day), with a
// note to show, on the class it was about.
function coursBack(form, note, why) {
  const back = String(form.get("back") ?? "");
  const target = new URL(back.startsWith("/admin/cours") ? back : "/admin/cours", "http://admin.invalid");
  target.searchParams.delete("note");
  target.searchParams.delete("why");
  if (note) target.searchParams.set("note", note);
  if (why) target.searchParams.set("why", why);
  const at = String(form.get("at") ?? "");
  return `${target.pathname}${target.search}${/^[a-z0-9-]+$/i.test(at) ? `#${at}` : ""}`;
}
const COURS_NOTES = {
  added: ["Ajouté·e au cours.", "Added to the class."],
  paid: ["Paiement enregistré.", "Payment recorded."],
  undone: ["Paiement à l’atelier annulé : la place est à régler.", "Studio payment undone: the place is unpaid."],
};
const CODE_REFUSALS = {
  unknown: ["code inconnu ou en pause", "unknown or paused code"],
  expired: ["code expiré", "expired code"],
  not_for_this_class: ["code pas valable pour ce cours", "code not valid for this class"],
  insufficient: ["pas assez sur le code", "not enough left on the code"],
  empty: ["code épuisé", "code used up"],
  already_used: ["place déjà payée par un code", "place already paid with a code"],
  past: ["cours terminé", "class over"],
};
function coursFlash(url) {
  const note = url.searchParams.get("note");
  if (note === "code") {
    const [fr, en] = CODE_REFUSALS[url.searchParams.get("why")] ?? CODE_REFUSALS.unknown;
    return `<p class="st off" style="margin:12px 0">${icon("exclamation-circle")}<span>${tr(`Ajouté·e au cours, mais pas payé : ${fr}. La place est à régler.`, `Added to the class, but not paid: ${en}. The place is unpaid.`)}</span></p>`;
  }
  return COURS_NOTES[note] ? `<p class="flash">${icon("check-circle")}${tr(...COURS_NOTES[note])}</p>` : "";
}

// The place behind a form: its Cal seat, booking and class (null if gone).
async function seatOf(q, seatUid) {
  const { rows } = await q.query(
    `SELECT s."referenceUid" AS seat_uid, b.id AS booking_id, b.uid AS booking_uid, b.status, e.slug
       FROM public."BookingSeat" s JOIN public."Booking" b ON b.id = s."bookingId" JOIN public."EventType" e ON e.id = b."eventTypeId"
      WHERE s."referenceUid" = $1 AND b.status IN ('accepted', 'pending')`,
    [String(seatUid ?? "").slice(0, 100)],
  );
  return rows[0] ?? null;
}
const deskAmount = (value) => {
  const euros = Number(String(value ?? "").trim().replace(/\s|€/g, "").replace(",", "."));
  if (!Number.isFinite(euros) || euros < 0 || euros > 10_000) throw refused("Montant invalide.", "Invalid amount.");
  return Math.round(euros * 100);
};
// Paid at the desk: recorded per place, and the class booking is confirmed, as
// a code or a card payment confirms it. Not for a place already paid.
async function deskPay(q, seat, method, cents) {
  await q.query(
    `INSERT INTO rusc.desk_payments (seat_uid, method, amount_cents, offer) VALUES ($1, $2, $3, $4)
     ON CONFLICT (seat_uid) DO NOTHING`,
    [seat.seat_uid, method, method === "free" ? 0 : cents, seat.slug],
  );
  if (seat.status === "pending") await q.query(`UPDATE public."Booking" SET status = 'accepted' WHERE id = $1 AND status = 'pending'`, [seat.booking_id]);
}
async function placePaid(form) {
  const method = String(form.get("method") ?? "");
  if (!DESK[method]) throw refused("Choisissez un moyen de paiement.", "Choose a payment method.");
  const cents = method === "free" ? 0 : deskAmount(form.get("amount"));
  await inTransaction(async (client) => {
    const seat = await seatOf(client, form.get("seat"));
    if (!seat) throw refused("Cette place n’existe plus.", "This place no longer exists.");
    // Paid already: online, with a code, at the desk (undo it first to
    // change how), or on Acuity (not one "à régler").
    const paid = await client.query(
      `SELECT EXISTS (SELECT 1 FROM rusc.paid_seats WHERE seat_uid = $1)
           OR EXISTS (SELECT 1 FROM rusc.uses WHERE seat_uid = $1 AND cancelled_at IS NULL)
           OR EXISTS (SELECT 1 FROM rusc.desk_payments WHERE seat_uid = $1)
           OR EXISTS (SELECT 1 FROM rusc.acuity_seats WHERE seat_uid = $1 AND pay <> 'à régler') AS paid`,
      [seat.seat_uid],
    );
    if (paid.rows[0]?.paid) throw refused("Cette place est déjà payée.", "This place is already paid.");
    await deskPay(client, seat, method, cents);
  });
}
async function placeUnpaid(form) {
  await db.query("DELETE FROM rusc.desk_payments WHERE seat_uid = $1", [String(form.get("seat") ?? "").slice(0, 100)]);
}
async function placePresence(form) {
  const seat = await seatOf(db, form.get("seat"));
  if (!seat) throw refused("Cette place n’existe plus.", "This place no longer exists.");
  const came = String(form.get("came") ?? "");
  if (came === "clear") await db.query("DELETE FROM rusc.attendance WHERE seat_uid = $1", [seat.seat_uid]);
  else await db.query(
    `INSERT INTO rusc.attendance (seat_uid, came) VALUES ($1, $2) ON CONFLICT (seat_uid) DO UPDATE SET came = EXCLUDED.came, marked_at = now()`,
    [seat.seat_uid, came === "1"],
  );
}

// "Ajouter quelqu’un": the person joins the class's Cal booking at that time
// (everyone in a class shares one, as when they book on the site), or a new
// one is made, accepted, as scripts/continuity/acuity-apply.sql does for
// Acuity's. Extra places are seats linked to theirs, as the cart's are. They
// pay later, at the desk now, or with a code (taken off as on the site).
async function addPerson(form) {
  const slug = String(form.get("slug") ?? "");
  const day = String(form.get("day") ?? "");
  const time = String(form.get("time") ?? "");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40) || null;
  const places = Math.min(Math.max(Math.floor(Number(form.get("places"))) || 1, 1), 20);
  const method = DESK[form.get("pay")] ? String(form.get("pay")) : null;
  const code = normalize(form.get("code") ?? "");
  if (!OFFERS[slug] || !isDay(day) || !/^\d{2}:\d{2}$/.test(time)) throw refused("Cours introuvable.", "Class not found.");
  if (!name) throw refused("Il faut un nom.", "A name is needed.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw refused("E-mail invalide.", "Invalid e-mail.");
  if (day < parisToday()) throw refused("Ce cours est passé.", "This class is over.");
  const cents = method && method !== "free" ? Math.round(OFFERS[slug].price * 100) : 0;
  // A code is checked first, for every place, so a typo books nobody.
  if (code) {
    const type = await db.query(`SELECT e.length FROM public."EventType" e JOIN public.users u ON u.id = e."userId" WHERE u.username = $1 AND e.slug = $2`, [HOST, slug]);
    const row = (await db.query("SELECT * FROM rusc.codes WHERE key = $1", [code])).rows[0];
    const why = refusal(row, slug, row ? needed(row.unit, slug, type.rows[0]?.length ?? 120) * places : 0);
    if (why) {
      const [fr, en] = CODE_REFUSALS[why] ?? CODE_REFUSALS.unknown;
      throw refused(`Code refusé : ${fr}. Personne n’a été ajouté.`, `Code refused: ${en}. Nobody was added.`);
    }
  }

  const seats = await inTransaction(async (client) => {
    const host = await hostId(client);
    const type = await client.query(`SELECT id, title, length, "seatsPerTimeSlot" AS capacity FROM public."EventType" WHERE "userId" = $1 AND slug = $2`, [host, slug]);
    const et = type.rows[0];
    if (!et) throw refused("Cours introuvable dans Cal.", "Class not found in Cal.");
    // Cal keeps times in UTC, without a zone.
    const start = `(($2::date + $3::time) AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC'`;
    const existing = await client.query(
      `SELECT id, uid, status FROM public."Booking" WHERE "eventTypeId" = $1 AND "startTime" = ${start} AND status IN ('accepted', 'pending')
        ORDER BY status = 'accepted' DESC, id LIMIT 1 FOR UPDATE`,
      [et.id, day, time],
    );
    let booking = existing.rows[0];
    if (booking) {
      const taken = await client.query(`SELECT count(*)::int AS n FROM public."BookingSeat" WHERE "bookingId" = $1`, [booking.id]);
      if (et.capacity && taken.rows[0].n + places > et.capacity) {
        throw refused(`Plus assez de places : il en reste ${Math.max(0, et.capacity - taken.rows[0].n)}.`, `Not enough places: ${Math.max(0, et.capacity - taken.rows[0].n)} left.`);
      }
      if (booking.status === "pending") await client.query(`UPDATE public."Booking" SET status = 'accepted' WHERE id = $1`, [booking.id]);
    } else {
      if (et.capacity && places > et.capacity) throw refused(`Le cours a ${et.capacity} places.`, `The class has ${et.capacity} places.`);
      const made = await client.query(
        `INSERT INTO public."Booking" (uid, title, "startTime", "endTime", "userId", "eventTypeId", status)
         VALUES ($4, $5, ${start}, ${start} + make_interval(mins => $6), $7, $1, 'accepted') RETURNING id, uid`,
        [et.id, day, time, randomUUID(), et.title, et.length, host],
      );
      booking = made.rows[0];
    }
    const uids = [];
    for (let i = 0; i < places; i++) {
      const uid = randomUUID();
      const extra = i > 0;
      // No e-mail: a placeholder that, like a friend's extra place, shows no
      // contact and doesn't join Clients.
      const attendeeEmail = extra ? `place-${uid}${ANONYMOUS}` : email || `sans-email-${uid}${ANONYMOUS}`;
      const attendee = await client.query(
        `INSERT INTO public."Attendee" (email, name, "timeZone", locale, "bookingId", "phoneNumber") VALUES ($1, $2, 'Europe/Paris', $3, $4, $5) RETURNING id`,
        [attendeeEmail, extra ? `${name} +${i}` : name, lang(), booking.id, extra ? null : phone],
      );
      const data = extra ? { rusc_holder: uids[0], rusc_added: "admin" } : { responses: { name, ...(email ? { email } : {}) }, rusc_added: "admin" };
      await client.query(`INSERT INTO public."BookingSeat" ("referenceUid", "bookingId", "attendeeId", data) VALUES ($1, $2, $3, $4)`, [uid, booking.id, attendee.rows[0].id, data]);
      uids.push(uid);
      if (method && !code) await deskPay(client, { seat_uid: uid, booking_id: booking.id, status: "accepted", slug }, method, cents);
    }
    return uids;
  });
  // A code pays for each place, as on the site; the first refusal stops.
  if (code) {
    for (const seatUid of seats) {
      const result = await apiRedeem({ code, seatUid });
      if (!result.ok) return { refused: result.reason };
    }
  }
  return { refused: null };
}

// List · Calendar, at the top of Cours.
function coursTabs(active) {
  const tabs = [["liste", "list-bullet", tr("Liste", "List"), "/admin/cours"], ["calendrier", "calendar-days", tr("Calendrier", "Calendar"), "/admin/cours?vue=calendrier"]];
  return `<div class="toolbar"><nav class="seg">${tabs.map(([key, name, label, href]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${icon(name)}${label}</a>`).join("")}</nav><a class="action" href="/admin/cours/nouveau">${icon("add")}${tr("Nouveau cours", "New class")}</a></div>`;
}

async function coursPage(url) {
  const day = url.searchParams.get("jour");
  if (isDay(day)) return coursDay(day, url);
  if (url.searchParams.get("vue") === "calendrier") return coursCalendar(url.searchParams.get("mois"));
  return coursList(url);
}

// "Aujourd’hui · mardi 6 octobre", "Demain · …", then the plain day.
const dayTitle = (day, today) => {
  const near = day === today ? tr("Aujourd’hui", "Today") : day === addDays(today, 1) ? tr("Demain", "Tomorrow") : "";
  return near ? `${near} · ${weekday(noon(day))}` : weekday(noon(day));
};

// The coming days, class by class.
async function coursList(url) {
  const days = Math.min(Math.max(Number(url.searchParams.get("jours")) || 14, 1), 60);
  const today = parisToday();
  const byDay = await loadSessions(today, addDays(today, days));
  const body = [...byDay.entries()]
    .map(([day, list]) => `<h2 class="day">${esc(dayTitle(day, today))}</h2>${list.map(sessionBox).join("")}`)
    .join("");
  return shell(
    "cours",
    tr("Cours", "Classes"),
    `<h1>${tr("Cours", "Classes")}</h1>${coursTabs("liste")}${coursFlash(url)}<p class="muted">${tr(`Les ${days} prochains jours, d’après les réservations et les horaires de Cal.`, `The next ${days} days, from Cal’s bookings and timetable.`)}
       ${days < 30 ? `<a href="?jours=30">${tr("Voir 30 jours", "Show 30 days")}</a>` : `<a href="?jours=14">${tr("Voir 14 jours", "Show 14 days")}</a>`}</p>
     ${body || `<p class="muted">${tr("Aucun cours sur cette période.", "No classes in this period.")}</p>`}`,
  );
}

// A month at a glance: every class and its places taken. A class, or a day,
// opens that day's lists.
async function coursCalendar(month) {
  const today = parisToday();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")) month = today.slice(0, 7);
  const [year, mm] = month.split("-").map(Number);
  const previous = new Date(Date.UTC(year, mm - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, mm, 1)).toISOString().slice(0, 7);
  // Whole weeks, Monday to Sunday.
  const monday = (day) => addDays(day, -((noon(day).getUTCDay() + 6) % 7));
  const from = monday(`${month}-01`);
  const to = addDays(monday(addDays(`${next}-01`, -1)), 7);
  const byDay = await loadSessions(from, to);

  const chip = (s) => {
    const taken = s.people.length;
    const state = s.seats && taken >= s.seats ? " full" : taken ? " some" : "";
    return `<a class="chip${state}" href="?jour=${s.day}#${esc(sessionId(s))}" title="${esc(`${s.time} · ${sessionLabel(s)} · ${placesTaken(s)}`)}"><span>${esc(s.time)}</span><span class="l">${esc(sessionLabel(s).replace(/ [12] ?h$/i, ""))}</span><b>${placesTaken(s)}</b></a>`;
  };
  const cells = [];
  for (let day = from; day < to; day = addDays(day, 1)) {
    const list = byDay.get(day) ?? [];
    const kind = [day.slice(0, 7) !== month && "out", day < today && "past", day === today && "today", !list.length && "empty"].filter(Boolean).join(" ");
    cells.push(`<div class="cell ${kind}"><a class="date" href="?jour=${day}"><span class="n">${noon(day).getUTCDate()}</span><span class="w cap">${esc(weekday(noon(day)))}</span></a>${list.map(chip).join("")}</div>`);
  }
  const dows = [0, 1, 2, 3, 4, 5, 6].map((i) => new Intl.DateTimeFormat(LOCALE(), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i, 12))));
  const title = new Intl.DateTimeFormat(LOCALE(), { month: "long", year: "numeric", timeZone: "UTC" }).format(noon(`${month}-01`));
  const booked = [...byDay.entries()].filter(([day]) => day.startsWith(month)).reduce((n, [, list]) => n + list.reduce((m, s) => m + s.people.length, 0), 0);
  return shell(
    "cours",
    `${tr("Cours", "Classes")} · ${title}`,
    `<h1>${tr("Cours", "Classes")}</h1>${coursTabs("calendrier")}
     <div class="calnav"><a class="ibtn" href="?vue=calendrier&mois=${previous}" title="${tr("Mois précédent", "Previous month")}">${icon("chevron-left", tr("Mois précédent", "Previous month"))}</a><a class="ibtn" href="?vue=calendrier&mois=${next}" title="${tr("Mois suivant", "Next month")}">${icon("chevron-right", tr("Mois suivant", "Next month"))}</a><h2 class="cap">${esc(title)}</h2>
       ${month !== today.slice(0, 7) ? `<a class="small" href="?vue=calendrier">${tr("Aujourd’hui", "Today")}</a>` : ""}<span class="muted small">${booked} ${tr(booked > 1 ? "places réservées" : "place réservée", booked === 1 ? "place booked" : "places booked")}</span></div>
     <div class="cal">${dows.map((d) => `<div class="dow">${esc(d)}</div>`).join("")}${cells.join("")}</div>
     <p class="muted small">${tr("3/7 : places prises sur 7. Vert : déjà des inscrits ; orange : complet. Un jour ou un cours ouvre la liste des personnes.", "3/7: 3 of 7 places taken. Green: people booked; orange: full. A day or a class opens its list of people.")}</p>`,
  );
}

// One day: its classes and everyone booked, past or coming.
async function coursDay(day, url) {
  const list = (await loadSessions(day, addDays(day, 1))).get(day) ?? [];
  const long = new Intl.DateTimeFormat(LOCALE(), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(noon(day));
  return shell(
    "cours",
    `${tr("Cours", "Classes")} · ${long}`,
    `<h1 class="cap">${esc(long)}</h1>${coursTabs("calendrier")}${coursFlash(url)}
     <div class="calnav"><a class="ibtn" href="?jour=${addDays(day, -1)}" title="${tr("Veille", "Previous day")}">${icon("chevron-left", tr("Veille", "Previous day"))}</a><a class="ibtn" href="?jour=${addDays(day, 1)}" title="${tr("Lendemain", "Next day")}">${icon("chevron-right", tr("Lendemain", "Next day"))}</a><a href="?vue=calendrier&mois=${day.slice(0, 7)}">${tr("Tout le mois", "The whole month")}</a></div>
     ${list.length ? list.map(sessionBox).join("") : `<p class="muted">${tr("Aucun cours ce jour-là.", "No classes that day.")}</p>`}`,
  );
}

// ---------------------------------------------------------------- Calendrier équipe (.ics)
// A calendar feed the team adds once to their phone (Google / iPhone) so every
// booking shows with the student's name and contact details, like the old
// Acuity system. Each event is one booked seat; the description holds phone,
// email and how they paid. Served authenticated at /admin/cal.ics.

const icsEscape = (s) => String(s ?? "").replace(/[\\;,]/g, (c) => ({ "\\": "\\\\", ";": "\\;", ",": "\\," })[c]).replace(/\n/g, "\\n");
const icsStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

async function calFeed() {
  const from = parisToday();
  const to = addDays(from, 90);
  const rows = await db.query(
    `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, b."endTime" AT TIME ZONE 'UTC' AS ends,
            e.slug, e.title, a.name, a.email, a."phoneNumber" AS phone,
            c.display AS code, u.amount AS code_amount, c.unit AS code_unit,
            ps.order_id AS paid_order, x.pay AS acuity_pay, dp.method AS desk_method
       FROM public."Booking" b
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       JOIN public."Attendee" a ON a."bookingId" = b.id
       LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
       LEFT JOIN rusc.uses u ON u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL
       LEFT JOIN rusc.codes c ON c.key = u.key
       LEFT JOIN rusc.paid_seats ps ON ps.seat_uid = s."referenceUid"
       LEFT JOIN rusc.acuity_seats x ON x.seat_uid = s."referenceUid"
       LEFT JOIN rusc.desk_payments dp ON dp.seat_uid = s."referenceUid"
      WHERE b.status IN ('accepted', 'pending')
        AND b."startTime" AT TIME ZONE 'UTC' >= $1::date::timestamp AT TIME ZONE 'Europe/Paris'
        AND b."startTime" AT TIME ZONE 'UTC' < $2::date::timestamp AT TIME ZONE 'Europe/Paris'
      ORDER BY 1, a.name`,
    [from, to],
  );
  const events = rows.rows.map((r) => {
    const start = new Date(r.starts);
    const end = new Date(r.ends);
    const title = OFFERS[r.slug] ? offerLabel(r.slug) : r.title;
    const pay = r.code
      ? `Code ${r.code}`
      : r.paid_order ? "Payé en ligne" : r.desk_method ? (r.desk_method === "free" ? "Offert" : "Payé à l’atelier") : r.acuity_pay ? "Payé (Acuity)" : "En attente de paiement";
    const desc = [`Élève : ${r.name || "—"}`, `Téléphone : ${r.phone || "—"}`, `Email : ${r.email || "—"}`, `Paiement : ${pay}`].join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${r.slug || r.title}-${icsStamp(start)}-${icsEscape(r.email || r.name || "")}@rusc`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape(title)} — ${icsEscape(r.name || "")}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//rūsc//Booking//FR", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

// ---------------------------------------------------------------- Horaires
// The classes' hours: Cal's Availability rows of each class's schedule (one
// schedule per class, deploy/cal/seed-classes.mjs). Weekly rows have days
// (0 = Sunday); dated rows are one-off sessions (stages); a dated row from
// 00:00 to 00:00 closes that class that day, as Cal's date overrides do.
// Bookings already made are never touched.

const weekdayName = (d) => new Intl.DateTimeFormat(LOCALE(), { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + d, 12))); // 4 Jan 2026 is a Sunday
const hhmm = (t) => String(t ?? "").slice(0, 5);
const toMinutes = (t) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t ?? "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const refused = (fr, en) => Object.assign(new Error(tr(fr, en)), { status: 400 });

async function horairesClasses() {
  const classes = await db.query(
    `SELECT e.id, e.slug, e.title, e.length, e."seatsPerTimeSlot" AS seats, e."scheduleId" AS schedule_id
       FROM public."EventType" e WHERE e."seatsPerTimeSlot" IS NOT NULL AND e."scheduleId" IS NOT NULL ORDER BY e.id`,
  );
  const rows = await db.query(
    `SELECT v.id, v."scheduleId" AS schedule_id, v.days, v.date::text AS date, v."startTime"::text AS start, v."endTime"::text AS "end"
       FROM public."Availability" v WHERE v."scheduleId" = ANY($1::int[]) ORDER BY v.date NULLS FIRST, v."startTime"`,
    [classes.rows.map((c) => c.schedule_id)],
  );
  return classes.rows.map((c) => ({ ...c, rows: rows.rows.filter((r) => r.schedule_id === c.schedule_id) }));
}

async function horairesPage(url) {
  const classes = await horairesClasses();
  const today = parisToday();
  const flash = url.searchParams.has("created")
    ? tr("Cours créé. Il est sur la page Réserver du site (Cours & stages) ; ses dates s’y réservent dès qu’il a des horaires ci-dessous.", "Class created. It’s on the site’s booking page (Courses & workshops); people can book it as soon as it has hours below.")
    : url.searchParams.has("saved")
    ? tr("Enregistré. Le calendrier de réservation suit tout de suite.", "Saved. The booking calendar follows right away.")
    : url.searchParams.has("closed")
      ? tr(`${Number(url.searchParams.get("closed")) || 0} jour(s)-cours fermés.`, `${Number(url.searchParams.get("closed")) || 0} class-day(s) closed.`) +
        (Number(url.searchParams.get("skipped")) ? ` ${tr(`${Number(url.searchParams.get("skipped"))} déjà occupés par une date, laissés tels quels.`, `${Number(url.searchParams.get("skipped"))} already had a date, left as they were.`)}` : "")
      : "";
  // Removing hours takes them off the booking calendar at once: ask first.
  const removeButton = (id, label, ask) =>
    `<form method="post" action="/admin/horaires/remove" style="display:inline"${ask ? ` onsubmit="return confirm(${esc(JSON.stringify(ask))})"` : ""}><input type="hidden" name="id" value="${id}"><button class="plain small" type="submit">${label}</button></form>`;
  const trash = (label) => `${icon("trash")}${label}`;
  const askRemove = tr("Retirer cet horaire ? Il disparaît du calendrier de réservation (les réservations faites restent).", "Remove these hours? They leave the booking calendar (bookings already made stay).");
  const dayOptions = [1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${esc(weekdayName(d))}</option>`).join("");
  const blocks = classes
    .map((c) => {
      const weekly = c.rows.filter((r) => !r.date).sort((a, b) => ((a.days[0] + 6) % 7) - ((b.days[0] + 6) % 7) || a.start.localeCompare(b.start));
      const dated = c.rows.filter((r) => r.date && r.date >= today && r.start !== r.end);
      const closed = c.rows.filter((r) => r.date && r.date >= today && r.start === r.end);
      const past = c.rows.filter((r) => r.date && r.date < today).length;
      const line = (label, action) => `<tr><td>${label}</td><td style="text-align:right">${action}</td></tr>`;
      const lines = [
        ...weekly.map((r) => line(`${esc(r.days.map(weekdayName).join(", "))} · ${hhmm(r.start)}–${hhmm(r.end)}`, removeButton(r.id, trash(tr("Retirer", "Remove")), askRemove))),
        ...dated.map((r) => line(`${esc(fmtDate(r.date))} · ${hhmm(r.start)}–${hhmm(r.end)}`, removeButton(r.id, trash(tr("Retirer", "Remove")), askRemove))),
        ...closed.map((r) => line(`<span class="off">${tr("Fermé le", "Closed on")} ${esc(fmtDate(r.date))}</span>`, removeButton(r.id, `${icon("undo")}${tr("Rouvrir", "Reopen")}`))),
      ].join("");
      const openStudio = c.slug === "atelier-libre-1h";
      const endField = `<label>${tr("Fin", "End")}<input name="end" type="time" step="1800" ${openStudio ? "required" : `placeholder="${tr("auto", "auto")}"`}></label>`;
      // Every class with a row in rusc.classes (built-in or made here) can be edited.
      const row = CLASSES.get(c.slug);
      return `<div class="session" id="${esc(c.slug)}"><div class="head"><b>${esc(OFFERS[c.slug] ? offerLabel(c.slug) : c.title)}</b>
          <span class="pill">${c.length} min · ${c.seats} ${tr("places", "places")}${row ? ` · ${esc(fmtAmount("euros", row.price_cents / 100))}` : ""}</span>
          ${row && !row.active ? `<span class="pill off">${tr("masqué du site", "hidden from the site")}</span>` : ""}
          ${row ? `<span class="grow"></span><a class="button plain small" href="/admin/cours/offre/${esc(c.slug)}">${icon("edit")}${tr("Modifier", "Edit")}</a>` : ""}</div>
        ${lines ? `<table><tbody>${lines}</tbody></table>` : `<p class="muted" style="margin:0">${tr("Aucun horaire.", "No hours.")}</p>`}
        ${past ? `<p class="muted small">${tr(`${past} date(s) passée(s) masquée(s).`, `${past} past date(s) hidden.`)}</p>` : ""}
        <details class="add"><summary>${icon("add")}${tr("Ajouter un horaire", "Add hours")}</summary>
        <form class="box" method="post" action="/admin/horaires/add" style="margin-top:10px">
          <input type="hidden" name="class" value="${c.id}">
          <label>${tr("Chaque semaine le", "Every week on")}<select name="day"><option value="">—</option>${dayOptions}</select></label>
          <label>${tr("ou une date", "or one date")}<input name="date" type="date" min="${today}"></label>
          <label>${tr("Début", "Start")}<input name="start" type="time" step="1800" required></label>
          ${endField}
          <div><button type="submit">${tr("Ajouter", "Add")}</button></div>
        </form>
        ${openStudio ? `<p class="muted small">${tr("Atelier libre : une plage de début à fin, découpée en créneaux d’une heure.", "Open studio: a span from start to end, cut into one-hour slots.")}</p>` : `<p class="muted small">${tr(`Sans fin, le cours dure ${c.length} min.`, `Without an end, the class lasts ${c.length} min.`)}</p>`}
        </details>
      </div>`;
    })
    .join("");
  const classBoxes = classes
    .map((c) => `<label><input type="checkbox" name="classes" value="${c.id}"${c.rows.some((r) => !r.date) ? " checked" : ""}> ${esc(OFFERS[c.slug] ? offerLabel(c.slug) : c.title)}</label>`)
    .join("");
  return shell(
    "horaires",
    tr("Horaires", "Timetable"),
    `<div class="titlebar"><h1>${tr("Horaires", "Timetable")}</h1><a class="action" href="/admin/cours/nouveau">${icon("add")}${tr("Nouveau cours", "New class")}</a></div>
     <p class="muted">${tr("Les horaires des cours, tels que Cal les propose à la réservation. Les réservations déjà faites ne bougent pas.", "The classes’ hours, as Cal offers them for booking. Bookings already made don’t move.")}</p>
     ${flash ? `<p class="flash">${icon("check-circle")}${esc(flash)}</p>` : ""}
     <h2>${tr("Fermer des jours (vacances, jours fériés)", "Close days (holidays)")}</h2>
     <form class="box" method="post" action="/admin/horaires/close" onsubmit="return confirm(${esc(JSON.stringify(tr("Fermer ces jours pour les cours cochés ? Ils disparaissent du calendrier de réservation.", "Close these days for the ticked classes? They leave the booking calendar.")))})">
       <label>${tr("Du", "From")}<input name="from" type="date" min="${today}" required></label>
       <label>${tr("Au (inclus)", "To (included)")}<input name="to" type="date" min="${today}"></label>
       <fieldset><legend>${tr("Cours fermés", "Classes closed")}</legend>${classBoxes}</fieldset>
       <div><button type="submit">${tr("Fermer", "Close")}</button></div>
     </form>
     <h2>${tr("Par cours", "By class")}</h2>${blocks}`,
  );
}

// A weekly slot or a dated one, from a form's day or date, start and end (by
// default one class long).
function slotFrom(form, length) {
  const day = String(form.get("day") ?? "");
  const date = String(form.get("date") ?? "");
  const start = toMinutes(form.get("start"));
  if (start === null) throw refused("Heure de début invalide.", "Invalid start time.");
  const end = form.get("end") ? toMinutes(form.get("end")) : start + length;
  if (end === null || end <= start || end > 23 * 60 + 59) throw refused("Heure de fin invalide (après le début, avant minuit).", "Invalid end time (after the start, before midnight).");
  if (end - start < length) throw refused(`La plage doit durer au moins ${length} min.`, `The span must last at least ${length} min.`);
  if (isDay(date)) {
    if (date < parisToday()) throw refused("Cette date est passée.", "That date is past.");
    return { date, start: fromMinutes(start), end: fromMinutes(end) };
  }
  if (/^[0-6]$/.test(day)) return { day: Number(day), start: fromMinutes(start), end: fromMinutes(end) };
  throw refused("Choisissez un jour de la semaine ou une date.", "Pick a weekday or a date.");
}

// q: the pool, or a client inside a transaction.
async function insertSlot(q, scheduleId, slot) {
  if (slot.date) {
    // A dated row replaces the weekly hours that day: drop a closure first.
    await q.query(`DELETE FROM public."Availability" WHERE "scheduleId" = $1 AND date = $2::date AND "startTime" = "endTime"`, [scheduleId, slot.date]);
    await q.query(`INSERT INTO public."Availability" ("scheduleId", days, date, "startTime", "endTime") VALUES ($1, ARRAY[]::int[], $2::date, $3::time, $4::time)`, [scheduleId, slot.date, slot.start, slot.end]);
  } else {
    await q.query(`INSERT INTO public."Availability" ("scheduleId", days, "startTime", "endTime") VALUES ($1, ARRAY[$2::int], $3::time, $4::time)`, [scheduleId, slot.day, slot.start, slot.end]);
  }
}

async function horairesAdd(form) {
  const cls = (await horairesClasses()).find((c) => String(c.id) === String(form.get("class")));
  if (!cls) throw refused("Cours inconnu.", "Unknown class.");
  await insertSlot(db, cls.schedule_id, slotFrom(form, cls.length));
  return cls.slug;
}

async function horairesRemove(form) {
  const classes = await horairesClasses();
  const row = classes.flatMap((c) => c.rows.map((r) => ({ ...r, slug: c.slug }))).find((r) => String(r.id) === String(form.get("id")));
  if (!row) throw refused("Horaire introuvable.", "Hours not found.");
  await db.query(`DELETE FROM public."Availability" WHERE id = $1`, [row.id]);
  return row.slug;
}

async function horairesClose(form) {
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") || from);
  if (!isDay(from) || !isDay(to) || to < from) throw refused("Dates invalides.", "Invalid dates.");
  if (from < parisToday()) throw refused("Ces dates sont passées.", "Those dates are past.");
  if (addDays(from, 92) < to) throw refused("Trois mois au plus à la fois.", "Three months at most at a time.");
  const chosen = new Set(form.getAll("classes").map(String));
  const classes = (await horairesClasses()).filter((c) => chosen.has(String(c.id)));
  if (!classes.length) throw refused("Choisissez au moins un cours.", "Pick at least one class.");
  let closed = 0;
  let skipped = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    for (const c of classes) {
      if (c.rows.some((r) => r.date === day)) {
        skipped += c.rows.some((r) => r.date === day && r.start !== r.end) ? 1 : 0;
        continue;
      }
      await db.query(`INSERT INTO public."Availability" ("scheduleId", days, date, "startTime", "endTime") VALUES ($1, ARRAY[]::int[], $2::date, '00:00', '00:00')`, [c.schedule_id, day]);
      closed += 1;
    }
  }
  return { closed, skipped };
}

// ---------------------------------------------------------------- Nouveau cours
// The form behind a class made here (see "classes made here" above): create
// at /admin/cours/nouveau, edit at /admin/cours/offre/<key>. Creating makes the
// Cal event type with the same settings as deploy/cal/seed-classes.mjs, so it
// books, holds places, takes codes and is paid like the others.

const HOST = "raquel"; // the studio's Cal account, host of every class (lib/cal.ts, CAL_USERNAME)
const TZ = "Europe/Paris";
const ADDRESS = "rūsc, 99 Promenade Marie Paradis, 74400 Chamonix-Mont-Blanc";
// Bookable until 30 minutes after the start (deploy/cal/patches/late-booking.patch).
const NOTICE = -30;
const OPEN_STUDIO = "atelier-libre-1h"; // one-hour slots cut from longer spans
// The site's photos a class can show (PHOTOS in components/OfferCard.tsx), with
// small copies in photos/ for the form.
const PHOTOS = [
  "atelier-03", "modelage-2h", "atelier-08", "atelier-07", "ceramique-1j", "ceramique-2j", "porcelaine", "atelier-05", "stages",
  "atelier-01", "atelier-04", "atelier-10", "location", "membres", "us-01", "us-02", "us-04", "bon-cadeau",
];
const PHOTO_DIR = new URL("./photos/", import.meta.url);
const PHOTO_FILES = new Map(PHOTOS.map((name) => [name, readFileSync(new URL(`${name}.jpg`, PHOTO_DIR))]));

// "2 h", "1 h 30", "45 min"; the line above a class's name when none is given.
const duration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
};
const defaultTag = (minutes, english) => `${minutes >= 300 ? (english ? "Workshop" : "Stage") : english ? "Course" : "Cours"} · ${duration(minutes)}`;

// The form's values, checked.
function classInput(form) {
  const line = (name, max) => String(form.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const text = (name) => String(form.get(name) ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 1000);
  const titleFr = line("title_fr", 60);
  if (!titleFr) throw refused("Il faut un nom.", "A name is needed.");
  const price = Math.round(Number(String(form.get("price") ?? "").replace(",", ".")) * 100);
  if (!Number.isInteger(price) || price < 100 || price > 200000) throw refused("Un prix entre 1 et 2 000 €.", "A price between €1 and €2,000.");
  const minutes = Math.round(Number(form.get("minutes")));
  if (!(minutes >= 15 && minutes <= 720)) throw refused("Une durée entre 15 et 720 minutes.", "A length between 15 and 720 minutes.");
  const seats = Math.round(Number(form.get("seats")));
  if (!(seats >= 1 && seats <= 30)) throw refused("Entre 1 et 30 places.", "Between 1 and 30 places.");
  const image = String(form.get("image") ?? "");
  return {
    titleFr,
    titleEn: line("title_en", 60) || titleFr,
    tagFr: line("tag_fr", 60) || defaultTag(minutes, false),
    tagEn: line("tag_en", 60) || defaultTag(minutes, true),
    noteFr: line("note_fr", 80) || null,
    noteEn: line("note_en", 80) || null,
    descriptionFr: text("description_fr"),
    descriptionEn: text("description_en"),
    showPrice: form.get("show_price") === "on",
    showMemberPrice: form.get("show_member_price") === "on",
    price,
    minutes,
    seats,
    image: PHOTOS.includes(image) ? image : PHOTOS[0],
    euroCodes: form.get("euro_codes") === "on",
    classCards: form.get("class_cards") === "on",
  };
}

// A new class's key (its Cal slug and the site's offer key), from its French
// name: free in Cal and on the site, without the prefixes the site's member
// prices read (lib/pricing.ts), and never ending in -fr or -en (old twins).
function classKey(title, taken) {
  let base = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 40).replace(/-+$/, "") || "cours";
  if (/^(atelier-libre|bon-cadeau|adhesion|carnet)/.test(base)) base = `cours-${base}`;
  if (/-(fr|en)$/.test(base)) base += "-1";
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
}

// The English title and description, which Cal's booker shows on the English pages.
async function writeTranslations(client, key, eventTypeId, userId, v) {
  await client.query(`DELETE FROM public."EventTypeTranslation" WHERE "eventTypeId" = $1`, [eventTypeId]);
  for (const [field, text] of [["TITLE", v.titleEn], ["DESCRIPTION", v.descriptionEn]]) {
    if (!text) continue;
    await client.query(
      `INSERT INTO public."EventTypeTranslation" (uid, "eventTypeId", field, "sourceLocale", "targetLocale", "translatedText", "createdBy", "updatedAt")
       VALUES ($1, $2, $3, 'fr', 'en', $4, $5, now())`,
      [`rusc-${key}-${field.toLowerCase()}-en`, eventTypeId, field, text, userId],
    );
  }
}

// Codes already sold that pay for every class (gift vouchers in euros) or for
// the 2-hour classes (class cards, a voucher for one 2-hour class) pay for this
// one too, or no longer, as the studio chose.
async function shareCodes(client, key, v) {
  const everyClass = Object.keys(BUILTIN).filter((k) => k !== "atelier-libre-1h");
  for (const [on, unit, offers] of [[v.euroCodes, "euros", everyClass], [v.classCards, "sessions", TWO_HOUR]]) {
    await client.query(
      on
        ? `UPDATE rusc.codes SET offers = array_append(offers, $1) WHERE unit = $2 AND offers @> $3::text[] AND NOT ($1 = ANY(offers))`
        : `UPDATE rusc.codes SET offers = array_remove(offers, $1) WHERE unit = $2 AND offers @> $3::text[] AND $1 = ANY(offers)`,
      [key, unit, offers],
    );
  }
}

async function hostId(client) {
  const { rows } = await client.query("SELECT id FROM public.users WHERE username = $1", [HOST]);
  if (!rows[0]) throw new Error(`no Cal user ${HOST}`);
  return rows[0].id;
}

async function inTransaction(work) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function classCreate(form) {
  const v = classInput(form);
  // The first session, if one is given (checked before anything is made).
  const first = form.get("start") || form.get("day") || form.get("date") ? slotFrom(form, v.minutes) : null;
  const key = await inTransaction(async (client) => {
    const userId = await hostId(client);
    const slugs = await client.query(`SELECT slug FROM public."EventType" WHERE "userId" = $1 UNION SELECT key FROM rusc.classes`, [userId]);
    const key = classKey(v.titleFr, new Set([...Object.keys(BUILTIN), ...Object.keys(PRODUCTS), ...slugs.rows.map((r) => r.slug)]));
    const schedule = await client.query(`INSERT INTO public."Schedule" ("userId", name, "timeZone") VALUES ($1, $2, $3) RETURNING id`, [userId, `rūsc · ${v.titleFr}`, TZ]);
    const scheduleId = schedule.rows[0].id;
    // As seed-classes.mjs: places shown, attendees not; booked PENDING until paid
    // (the cart); hidden from Cal's profile page (the site embeds it); Paris
    // time; 30-minute slot interval, each window one class long.
    const event = await client.query(
      `INSERT INTO public."EventType" (title, slug, description, length, "userId", "scheduleId", "seatsPerTimeSlot", "minimumBookingNotice",
         "seatsShowAvailabilityCount", "seatsShowAttendees", locations, "interfaceLanguage", "lockTimeZoneToggleOnBookingPage", "lockedTimeZone",
         "disableGuests", "requiresConfirmation", hidden, "slotInterval", position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, $9::jsonb, NULL, true, $10, false, true, true, 30, 0) RETURNING id`,
      [v.titleFr, key, v.descriptionFr, v.minutes, userId, scheduleId, v.seats, NOTICE,
        JSON.stringify([{ type: "inPerson", address: ADDRESS, displayLocationPublicly: true }]), TZ],
    );
    const eventTypeId = event.rows[0].id;
    await client.query(`INSERT INTO public."_user_eventtype" ("A", "B") VALUES ($1, $2)`, [eventTypeId, userId]);
    await writeTranslations(client, key, eventTypeId, userId, v);
    await client.query(
      `INSERT INTO rusc.classes (key, event_type_id, title_fr, title_en, tag_fr, tag_en, note_fr, note_en, description_fr, description_en,
         price_cents, image, euro_codes, class_cards, show_price, show_member_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [key, eventTypeId, v.titleFr, v.titleEn, v.tagFr, v.tagEn, v.noteFr, v.noteEn, v.descriptionFr, v.descriptionEn, v.price, v.image,
        v.euroCodes, v.classCards, v.showPrice, v.showMemberPrice],
    );
    await shareCodes(client, key, v);
    if (first) await insertSlot(client, scheduleId, first);
    return key;
  });
  await syncClasses(true);
  console.log("class created", key);
  return key;
}

async function classUpdate(key, form) {
  await syncClasses(true);
  const c = CLASSES.get(key);
  if (!c) throw refused("Cours introuvable.", "Class not found.");
  const v = classInput(form);
  // Open studio is cut into one-hour slots: its length stays.
  if (key === OPEN_STUDIO) v.minutes = c.length;
  await inTransaction(async (client) => {
    const userId = await hostId(client);
    await client.query(`UPDATE public."EventType" SET title = $2, description = $3, "seatsPerTimeSlot" = $4 WHERE id = $1`, [c.event_type_id, v.titleFr, v.descriptionFr, v.seats]);
    if (v.minutes !== c.length) {
      // Cal's trigger copies the new length into its bookings' summary.
      await client.query(`UPDATE public."EventType" SET length = $2 WHERE id = $1`, [c.event_type_id, v.minutes]);
      // Each window one class long stays one class long (one slot); longer
      // spans are left as they are.
      const rows = await client.query(`SELECT id, "startTime"::text AS start, "endTime"::text AS "end" FROM public."Availability" WHERE "scheduleId" = $1`, [c.schedule_id]);
      for (const row of rows.rows) {
        const start = toMinutes(hhmm(row.start));
        const end = toMinutes(hhmm(row.end));
        if (start !== end && end - start === c.length && start + v.minutes <= 23 * 60 + 59) {
          await client.query(`UPDATE public."Availability" SET "endTime" = $2::time WHERE id = $1`, [row.id, fromMinutes(start + v.minutes)]);
        }
      }
    }
    if (c.schedule_id) await client.query(`UPDATE public."Schedule" SET name = $2 WHERE id = $1`, [c.schedule_id, `rūsc · ${v.titleFr}`]);
    await writeTranslations(client, key, c.event_type_id, userId, v);
    await client.query(
      `UPDATE rusc.classes SET title_fr = $2, title_en = $3, tag_fr = $4, tag_en = $5, note_fr = $6, note_en = $7, description_fr = $8,
         description_en = $9, price_cents = $10, image = $11, euro_codes = $12, class_cards = $13, show_price = $14, show_member_price = $15 WHERE key = $1`,
      [key, v.titleFr, v.titleEn, v.tagFr, v.tagEn, v.noteFr, v.noteEn, v.descriptionFr, v.descriptionEn, v.price, v.image, v.euroCodes, v.classCards,
        v.showPrice, v.showMemberPrice],
    );
    // A built-in class keeps the codes it always had (carnets, vouchers, presets).
    if (!c.builtin) await shareCodes(client, key, v);
  });
  await syncClasses(true);
}

// Listed on the site, or not. Bookings, codes and orders stay as they are.
async function classToggle(key) {
  await db.query("UPDATE rusc.classes SET active = NOT active WHERE key = $1", [key]);
  await syncClasses(true);
}

function classForm(c) {
  const value = (v) => (v === null || v === undefined ? "" : ` value="${esc(v)}"`);
  const field = (label, name, attrs = "", cls = "") => `<label${cls ? ` class="${cls}"` : ""}>${label}<input name="${name}"${attrs}></label>`;
  const area = (label, name, text) => `<label class="wide">${label}<textarea name="${name}" rows="3" maxlength="1000">${esc(text ?? "")}</textarea></label>`;
  const image = c?.image ?? PHOTOS[0];
  const photos = PHOTOS.map(
    (name) => `<label title="${esc(name)}"><input type="radio" name="image" value="${esc(name)}"${name === image ? " checked" : ""}><img src="/photos/${esc(name)}.jpg" alt="${esc(name)}" width="120" height="90" loading="lazy"></label>`,
  ).join("");
  const dayOptions = [1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${esc(weekdayName(d))}</option>`).join("");
  const today = parisToday();
  return `<form class="box" method="post" action="${c ? `/admin/cours/offre/${esc(c.key)}` : "/admin/cours/nouveau"}">
    <h3>${tr("Le cours", "The class")}</h3>
    ${field(tr("Nom en français", "Name in French"), "title_fr", ` required maxlength="60" placeholder="${tr("ex. raku 1 jour", "e.g. raku 1 jour")}"${value(c?.title_fr)}`, "two")}
    ${field(tr("Nom en anglais", "Name in English"), "title_en", ` required maxlength="60" placeholder="${tr("ex. raku 1 day", "e.g. raku 1 day")}"${value(c?.title_en)}`, "two")}
    ${field(tr("Prix (€ TTC, par place)", "Price (€ incl. VAT, per place)"), "price", ` type="number" min="1" max="2000" step="0.5" required${value(c ? c.price_cents / 100 : null)}`)}
    ${c?.key === OPEN_STUDIO
      ? `<input type="hidden" name="minutes" value="${c.length}">`
      : field(tr("Durée (minutes)", "Length (minutes)"), "minutes", ` type="number" min="15" max="720" step="15" required${value(c?.length ?? 120)}`)}
    ${field(tr("Places", "Places"), "seats", ` type="number" min="1" max="30" required${value(c?.seats ?? 7)}`)}
    <h3>${tr("Sur la page Réserver du site", "On the site’s booking page")}</h3>
    ${field(tr("Au-dessus du nom (français)", "Above the name (French)"), "tag_fr", ` maxlength="60" placeholder="${tr("auto : Cours · 2 h", "auto: Cours · 2 h")}"${value(c?.tag_fr)}`)}
    ${field(tr("Au-dessus du nom (anglais)", "Above the name (English)"), "tag_en", ` maxlength="60" placeholder="${tr("auto : Course · 2 h", "auto: Course · 2 h")}"${value(c?.tag_en)}`)}
    ${field(tr("Après le prix (français)", "After the price (French)"), "note_fr", ` maxlength="80" placeholder="${tr("ex. apéro et modelage", "e.g. apéro et modelage")}"${value(c?.note_fr)}`)}
    ${field(tr("Après le prix (anglais)", "After the price (English)"), "note_en", ` maxlength="80" placeholder="${tr("ex. drinks and hand-building", "e.g. drinks and hand-building")}"${value(c?.note_en)}`)}
    <fieldset><legend>${tr("Ligne du prix", "Price line")}</legend>
      <label><input type="checkbox" name="show_price"${!c || c.show_price ? " checked" : ""}> ${tr("Afficher le prix", "Show the price")}</label>
      <label><input type="checkbox" name="show_member_price"${c?.show_member_price ? " checked" : ""}> ${tr(`Et le prix membre (−${MEMBER_PERCENT} %)`, `And the member price (−${MEMBER_PERCENT}%)`)}</label>
      <span class="muted small" style="flex-basis:100%">${tr("Puis le texte « après le prix » (« / heure » se colle au prix). Sans le prix, ce texte seul.", "Then the “after the price” text (“/ hour” sticks to the price). Without the price, that text alone.")}</span></fieldset>
    ${area(tr("Description en français (dans le calendrier de réservation)", "Description in French (in the booking calendar)"), "description_fr", c?.description_fr)}
    ${area(tr("Description en anglais", "Description in English"), "description_en", c?.description_en)}
    <fieldset class="photos"><legend>${tr("Photo", "Photo")}</legend>${photos}</fieldset>
    ${c?.builtin
      ? `<p class="muted small wide">${tr("Codes : ceux qui paient ce cours aujourd’hui continuent de le payer (carnets, bons cadeaux, codes de l’atelier).", "Codes: those that pay for this class today keep paying for it (class cards, gift vouchers, studio codes).")}</p>`
      : `<fieldset><legend>${tr("Codes qui le paient", "Codes that pay for it")}</legend>
      <label><input type="checkbox" name="euro_codes"${c ? (c.euro_codes ? " checked" : "") : " checked"}> ${tr("Bons cadeaux en euros (le prix du cours)", "Gift vouchers in euros (the class’s price)")}</label>
      <label><input type="checkbox" name="class_cards"${c?.class_cards ? " checked" : ""}> ${tr("Carnets et bons « cours de 2 h » (une séance)", "2-hour class cards and vouchers (one session)")}</label></fieldset>`}
    ${c ? "" : `<fieldset><legend>${tr("Première séance (facultatif, sinon dans Horaires)", "First session (optional, or later in Timetable)")}</legend>
      <label>${tr("Chaque semaine le", "Every week on")} <select name="day"><option value="">—</option>${dayOptions}</select></label>
      <label>${tr("ou le", "or on")} <input name="date" type="date" min="${today}"></label>
      <label>${tr("à", "at")} <input name="start" type="time" step="1800"></label></fieldset>`}
    <div><button type="submit">${c ? tr("Enregistrer", "Save") : tr("Créer le cours", "Create the class")}</button></div>
  </form>`;
}

function classNewPage() {
  return shell(
    "horaires",
    tr("Nouveau cours", "New class"),
    `<p><a href="/admin/horaires">${tr("← Horaires", "← Timetable")}</a></p>
     <h1>${tr("Nouveau cours", "New class")}</h1>
     <p class="muted">${tr("Il s’ajoute à la page Réserver du site (Cours & stages), en français et en anglais. On le réserve et le paie (carte ou code) comme les autres cours ; il apparaît dans Cours et Horaires.", "It joins the site’s booking page (Courses & workshops), in French and English. People book it and pay for it (card or code) like the other classes; it shows in Classes and Timetable.")}</p>
     ${classForm(null)}`,
  );
}

async function classEditPage(key, flash) {
  await syncClasses(true);
  const c = CLASSES.get(key);
  if (!c) return null;
  return shell(
    "horaires",
    c.title_fr,
    `<p><a href="/admin/horaires#${esc(key)}">${tr("← Horaires", "← Timetable")}</a></p>
     ${flash ? `<p class="flash">${icon("check-circle")}${esc(flash)}</p>` : ""}
     <div class="titlebar"><h1>${esc(tr(c.title_fr, c.title_en))}</h1><a class="action plain" href="/admin/horaires#${esc(key)}">${icon("clock")}${tr("Ses horaires", "Its hours")}</a></div>
     <p class="muted">${c.active ? tr("Sur la page Réserver du site.", "On the site’s booking page.") : `<span class="off">${tr("Masqué : le site ne le propose plus.", "Hidden: the site no longer offers it.")}</span>`}
       ${tr("Un changement s’y voit en moins d’une minute.", "A change shows there within a minute.")}</p>
     ${c.builtin ? `<p class="muted small">${icon("exclamation-circle")} ${tr("Les pages de présentation du site (Cours, Stages, Membres, accueil) gardent leur propre texte et leurs prix : à changer à part.", "The site’s own pages (Courses, Workshops, Members, home) keep their own text and prices: change those separately.")}</p>` : ""}
     ${classForm(c)}
     <form method="post" action="/admin/cours/offre/${esc(key)}/site" style="margin-top:12px"${c.active ? ` onsubmit="return confirm(${esc(JSON.stringify(tr("Retirer ce cours de la page Réserver ? Les réservations faites restent.", "Take this class off the booking page? Bookings already made stay.")))})"` : ""}>
       <button class="plain" type="submit">${c.active ? tr("Retirer du site (les réservations faites restent)", "Take off the site (bookings made stay)") : tr("Remettre sur le site", "Put back on the site")}</button>
     </form>`,
  );
}

// ---------------------------------------------------------------- email (Resend)
// Transactional emails go through Resend (https://api.resend.com/emails), the
// same service Cal uses. The API key is RESEND_API_KEY (Fly secret on
// rusc-admin); the sender domain studio-rusc.com is verified there. Sending is
// best-effort: a failed email never blocks the action it accompanies.
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = "rūsc <info@studio-rusc.com>";
const REPLY_TO = "info@studio-rusc.com";

async function sendEmail(to, subject, text) {
  if (!RESEND_API_KEY) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text, reply_to: REPLY_TO }),
    });
    if (!res.ok) console.error("resend send failed", res.status, await res.text().catch(() => ""));
  } catch (error) {
    console.error("resend send error", error);
  }
}

// Booking confirmation: sent to the student (and info@ in copy) the moment a
// place becomes paid. Restores what the old Acuity system already did.
async function sendBookingConfirmation(group, name, email, amount, lang, kind) {
  // No address: an extra place, or someone the studio added without one.
  if (!email || email.endsWith(ANONYMOUS)) return;
  const en = String(lang ?? "").toLowerCase() === "en";
  // kind: "card10" | "card5" | "gift" | null (drop-in / paid by card).
  const nature = kind === "card10" ? (en ? "card · €35 per class" : "abonnement · 35 € la séance")
    : kind === "card5" ? (en ? "card · €42 per class" : "abonnement · 42 € la séance")
    : kind === "gift" ? (en ? "gift voucher" : "bon cadeau")
    : null;
  const title = OFFERS[group.slug] ? (en ? OFFERS[group.slug].en : OFFERS[group.slug].label) : group.title;
  const start = new Date(group.start_time);
  const end = new Date(group.end_time);
  const dateFmt = start.toLocaleDateString(en ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const timeFmt = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const endFmt = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  const first = String(name ?? "").split(/\s+/)[0] || "";
  const subject = en ? "Your booking at rūsc is confirmed" : "Votre réservation chez rūsc est confirmée";
  const addr = "99 Promenade Marie-Paradis, 74400 Chamonix-Mont-Blanc";
  const paid = amount != null && Number(amount) > 0 ? Number(amount) : null;
  const sig = ["rūsc · Chamonix", "@studiorusc", en ? "— Dare art." : "— Osez l'art."];
  const paymentLine = paid != null
    ? (en ? `${paid.toFixed(2).replace(".", ",")} € paid` : `${paid.toFixed(2).replace(".", ",")} € payés`)
    : null;
  const text = en
    ? [
        `Hello ${first},`, "",
        "Your seat is booked at rūsc. See you soon, hands in the clay.", "",
        `${title}`, `${dateFmt} · ${timeFmt} – ${endFmt}`, `rūsc · ${addr}, France`, "",
        ...(paymentLine ? ["Payment", paymentLine, ""] : []),
        `Cancel or reschedule free of charge: write to ${REPLY_TO} at least 24 h in advance.`, "",
        ...sig,
      ]
    : [
        `Bonjour ${first},`, "",
        "Votre place est réservée chez rūsc. À très vite, les mains dans la terre.", "",
        `${title}`, `${dateFmt} · ${timeFmt} – ${endFmt}`, `rūsc · ${addr}`, "",
        ...(paymentLine ? ["Paiement", paymentLine, ""] : []),
        `Annuler ou reporter sans frais : écrivez-nous à ${REPLY_TO} au moins 24 h à l'avance.`, "",
        ...sig,
      ];
  await sendEmail(email, subject, text.join("\n"));
  if (REPLY_TO && REPLY_TO !== email) {
    // The team copy: who booked, and their full contact details (as the old
    // Acuity system reported) so the studio can reach them.
    const teamText = [
      "Nouvelle réservation — rūsc",
      "",
      `Élève : ${name || "—"}`,
      `Téléphone : ${group.phone || "—"}`,
      `Email : ${email}`,
      "",
      `${title}`,
      `${dateFmt} · ${timeFmt} – ${endFmt}`,
      paid != null ? `Payé : ${paid.toFixed(2).replace(".", ",")} €` : `Payé : ${nature ?? "—"}`,
    ].join("\n");
    await sendEmail(REPLY_TO, `Nouvelle réservation — ${title} (${first || email})`, teamText);
  }
}

// Welcome email for a brand-new account (member or not): every signup gets it,
// a simple hello and what the space opens. The richer "welcome member" email is
// separate and sent only when a membership (adhesion) is bought. Sent in the
// language the visitor used to sign up (fr or en).
async function sendSignupWelcome(name, email, lang) {
  const first = String(name ?? "").split(/\s+/)[0] || "";
  const en = String(lang ?? "").toLowerCase() === "en";
  const subject = en ? "Welcome to rūsc" : "Bienvenue à rūsc";
  const signature = en
    ? ["Lena · Studio rūsc", "99 Promenade Marie-Paradis · 74400 Chamonix-Mont-Blanc", "studio-rusc.com · @studiorusc"]
    : ["Lena · Studio rūsc", "99 Promenade Marie-Paradis · 74400 Chamonix-Mont-Blanc", "studio-rusc.com · @studiorusc"];
  const text = en
    ? [
        `Hello ${first},`,
        "",
        "Welcome to rūsc. Your space is ready.",
        "",
        "What you can do right away:",
        "- Book a class or a workshop.",
        "- Buy a card or a gift voucher.",
        "- Follow your bookings and cards in your space (studio-rusc.com → Log in).",
        "",
        "Want to go further? The open studio awaits: a space in autonomy, reserved for members, after a two-hour initiation.",
        "",
        "See you soon, hands in the clay.",
        "",
        ...signature,
      ]
    : [
        `Bonjour ${first},`,
        "",
        "Bienvenue chez rūsc. Votre espace est prêt.",
        "",
        "Ce que vous pouvez faire dès maintenant :",
        "- Réserver un cours ou un stage.",
        "- Acheter un carnet ou un bon cadeau.",
        "- Suivre vos réservations et vos carnets dans votre espace (studio-rusc.com → Connexion).",
        "",
        "Vous souhaitez aller plus loin ? L'atelier libre vous attend : un espace en autonomie, réservé aux membres, après une initiation de deux heures.",
        "",
        "À très vite, les mains dans la terre.",
        "",
        ...signature,
      ];
  await sendEmail(email, subject, text.join("\n"));
}

// ---------------------------------------------------------------- member accounts
// The site's Connexion page (lib/auth.ts): sign up, sign in, the member's
// space (membership, codes, bookings). Passwords are kept as scrypt hashes,
// tokens as SHA-256; a token travels as "Authorization: Bearer …".

const scryptKey = (password, salt) =>
  new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => (error ? reject(error) : resolve(key))));
async function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await scryptKey(password, salt)).toString("base64")}`;
}
async function passwordMatches(password, stored) {
  const [kind, salt, hash] = String(stored ?? "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const key = await scryptKey(password, Buffer.from(salt, "base64"));
  const expected = Buffer.from(hash, "base64");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
const tokenHash = (token) => createHash("sha256").update(String(token)).digest("hex");
async function newToken(accountId, kind, days) {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO rusc.account_tokens (hash, account_id, kind, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 day')",
    [tokenHash(token), accountId, kind, days],
  );
  return token;
}
async function signedInAccount(req) {
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length > 100) return null;
  const { rows } = await db.query(
    `SELECT a.*, t.hash FROM rusc.account_tokens t JOIN rusc.accounts a ON a.id = t.account_id
      WHERE t.hash = $1 AND t.kind = 'session' AND t.expires_at > now()`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}
async function publicUser(account) {
  const member = await db.query(
    "SELECT 1 FROM rusc.members WHERE lower(email) = lower($1) AND until >= (now() AT TIME ZONE 'Europe/Paris')::date",
    [account.email],
  );
  return { id: String(account.id), name: account.name, email: account.email, member: member.rowCount > 0 };
}

// The member's space: membership, codes (added to the account, or in their
// name), coming bookings and past visits (Cal and Acuity's history).
async function accountData(account) {
  const email = account.email.toLowerCase();
  const [member, codes, coming, past] = await Promise.all([
    db.query("SELECT since, until FROM rusc.members WHERE lower(email) = $1", [email]),
    db.query(
      `SELECT display, label, unit, remaining, initial, expires_on, active FROM rusc.codes
        WHERE account_id = $1 OR lower(coalesce(holder, '')) LIKE '%' || $2 || '%' ORDER BY created_at DESC`,
      [account.id, email],
    ),
    // Coming classes: places paid (card, code, Acuity), or booked in a class
    // the studio confirmed, but not places still waiting in a cart. Payment is
    // per place: everyone in a class shares one Cal booking and its status.
    db.query(
      `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, e.slug, e.title
         FROM public."Attendee" a JOIN public."Booking" b ON b.id = a."bookingId" JOIN public."EventType" e ON e.id = b."eventTypeId"
         LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
        WHERE lower(a.email) = $1 AND b.status IN ('accepted', 'pending') AND b."startTime" >= now() AT TIME ZONE 'UTC'
          AND (${PAID_SEAT} OR (b.status = 'accepted'
               AND NOT EXISTS (SELECT 1 FROM rusc.holds h WHERE h.seat_uid = s."referenceUid" AND h.released_at IS NULL)))
        ORDER BY b."startTime"`,
      [email],
    ),
    db.query(
      `SELECT starts, slug, title FROM (
         SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, e.slug, e.title
           FROM public."Attendee" a JOIN public."Booking" b ON b.id = a."bookingId" JOIN public."EventType" e ON e.id = b."eventTypeId"
          WHERE lower(a.email) = $1 AND b.status IN ('accepted', 'pending') AND b."startTime" < now() AT TIME ZONE 'UTC'
         UNION ALL
         SELECT h.starts_at, h.offer, h.type FROM rusc.history h WHERE lower(h.email) = $1 AND NOT h.canceled AND h.starts_at < now()
       ) x ORDER BY starts DESC LIMIT 60`,
      [email],
    ),
  ]);
  const visit = (b) => ({ start: new Date(b.starts).toISOString(), offer: OFFERS[b.slug] ? b.slug : null, title: b.title });
  return {
    user: await publicUser(account),
    membership: member.rows[0] ? { since: isoDate(member.rows[0].since), until: isoDate(member.rows[0].until) } : null,
    codes: codes.rows.map((c) => ({ code: c.display, label: c.label, unit: c.unit, remaining: num(c.remaining), initial: num(c.initial), expiresOn: isoDate(c.expires_on), active: c.active })),
    coming: coming.rows.map(visit),
    past: past.rows.map(visit),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function authApi(req, url) {
  const path = url.pathname.replace(/^\/api\/auth/, "").replace(/\/$/, "");
  if (req.method === "GET" && (path === "/session" || path === "/account")) {
    const account = await signedInAccount(req);
    if (!account) return [401, { error: "signed_out" }];
    return [200, path === "/session" ? { user: await publicUser(account) } : await accountData(account)];
  }
  if (req.method !== "POST") return [405, { error: "method" }];
  if (limited(req, 20, "auth:")) return [429, { error: "too_many" }];
  const input = JSON.parse((await readBody(req)) || "{}");
  const days = input.remember === false ? 1 : 365;
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const goodPassword = password.length >= 8 && password.length <= 200;

  if (path === "/signup") {
    const name = String(input.name ?? "").trim().slice(0, 80);
    if (!name) return [400, { error: "name_required" }];
    if (!EMAIL.test(email) || email.length > 200) return [400, { error: "email_invalid" }];
    if (!goodPassword) return [400, { error: "password_short" }];
    const created = await db.query(
      "INSERT INTO rusc.accounts (email, name, password, last_login_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING RETURNING *",
      [email, name, await hashPassword(password)],
    );
    if (!created.rowCount) return [409, { error: "email_taken" }];
    // Welcome email (best-effort, never blocks the signup) in the visitor's
    // interface language, sent to every new account.
    const wantsEn = String(input.lang ?? "").toLowerCase() === "en";
    const cookieEn = /(?:^|;\s*)rusc_lang=en(?:;|$)/.test(req.headers.cookie ?? "");
    sendSignupWelcome(created.rows[0].name, created.rows[0].email, wantsEn || cookieEn ? "en" : "fr");
    return [200, { token: await newToken(created.rows[0].id, "session", days), user: await publicUser(created.rows[0]) }];
  }
  if (path === "/login") {
    const account = (await db.query("SELECT * FROM rusc.accounts WHERE lower(email) = $1", [email])).rows[0];
    // The same answer, in about the same time, whether the e-mail exists or not.
    const ok = account ? await passwordMatches(password, account.password) : (await hashPassword(password), false);
    if (!ok) return [401, { error: "wrong_login" }];
    await db.query("UPDATE rusc.accounts SET last_login_at = now() WHERE id = $1", [account.id]);
    return [200, { token: await newToken(account.id, "session", days), user: await publicUser(account) }];
  }
  if (path === "/logout") {
    const account = await signedInAccount(req);
    if (account) await db.query("DELETE FROM rusc.account_tokens WHERE hash = $1", [account.hash]);
    return [204, {}];
  }
  if (path === "/reset") {
    if (!goodPassword) return [400, { error: "password_short" }];
    const account = (
      await db.query(
        `SELECT a.* FROM rusc.account_tokens t JOIN rusc.accounts a ON a.id = t.account_id
          WHERE t.hash = $1 AND t.kind = 'reset' AND t.expires_at > now()`,
        [tokenHash(input.token ?? "")],
      )
    ).rows[0];
    if (!account) return [400, { error: "reset_expired" }];
    await db.query("UPDATE rusc.accounts SET password = $2, last_login_at = now() WHERE id = $1", [account.id, await hashPassword(password)]);
    // Every older sign-in and link ends with the new password.
    await db.query("DELETE FROM rusc.account_tokens WHERE account_id = $1", [account.id]);
    return [200, { token: await newToken(account.id, "session", days), user: await publicUser(account) }];
  }
  if (path === "/codes") {
    const account = await signedInAccount(req);
    if (!account) return [401, { error: "signed_out" }];
    const code = (await db.query("SELECT key, account_id FROM rusc.codes WHERE key = $1", [normalize(input.code)])).rows[0];
    if (!code) return [404, { error: "code_unknown" }];
    if (code.account_id && String(code.account_id) !== String(account.id)) return [409, { error: "code_taken" }];
    await db.query("UPDATE rusc.codes SET account_id = $2 WHERE key = $1", [code.key, account.id]);
    return [200, await accountData(account)];
  }
  return [404, { error: "not_found" }];
}

// From a client's page: a link that lets them choose a new password (7 days).
async function clientResetLink(id) {
  const client = (await db.query("SELECT email FROM rusc.clients WHERE id = $1", [id])).rows[0];
  const account = client?.email ? (await db.query("SELECT id FROM rusc.accounts WHERE lower(email) = lower($1)", [client.email])).rows[0] : null;
  if (!account) throw refused("Ce client n’a pas de compte.", "This client has no account.");
  const token = await newToken(account.id, "reset", 7);
  const links = [`${SITE_ORIGIN}/connexion/?reset=${token}`, `${SITE_ORIGIN}/en/login/?reset=${token}`];
  return `<div class="flash" style="display:block"><p class="st">${icon("check-circle")}${tr("Lien valable 7 jours, à envoyer au client (un seul usage) :", "Link valid for 7 days, to send to the client (single use):")}</p>
    ${links.map((l, i) => `<p class="linkbox"><span class="muted">${i ? "EN" : "FR"}</span><code>${esc(l)}</code></p>`).join("")}</div>`;
}

// From a client's page: their membership (Acuity had no export of members).
async function clientMembership(id, form) {
  const client = (await db.query("SELECT email, first_name, last_name FROM rusc.clients WHERE id = $1", [id])).rows[0];
  if (!client?.email) throw refused("Il faut un e-mail pour l’adhésion.", "Membership needs an e-mail.");
  const until = String(form.get("until") ?? "");
  if (!until) {
    await db.query("DELETE FROM rusc.members WHERE lower(email) = lower($1)", [client.email]);
    return;
  }
  if (!isDay(until)) throw refused("Date invalide.", "Invalid date.");
  await db.query(
    `INSERT INTO rusc.members (email, name, until, note) VALUES (lower($1), $2, $3::date, $4)
     ON CONFLICT (email) DO UPDATE SET until = EXCLUDED.until, note = EXCLUDED.note`,
    [client.email, [client.first_name, client.last_name].filter(Boolean).join(" ") || null, until, tr("saisi dans l’admin", "entered in the admin")],
  );
}

// Online orders, newest first, with what each one paid for.
async function commandesPage() {
  const orders = await db.query("SELECT * FROM rusc.orders ORDER BY created_at DESC LIMIT 200");
  const codes = await db.query("SELECT order_id, key, display, label FROM rusc.codes WHERE order_id IS NOT NULL");
  const byOrder = new Map();
  for (const c of codes.rows) {
    if (!byOrder.has(c.order_id)) byOrder.set(c.order_id, []);
    byOrder.get(c.order_id).push(c);
  }
  const describe = (items) =>
    items
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        const [, key, cents, qty] = token.match(/^([a-z0-9-]+)(?::(\d+))?x(\d+)/) ?? [];
        const label = OFFERS[key] ? offerLabel(key) : productLabel(key);
        return `${esc(label)}${cents ? ` · ${esc(fmtAmount("euros", Number(cents) / 100))}` : ""}${Number(qty) > 1 ? ` × ${qty}` : ""}`;
      })
      .join("<br>");
  const rows = orders.rows
    .map((o) => {
      const made = (byOrder.get(o.id) ?? []).map((c) => `<a href="/admin/codes/${esc(c.key)}">${esc(c.display)}</a>`).join("<br>");
      return `<tr id="${esc(o.id)}"><td>${esc(fmtDateTime(o.created_at))}${o.livemode ? "" : ` <span class="pill">test</span>`}</td>
        <td>${esc(o.name ?? "")}<br><span class="muted">${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ""}</span></td>
        <td>${describe(o.items)}</td><td>${esc(fmtAmount("euros", o.amount))}</td><td>${made || `<span class="muted">—</span>`}</td></tr>`;
    })
    .join("");
  const notice = WEBHOOK_SECRET
    ? ""
    : `<p class="off">${icon("exclamation-triangle")} <b>${tr("Stripe n’est pas encore relié à l’admin", "Stripe isn’t linked to the admin yet")}</b> : ${tr("les commandes apparaîtront ici dès que la clé du webhook sera enregistrée.", "orders will show here once the webhook’s secret is saved.")}</p>`;
  return shell(
    "commandes",
    tr("Commandes", "Orders"),
    `<h1>${tr("Commandes", "Orders")}</h1><p class="muted">${tr("Les paiements en ligne du panier. Les carnets et bons cadeaux achetés reçoivent leur code automatiquement (colonne Codes) ; les cours payés apparaissent « Payé en ligne » dans Cours.", "Online payments from the cart. Cards and gift vouchers bought get their code automatically (Codes column); paid classes show as “Paid online” in Classes.")}</p>
     ${notice}
     <table><thead><tr><th>Date</th><th>${tr("Client", "Customer")}</th><th>${tr("Achat", "Bought")}</th><th>Total</th><th>Codes</th></tr></thead>
     <tbody>${rows || `<tr><td colspan="5" class="muted">${tr("Aucune commande pour l’instant.", "No orders yet.")}</td></tr>`}</tbody></table>
     ${await acuityOrdersTable()}`,
  );
}

// Orders from Acuity, before the switch (rusc.acuity_orders).
async function acuityOrdersTable() {
  const { rows } = await db.query(
    `SELECT o.*, o.ordered_at AT TIME ZONE 'Europe/Paris' AS ordered, c.id AS client_id
       FROM rusc.acuity_orders o LEFT JOIN rusc.clients c ON lower(c.email) = lower(o.email)
      ORDER BY o.ordered_at DESC LIMIT 500`,
  );
  if (!rows.length) return "";
  const body = rows
    .map((o) => {
      const who = esc([o.first_name, o.last_name].filter(Boolean).join(" ") || o.email || "—");
      return `<tr><td>${esc(fmtDateTime(o.ordered))}</td><td>${o.client_id ? `<a href="/admin/clients/${o.client_id}">${who}</a>` : who}</td>
        <td>${esc(o.products ?? "")}</td><td>${o.total !== null ? esc(fmtAmount("euros", num(o.total))) : "—"}</td><td class="muted">${esc(o.status ?? "")}</td></tr>`;
    })
    .join("");
  return `<h2>${tr("Avant le site : commandes Acuity", "Before the site: Acuity orders")}</h2>
    <p class="muted">${tr(`${rows.length} commandes de carnets et bons cadeaux passées sur Acuity.`, `${rows.length} card and gift-voucher orders placed on Acuity.`)}</p>
    <table><thead><tr><th>Date</th><th>${tr("Client", "Customer")}</th><th>${tr("Achat", "Bought")}</th><th>Total</th><th>${tr("État", "Status")}</th></tr></thead><tbody>${body}</tbody></table>`;
}

// ---------------------------------------------------------------- Clients

const clientName = (c) => [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || tr("Sans nom", "No name");
const SOURCE_CLIENT = { acuity: ["Acuity", "Acuity"], cal: ["Réservation", "Booking"], online: ["Achat en ligne", "Online order"], account: ["Compte en ligne", "Online account"] };

// Everyone the studio knows: Acuity's list and history, then bookings, orders
// and accounts. Most recent visit first.
async function clientsPage(url) {
  const q = (url.searchParams.get("q") ?? "").trim();
  const { rows } = await db.query(
    `SELECT c.*, m.until AS member_until,
            (SELECT count(*) FROM rusc.history h WHERE lower(h.email) = lower(c.email) AND NOT h.canceled) +
            (SELECT count(*) FROM public."Attendee" a JOIN public."Booking" b ON b.id = a."bookingId"
              WHERE lower(a.email) = lower(c.email) AND b.status IN ('accepted', 'pending')) AS visits,
            greatest((SELECT max(h.starts_at) FROM rusc.history h WHERE lower(h.email) = lower(c.email) AND NOT h.canceled AND h.starts_at < now()),
                     (SELECT max(b."startTime" AT TIME ZONE 'UTC') FROM public."Attendee" a JOIN public."Booking" b ON b.id = a."bookingId"
                       WHERE lower(a.email) = lower(c.email) AND b.status IN ('accepted', 'pending') AND b."startTime" < now() AT TIME ZONE 'UTC')) AS last_visit
       FROM rusc.clients c LEFT JOIN rusc.members m ON lower(m.email) = lower(c.email)
      WHERE $1 = '' OR lower(concat_ws(' ', c.first_name, c.last_name, c.email, c.phone, c.others::text)) LIKE $2
      ORDER BY last_visit DESC NULLS LAST, c.id DESC LIMIT 400`,
    [q, `%${q.toLowerCase()}%`],
  );
  const total = (await db.query("SELECT count(*) FROM rusc.clients")).rows[0].count;
  const today = parisToday();
  const list = rows
    .map((c) => {
      const member = c.member_until && isoDate(c.member_until) >= today ? ` <span class="pill">${tr("membre", "member")}</span>` : "";
      const others = Array.isArray(c.others) && c.others.length ? ` <span class="muted small">+ ${c.others.map((o) => esc([o.first_name, o.last_name].filter(Boolean).join(" "))).join(", ")}</span>` : "";
      return `<tr><td><a href="/admin/clients/${c.id}"><b>${esc(clientName(c))}</b></a>${others}${member}<br><span class="muted">${esc(c.email ?? "")}</span></td>
        <td>${esc(c.phone ?? "")}</td><td>${num(c.visits)}</td><td>${c.last_visit ? esc(fmtDate(c.last_visit)) : "—"}</td><td class="muted">${esc(tr(...(SOURCE_CLIENT[c.source] ?? [c.source, c.source])))}</td></tr>`;
    })
    .join("");
  return shell(
    "clients",
    tr("Clients", "Clients"),
    `<h1>${tr("Clients", "Clients")}</h1><p class="muted">${tr(`${total} clients : la liste d’Acuity avec ses notes, puis chaque personne qui réserve, achète ou ouvre un compte.`, `${total} clients: Acuity’s list with its notes, then everyone who books, buys or opens an account.`)}</p>
     <form class="search" method="get" action="/admin/clients"><span class="field">${icon("magnifying-glass")}<input name="q" type="search" value="${esc(q)}" placeholder="${tr("Nom, e-mail ou téléphone", "Name, e-mail or phone")}" aria-label="${tr("Chercher", "Search")}"></span><button class="plain">${tr("Chercher", "Search")}</button></form>
     <table><thead><tr><th>${tr("Client", "Client")}</th><th>${tr("Téléphone", "Phone")}</th><th>${tr("Réservations", "Bookings")}</th><th>${tr("Dernière venue", "Last visit")}</th><th>${tr("Origine", "Source")}</th></tr></thead>
     <tbody>${list || `<tr><td colspan="5" class="muted">${tr("Personne.", "Nobody.")}</td></tr>`}</tbody></table>
     ${rows.length === 400 ? `<p class="muted">${tr("Les 400 plus récents : cherchez pour trouver les autres.", "The 400 most recent: search to find the others.")}</p>` : ""}`,
  );
}

// One client: contact and notes, membership, online account, codes, every
// booking (Acuity's history and Cal) and every order.
async function clientPage(id, flash) {
  const c = (await db.query("SELECT * FROM rusc.clients WHERE id = $1", [id])).rows[0];
  if (!c) return null;
  const email = (c.email ?? "").toLowerCase();
  const [member, account, codes, history, cal, acuityOrders, orders] = await Promise.all([
    db.query("SELECT * FROM rusc.members WHERE lower(email) = $1", [email]),
    db.query("SELECT id, name, created_at, last_login_at FROM rusc.accounts WHERE lower(email) = $1", [email]),
    db.query(
      `SELECT c.* FROM rusc.codes c LEFT JOIN rusc.accounts a ON a.id = c.account_id
        WHERE $1 <> '' AND (lower(a.email) = $1 OR lower(coalesce(c.holder, '')) LIKE '%' || $1 || '%') ORDER BY c.created_at DESC`,
      [email],
    ),
    db.query("SELECT * FROM rusc.history WHERE $1 <> '' AND lower(email) = $1 ORDER BY starts_at DESC", [email]),
    db.query(
      `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, b.status, e.slug, e.title, s."referenceUid" AS seat_uid,
              k.display AS code, ps.order_id AS paid_order, dp.method AS desk_method, dp.amount_cents AS desk_cents, att.came
         FROM public."Attendee" a JOIN public."Booking" b ON b.id = a."bookingId" JOIN public."EventType" e ON e.id = b."eventTypeId"
         LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
         LEFT JOIN rusc.uses u ON u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL
         LEFT JOIN rusc.codes k ON k.key = u.key
         LEFT JOIN rusc.paid_seats ps ON ps.seat_uid = s."referenceUid"
         LEFT JOIN rusc.desk_payments dp ON dp.seat_uid = s."referenceUid"
         LEFT JOIN rusc.attendance att ON att.seat_uid = s."referenceUid"
        WHERE $1 <> '' AND lower(a.email) = $1 ORDER BY b."startTime" DESC`,
      [email],
    ),
    db.query("SELECT *, ordered_at AT TIME ZONE 'Europe/Paris' AS ordered FROM rusc.acuity_orders WHERE $1 <> '' AND lower(email) = $1 ORDER BY ordered_at DESC", [email]),
    db.query("SELECT * FROM rusc.orders WHERE $1 <> '' AND lower(email) = $1 ORDER BY created_at DESC", [email]),
  ]);
  const today = parisToday();
  const m = member.rows[0];
  const a = account.rows[0];

  const visits = [
    ...cal.rows.map((b) => ({
      at: new Date(b.starts),
      what: OFFERS[b.slug] ? offerLabel(b.slug) : b.title,
      came: b.came,
      how: b.status !== "accepted" && b.status !== "pending"
        ? `<span class="muted">${tr("annulée", "cancelled")}</span>`
        : b.code ? `<span class="st ok">${icon("ticket")}<span>Code ${esc(b.code)}</span></span>`
        : b.paid_order ? `<span class="st ok">${icon("check-circle")}${tr("Payé en ligne", "Paid online")}</span>`
        : b.desk_method ? deskPaid(b)
        : `<span class="muted">${tr("site", "site")}</span>`,
    })),
    ...history.rows.map((h) => ({
      at: new Date(h.starts_at),
      what: h.offer ? offerLabel(h.offer) : h.type,
      who: [h.first_name, h.last_name].filter(Boolean).join(" "),
      notes: h.notes,
      how: h.canceled ? `<span class="muted">${tr("annulé sur Acuity", "cancelled on Acuity")}</span>` : payment({ ...h, history: true }),
    })),
  ].sort((x, y) => y.at - x.at);
  const noShows = visits.filter((v) => v.came === false).length;
  const visitRows = visits
    .map((v) => `<tr><td>${esc(fmtDateTime(v.at))}${v.at > new Date() ? ` <span class="pill">${tr("à venir", "coming")}</span>` : ""}${v.came === true ? ` <span class="pill some">${tr("venu·e", "came")}</span>` : v.came === false ? ` <span class="pill full">${tr("absent·e", "no-show")}</span>` : ""}</td><td>${esc(v.what)}${v.who && v.who.toLowerCase() !== clientName(c).toLowerCase() ? `<br><span class="muted small">${esc(v.who)}</span>` : ""}${v.notes ? `<br><span class="muted small" style="white-space:pre-wrap">${esc(v.notes)}</span>` : ""}</td><td>${v.how}</td></tr>`)
    .join("");
  const codeRows = codes.rows
    .map((k) => `<tr><td><a href="/admin/codes/${esc(k.key)}"><b>${esc(k.display)}</b></a><br><span class="muted">${esc(k.label)}</span></td>
      <td>${esc(fmtAmount(k.unit, k.remaining))} <span class="muted">${tr("sur", "of")} ${esc(fmtAmount(k.unit, k.initial))}</span>${meter(k.remaining, k.initial, k.unit)}</td><td>${esc(fmtDate(k.expires_on))}</td></tr>`)
    .join("");
  const orderRows = [
    ...orders.rows.map((o) => `<tr><td>${esc(fmtDateTime(o.created_at))}</td><td><a href="/admin/commandes#${esc(o.id)}">${tr("En ligne", "Online")}</a></td><td>${esc(fmtAmount("euros", num(o.amount)))}</td></tr>`),
    ...acuityOrders.rows.map((o) => `<tr><td>${esc(fmtDateTime(o.ordered))}</td><td>${esc(o.products ?? "")} <span class="muted">· Acuity</span></td><td>${o.total !== null ? esc(fmtAmount("euros", num(o.total))) : "—"}</td></tr>`),
  ].join("");

  const accountBlock = a
    ? `<p>${tr("Compte créé le", "Account opened on")} ${esc(fmtDate(a.created_at))}${a.last_login_at ? ` · ${tr("dernière connexion", "last sign-in")} ${esc(fmtDate(a.last_login_at))}` : ""}</p>
       <form method="post" action="/admin/clients/${c.id}/reset"><button class="plain" type="submit">${tr("Créer un lien pour changer son mot de passe", "Make a link to change their password")}</button></form>`
    : `<p class="muted">${tr("Pas de compte sur le site. Il suffit de s’inscrire avec cet e-mail : ses réservations, codes et adhésion y apparaissent.", "No account on the site. Signing up with this e-mail is enough: their bookings, codes and membership show there.")}</p>`;

  return shell(
    "clients",
    clientName(c),
    `<p><a href="/admin/clients">${tr("← Tous les clients", "← All clients")}</a></p>
     ${flash ?? ""}
     <h1>${esc(clientName(c))}</h1>
     <div class="contact" style="font-size:15px">${c.email ? `<a href="mailto:${esc(c.email)}">${icon("envelope")}${esc(c.email)}</a>` : ""}${c.phone ? `<a href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ""))}">${icon("phone")}${esc(c.phone)}</a>` : ""}</div>
     <p class="muted">${esc(tr(...(SOURCE_CLIENT[c.source] ?? [c.source, c.source])))} · ${m ? (isoDate(m.until) >= today ? `<span class="ok">${tr("membre jusqu’au", "member until")} ${esc(fmtDate(m.until))}</span>` : `${tr("adhésion finie le", "membership ended on")} ${esc(fmtDate(m.until))}`) : tr("pas d’adhésion en ligne", "no online membership")}</p>
     <form class="linkbox" method="post" action="/admin/clients/${c.id}/member" style="margin:0 0 8px">
       <label style="display:flex;gap:8px;align-items:center">${tr("Membre jusqu’au", "Member until")}<input name="until" type="date" value="${m ? esc(isoDate(m.until)) : ""}"></label>
       <button class="plain small" type="submit">${tr("Enregistrer", "Save")}</button><span class="muted small">${tr("vide = pas membre", "empty = not a member")}</span></form>
     ${c.notes ? `<h2>${tr("Notes (Acuity)", "Notes (Acuity)")}</h2><p style="white-space:pre-wrap">${esc(c.notes)}</p>` : ""}
     ${Array.isArray(c.others) && c.others.length ? `<h2>${tr("Aussi à cet e-mail", "Also under this e-mail")}</h2><ul>${c.others.map((o) => `<li>${esc([o.first_name, o.last_name].filter(Boolean).join(" ") || "—")}${o.phone ? ` · <a href="tel:${esc(String(o.phone).replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a>` : ""}${o.notes ? `<br><span class="muted" style="white-space:pre-wrap">${esc(o.notes)}</span>` : ""}</li>`).join("")}</ul>` : ""}
     <h2>${tr("Compte sur le site", "Account on the site")}</h2>${accountBlock}
     <div class="titlebar"><h2>${tr("Codes", "Codes")}</h2><a class="action" href="/admin/codes?holder=${encodeURIComponent([clientName(c), c.email].filter(Boolean).join(" · "))}#nouveau">${icon("add")}${tr("Nouveau code", "New code")}</a></div>
     ${codeRows ? `<table><thead><tr><th>Code</th><th>${tr("Reste", "Left")}</th><th>${tr("Valable jusqu’au", "Valid until")}</th></tr></thead><tbody>${codeRows}</tbody></table>` : `<p class="muted">${tr("Aucun code à son nom.", "No codes in their name.")}</p>`}
     <h2>${tr("Réservations", "Bookings")} (${visits.length})${noShows ? ` <span class="pill full">${noShows} ${tr(noShows > 1 ? "absences" : "absence", noShows > 1 ? "no-shows" : "no-show")}</span>` : ""}</h2>
     ${visitRows ? `<table><thead><tr><th>${tr("Quand", "When")}</th><th>${tr("Cours", "Class")}</th><th>${tr("Paiement", "Payment")}</th></tr></thead><tbody>${visitRows}</tbody></table>` : `<p class="muted">${tr("Aucune.", "None.")}</p>`}
     <h2>${tr("Commandes", "Orders")}</h2>
     ${orderRows ? `<table><thead><tr><th>Date</th><th>${tr("Achat", "Bought")}</th><th>Total</th></tr></thead><tbody>${orderRows}</tbody></table>` : `<p class="muted">${tr("Aucune.", "None.")}</p>`}`,
  );
}


function offerBoxes(selected) {
  return `<fieldset><legend>${tr("Valable pour", "Valid for")}</legend>${Object.keys(OFFERS)
    .map((k) => `<label><input type="checkbox" name="offers" value="${k}"${selected.includes(k) ? " checked" : ""}> ${esc(offerLabel(k))}</label>`)
    .join("")}</fieldset>`;
}

// A code's balance at a glance, as in the member's space on the site: one notch
// per class or hour for a card of up to 20, otherwise a bar.
function meter(remaining, initial, unit) {
  const left = num(remaining);
  const total = num(initial);
  if (unit !== "euros" && Number.isInteger(total) && total >= 2 && total <= 20) {
    const notches = Array.from({ length: total }, (_, i) => `<i style="--f:${Math.round(Math.min(1, Math.max(0, left - i)) * 100)}%"></i>`);
    return `<span class="meter" aria-hidden="true">${notches.join("")}</span>`;
  }
  const share = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  return `<span class="meter" aria-hidden="true"><i style="--f:${Math.round(share * 100)}%"></i></span>`;
}

function newCodeForm(presetId, holder = "") {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[1];
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + p.months);
  return `
  <form class="box" method="post" action="/admin/codes">
    <label>Type
      <select name="preset" onchange="const q=new URLSearchParams(location.search);q.set('preset',this.value);location.href='?'+q+'#nouveau'">
        ${PRESETS.map((x) => `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${esc(tr(x.label, x.en))}</option>`).join("")}
      </select></label>
    <label>${tr("Intitulé (ce que voit le client)", "Label (what the customer sees)")}<input name="label" value="${esc(tr(p.label, p.en))}" required maxlength="80"></label>
    <label>${tr("Quantité", "Amount")}
      <span style="display:flex;gap:6px"><input name="amount" type="number" min="0.5" step="0.5" value="${p.amount}" required style="width:100px">
      <select name="unit">${Object.entries(UNIT).map(([u, t]) => `<option value="${u}"${u === p.unit ? " selected" : ""}>${tr(...t.many)}</option>`).join("")}</select></span></label>
    <label>${tr("Valable jusqu’au", "Valid until")}<input name="expires_on" type="date" value="${isoDate(expiry)}"></label>
    <label>${tr("Client (nom, e-mail)", "Customer (name, email)")}<input name="holder" maxlength="120" placeholder="${tr("facultatif", "optional")}" value="${esc(holder)}"></label>
    <label>Note<input name="note" maxlength="200" placeholder="${tr("ex. payé en espèces le 24/09", "e.g. paid in cash on 24/09")}"></label>
    <label>Code<input name="code" maxlength="40" placeholder="${tr("auto si vide", "auto if empty")}"></label>
    ${offerBoxes(presetOffers(p))}
    <div><button type="submit">${tr("Créer le code", "Create the code")}</button></div>
  </form>`;
}

async function adminHome(url) {
  const q = (url.searchParams.get("q") ?? "").trim();
  const like = `%${q.toLowerCase()}%`;
  const { rows } = await db.query(
    `SELECT c.*, (SELECT count(*) FROM rusc.uses u WHERE u.key = c.key AND u.cancelled_at IS NULL AND u.seat_uid IS NOT NULL) AS bookings
       FROM rusc.codes c
      WHERE $1 = '' OR lower(c.key) LIKE $2 OR lower(c.display) LIKE $2 OR lower(coalesce(c.holder,'')) LIKE $2 OR lower(c.label) LIKE $2
      ORDER BY c.created_at DESC LIMIT 300`,
    [q, like],
  );
  const today = parisToday();
  const list = rows
    .map((c) => {
      const expired = c.expires_on && isoDate(c.expires_on) < today;
      const state = !c.active ? `<span class="pill off">${tr("en pause", "paused")}</span>` : expired ? `<span class="pill off">${tr("expiré", "expired")}</span>` : "";
      return `<tr><td><a href="/admin/codes/${esc(c.key)}"><b>${esc(c.display)}</b></a> ${state}<br><span class="muted">${esc(c.label)}</span></td>
        <td>${esc(fmtAmount(c.unit, c.remaining))} <span class="muted">${tr("sur", "of")} ${esc(fmtAmount(c.unit, c.initial))}</span>${meter(c.remaining, c.initial, c.unit)}</td>
        <td>${esc(fmtDate(c.expires_on))}</td><td>${esc(c.holder ?? "")}</td><td>${num(c.bookings)}</td><td>${sourceLabel(c.source)}</td></tr>`;
    })
    .join("");
  return shell(
    "codes",
    "Codes",
    `<h1>Codes</h1><p class="muted">${tr("Carnets, bons cadeaux et codes de l’atelier. Un client utilise son code sur la page Réserver du site : chaque réservation est déduite ici.", "Class cards, gift vouchers and studio codes. A customer uses their code on the site’s booking page: each booking is taken off here.")}</p>
     <details class="new" id="nouveau"${["preset", "nouveau", "holder"].some((k) => url.searchParams.has(k)) ? " open" : ""}><summary>${icon("add")}${tr("Nouveau code", "New code")}</summary>
       ${newCodeForm(url.searchParams.get("preset"), String(url.searchParams.get("holder") ?? "").slice(0, 120))}</details>
     <h2>${tr("Tous les codes", "All codes")}</h2>
     <form class="search" method="get" action="/admin/codes"><span class="field">${icon("magnifying-glass")}<input name="q" type="search" value="${esc(q)}" placeholder="${tr("Chercher un code, un client, un type", "Search a code, a customer, a type")}" aria-label="${tr("Chercher", "Search")}"></span><button class="plain">${tr("Chercher", "Search")}</button></form>
     <table><thead><tr><th>Code</th><th>${tr("Reste", "Left")}</th><th>${tr("Valable jusqu’au", "Valid until")}</th><th>${tr("Client", "Customer")}</th><th>${tr("Réservations", "Bookings")}</th><th>${tr("Origine", "Source")}</th></tr></thead><tbody>${list || `<tr><td colspan="6" class="muted">${tr("Aucun code.", "No codes.")}</td></tr>`}</tbody></table>`,
  );
}

async function adminCode(key, flash) {
  const { rows } = await db.query("SELECT * FROM rusc.codes WHERE key = $1", [key]);
  const c = rows[0];
  if (!c) return null;
  const uses = await db.query("SELECT * FROM rusc.uses WHERE key = $1 ORDER BY at DESC", [key]);
  const history = uses.rows
    .map((u) => {
      const what = u.seat_uid
        ? `${esc(offerLabel(u.offer))} · ${esc(fmtDateTime(u.starts_at))}${u.attendee ? `<br><span class="muted">${esc(u.attendee)}</span>` : ""}`
        : esc(u.note ?? tr("Ajustement", "Adjustment"));
      const amount = num(u.amount) >= 0 ? `− ${fmtAmount(c.unit, u.amount)}` : `+ ${fmtAmount(c.unit, -num(u.amount))}`;
      return `<tr><td>${esc(fmtDateTime(u.at))}</td><td>${what}</td><td>${esc(amount)}${u.cancelled_at ? ` <span class="pill">${tr("annulée, rendue", "cancelled, given back")}</span>` : ""}</td></tr>`;
    })
    .join("");
  return shell(
    "codes",
    c.display,
    `<p><a href="/admin/codes">${tr("← Tous les codes", "← All codes")}</a></p>
     ${flash ? `<p class="flash">${icon("check-circle")}${esc(flash)}</p>` : ""}
     <div class="codebox"><div class="code">${esc(c.display)}</div>
       <button class="ibtn copy" type="button" data-copy="${esc(c.display)}" title="${tr("Copier le code", "Copy the code")}">${icon("clipboard-document", tr("Copier le code", "Copy the code"))}${icon("check", tr("Copié", "Copied"))}</button></div>
     <script>
       document.querySelector(".copy").addEventListener("click", async (event) => {
         const button = event.currentTarget;
         let copied = await navigator.clipboard?.writeText(button.dataset.copy).then(() => true, () => false);
         if (!copied) {
           // Where the clipboard API is refused: select the code and use the older
           // copy command; if that fails too, the code stays selected for ⌘C / Ctrl+C.
           const range = document.createRange();
           range.selectNodeContents(document.querySelector(".code"));
           getSelection().removeAllRanges();
           getSelection().addRange(range);
           copied = document.execCommand("copy");
         }
         if (copied) {
           button.classList.add("done");
           setTimeout(() => button.classList.remove("done"), 1800);
         }
       });
     </script>
     <h1 style="margin-top:14px">${esc(c.label)}</h1>
     <p>${tr("Reste", "Left:")} <b>${esc(fmtAmount(c.unit, c.remaining))}</b> ${tr("sur", "of")} ${esc(fmtAmount(c.unit, c.initial))} · ${tr("valable jusqu’au", "valid until")} ${esc(fmtDate(c.expires_on))}
       ${!c.active ? ` · <span class="off">${tr("en pause", "paused")}</span>` : ""}</p>
     <div class="meter-wide">${meter(c.remaining, c.initial, c.unit)}</div>
     <p class="muted">${tr("Pour", "For")} : ${c.offers.map((k) => esc(offerLabel(k))).join(", ")}${c.holder ? ` · ${tr("Client", "Customer")} : ${esc(c.holder)}` : ""}${c.note ? ` · ${esc(c.note)}` : ""}</p><p>${sourceLabel(c.source)}</p>
     <h2>${tr("Ajuster le solde", "Adjust the balance")}</h2>
     <form class="box" method="post" action="/admin/codes/${esc(c.key)}/adjust">
       <label>${tr("Ajouter (+) ou retirer (−)", "Add (+) or take off (−)")}<input name="delta" type="number" step="0.5" required placeholder="${tr("ex. -1 ou 2", "e.g. -1 or 2")}"></label>
       <label>${tr("Raison", "Reason")}<input name="note" maxlength="200" required placeholder="${tr("ex. séance réservée par téléphone", "e.g. class booked by phone")}"></label>
       <div><button type="submit">${tr("Enregistrer", "Save")}</button></div>
     </form>
     <form method="post" action="/admin/codes/${esc(c.key)}/active" style="margin-top:12px"${c.active ? ` onsubmit="return confirm(${esc(JSON.stringify(tr("Mettre ce code en pause ? Il ne paiera plus aucun cours jusqu’à sa réactivation.", "Pause this code? It won’t pay for any class until it’s reactivated.")))})"` : ""}>
       <input type="hidden" name="active" value="${c.active ? "0" : "1"}">
       <button class="plain" type="submit">${c.active ? tr("Mettre en pause (le code ne marche plus)", "Pause (the code stops working)") : tr("Réactiver le code", "Reactivate the code")}</button>
     </form>
     <h2>${tr("Historique", "History")}</h2>
     <table><thead><tr><th>${tr("Quand", "When")}</th><th>${tr("Quoi", "What")}</th><th>${tr("Solde", "Balance")}</th></tr></thead><tbody>${history || `<tr><td colspan="3" class="muted">${tr("Pas encore utilisé.", "Not used yet.")}</td></tr>`}</tbody></table>`,
  );
}

async function adminCreate(form) {
  const unit = UNIT[form.get("unit")] ? form.get("unit") : "sessions";
  const amount = num(form.get("amount"));
  const offers = form.getAll("offers").filter((k) => OFFERS[k]);
  const label = String(form.get("label") ?? "").trim().slice(0, 80);
  if (!(amount > 0) || !offers.length || !label) throw Object.assign(new Error(tr("Quantité, intitulé et au moins un cours sont nécessaires.", "An amount, a label and at least one class are needed.")), { status: 400 });
  const custom = normalize(form.get("code"));
  const { key, display } = custom ? { key: custom, display: String(form.get("code")).trim().toUpperCase() } : newCode();
  const expires = String(form.get("expires_on") ?? "") || null;
  const result = await db.query(
    `INSERT INTO rusc.codes (key, display, label, unit, offers, initial, remaining, expires_on, holder, note, source)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, 'studio') ON CONFLICT (key) DO NOTHING RETURNING key`,
    [key, display, label, unit, offers, amount, expires, String(form.get("holder") ?? "").trim().slice(0, 120) || null, String(form.get("note") ?? "").trim().slice(0, 200) || null],
  );
  if (!result.rowCount) throw Object.assign(new Error(tr("Ce code existe déjà.", "This code already exists.")), { status: 409 });
  return key;
}

async function adminAdjust(key, form) {
  const delta = num(form.get("delta"));
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!delta || !note) throw Object.assign(new Error(tr("Montant et raison sont nécessaires.", "An amount and a reason are needed.")), { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      "UPDATE rusc.codes SET remaining = remaining + $2 WHERE key = $1 AND remaining + $2 >= 0 RETURNING key",
      [key, delta],
    );
    if (!updated.rowCount) throw Object.assign(new Error(tr("Le solde ne peut pas passer sous zéro.", "The balance can’t go below zero.")), { status: 400 });
    await client.query("INSERT INTO rusc.uses (key, amount, note) VALUES ($1, $2, $3)", [key, -delta, note]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- server

// The page language: cookie rusc_lang ("en" or French by default).
const langOf = (req) => (/(?:^|;\s*)rusc_lang=en(?:;|$)/.test(req.headers.cookie ?? "") ? "en" : "fr");

async function handle(req, res, url) {
  try {
    // The classes made here, as of the last 30 seconds (OFFERS, codes, pages).
    await syncClasses();
    // FR · EN switch: remembered for a year, then back to the same page.
    if (url.pathname === "/lang") {
      const to = url.searchParams.get("to") === "en" ? "en" : "fr";
      const back = String(url.searchParams.get("back") ?? "");
      const target = /^\/(admin|login)[\w/?=&.-]*$/.test(back) ? back : "/admin/cours";
      return send(res, 303, "", { location: target, "set-cookie": `rusc_lang=${to}; Path=/; Secure; SameSite=Lax; Max-Age=31536000` });
    }
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    // Team calendar feed, public but keyed: the link carries the secret so the
    // phone can load it without a login password (which calendar apps can't
    // submit). Serve only when the key matches.
    if (url.pathname === "/cal.ics") {
      if (String(url.searchParams.get("k") ?? "") !== CAL_FEED_KEY) return send(res, 404, { ok: false });
      return send(res, 200, await calFeed(), { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-cache" });
    }
    // Mailing opt-out: a link from our emails removes that address. Public, no auth.
    if (url.pathname === "/unsubscribe") {
      const em = String(url.searchParams.get("email") ?? "").trim().toLowerCase();
      if (EMAIL.test(em)) {
        await db.query("INSERT INTO rusc.unsubscribed (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [em]);
      }
      return send(res, 200, page(tr("Désinscription", "Unsubscribed"), `<h1 class="brand">${brand(20)}</h1><p>${tr("Vous ne recevrez plus ces messages. Merci.", "You will no longer receive these messages. Thank you.")}</p>`));
    }
    // Cal's cron loop calls this every few minutes (deploy/cal/cron.sh): it
    // wakes rūsc admin, which then frees unpaid places whose hold ran out.
    if (url.pathname === "/tasks/release-places") {
      await releaseExpired();
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/logo.webp") return send(res, 200, LOGO, { "content-type": "image/webp", "cache-control": "public, max-age=604800" });
    const photo = url.pathname.match(/^\/photos\/([a-z0-9-]+)\.jpg$/);
    if (photo && PHOTO_FILES.has(photo[1])) return send(res, 200, PHOTO_FILES.get(photo[1]), { "content-type": "image/jpeg", "cache-control": "public, max-age=604800" });

    if (url.pathname === "/stripe/webhook" && req.method === "POST") {
      const body = await readBody(req, 512 * 1024);
      // One log line per delivery (event id and type, never customer data),
      // so `fly logs -a rusc-admin` shows whether Stripe reaches us and why not.
      const { event, problem } = stripeCheck(body, req.headers["stripe-signature"]);
      if (!event) {
        console.log(`stripe webhook refused: ${problem}`);
        return send(res, 400, { ok: false });
      }
      console.log(`stripe webhook ${event.id} ${event.type} ${event.livemode ? "live" : "test"}`);
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        await recordOrder(event.data.object);
      } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
        await releaseHold(event.data.object);
      }
      return send(res, 200, { received: true });
    }

    if (url.pathname === "/import/acuity" && IMPORT_TOKEN) {
      const headers = req.headers.origin === IMPORT_ORIGIN
        ? { "access-control-allow-origin": IMPORT_ORIGIN, "access-control-allow-headers": "content-type, x-import-token", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" }
        : {};
      if (req.method === "OPTIONS") return send(res, 204, {}, headers);
      if (req.method !== "POST" || !sameText(req.headers["x-import-token"] ?? "", IMPORT_TOKEN)) return send(res, 403, { ok: false }, headers);
      const payload = JSON.parse(await readBody(req, 5 * 1024 * 1024));
      // "acuity": codes and upcoming bookings (acuity-extract.js); "acuity-history":
      // every appointment, the orders and the client list (acuity-history.mjs).
      const source = url.searchParams.get("source") === "acuity-history" ? "acuity-history" : "acuity";
      await db.query("INSERT INTO rusc.imports (source, payload) VALUES ($1, $2)", [source, payload]);
      const count = (key) => (Array.isArray(payload[key]) ? payload[key].length : 0);
      return send(res, 200, { ok: true, source, codes: count("codes"), appointments: count("appointments"), orders: count("orders"), clients: count("clients") }, headers);
    }

    if (url.pathname.startsWith("/api/auth/")) {
      const headers = cors(req);
      if (req.method === "OPTIONS") return send(res, 204, {}, headers);
      const [status, body] = await authApi(req, url);
      return send(res, status, body, headers);
    }

    if (url.pathname.startsWith("/api/")) {
      const headers = cors(req);
      if (req.method === "OPTIONS") return send(res, 204, {}, headers);
      // The site's booking page and checkout: a change here shows within a minute.
      if (url.pathname === "/api/classes" && req.method === "GET") {
        return send(res, 200, apiClasses(), { ...headers, "cache-control": "public, max-age=30" });
      }
      if (url.pathname === "/api/order" && req.method === "GET") {
        if (limited(req, 60)) return send(res, 429, { paid: false, codes: [] }, headers);
        return send(res, 200, await apiOrder(String(url.searchParams.get("id") ?? "")), headers);
      }
      // Places (the cart): their own, larger allowance. Seat references can't
      // be guessed, and checkouts all come from the site's few server addresses.
      if (url.pathname === "/api/places" || url.pathname === "/api/places/checkout") {
        if (limited(req, 300, "places:")) return send(res, 429, { ok: false, reason: "too_many" }, headers);
        const seatList = (list) => (Array.isArray(list) ? list : []).map((s) => String(s).slice(0, 100)).filter(Boolean).slice(0, 20);
        if (url.pathname === "/api/places" && req.method === "GET") {
          return send(res, 200, await apiPlacesState(seatList(String(url.searchParams.get("seats") ?? "").split(","))), headers);
        }
        if (req.method !== "POST") return send(res, 405, { ok: false }, headers);
        const input = JSON.parse((await readBody(req)) || "{}");
        if (url.pathname === "/api/places/checkout") return send(res, 200, await apiPlacesCheckout(seatList(input.seats)), headers);
        return send(res, 200, await apiPlaces(input), headers);
      }
      if (req.method !== "POST") return send(res, 405, { ok: false }, headers);
      if (limited(req, 40)) return send(res, 429, { ok: false, reason: "too_many" }, headers);
      reconcile().catch((e) => console.error("reconcile", e.message));
      const input = JSON.parse((await readBody(req)) || "{}");
      if (url.pathname === "/api/check") return send(res, 200, await apiCheck(input), headers);
      if (url.pathname === "/api/cover") return send(res, 200, await apiCover(input), headers);
      if (url.pathname === "/api/release") return send(res, 200, await apiRelease(input), headers);
      if (url.pathname === "/api/redeem") {
        const result = await apiRedeem(input);
        if (result.ok) console.log("code used", result.code, input.seatUid?.slice(0, 8));
        return send(res, 200, result, headers);
      }
      return send(res, 404, { ok: false }, headers);
    }

    if (url.pathname === "/login") {
      if (!ADMIN_PASSWORD) return send(res, 503, page(tr("Connexion", "Sign in"), `<h1 class="brand">${brand(30)}</h1><p>${tr("Pas encore de mot de passe", "No password yet")} : <code>fly secrets set -a rusc-admin CODES_ADMIN_PASSWORD=…</code></p>`));
      const next = url.searchParams.get("next") ?? "/admin/cours";
      if (req.method !== "POST") return send(res, 200, loginPage("", next));
      if (limited(req, 10)) return send(res, 429, loginPage(tr("Trop d’essais : réessayez dans quelques minutes.", "Too many tries: please try again in a few minutes."), next));
      const form = new URLSearchParams(await readBody(req));
      const target = String(form.get("next") ?? "");
      // Back to the page asked for, with its view (?vue=calendrier&mois=…), never elsewhere.
      const safeNext = /^\/admin(\/[\w/-]*)?(\?[\w=&-]*)?$/.test(target) ? target : "/admin/cours";
      if (!sameText(form.get("password") ?? "", ADMIN_PASSWORD)) return send(res, 401, loginPage(tr("Mot de passe incorrect.", "Wrong password."), safeNext));
      return send(res, 303, "", { location: safeNext, "set-cookie": sessionCookie() });
    }
    if (url.pathname === "/logout") {
      return send(res, 303, "", { location: "/login", "set-cookie": "rusc_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
    }
    if (url.pathname === "/" ) return send(res, 303, "", { location: "/admin/cours" });

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      if (!signedIn(req)) return send(res, 303, "", { location: `/login?next=${encodeURIComponent(url.pathname + url.search)}` });
      await reconcile();
      if (req.method === "POST") {
        // Forms only come from these pages.
        const origin = req.headers.origin;
        if (origin && origin !== `https://${req.headers.host}`) return send(res, 403, page(tr("Refusé", "Refused"), `<p>${tr("Refusé.", "Refused.")}</p>`));
        const form = new URLSearchParams(await readBody(req));
        const match = url.pathname.match(/^\/admin\/codes\/([A-Z0-9]+)\/(adjust|active)$/);
        const clientAction = url.pathname.match(/^\/admin\/clients\/(\d+)\/(reset|member)$/);
        const classAction = url.pathname.match(/^\/admin\/cours\/offre\/([a-z0-9-]+)(\/site)?$/);
        if (url.pathname === "/admin/cours/nouveau") {
          const key = await classCreate(form);
          return send(res, 303, "", { location: `/admin/horaires?created=1#${key}` });
        }
        if (classAction) {
          if (classAction[2]) await classToggle(classAction[1]);
          else await classUpdate(classAction[1], form);
          return send(res, 303, "", { location: `/admin/cours/offre/${classAction[1]}?saved=1` });
        }
        if (clientAction && clientAction[2] === "reset") {
          return send(res, 200, await clientPage(clientAction[1], await clientResetLink(clientAction[1])));
        }
        if (clientAction && clientAction[2] === "member") {
          await clientMembership(clientAction[1], form);
          return send(res, 303, "", { location: `/admin/clients/${clientAction[1]}?saved=1` });
        }
        if (url.pathname === "/admin/cours/ajouter") {
          const { refused: why } = await addPerson(form);
          return send(res, 303, "", { location: coursBack(form, why ? "code" : "added", why) });
        }
        if (url.pathname === "/admin/places/paid") {
          await placePaid(form);
          return send(res, 303, "", { location: coursBack(form, "paid") });
        }
        if (url.pathname === "/admin/places/unpaid") {
          await placeUnpaid(form);
          return send(res, 303, "", { location: coursBack(form, "undone") });
        }
        if (url.pathname === "/admin/places/presence") {
          await placePresence(form);
          return send(res, 303, "", { location: coursBack(form) });
        }
        if (url.pathname === "/admin/horaires/add") {
          const slug = await horairesAdd(form);
          return send(res, 303, "", { location: `/admin/horaires?saved=1#${slug}` });
        }
        if (url.pathname === "/admin/horaires/remove") {
          const slug = await horairesRemove(form);
          return send(res, 303, "", { location: `/admin/horaires?saved=1#${slug}` });
        }
        if (url.pathname === "/admin/horaires/close") {
          const { closed, skipped } = await horairesClose(form);
          return send(res, 303, "", { location: `/admin/horaires?closed=${closed}&skipped=${skipped}` });
        }
        if (url.pathname === "/admin/codes") {
          const key = await adminCreate(form);
          return send(res, 303, "", { location: `/admin/codes/${key}?created=1` });
        }
        if (match && match[2] === "adjust") {
          await adminAdjust(match[1], form);
          return send(res, 303, "", { location: `/admin/codes/${match[1]}?saved=1` });
        }
        if (match && match[2] === "active") {
          await db.query("UPDATE rusc.codes SET active = $2 WHERE key = $1", [match[1], form.get("active") === "1"]);
          return send(res, 303, "", { location: `/admin/codes/${match[1]}?saved=1` });
        }
        return send(res, 404, page(tr("Introuvable", "Not found"), `<p>${tr("Introuvable.", "Not found.")}</p>`));
      }
      if (url.pathname === "/admin" || url.pathname === "/admin/") return send(res, 303, "", { location: "/admin/cours" });
      if (url.pathname === "/admin/cours") return send(res, 200, await coursPage(url));
      if (url.pathname === "/admin/codes") return send(res, 200, await adminHome(url));
      if (url.pathname === "/admin/commandes") return send(res, 200, await commandesPage());
      if (url.pathname === "/admin/clients") return send(res, 200, await clientsPage(url));
      if (url.pathname === "/admin/horaires") return send(res, 200, await horairesPage(url));
      if (url.pathname === "/admin/cours/nouveau") return send(res, 200, classNewPage());
      const madeClass = url.pathname.match(/^\/admin\/cours\/offre\/([a-z0-9-]+)$/);
      if (madeClass) {
        const html = await classEditPage(madeClass[1], url.searchParams.has("saved") ? tr("Enregistré.", "Saved.") : "");
        return html ? send(res, 200, html) : send(res, 404, shell("horaires", tr("Introuvable", "Not found"), `<p>${tr("Cours introuvable.", "Class not found.")}</p>`));
      }
      const client = url.pathname.match(/^\/admin\/clients\/(\d+)$/);
      if (client) {
        const html = await clientPage(client[1], url.searchParams.has("saved") ? `<p class="flash">${icon("check-circle")}${tr("Enregistré.", "Saved.")}</p>` : "");
        return html ? send(res, 200, html) : send(res, 404, shell("clients", tr("Introuvable", "Not found"), `<p>${tr("Client introuvable.", "Client not found.")}</p>`));
      }
      const code = url.pathname.match(/^\/admin\/codes\/([A-Z0-9]+)$/);
      if (code) {
        const flash = url.searchParams.has("created") ? tr("Code créé : donnez-le au client.", "Code created: give it to the customer.") : url.searchParams.has("saved") ? tr("Enregistré.", "Saved.") : "";
        const html = await adminCode(code[1], flash);
        return html ? send(res, 200, html) : send(res, 404, page(tr("Introuvable", "Not found"), `<p>${tr("Code introuvable.", "Code not found.")}</p>`));
      }
      return send(res, 404, shell("", tr("Introuvable", "Not found"), `<p>${tr("Introuvable.", "Not found.")}</p>`));
    }

    send(res, 404, { ok: false });
  } catch (error) {
    const status = error.status ?? (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error(req.method, url.pathname, error);
    if (url.pathname.startsWith("/admin")) {
      return send(res, status, page(tr("Erreur", "Error"), `<p class="st off">${icon("exclamation-triangle")}<b>${esc(status === 500 ? tr("Erreur, réessayez.", "Something went wrong, please try again.") : error.message)}</b></p><p><a href="javascript:history.back()">${tr("← Retour", "← Back")}</a></p>`));
    }
    send(res, status, { ok: false, reason: status === 500 ? "error" : "bad_request" }, cors(req));
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  request.run({ lang: langOf(req), path: url.pathname + url.search }, () => handle(req, res, url));
});

server.listen(PORT, "0.0.0.0", () => console.log(`rusc-admin on :${PORT}`));

// Unpaid places whose hold ran out are freed while rūsc admin is awake.
if (process.env.DATABASE_URL) setInterval(() => releaseExpired().catch((e) => console.error("release", e.message)), 60_000).unref();
