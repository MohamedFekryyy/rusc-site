// rūsc codes: prepaid carnets, gift vouchers and codes the studio issues
// itself (a carnet paid in cash or by card at the studio, a voucher, a
// member's hours), and their use when a class is booked on the site.
// Runs on Fly as rusc-codes (deploy/codes/README.md).
//
// Public API, called by the booking page (components/BookingEmbed.tsx):
//   POST /api/check   {code, offer}    what's left, and whether it covers that class
//   POST /api/redeem  {code, seatUid}  takes the class just booked in Cal off the code
// Studio admin, HTTP Basic (user "rusc", password CODES_ADMIN_PASSWORD):
//   /admin            every code with its balance and uses; create, adjust, pause
//
// Data: schema "rusc" of the Cal.diy database (schema.sql). Cal's own tables
// are only read (bookings, seats, event types, attendees), never written.

import http from "node:http";
import { randomInt, timingSafeEqual } from "node:crypto";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 8080);
const ADMIN_USER = "rusc";
const ADMIN_PASSWORD = process.env.CODES_ADMIN_PASSWORD ?? "";
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
// Dates (expiry) as "YYYY-MM-DD" strings, not Dates shifted by the time zone.
pg.types.setTypeParser(1082, (value) => value);

// The classes a code can be used for: the offers of kind "session" in the
// site's lib/cal.ts (same keys; each is one Cal event type, slug = key).
// Keep in sync with it. Prices (TTC, euros) matter for codes worth an amount.
const OFFERS = {
  "atelier-ceramique-2h": { label: "tournage 2h", price: 50 },
  "atelier-modelage-2h": { label: "modelage 2h", price: 50 },
  "decor-a-cru-1h": { label: "décor à cru 1h", price: 20 },
  "modelage-enfant": { label: "cours enfant 2h", price: 50 },
  "atelier-libre-1h": { label: "atelier libre 1h", price: 22.5 },
  "atelier-ceramique-1j": { label: "céramique 1 jour", price: 180 },
  "atelier-ceramique-2j": { label: "céramique 2 jours", price: 280 },
  porcelaine: { label: "porcelaine 1 jour", price: 230 },
  "pot-and-wine": { label: "pot & wine", price: 75 },
};
const TWO_HOUR = ["atelier-ceramique-2h", "atelier-modelage-2h"];

// What the studio usually issues, to pre-fill the "new code" form.
const PRESETS = [
  { id: "carnet5", label: "Carnet 5 cours 2h", unit: "sessions", amount: 5, offers: TWO_HOUR, months: 6 },
  { id: "carnet10", label: "Carnet 10 cours 2h", unit: "sessions", amount: 10, offers: TWO_HOUR, months: 12 },
  { id: "libre10", label: "Atelier libre 10 h", unit: "hours", amount: 10, offers: ["atelier-libre-1h"], months: 6 },
  { id: "libre20", label: "Atelier libre 20 h", unit: "hours", amount: 20, offers: ["atelier-libre-1h"], months: 12 },
  { id: "cadeau2h", label: "Bon cadeau · cours 2h", unit: "sessions", amount: 1, offers: TWO_HOUR, months: 6 },
  { id: "cadeau1j", label: "Bon cadeau · stage 1 jour", unit: "sessions", amount: 1, offers: ["atelier-ceramique-1j"], months: 6 },
  { id: "cadeau2j", label: "Bon cadeau · stage 2 jours", unit: "sessions", amount: 1, offers: ["atelier-ceramique-2j"], months: 6 },
  { id: "montant", label: "Bon cadeau · montant", unit: "euros", amount: 50, offers: Object.keys(OFFERS), months: 6 },
];
const UNIT = {
  sessions: { one: "séance", many: "séances" },
  hours: { one: "heure", many: "heures" },
  euros: { one: "€", many: "€" },
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
  if (unit === "euros") return `${v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0 })} €`;
  return `${v.toLocaleString("fr-FR")} ${v === 1 ? UNIT[unit].one : UNIT[unit].many}`;
};
const fmtDate = (d) => (d ? new Date(`${isoDate(d)}T12:00:00Z`).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "—");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" }) : "—";

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
    ? { "access-control-allow-origin": origin, "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" }
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

// ---------------------------------------------------------------- studio admin

