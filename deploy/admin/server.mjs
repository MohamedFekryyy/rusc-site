// rūsc admin: the studio's one back office, and the codes behind it.
// Runs on Fly as rusc-admin (deploy/admin/README.md).
//
// Studio pages (sign in at /login with CODES_ADMIN_PASSWORD):
//   /admin/cours   the coming classes: who's coming, places left, how each paid
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
  res.writeHead(status, {
    "content-type": isText ? "text/html; charset=utf-8" : "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    ...headers,
  });
  res.end(isText ? body : JSON.stringify(body));
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
`;
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
    `<header class="top"><b>rūsc · admin</b><nav>${menu}</nav><span class="muted">${langSwitch()}</span><a class="muted" href="/logout">${tr("Déconnexion", "Sign out")}</a></header>${body}`,
  );
}

const loginPage = (error, next) =>
  page(
    tr("Connexion", "Sign in"),
    `<div class="login"><p class="muted" style="text-align:right">${langSwitch()}</p><h1>rūsc · admin</h1>
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

// The coming days: each class that takes place (from its Cal schedule, or
// from its bookings), who's coming, and how each person paid.
async function coursPage(url) {
  const days = Math.min(Math.max(Number(url.searchParams.get("jours")) || 14, 1), 60);
  const bookings = await db.query(
    `SELECT b."startTime" AT TIME ZONE 'UTC' AS starts, e.slug, e.title, e."seatsPerTimeSlot" AS seats,
            a.name, a.email, a."phoneNumber" AS phone, s."referenceUid" AS seat_uid,
            c.display AS code, u.amount AS code_amount, c.unit AS code_unit, ps.order_id AS paid_order
       FROM public."Booking" b
       JOIN public."EventType" e ON e.id = b."eventTypeId"
       JOIN public."Attendee" a ON a."bookingId" = b.id
       LEFT JOIN public."BookingSeat" s ON s."attendeeId" = a.id
       LEFT JOIN rusc.uses u ON u.seat_uid = s."referenceUid" AND u.cancelled_at IS NULL
       LEFT JOIN rusc.codes c ON c.key = u.key
       LEFT JOIN rusc.paid_seats ps ON ps.seat_uid = s."referenceUid"
      WHERE b.status IN ('accepted', 'pending')
        AND b."startTime" AT TIME ZONE 'UTC' >= date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'
        AND b."startTime" AT TIME ZONE 'UTC' < (date_trunc('day', now() AT TIME ZONE 'Europe/Paris') + $1::int * interval '1 day') AT TIME ZONE 'Europe/Paris'
      ORDER BY 1, e.slug, a.name`,
    [days],
  );
  // The timetable, so classes with nobody booked yet show too (not open-studio hours).
  const schedule = await db.query(
    `SELECT e.slug, e.title, e."seatsPerTimeSlot" AS seats, v.days, v.date::text AS date, v."startTime"::text AS start
       FROM public."EventType" e JOIN public."Availability" v ON v."scheduleId" = e."scheduleId"
      WHERE e."seatsPerTimeSlot" IS NOT NULL AND e.slug <> 'atelier-libre-1h'`,
  );

  const sessions = new Map(); // "YYYY-MM-DD HH:MM|slug" → session
  const at = (day, time, slug, title, seats) => {
    const key = `${day} ${time}|${slug}`;
    if (!sessions.has(key)) sessions.set(key, { day, time, slug, title, seats, people: [] });
    return sessions.get(key);
  };
  const today = parisToday();
  for (let i = 0; i < days; i++) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    const day = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    for (const row of schedule.rows) {
      const matches = row.date ? row.date === day : row.days.includes(weekday);
      if (matches) at(day, row.start.slice(0, 5), row.slug, row.title, row.seats);
    }
  }
  const now = parisParts(new Date());
  for (const row of bookings.rows) {
    const { day, time } = parisParts(new Date(row.starts));
    at(day, time, row.slug, row.title, row.seats).people.push(row);
  }

  const byDay = new Map();
  for (const session of [...sessions.values()].sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`) || a.title.localeCompare(b.title))) {
    if (session.day === now.day && session.time < now.time && !session.people.length) continue;
    if (!byDay.has(session.day)) byDay.set(session.day, []);
    byDay.get(session.day).push(session);
  }

  const people = (list) =>
    list.length
      ? `<table><tbody>${list
          .map((p) => {
            const paid = p.code
              ? `<span class="ok">Code ${esc(p.code)} (− ${esc(fmtAmount(p.code_unit, p.code_amount))})</span>`
              : p.paid_order
                ? `<a class="ok" href="/admin/commandes#${esc(p.paid_order)}">${tr("Payé en ligne", "Paid online")}</a>`
                : WEBHOOK_SECRET
                  ? `<span class="off">${tr("à régler (panier non payé, ou sur place)", "to pay (cart not paid, or at the studio)")}</span>`
                  : `<span class="muted">${tr("à vérifier (paiement en ligne pas encore relié)", "to check (online payment not linked yet)")}</span>`;
            const contact = [p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : "", p.phone ? esc(p.phone) : ""].filter(Boolean).join(" · ");
            return `<tr><td><b>${esc(p.name)}</b><br><span class="muted">${contact}</span></td><td>${paid}</td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<p class="muted" style="margin:0">${tr("Personne pour l’instant.", "Nobody yet.")}</p>`;

  const body = [...byDay.entries()]
    .map(([day, list]) => `<h2 class="day">${esc(weekday(new Date(`${day}T12:00:00Z`)))}</h2>${list
      .map((s) => `<div class="session"><div class="head"><b>${esc(s.time)} · ${esc(offerLabel(s.slug))}</b>
          <span class="pill">${s.people.length} / ${s.seats ?? "?"} ${tr("places", "places")}</span></div>${people(s.people)}</div>`)
      .join("")}`)
    .join("");
  return shell(
    "cours",
    tr("Cours", "Classes"),
    `<h1>${tr("Cours", "Classes")}</h1><p class="muted">${tr(`Les ${days} prochains jours, d’après les réservations et les horaires de Cal.`, `The next ${days} days, from Cal’s bookings and timetable.`)}
       ${days < 30 ? `<a href="?jours=30">${tr("Voir 30 jours", "Show 30 days")}</a>` : `<a href="?jours=14">${tr("Voir 14 jours", "Show 14 days")}</a>`}</p>
     ${body || `<p class="muted">${tr("Aucun cours sur cette période.", "No classes in this period.")}</p>`}`,
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
    : `<p class="off"><b>${tr("Stripe n’est pas encore relié à l’admin", "Stripe isn’t linked to the admin yet")}</b> : ${tr("les commandes apparaîtront ici dès que la clé du webhook sera enregistrée.", "orders will show here once the webhook’s secret is saved.")}</p>`;
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
        <td>${esc(fmtDate(c.expires_on))}</td><td>${esc(c.holder ?? "")}</td><td>${num(c.bookings)}</td><td class="muted">${esc(c.source)}</td></tr>`;
    })
    .join("");
  return shell(
    "codes",
    "Codes",
    `<h1>Codes</h1><p class="muted">${tr("Carnets, bons cadeaux et codes de l’atelier. Un client utilise son code sur la page Réserver du site : chaque réservation est déduite ici.", "Class cards, gift vouchers and studio codes. A customer uses their code on the site’s booking page: each booking is taken off here.")}</p>
     <h2>${tr("Nouveau code", "New code")}</h2>${newCodeForm(url.searchParams.get("preset"))}
     <h2>${tr("Tous les codes", "All codes")}</h2>
     <form class="search" method="get" action="/admin/codes"><input name="q" value="${esc(q)}" placeholder="${tr("Chercher un code, un client, un type", "Search a code, a customer, a type")}"><button class="plain">${tr("Chercher", "Search")}</button></form>
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
     ${flash ? `<p style="color:var(--accent)"><b>${esc(flash)}</b></p>` : ""}
     <div class="code">${esc(c.display)}</div>
     <h1 style="margin-top:14px">${esc(c.label)}</h1>
     <p>${tr("Reste", "Left:")} <b>${esc(fmtAmount(c.unit, c.remaining))}</b> ${tr("sur", "of")} ${esc(fmtAmount(c.unit, c.initial))} · ${tr("valable jusqu’au", "valid until")} ${esc(fmtDate(c.expires_on))}
       ${!c.active ? ` · <span class="off">${tr("en pause", "paused")}</span>` : ""}</p>
     <p class="muted">${tr("Pour", "For")} : ${c.offers.map((k) => esc(offerLabel(k))).join(", ")}${c.holder ? ` · ${tr("Client", "Customer")} : ${esc(c.holder)}` : ""}${c.note ? ` · ${esc(c.note)}` : ""} · ${tr("origine", "source")} : ${esc(c.source)}</p>
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
      if (!ADMIN_PASSWORD) return send(res, 503, page(tr("Connexion", "Sign in"), `<h1>rūsc · admin</h1><p>${tr("Pas encore de mot de passe", "No password yet")} : <code>fly secrets set -a rusc-admin CODES_ADMIN_PASSWORD=…</code></p>`));
      const next = url.searchParams.get("next") ?? "/admin/cours";
      if (req.method !== "POST") return send(res, 200, loginPage("", next));
      if (limited(req, 10)) return send(res, 429, loginPage(tr("Trop d’essais : réessayez dans quelques minutes.", "Too many tries: please try again in a few minutes."), next));
      const form = new URLSearchParams(await readBody(req));
      const target = String(form.get("next") ?? "");
      const safeNext = /^\/admin(\/[\w/-]*)?$/.test(target) ? target : "/admin/cours";
      if (!sameText(form.get("password") ?? "", ADMIN_PASSWORD)) return send(res, 401, loginPage(tr("Mot de passe incorrect.", "Wrong password."), safeNext));
      return send(res, 303, "", { location: safeNext, "set-cookie": sessionCookie() });
    }
    if (url.pathname === "/logout") {
      return send(res, 303, "", { location: "/login", "set-cookie": "rusc_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
    }
    if (url.pathname === "/" ) return send(res, 303, "", { location: "/admin/cours" });

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      if (!signedIn(req)) return send(res, 303, "", { location: `/login?next=${encodeURIComponent(url.pathname)}` });
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
      return send(res, status, page(tr("Erreur", "Error"), `<p class="off"><b>${esc(status === 500 ? tr("Erreur, réessayez.", "Something went wrong, please try again.") : error.message)}</b></p><p><a href="javascript:history.back()">${tr("← Retour", "← Back")}</a></p>`));
    }
    send(res, status, { ok: false, reason: status === 500 ? "error" : "bad_request" }, cors(req));
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  request.run({ lang: langOf(req), path: url.pathname + url.search }, () => handle(req, res, url));
});

server.listen(PORT, "0.0.0.0", () => console.log(`rusc-admin on :${PORT}`));
