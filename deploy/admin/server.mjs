// rūsc admin: the studio's one back office, and the codes behind it.
// Runs on Fly as rusc-admin (deploy/admin/README.md).
//
// Studio pages (sign in at /login with CODES_ADMIN_PASSWORD):
//   /admin/cours   the classes: who's coming, places left, how each paid; as a
//                  list of the coming days, a month calendar, or one day
//   /admin/codes   carnets, gift vouchers and codes the studio issues itself (a
//                  carnet paid in cash at the studio…): create, adjust, pause
//   /admin/commandes  online orders; carnets and vouchers bought get their code
// Stripe calls POST /stripe/webhook (checkout.session.completed), checked with
// the endpoint's signing secret STRIPE_WEBHOOK_SECRET.
// Public API, called by the booking page (components/BookingEmbed.tsx):
//   POST /api/check   {code, offer}    what's left, and whether it covers that class
//   POST /api/redeem  {code, seatUid}  takes the class just booked in Cal off the code
//   GET  /api/order?id=cs_…            the codes an online order created (thank-you screen)
//
// Data: schema "rusc" of the Cal.diy database (schema.sql). Cal's own tables
// are only read (bookings, seats, event types, attendees), never written.

import { AsyncLocalStorage } from "node:async_hooks";
import http from "node:http";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
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
const OFFERS = {
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
  { id: "montant", label: "Bon cadeau · montant", en: "Gift voucher · amount", unit: "euros", amount: 50, offers: Object.keys(OFFERS), months: 6 },
];
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
function limited(req, max) {
  const ip = req.headers["fly-client-ip"] ?? req.socket.remoteAddress ?? "?";
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
    ? { "access-control-allow-origin": origin, "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST, OPTIONS", vary: "origin" }
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
            b."endTime" AS end_time, b.status, e.slug, a.name, a.email
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
    await client.query("COMMIT");
    return { ok: true, used: amount, ...publicCode(after.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- online orders

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
// One-off import from the Acuity admin page (scripts/continuity/): only open
// while the Fly secret IMPORT_TOKEN is set, and only from Acuity's admin.
const IMPORT_TOKEN = process.env.IMPORT_TOKEN ?? "";
const IMPORT_ORIGIN = "https://secure.acuityscheduling.com";

// Stripe's signature: header "t=<time>,v1=<hex>…", HMAC-SHA256 of "<t>.<body>".
function stripeEvent(body, header) {
  if (!WEBHOOK_SECRET || !header) return null;
  const time = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|,)v1=([0-9a-f]+)/g)].map((m) => m[1]);
  if (!time || !signatures.length || Math.abs(Date.now() / 1000 - Number(time)) > 300) return null;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(`${time}.${body}`).digest("hex");
  return signatures.some((signature) => sameText(signature, expected)) ? JSON.parse(body) : null;
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
      `INSERT INTO rusc.orders (id, email, name, amount, lang, items, livemode) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [session.id, email, name, (session.amount_total ?? 0) / 100, metadata.lang ?? null, items, Boolean(session.livemode)],
    );
    if (!inserted.rowCount) {
      await client.query("ROLLBACK");
      return;
    }
    const holder = [name, email].filter(Boolean).join(" · ") || null;
    const note = `Commande en ligne du ${fmtDate(parisToday())}`;
    const english = metadata.lang === "en"; // the code's label in the buyer's language
    for (const token of items.split(/\s+/).filter(Boolean)) {
      const match = token.match(/^([a-z0-9-]+)x(\d+)(?:@(.+))?$/);
      if (!match) continue;
      const [, key, qtyText, ref] = match;
      const qty = Math.min(Number(qtyText) || 1, 20);
      if (OFFERS[key]) {
        if (ref) await client.query("INSERT INTO rusc.paid_seats (seat_uid, order_id, offer) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [ref, session.id, key]);
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
      for (let i = 0; i < qty; i++) {
        const { key: codeKey, display } = newCode();
        await client.query(
          `INSERT INTO rusc.codes (key, display, label, unit, offers, initial, remaining, expires_on, holder, note, source, order_id)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, 'online', $10)`,
          [codeKey, display, product.codeLabel?.[english ? 1 : 0] ?? (english ? preset.en : preset.label), preset.unit, preset.offers, preset.amount, addMonths(preset.months), holder, note, session.id],
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

async function apiOrder(id) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return { paid: false, codes: [] };
  const order = await db.query("SELECT id FROM rusc.orders WHERE id = $1", [id]);
  if (!order.rowCount) return { paid: false, codes: [] };
  const { rows } = await db.query("SELECT * FROM rusc.codes WHERE order_id = $1 ORDER BY created_at, key", [id]);
  return { paid: true, codes: rows.map((c) => ({ code: c.display, label: c.label, unit: c.unit, remaining: num(c.remaining), expiresOn: isoDate(c.expires_on) })) };
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
  :root{--bg:#f4f1ea;--ink:#141415;--muted:#6b6a64;--line:#dcd7cb;--accent:#3b4e3e;--warn:#9a4b2b}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif}
  main{max-width:980px;margin:0 auto;padding:28px 16px 60px}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:34px 0 12px}
  a{color:var(--accent)}p.muted,.muted{color:var(--muted)}table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:600;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  form.box{background:#fff;border:1px solid var(--line);padding:18px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
  label{display:grid;gap:4px;font-size:13px;color:var(--muted)}input,select,textarea{font:inherit;padding:8px;border:1px solid var(--line);background:#fff;color:var(--ink)}
  fieldset{border:1px solid var(--line);grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px}fieldset label{display:flex;gap:6px;color:var(--ink);align-items:center}
  button{font:inherit;background:var(--accent);color:#fff;border:0;padding:10px 16px;cursor:pointer}button.plain{background:none;color:var(--accent);border:1px solid var(--accent)}
  .code{font:600 26px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.06em;background:#fff;border:1px solid var(--line);padding:14px 18px;display:inline-block}
  .off{color:var(--warn)}.pill{font-size:12px;border:1px solid var(--line);padding:1px 8px;border-radius:99px;white-space:nowrap}
  .search{display:flex;gap:8px;margin:0 0 12px}.search input{flex:1}
  header.top{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:0 0 18px;margin:0 0 22px;border-bottom:1px solid var(--line)}
  header.top nav{display:flex;gap:16px;flex:1;flex-wrap:wrap}header.top nav a{text-decoration:none}header.top nav a[aria-current]{font-weight:600;text-decoration:underline}
  .soon{color:var(--muted);opacity:.6}.login{max-width:360px;margin:12vh auto 0}.login form.box{grid-template-columns:1fr}
  .session{background:#fff;border:1px solid var(--line);padding:12px 14px;margin:0 0 12px}.session .head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
  .session table td{font-size:14px}.ok{color:var(--accent)}.day{margin:28px 0 10px}.day::first-letter{text-transform:uppercase}
  .i{flex:none;vertical-align:-3px}.st{display:inline-flex;align-items:baseline;gap:6px}.st .i{align-self:center}
  .contact{display:flex;flex-wrap:wrap;gap:2px 14px;margin-top:2px}.contact a{display:inline-flex;align-items:center;gap:5px;color:var(--muted)}
  .ibtn{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);cursor:pointer}
  .ibtn:hover{border-color:var(--accent);color:var(--accent)}.codebox{display:flex;gap:10px;align-items:center}
  .copy .i+.i,.copy.done .i:first-child{display:none}.copy.done .i+.i{display:block}.copy.done{border-color:var(--accent);color:var(--accent)}
  .field{position:relative;flex:1;display:flex}.field .i{position:absolute;left:10px;top:50%;margin-top:-8px;color:var(--muted);pointer-events:none}.field input{flex:1;padding-left:32px}
  .brand{display:inline-flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none}.brand .logo{display:block}.brand span{color:var(--muted);font-weight:500}
  h1.brand{margin:0 0 10px}h1.brand span{font-size:22px}
  @media (max-width:700px){header.top{gap:12px 16px}header.top nav{order:3;flex-basis:100%}header.top .lang{margin-left:auto}}
  .flash{display:flex;gap:8px;align-items:center;color:var(--accent);font-weight:600}
  .session:target{box-shadow:0 0 0 2px var(--accent)}.cap::first-letter{text-transform:uppercase}.small{font-size:13px}
  nav.tabs{display:flex;gap:6px;margin:12px 0 18px}nav.tabs a{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border:1px solid var(--line);background:#fff;text-decoration:none}nav.tabs a[aria-current]{background:var(--accent);border-color:var(--accent);color:#fff}
  .calnav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 12px}.calnav h2{margin:0}.calnav a{text-decoration:none}.calnav .muted{margin-left:auto}
  main:has(.cal){max-width:1240px}.cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}
  .cal .dow{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
  .cal .cell{min-height:104px;min-width:0;padding:4px;display:flex;flex-direction:column;gap:3px;background:#fff;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
  .cal .cell.out{background:transparent}.cal .out .date,.cal .past .date{color:var(--muted)}.cal .cell.today{box-shadow:inset 0 0 0 2px var(--accent)}
  .cal .date{align-self:flex-start;padding:0 3px;font-size:13px;color:var(--ink);text-decoration:none}.cal .w{display:none}.cal .past .chip{opacity:.6}
  .chip{display:flex;gap:4px;align-items:baseline;min-width:0;padding:2px 4px;font-size:12px;line-height:1.35;color:var(--ink);text-decoration:none;background:var(--bg);border-left:3px solid var(--line)}
  .chip .l{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chip.some{border-left-color:var(--accent)}.chip.full{border-left-color:var(--warn);background:#f3e3da}
  @media (max-width:700px){.cal{display:block;border:0}.cal .dow,.cal .cell.empty,.cal .cell.out{display:none}.cal .cell{min-height:0;padding:12px 0;background:none;border:0;border-bottom:1px solid var(--line)}.cal .cell.today{box-shadow:none}.cal .n{display:none}.cal .w{display:block;font-weight:600;margin-bottom:4px}.chip{padding:6px 8px;font-size:14px}}
`;
// Icons: Heroicons 2.2 (MIT, Tailwind Labs, heroicons.com), inlined. Only where
// they carry meaning: a payment state, a control, a kind of contact, where a
// code comes from. 16 is the micro set, drawn for text; 20 the mini set, for
// round buttons.
const ICONS = {
  "check-circle": [16, '<path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clip-rule="evenodd"/>'],
  "ticket": [16, '<path fill-rule="evenodd" d="M1 4.5A1.5 1.5 0 0 1 2.5 3h11A1.5 1.5 0 0 1 15 4.5v1c0 .276-.227.494-.495.562a2 2 0 0 0 0 3.876c.268.068.495.286.495.562v1a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11.5v-1c0-.276.227-.494.495-.562a2 2 0 0 0 0-3.876C1.227 5.994 1 5.776 1 5.5v-1Zm9 1.25a.75.75 0 0 1 1.5 0v1a.75.75 0 0 1-1.5 0v-1Zm.75 2.75a.75.75 0 0 0-.75.75v1a.75.75 0 0 0 1.5 0v-1a.75.75 0 0 0-.75-.75Z" clip-rule="evenodd"/>'],
  "exclamation-circle": [16, '<path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>'],
  "exclamation-triangle": [16, '<path fill-rule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>'],
  "question-mark-circle": [16, '<path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.459.134-1.033.566-1.033 1.29v.25a.75.75 0 1 0 1.5 0v-.115a2.5 2.5 0 1 0-2.518-4.153.75.75 0 1 0 1.061 1.06Z" clip-rule="evenodd"/>'],
  "envelope": [16, '<path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"/><path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z"/>'],
  "phone": [16, '<path fill-rule="evenodd" d="m3.855 7.286 1.067-.534a1 1 0 0 0 .542-1.046l-.44-2.858A1 1 0 0 0 4.036 2H3a1 1 0 0 0-1 1v2c0 .709.082 1.4.238 2.062a9.012 9.012 0 0 0 6.7 6.7A9.024 9.024 0 0 0 11 14h2a1 1 0 0 0 1-1v-1.036a1 1 0 0 0-.848-.988l-2.858-.44a1 1 0 0 0-1.046.542l-.534 1.067a7.52 7.52 0 0 1-4.86-4.859Z" clip-rule="evenodd"/>'],
  "magnifying-glass": [16, '<path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd"/>'],
  "building-storefront": [16, '<path d="M4.5 7c.681 0 1.3-.273 1.75-.715C6.7 6.727 7.319 7 8 7s1.3-.273 1.75-.715A2.5 2.5 0 1 0 11.5 2h-7a2.5 2.5 0 0 0 0 5ZM6.25 8.097A3.986 3.986 0 0 1 4.5 8.5c-.53 0-1.037-.103-1.5-.29v4.29h-.25a.75.75 0 0 0 0 1.5h.5a.754.754 0 0 0 .138-.013A.5.5 0 0 0 3.5 14H6a.5.5 0 0 0 .5-.5v-3A.5.5 0 0 1 7 10h2a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .112-.013c.045.009.09.013.138.013h.5a.75.75 0 1 0 0-1.5H13V8.21c-.463.187-.97.29-1.5.29a3.986 3.986 0 0 1-1.75-.403A3.986 3.986 0 0 1 8 8.5a3.986 3.986 0 0 1-1.75-.403Z"/>'],
  "globe-alt": [16, '<path fill-rule="evenodd" d="M3.757 4.5c.18.217.376.42.586.608.153-.61.354-1.175.596-1.678A5.53 5.53 0 0 0 3.757 4.5ZM8 1a6.994 6.994 0 0 0-7 7 7 7 0 1 0 7-7Zm0 1.5c-.476 0-1.091.386-1.633 1.427-.293.564-.531 1.267-.683 2.063A5.48 5.48 0 0 0 8 6.5a5.48 5.48 0 0 0 2.316-.51c-.152-.796-.39-1.499-.683-2.063C9.09 2.886 8.476 2.5 8 2.5Zm3.657 2.608a8.823 8.823 0 0 0-.596-1.678c.444.298.842.659 1.182 1.07-.18.217-.376.42-.586.608Zm-1.166 2.436A6.983 6.983 0 0 1 8 8a6.983 6.983 0 0 1-2.49-.456 10.703 10.703 0 0 0 .202 2.6c.72.231 1.49.356 2.288.356.798 0 1.568-.125 2.29-.356a10.705 10.705 0 0 0 .2-2.6Zm1.433 1.85a12.652 12.652 0 0 0 .018-2.609c.405-.276.78-.594 1.117-.947a5.48 5.48 0 0 1 .44 2.262 7.536 7.536 0 0 1-1.575 1.293Zm-2.172 2.435a9.046 9.046 0 0 1-3.504 0c.039.084.078.166.12.244C6.907 13.114 7.523 13.5 8 13.5s1.091-.386 1.633-1.427c.04-.078.08-.16.12-.244Zm1.31.74a8.5 8.5 0 0 0 .492-1.298c.457-.197.893-.43 1.307-.696a5.526 5.526 0 0 1-1.8 1.995Zm-6.123 0a8.507 8.507 0 0 1-.493-1.298 8.985 8.985 0 0 1-1.307-.696 5.526 5.526 0 0 0 1.8 1.995ZM2.5 8.1c.463.5.993.935 1.575 1.293a12.652 12.652 0 0 1-.018-2.608 7.037 7.037 0 0 1-1.117-.947 5.48 5.48 0 0 0-.44 2.262Z" clip-rule="evenodd"/>'],
  "arrow-down-tray": [16, '<path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z"/><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z"/>'],
  "list-bullet": [16, '<path d="M3 4.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM6.25 3a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM6.25 7.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM6.25 11.5a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7ZM4 12.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM3 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>'],
  "calendar-days": [16, '<path d="M5.75 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM5 10.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM10.25 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM7.25 8.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM8 9.5A.75.75 0 1 0 8 11a.75.75 0 0 0 0-1.5Z"/><path fill-rule="evenodd" d="M4.75 1a.75.75 0 0 0-.75.75V3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2V1.75a.75.75 0 0 0-1.5 0V3h-5V1.75A.75.75 0 0 0 4.75 1ZM3.5 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7Z" clip-rule="evenodd"/>'],
  "chevron-left": [20, '<path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>'],
  "chevron-right": [20, '<path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>'],
  "clipboard-document": [20, '<path fill-rule="evenodd" d="M15.988 3.012A2.25 2.25 0 0 1 18 5.25v6.5A2.25 2.25 0 0 1 15.75 14H13.5v-3.379a3 3 0 0 0-.879-2.121l-3.12-3.121a3 3 0 0 0-1.402-.791 2.252 2.252 0 0 1 1.913-1.576A2.25 2.25 0 0 1 12.25 1h1.5a2.25 2.25 0 0 1 2.238 2.012ZM11.5 3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v.25h-3v-.25Z" clip-rule="evenodd"/><path d="M3.5 6A1.5 1.5 0 0 0 2 7.5v9A1.5 1.5 0 0 0 3.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L8.44 6.439A1.5 1.5 0 0 0 7.378 6H3.5Z"/>'],
  "check": [20, '<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/>'],};