function authorized(req) {
  const header = req.headers.authorization ?? "";
  if (!ADMIN_PASSWORD || !header.startsWith("Basic ")) return false;
  const given = Buffer.from(header.slice(6), "base64").toString("utf8");
  const expected = `${ADMIN_USER}:${ADMIN_PASSWORD}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
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
`;
const page = (title, body) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · codes rūsc</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

function offerBoxes(selected) {
  return `<fieldset><legend>Valable pour</legend>${Object.entries(OFFERS)
    .map(([k, o]) => `<label><input type="checkbox" name="offers" value="${k}"${selected.includes(k) ? " checked" : ""}> ${esc(o.label)}</label>`)
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
        ${PRESETS.map((x) => `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${esc(x.label)}</option>`).join("")}
      </select></label>
    <label>Intitulé (ce que voit le client)<input name="label" value="${esc(p.label)}" required maxlength="80"></label>
    <label>Quantité
      <span style="display:flex;gap:6px"><input name="amount" type="number" min="0.5" step="0.5" value="${p.amount}" required style="width:100px">
      <select name="unit">${Object.entries(UNIT).map(([u, t]) => `<option value="${u}"${u === p.unit ? " selected" : ""}>${t.many}</option>`).join("")}</select></span></label>
    <label>Valable jusqu’au<input name="expires_on" type="date" value="${isoDate(expiry)}"></label>
    <label>Client (nom, e-mail)<input name="holder" maxlength="120" placeholder="facultatif"></label>
    <label>Note<input name="note" maxlength="200" placeholder="ex. payé en espèces le 24/09"></label>
    <label>Code<input name="code" maxlength="40" placeholder="laisser vide : créé automatiquement"></label>
    ${offerBoxes(p.offers)}
    <div><button type="submit">Créer le code</button></div>
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
      const state = !c.active ? `<span class="pill off">en pause</span>` : expired ? `<span class="pill off">expiré</span>` : "";
      return `<tr><td><a href="/admin/codes/${esc(c.key)}"><b>${esc(c.display)}</b></a> ${state}<br><span class="muted">${esc(c.label)}</span></td>
        <td>${esc(fmtAmount(c.unit, c.remaining))}<br><span class="muted">sur ${esc(fmtAmount(c.unit, c.initial))}</span></td>
        <td>${esc(fmtDate(c.expires_on))}</td><td>${esc(c.holder ?? "")}</td><td>${num(c.bookings)}</td><td class="muted">${esc(c.source)}</td></tr>`;
    })
    .join("");
  return page(
    "Codes",
    `<h1>Codes rūsc</h1><p class="muted">Carnets, bons cadeaux et codes de l’atelier. Un client utilise son code sur la page Réserver du site : chaque réservation est déduite ici.</p>
     <h2>Nouveau code</h2>${newCodeForm(url.searchParams.get("preset"))}
     <h2>Tous les codes</h2>
     <form class="search" method="get" action="/admin"><input name="q" value="${esc(q)}" placeholder="Chercher un code, un client, un type"><button class="plain">Chercher</button></form>
     <table><thead><tr><th>Code</th><th>Reste</th><th>Valable jusqu’au</th><th>Client</th><th>Réservations</th><th>Origine</th></tr></thead><tbody>${list || `<tr><td colspan="6" class="muted">Aucun code.</td></tr>`}</tbody></table>`,
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
        ? `${esc(OFFERS[u.offer]?.label ?? u.offer)} · ${esc(fmtDateTime(u.starts_at))}${u.attendee ? `<br><span class="muted">${esc(u.attendee)}</span>` : ""}`
        : esc(u.note ?? "Ajustement");
      const amount = num(u.amount) >= 0 ? `− ${fmtAmount(c.unit, u.amount)}` : `+ ${fmtAmount(c.unit, -num(u.amount))}`;
      return `<tr><td>${esc(fmtDateTime(u.at))}</td><td>${what}</td><td>${esc(amount)}${u.cancelled_at ? ` <span class="pill">annulée, rendue</span>` : ""}</td></tr>`;
    })
    .join("");
  return page(
    c.display,
    `<p><a href="/admin">← Tous les codes</a></p>
     ${flash ? `<p style="color:var(--accent)"><b>${esc(flash)}</b></p>` : ""}
     <div class="code">${esc(c.display)}</div>
     <h1 style="margin-top:14px">${esc(c.label)}</h1>
     <p>Reste <b>${esc(fmtAmount(c.unit, c.remaining))}</b> sur ${esc(fmtAmount(c.unit, c.initial))} · valable jusqu’au ${esc(fmtDate(c.expires_on))}
       ${!c.active ? ` · <span class="off">en pause</span>` : ""}</p>
     <p class="muted">Pour : ${c.offers.map((k) => esc(OFFERS[k]?.label ?? k)).join(", ")}${c.holder ? ` · Client : ${esc(c.holder)}` : ""}${c.note ? ` · ${esc(c.note)}` : ""} · origine : ${esc(c.source)}</p>
     <h2>Ajuster le solde</h2>
     <form class="box" method="post" action="/admin/codes/${esc(c.key)}/adjust">
       <label>Ajouter (+) ou retirer (−)<input name="delta" type="number" step="0.5" required placeholder="ex. -1 ou 2"></label>
       <label>Raison<input name="note" maxlength="200" required placeholder="ex. séance réservée par téléphone"></label>
       <div><button type="submit">Enregistrer</button></div>
     </form>
     <form method="post" action="/admin/codes/${esc(c.key)}/active" style="margin-top:12px">
       <input type="hidden" name="active" value="${c.active ? "0" : "1"}">
       <button class="plain" type="submit">${c.active ? "Mettre en pause (le code ne marche plus)" : "Réactiver le code"}</button>
     </form>
     <h2>Historique</h2>
     <table><thead><tr><th>Quand</th><th>Quoi</th><th>Solde</th></tr></thead><tbody>${history || `<tr><td colspan="3" class="muted">Pas encore utilisé.</td></tr>`}</tbody></table>`,
  );
}

async function adminCreate(form) {
  const unit = UNIT[form.get("unit")] ? form.get("unit") : "sessions";
  const amount = num(form.get("amount"));
  const offers = form.getAll("offers").filter((k) => OFFERS[k]);
  const label = String(form.get("label") ?? "").trim().slice(0, 80);
  if (!(amount > 0) || !offers.length || !label) throw Object.assign(new Error("Quantité, intitulé et au moins un cours sont nécessaires."), { status: 400 });
  const custom = normalize(form.get("code"));
  const { key, display } = custom ? { key: custom, display: String(form.get("code")).trim().toUpperCase() } : newCode();
  const expires = String(form.get("expires_on") ?? "") || null;
  const result = await db.query(
    `INSERT INTO rusc.codes (key, display, label, unit, offers, initial, remaining, expires_on, holder, note, source)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, 'studio') ON CONFLICT (key) DO NOTHING RETURNING key`,
    [key, display, label, unit, offers, amount, expires, String(form.get("holder") ?? "").trim().slice(0, 120) || null, String(form.get("note") ?? "").trim().slice(0, 200) || null],
  );
  if (!result.rowCount) throw Object.assign(new Error("Ce code existe déjà."), { status: 409 });
  return key;
}

async function adminAdjust(key, form) {
  const delta = num(form.get("delta"));
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!delta || !note) throw Object.assign(new Error("Montant et raison sont nécessaires."), { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      "UPDATE rusc.codes SET remaining = remaining + $2 WHERE key = $1 AND remaining + $2 >= 0 RETURNING key",
      [key, delta],
    );
    if (!updated.rowCount) throw Object.assign(new Error("Le solde ne peut pas passer sous zéro."), { status: 400 });
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/health") return send(res, 200, { ok: true });

    if (url.pathname.startsWith("/api/")) {
      const headers = cors(req);
      if (req.method === "OPTIONS") return send(res, 204, {}, headers);
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

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      if (!ADMIN_PASSWORD) return send(res, 503, page("Codes", "<h1>Codes rūsc</h1><p>Pas encore de mot de passe : <code>fly secrets set -a rusc-codes CODES_ADMIN_PASSWORD=…</code></p>"));
      if (!authorized(req)) return send(res, 401, page("Connexion", "<p>Connexion requise.</p>"), { "www-authenticate": 'Basic realm="codes rusc", charset="UTF-8"' });
      await reconcile();
      if (req.method === "POST") {
        // Forms only come from these pages.
        const origin = req.headers.origin;
        if (origin && origin !== `https://${req.headers.host}`) return send(res, 403, page("Refusé", "<p>Refusé.</p>"));
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
        return send(res, 404, page("Introuvable", "<p>Introuvable.</p>"));
      }
      if (url.pathname === "/admin") return send(res, 200, await adminHome(url));
      const code = url.pathname.match(/^\/admin\/codes\/([A-Z0-9]+)$/);
      if (code) {
        const flash = url.searchParams.has("created") ? "Code créé : donnez-le au client." : url.searchParams.has("saved") ? "Enregistré." : "";
        const html = await adminCode(code[1], flash);
        return html ? send(res, 200, html) : send(res, 404, page("Introuvable", "<p>Code introuvable.</p>"));
      }
      return send(res, 404, page("Introuvable", "<p>Introuvable.</p>"));
    }

    send(res, 404, { ok: false });
  } catch (error) {
    const status = error.status ?? (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error(req.method, url.pathname, error);
    if (url.pathname.startsWith("/admin")) {
      return send(res, status, page("Erreur", `<p class="off"><b>${esc(status === 500 ? "Erreur, réessayez." : error.message)}</b></p><p><a href="javascript:history.back()">← Retour</a></p>`));
    }
    send(res, status, { ok: false, reason: status === 500 ? "error" : "bad_request" }, cors(req));
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`rusc-codes on :${PORT}`));
