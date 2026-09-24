// Runs IN the Acuity admin page (secure.acuityscheduling.com, logged in), as
// a page script: Acuity only gives API access on its top plan, so this reads
// what the admin pages show and sends it straight to rūsc admin's one-off
// import (POST /import/acuity), which keeps it as received. Returns counts only.
//
// Replace __IMPORT_TOKEN__ with the Fly secret IMPORT_TOKEN of rusc-admin
// (set just for the import, unset afterwards). Then apply it with
// scripts/continuity/acuity-apply.sql.
//
// Sends, per code of every package and gift certificate: the product, the
// appointment types it's valid for, the code, holder, "Expires …" text,
// balance text ("1140 minutes remaining (of 1200 total)") and whether it was
// never used (then Acuity shows no balance). Per upcoming
// appointment (Acuity's own CSV export, today → one year): start, end, name,
// phone, email, type, paid, amount paid online, code used, id. Not the notes.

(async () => {
  const TOKEN = "__IMPORT_TOKEN__";
  const ADMIN = "https://rusc-admin.fly.dev/import/acuity";
  const html = async (path) => new DOMParser().parseFromString(await (await fetch(path, { credentials: "include" })).text(), "text/html");

  // Packages and gift certificates, and their names (from the list's edit links).
  const list = await html("/products.php");
  const names = {};
  for (const a of list.querySelectorAll('a[href*="action=edit"]')) {
    const id = new URL(a.getAttribute("href"), location.href).searchParams.get("id");
    const text = a.textContent.trim();
    if (id && text && !/^edit$/i.test(text)) names[id] ??= text;
  }
  const codes = [];
  for (const id of Object.keys(names)) {
    // The classes a package is valid for: its edit page's checked types.
    const edit = await html(`/products.php?action=edit&id=${id}`);
    const types = [...edit.querySelectorAll('input[type=checkbox][name^="chk_types["]:checked')].map((i) => i.name.slice(10, -1));
    // All its codes: viewCodes, 15 per page (the edit page only shows the
    // oldest 15). Past the last page Acuity repeats it, which ends the loop.
    let previous = null;
    for (let p = 1; p <= 200; p++) {
      const page = await html(`/products.php?action=viewCodes&id=${id}&p=${p}`);
      const items = [...page.querySelectorAll("div.show-on-hover-container.margin-bottom")];
      const first = items[0]?.querySelector("strong")?.textContent.trim() ?? "";
      if (!items.length || first === previous) break;
      previous = first;
      for (const item of items) {
        const code = item.querySelector("strong")?.textContent.trim();
        if (!code) continue;
        codes.push({
          productId: id,
          product: names[id],
          types,
          code,
          holder: [...item.children].find((c) => c.tagName === "DIV" && !c.className)?.textContent.trim() ?? "",
          expires: item.querySelector("div.text-muted")?.textContent.trim() ?? "",
          balance: item.querySelector("div.code-redeemable")?.textContent.trim() ?? "",
          // A code never used has no balance line: it's worth its product's
          // full value (products table in acuity-apply.sql).
          unused: /Code has not been used/i.test(item.textContent),
        });
      }
    }
  }

  // Upcoming appointments: Acuity's CSV export, today → one year.
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const body = new FormData();
  body.append("minDay", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  body.append("maxDay", `${d.getFullYear() + 1}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  const csv = await (await fetch("/appointments.php?action=exportExcel", { method: "POST", body, credentials: "include" })).text();
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [header, ...data] = rows.filter((r) => r.length > 1);
  const col = (name) => header.indexOf(name);
  const appointments = data.map((r) => ({
    id: r[col("Appointment ID")],
    start: r[col("Start Time")],
    end: r[col("End Time")],
    timezone: r[col("Timezone")],
    firstName: r[col("First Name")],
    lastName: r[col("Last Name")],
    phone: r[col("Phone")],
    email: r[col("Email")],
    type: r[col("Type")],
    paid: r[col("Paid?")],
    amountPaid: r[col("Amount Paid Online")],
    certificate: r[col("Certificate Code")],
  }));

  const res = await fetch(ADMIN, {
    method: "POST",
    headers: { "content-type": "application/json", "x-import-token": TOKEN },
    body: JSON.stringify({ exportedAt: new Date().toISOString(), codes, appointments }),
  });
  return { status: res.status, ...(await res.json()) };
})();