const icon = (name, label) => {
  const [size, paths] = ICONS[name];
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : `aria-hidden="true"`;
  return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="currentColor" ${a11y}>${paths}</svg>`;
};

// The studio's logo (the site's assets/logo-rusc-trim.webp, 719 × 118), in
// place of the word rūsc on the sign-in page and in the header.
const LOGO = readFileSync(new URL("./logo.webp", import.meta.url));
const brand = (height) =>
  `<img class="logo" src="/logo.webp" alt="rūsc" width="${Math.round((height * 719) / 118)}" height="${height}"><span>admin</span>`;

const page = (title, body) =>
  `<!doctype html><html lang="${lang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · rūsc admin</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

// FR · EN links: the page's own address comes back after the switch.
function langSwitch() {
  const back = encodeURIComponent(request.getStore()?.path ?? "/admin/cours");
  return ["fr", "en"]
    .map((l) => (l === lang() ? `<b>${l.toUpperCase()}</b>` : `<a href="/lang?to=${l}&back=${back}">${l.toUpperCase()}</a>`))
    .join(" · ");
}

// Every studio page: the same header and menu. SOON items are next.
const MENU = [["cours", "Cours", "Classes"], ["codes", "Codes", "Codes"], ["commandes", "Commandes", "Orders"], ["horaires", "Horaires", "Timetable"]];
const SOON = new Set(["horaires"]);
function shell(active, title, body) {
  const menu = MENU.map(([key, fr, en]) =>
    SOON.has(key)
      ? `<span class="soon" title="${tr("Bientôt", "Soon")}">${tr(fr, en)}</span>`
      : `<a href="/admin/${key}"${key === active ? ' aria-current="page"' : ""}>${tr(fr, en)}</a>`,
  ).join("");
  return page(
    title,
    `<header class="top"><a class="brand" href="/admin/cours">${brand(18)}</a><nav>${menu}</nav><span class="muted lang">${langSwitch()}</span><a class="muted" href="/logout">${tr("Déconnexion", "Sign out")}</a></header>${body}`,
  );
}

const loginPage = (error, next) =>
  page(
    tr("Connexion", "Sign in"),
    `<div class="login"><p class="muted" style="text-align:right">${langSwitch()}</p><h1 class="brand">${brand(30)}</h1>
     <p class="muted">${tr("L’espace de l’atelier : cours, codes, commandes.", "The studio’s back office: classes, codes, orders.")}</p>
     ${error ? `<p class="off"><b>${esc(error)}</b></p>` : ""}
     <form class="box" method="post" action="/login"><input type="hidden" name="next" value="${esc(next)}">
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
  const bookings = await db.query(
    `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, e.slug, e.title, e."seatsPerTimeSlot" AS seats,
            a.name, a.email, a."phoneNumber" AS phone, s."referenceUid" AS seat_uid,
            c.display AS code, u.amount AS code_amount, c.unit AS code_unit, ps.order_id AS paid_order, x.pay AS acuity_pay
       FROM public."Booking" b
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       JOIN public."Attendee" a ON a."bookingId" = b.id
       LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
       LEFT JOIN rusc.uses u ON u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL
       LEFT JOIN rusc.codes c ON c.key = u.key
       LEFT JOIN rusc.paid_seats ps ON ps.seat_uid = s."referenceUid"
       LEFT JOIN rusc.acuity_seats x ON x.seat_uid = s."referenceUid"
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

  const now = parisParts(new Date());
  const byDay = new Map();
  for (const session of [...sessions.values()].sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`) || a.title.localeCompare(b.title))) {
    if (!session.people.length && (session.day < now.day || (session.day === now.day && session.time < now.time))) continue;
    if (!byDay.has(session.day)) byDay.set(session.day, []);
    byDay.get(session.day).push(session);
  }
  return byDay;
}

// How one person paid for their place.
function payment(p) {
  if (p.code) return `<span class="st ok">${icon("ticket")}<span>Code ${esc(p.code)} (− ${esc(fmtAmount(p.code_unit, p.code_amount))})</span></span>`;
  if (p.paid_order) return `<a class="st ok" href="/admin/commandes#${esc(p.paid_order)}">${icon("check-circle")}${tr("Payé en ligne", "Paid online")}</a>`;
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
  return WEBHOOK_SECRET
    ? `<span class="st off">${icon("exclamation-circle")}<span>${tr("à régler (panier non payé, ou sur place)", "to pay (cart not paid, or at the studio)")}</span></span>`
    : `<span class="st muted">${icon("question-mark-circle")}<span>${tr("à vérifier (paiement en ligne pas encore relié)", "to check (online payment not linked yet)")}</span></span>`;
}

const people = (list) =>
  list.length
    ? `<table><tbody>${list
        .map((p) => {
          const contact = [
            p.email ? `<a href="mailto:${esc(p.email)}">${icon("envelope")}${esc(p.email)}</a>` : "",
            p.phone ? `<a href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ""))}">${icon("phone")}${esc(p.phone)}</a>` : "",
          ].join("");
          return `<tr><td><b>${esc(p.name)}</b>${contact ? `<span class="contact">${contact}</span>` : ""}</td><td>${payment(p)}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : `<p class="muted" style="margin:0">${tr("Personne pour l’instant.", "Nobody yet.")}</p>`;

// One class, with its people; the calendar links to it by its id.
const sessionId = (s) => `c${s.time.replace(":", "")}-${s.slug}`;
const sessionBox = (s) =>
  `<div class="session" id="${esc(sessionId(s))}"><div class="head"><b>${esc(s.time)} · ${esc(offerLabel(s.slug))}</b>
     <span class="pill">${s.people.length} / ${s.seats ?? "?"} ${tr("places", "places")}</span></div>${people(s.people)}</div>`;

// List · Calendar, at the top of Cours.
function coursTabs(active) {
  const tabs = [["liste", "list-bullet", tr("Liste", "List"), "/admin/cours"], ["calendrier", "calendar-days", tr("Calendrier", "Calendar"), "/admin/cours?vue=calendrier"]];
  return `<nav class="tabs">${tabs.map(([key, name, label, href]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${icon(name)}${label}</a>`).join("")}</nav>`;
}

async function coursPage(url) {
  const day = url.searchParams.get("jour");
  if (isDay(day)) return coursDay(day);
  if (url.searchParams.get("vue") === "calendrier") return coursCalendar(url.searchParams.get("mois"));
  return coursList(url);
}

// The coming days, class by class.
async function coursList(url) {
  const days = Math.min(Math.max(Number(url.searchParams.get("jours")) || 14, 1), 60);
  const today = parisToday();
  const byDay = await loadSessions(today, addDays(today, days));
  const body = [...byDay.entries()]
    .map(([day, list]) => `<h2 class="day">${esc(weekday(noon(day)))}</h2>${list.map(sessionBox).join("")}`)
    .join("");
  return shell(
    "cours",
    tr("Cours", "Classes"),
    `<h1>${tr("Cours", "Classes")}</h1>${coursTabs("liste")}<p class="muted">${tr(`Les ${days} prochains jours, d’après les réservations et les horaires de Cal.`, `The next ${days} days, from Cal’s bookings and timetable.`)}
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
    return `<a class="chip${state}" href="?jour=${s.day}#${esc(sessionId(s))}" title="${esc(`${s.time} · ${offerLabel(s.slug)} · ${taken} / ${s.seats ?? "?"}`)}"><span>${esc(s.time)}</span><span class="l">${esc(offerLabel(s.slug).replace(/ [12]h$/, ""))}</span><b>${taken}/${s.seats ?? "?"}</b></a>`;
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
     <p class="muted small">${tr("3/7 : places prises sur 7. Liseré vert : déjà des inscrits ; orange : complet. Un jour ou un cours ouvre la liste des personnes.", "3/7: 3 of 7 places taken. Green edge: people booked; orange: full. A day or a class opens its list of people.")}</p>`,
  );
}

// One day: its classes and everyone booked, past or coming.
async function coursDay(day) {
  const list = (await loadSessions(day, addDays(day, 1))).get(day) ?? [];
  const long = new Intl.DateTimeFormat(LOCALE(), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(noon(day));
  return shell(
    "cours",
    `${tr("Cours", "Classes")} · ${long}`,
    `<h1 class="cap">${esc(long)}</h1>${coursTabs("calendrier")}
     <div class="calnav"><a class="ibtn" href="?jour=${addDays(day, -1)}" title="${tr("Veille", "Previous day")}">${icon("chevron-left", tr("Veille", "Previous day"))}</a><a class="ibtn" href="?jour=${addDays(day, 1)}" title="${tr("Lendemain", "Next day")}">${icon("chevron-right", tr("Lendemain", "Next day"))}</a><a href="?vue=calendrier&mois=${day.slice(0, 7)}">${tr("Tout le mois", "The whole month")}</a></div>
     ${list.length ? list.map(sessionBox).join("") : `<p class="muted">${tr("Aucun cours ce jour-là.", "No classes that day.")}</p>`}`,
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
        const [, key, qty] = token.match(/^([a-z0-9-]+)x(\d+)/) ?? [];
        const label = OFFERS[key] ? offerLabel(key) : productLabel(key);
        return `${esc(label)}${Number(qty) > 1 ? ` × ${qty}` : ""}`;
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
     <tbody>${rows || `<tr><td colspan="5" class="muted">${tr("Aucune commande pour l’instant.", "No orders yet.")}</td></tr>`}</tbody></table>`,
  );
}

function offerBoxes(selected) {
  return `<fieldset><legend>${tr("Valable pour", "Valid for")}</legend>${Object.keys(OFFERS)
    .map((k) => `<label><input type="checkbox" name="offers" value="${k}"${selected.includes(k) ? " checked" : ""}> ${esc(offerLabel(k))}</label>`)
    .join("")}</fieldset>`;
}

function newCodeForm(presetId) {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[1];
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + p.months);
  return `
  <form class="box" method="post" action="/admin/codes">
    <label>Type
      <select name="preset" onchange="location.search='?preset='+this.value">
        ${PRESETS.map((x) => `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${esc(tr(x.label, x.en))}</option>`).join("")}
      </select></label>
    <label>${tr("Intitulé (ce que voit le client)", "Label (what the customer sees)")}<input name="label" value="${esc(tr(p.label, p.en))}" required maxlength="80"></label>
    <label>${tr("Quantité", "Amount")}
      <span style="display:flex;gap:6px"><input name="amount" type="number" min="0.5" step="0.5" value="${p.amount}" required style="width:100px">
      <select name="unit">${Object.entries(UNIT).map(([u, t]) => `<option value="${u}"${u === p.unit ? " selected" : ""}>${tr(...t.many)}</option>`).join("")}</select></span></label>
    <label>${tr("Valable jusqu’au", "Valid until")}<input name="expires_on" type="date" value="${isoDate(expiry)}"></label>
    <label>${tr("Client (nom, e-mail)", "Customer (name, email)")}<input name="holder" maxlength="120" placeholder="${tr("facultatif", "optional")}"></label>
    <label>Note<input name="note" maxlength="200" placeholder="${tr("ex. payé en espèces le 24/09", "e.g. paid in cash on 24/09")}"></label>
    <label>Code<input name="code" maxlength="40" placeholder="${tr("laisser vide : créé automatiquement", "leave empty: made for you")}"></label>
    ${offerBoxes(p.offers)}
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
        <td>${esc(fmtAmount(c.unit, c.remaining))}<br><span class="muted">${tr("sur", "of")} ${esc(fmtAmount(c.unit, c.initial))}</span></td>
        <td>${esc(fmtDate(c.expires_on))}</td><td>${esc(c.holder ?? "")}</td><td>${num(c.bookings)}</td><td>${sourceLabel(c.source)}</td></tr>`;
    })
    .join("");
  return shell(
    "codes",
    "Codes",
    `<h1>Codes</h1><p class="muted">${tr("Carnets, bons cadeaux et codes de l’atelier. Un client utilise son code sur la page Réserver du site : chaque réservation est déduite ici.", "Class cards, gift vouchers and studio codes. A customer uses their code on the site’s booking page: each booking is taken off here.")}</p>
     <h2>${tr("Nouveau code", "New code")}</h2>${newCodeForm(url.searchParams.get("preset"))}
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
     <p class="muted">${tr("Pour", "For")} : ${c.offers.map((k) => esc(offerLabel(k))).join(", ")}${c.holder ? ` · ${tr("Client", "Customer")} : ${esc(c.holder)}` : ""}${c.note ? ` · ${esc(c.note)}` : ""}</p><p>${sourceLabel(c.source)}</p>
     <h2>${tr("Ajuster le solde", "Adjust the balance")}</h2>
     <form class="box" method="post" action="/admin/codes/${esc(c.key)}/adjust">
       <label>${tr("Ajouter (+) ou retirer (−)", "Add (+) or take off (−)")}<input name="delta" type="number" step="0.5" required placeholder="${tr("ex. -1 ou 2", "e.g. -1 or 2")}"></label>
       <label>${tr("Raison", "Reason")}<input name="note" maxlength="200" required placeholder="${tr("ex. séance réservée par téléphone", "e.g. class booked by phone")}"></label>
       <div><button type="submit">${tr("Enregistrer", "Save")}</button></div>
     </form>
     <form method="post" action="/admin/codes/${esc(c.key)}/active" style="margin-top:12px">
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
    // FR · EN switch: remembered for a year, then back to the same page.
    if (url.pathname === "/lang") {
      const to = url.searchParams.get("to") === "en" ? "en" : "fr";
      const back = String(url.searchParams.get("back") ?? "");
      const target = /^\/(admin|login)[\w/?=&.-]*$/.test(back) ? back : "/admin/cours";
      return send(res, 303, "", { location: target, "set-cookie": `rusc_lang=${to}; Path=/; Secure; SameSite=Lax; Max-Age=31536000` });
    }
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    if (url.pathname === "/logo.webp") return send(res, 200, LOGO, { "content-type": "image/webp", "cache-control": "public, max-age=604800" });

    if (url.pathname === "/stripe/webhook" && req.method === "POST") {
      const body = await readBody(req, 512 * 1024);
      const event = stripeEvent(body, req.headers["stripe-signature"]);
      if (!event) return send(res, 400, { ok: false });
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        await recordOrder(event.data.object);
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
      await db.query("INSERT INTO rusc.imports (source, payload) VALUES ('acuity', $1)", [payload]);
      return send(res, 200, { ok: true, codes: payload.codes?.length ?? 0, appointments: payload.appointments?.length ?? 0 }, headers);
    }

    if (url.pathname.startsWith("/api/")) {
      const headers = cors(req);
      if (req.method === "OPTIONS") return send(res, 204, {}, headers);
      if (url.pathname === "/api/order" && req.method === "GET") {
        if (limited(req, 60)) return send(res, 429, { paid: false, codes: [] }, headers);
        return send(res, 200, await apiOrder(String(url.searchParams.get("id") ?? "")), headers);
      }
      if (req.method !== "POST") return send(res, 405, { ok: false }, headers);
      if (limited(req, 40)) return send(res, 429, { ok: false, reason: "too_many" }, headers);
      reconcile().catch((e) => console.error("reconcile", e.message));
      const input = JSON.parse((await readBody(req)) || "{}");
      if (url.pathname === "/api/check") return send(res, 200, await apiCheck(input), headers);
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
