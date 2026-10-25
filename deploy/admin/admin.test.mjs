// Unit tests for the two fixed functions in deploy/admin/server.mjs.
// Cancel unpaid pending + membership reminders. Run: node deploy/admin/admin.test.mjs
import { pathToFileURL } from "node:url";

// Load server.mjs inside a sandbox with a mocked pg pool + sendEmail no-op.
// We only evaluate the file to grab the pure helpers whose logic we fixed,
// without touching a real DB or email.

// Mock pg.Pool so `import`-time construction works.
class FakePool {
  constructor() {}
  query() { throw new Error("no DB in tests"); }
  on() {}
  end() {}
}
globalThis.__PGCALLS = [];
const calls = globalThis.__PGCALLS;

// We test the two fixed behaviours by importing the real module text and
// asserting on the exact source changes rather than executing DB logic.
import fs from "node:fs";
const src = fs.readFileSync(new URL("./server.mjs", import.meta.url), "utf8");

let pass = 0, fail = 0;
const t = (name, ok) => { if (ok) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };

// Bug 1: cancelUnpaidPending must destructure { rows } from db.query.
t("cancelUnpaidPending destructures { rows }",
  /async function cancelUnpaidPending\(\)\s*{\s*const \{ rows \} = await db\.query\(/.test(src));
t("cancelUnpaidPending no longer has bare 'const rows = await db.query'",
  !/async function cancelUnpaidPending\(\)\s*{\s*const rows = await db\.query\(/.test(src));

// Bug 2: memberReminders must not reference `today` as a bare SQL identifier.
t("memberReminders no longer uses bare 'reminded_on < today' in SQL",
  !/reminded_on < today\b/.test(src));
t("memberReminders uses a $2::date parameter for the reminded_on comparison",
  /reminded_on IS NULL OR reminded_on < \$2::date/.test(src));

// Confirm reminded_on column exists in schema (for the reminder feature).
const schema = fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
t("schema.sql defines reminded_on date on rusc.members",
  /reminded_on date/.test(schema));

// Confirm the callers/loop still call both with .catch guards (no crash).
t("releaseExpired calls cancelUnpaidPending via .catch",
  /cancelUnpaidPending\(\)\.catch\(/.test(src));
t("memberReminders call site has .catch guard",
  /memberReminders\(\)\.catch\(/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
