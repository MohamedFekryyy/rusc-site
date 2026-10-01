// Builds member INSERTs for rūsc admin from Acuity's member export.
//
// Acuity has no export of members, so Raquel exported a hand-kept list:
//   data/acuity/membres.csv
// Columns (French, comma-separated, RFC 4180):
//   email, prenom, nom, telephone, derniere_adhesion, expiration, statut
//
// It maps to rusc.members (deploy/admin/schema.sql):
//   email PRIMARY KEY, name, since date, until date, order_id, note
//
//   derniere_adhesion -> since
//   expiration        -> until
//   prenom nom        -> name
//
// Only `actif` members are imported (the others are already past their
// `until`; rusc-admin computes "is a member" as `until >= today`, so an
// expired row is harmless but keeping the list clean matches the studio's
// intent). Prints counts only — the file holds client data.
//
// Usage (dry run first, from sites/rusc-new):
//   node scripts/continuity/members-import.mjs [--dry-run] [membres.csv]
// Then apply:
//   sh deploy/cal/db-run.sh /tmp/members-import.sql
//
// Does NOT touch the live database itself: it only writes a .sql file you
// then run through db-run.sh (same pattern as the other continuity scripts).

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--")) ?? "../../data/acuity/membres.csv";
const out = DRY ? "/tmp/members-import.dry.sql" : "/tmp/members-import.sql";

// RFC 4180 CSV (commas), same parser as acuity-history.mjs.
function parse(text, separator = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === separator) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((v) => v.trim()));
  const names = header.map((h) => h.replace(/^﻿/, "").trim());
  return data.map((r) => Object.fromEntries(names.map((n, i) => [n, (r[i] ?? "").trim()])));
}

const text = readFileSync(file, "utf8").replace(/^﻿/, "");
const rows = parse(text);

// Only rows with a plausible e-mail and an expiration date.
const day = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const active = [];
const skipped = { noEmail: 0, noDates: 0, expired: 0, badEmail: 0 };
for (const r of rows) {
  const email = (r.email ?? "").toLowerCase().trim();
  const since = day(r.derniere_adhesion);
  const until = day(r.expiration);
  const statut = (r.statut ?? "").toLowerCase().trim();

  if (!emailRe.test(email)) { skipped.badEmail++; continue; }
  if (!until || !since) { skipped.noDates++; continue; }

  const name = [r.prenom, r.nom].filter(Boolean).join(" ").trim();

  if (statut === "expire") { skipped.expired++; continue; }

  active.push({ email, name: name || null, since, until });
}

// Escape single quotes for SQL literal.
const esc = (s) => s.replace(/'/g, "''");

const lines = [
  "-- Members import from Acuity's hand-kept member list (membres.csv).",
  "-- Idempotent: upsert by e-mail; keeps the latest since/until.",
  "\\set ON_ERROR_STOP on",
  "BEGIN;",
  "SET LOCAL timezone = 'UTC';",
];

for (const m of active) {
  lines.push(
    `INSERT INTO rusc.members (email, name, since, until, note) VALUES (` +
    `lower('${esc(m.email)}'), ${m.name ? `'${esc(m.name)}'` : "NULL"}, ` +
    `'${m.since}', '${m.until}', 'Importé d’Acuity (membres.csv)') ` +
    `ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, rusc.members.name), ` +
    `since = LEAST(rusc.members.since, EXCLUDED.since), ` +
    `until = GREATEST(rusc.members.until, EXCLUDED.until);`
  );
}

lines.push(
  "",
  "-- Report (counts only)",
  "\\pset format unaligned",
  "\\pset footer off",
  `SELECT 'members read' AS what, ${rows.length}::text AS n ` +
  `UNION ALL SELECT 'imported (actif)', ${active.length}::text ` +
  `UNION ALL SELECT 'skipped: expired', ${skipped.expired}::text ` +
  `UNION ALL SELECT 'skipped: missing dates', ${skipped.noDates}::text ` +
  `UNION ALL SELECT 'skipped: bad/missing email', ${skipped.badEmail}::text;`,
  "COMMIT;"
);

writeFileSync(out, lines.join("\n") + "\n");

console.log(`membres.csv: ${rows.length} rows total`);
console.log(`imported (actif): ${active.length}`);
console.log(`skipped: expired ${skipped.expired}, missing dates ${skipped.noDates}, bad email ${skipped.badEmail}`);
console.log(`wrote ${out} (${DRY ? "dry run — for inspection only, do not apply" : "apply with: sh deploy/cal/db-run.sh " + out})`);
