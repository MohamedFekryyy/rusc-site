# Continuity: from Acuity to the new system

Acuity (owner `19154889`) still runs the live studio-rusc.com until the switch. Everything customers hold there must keep working on the new site:
- **prepaid codes:** carnets, open-studio hours, gift vouchers;
- **upcoming bookings.**

Codes become rūsc admin codes (`rusc.codes`, `source = 'acuity'`), usable on the booking page like any other. Bookings become places in the right Cal class.

**Client data never goes in this repo or in chat.** The scripts print counts only. Exports stay in `data/` and keys in `.secrets/`, both git-ignored.

## The files

| File | What it does | Status |
|---|---|---|
| `acuity-extract.js` | Page script, run **in the Acuity admin** (signed in as the studio). It reads every code of every package and gift certificate (all `products.php?action=viewCodes` pages, 15 codes each), the classes each is valid for, and the upcoming appointments (Acuity's CSV export, today to one year ahead). It posts them to rūsc admin's `POST /import/acuity`, which stores them as received in `rusc.imports`. | **The way in use** |
| `acuity-apply.sql` | Turns the latest `rusc.imports` row into codes and Cal places, inside the database (`sh deploy/cal/db-run.sh scripts/continuity/acuity-apply.sql`). Safe to re-run. Prints counts only. | **The way in use** |
| `acuity-history.mjs` | Local script: reads the owner's Acuity exports in `data/acuity/` (every appointment, the orders, the client list with the studio's notes) and posts them to the same import route, `?source=acuity-history`. | **The way in use** |
| `acuity-history.sql` | Loads the latest history import into `rusc.history` (appointments), `rusc.acuity_orders` and `rusc.clients`. Safe to re-run with newer exports. People listed under a shared e-mail are kept together (`rusc.clients.others`), so no name is lost. | **The way in use** |
| `acuity-classes.mjs` | Reads the class timetable from Acuity's public scheduling API (no client data), to rebuild it in Cal. | Used once (step 17) |
| `acuity-export.mjs` | The same export through Acuity's API. | **Doesn't work:** the API answers 403 on the studio's plan (Powerhouse only). Kept for reference. |

## How `acuity-apply.sql` converts

- **Codes kept:** still valid (not expired), something left, and valid for a class we run. Expired, used-up and unreadable ones are counted and skipped.
- **Units:** Acuity counts minutes.
  - Open-studio codes become **hours**.
  - Class cards become **classes**, of the shortest class they're valid for (2 h).
  - Values are rounded down to a half.
  - Euro vouchers stay in **euros**. A booking takes the class price (`OFFERS` in `deploy/admin/server.mjs`).
- **Never-used codes:** Acuity shows no balance for them, only "Code has not been used". They get their product's full value, from the `products` table at the top of the SQL (copied from each Acuity product's settings). **If the studio adds or changes a product in Acuity, update that table.**
- **Classes:**
  - Acuity's appointment types map to our offer keys (the `types` table).
  - A card valid for wheel throwing is valid for every 2-hour class (wheel throwing, hand-building, children's), as the site sells them.
- **Re-runs:** a code already used in the new system keeps its balance, and a booking already copied is skipped. A booking cancelled in Acuity since the last run leaves Cal. Nobody is emailed.
- **Bookings:** each becomes a seat (`acuity-<appointment id>`) in the matching Cal class at that time. How it was paid in Acuity goes into `rusc.acuity_seats` ("code …", "payé …", "à régler"), and rūsc admin's Cours shows it.

## Run it (again on switch day)

Agents: the Acuity admin is the studio's account; only open it in the owner's browser, with their go-ahead.

1. Open the import for a few minutes. The token is a one-off random value, stored nowhere else:
   ```bash
   umask 077; openssl rand -hex 24 > .secrets/import-token
   printf 'IMPORT_TOKEN=%s\n' "$(cat .secrets/import-token)" | fly secrets import -a rusc-admin
   ```
2. In Chrome, in the Acuity admin (https://secure.acuityscheduling.com, signed in as the studio), run `acuity-extract.js` with `__IMPORT_TOKEN__` replaced by the token, from DevTools' console or an agent's page-script tool. It returns counts: `{status: 200, ok: true, codes, appointments}`.
3. Dry run: counts only, nothing written.
   ```bash
   sed 's/^COMMIT;$/ROLLBACK;/' scripts/continuity/acuity-apply.sql > /tmp/acuity-dry.sql
   sh deploy/cal/db-run.sh /tmp/acuity-dry.sql
   ```
   The two "(check!)" lines should be 0. If not, a balance or a product changed shape; fix the SQL first.
4. Apply: `sh deploy/cal/db-run.sh scripts/continuity/acuity-apply.sql`.
5. Close the import: `fly secrets unset IMPORT_TOKEN -a rusc-admin && rm .secrets/import-token`. `/import/acuity` then answers 404.
6. Once the switch is final, delete the raw imports, which hold client details: `DELETE FROM rusc.imports;` (through `db-run.sh`).

## History (every appointment, orders, clients)

Export from Acuity (appointments over all dates, orders, the client list) into `data/acuity/`, then:

```bash
umask 077; openssl rand -hex 24 > .secrets/import-token
printf 'IMPORT_TOKEN=%s\n' "$(cat .secrets/import-token)" | fly secrets import -a rusc-admin
node scripts/continuity/acuity-history.mjs          # --dry-run first to see the counts
sh deploy/cal/db-run.sh scripts/continuity/acuity-history.sql
fly secrets unset IMPORT_TOKEN -a rusc-admin && rm .secrets/import-token
```

rūsc admin then shows it:
- Cours: past days, grouped into classes, with how each was paid;
- Clients: everyone, with contact, notes, visits and codes;
- Commandes: Acuity's orders.

## Done so far

**2026-09-24, history:**
- 1,616 appointments (February 2020 to 22 September 2026), 1,594 matched to one of our classes; the other 22 keep their Acuity type name.
- 216 orders.
- 730 clients (688 e-mails from the client list, 38 more from appointments and orders, 4 without an e-mail), plus 92 people kept under a shared e-mail.

**2026-09-24, codes:**
- 237 codes read. 46 carried over (27 never used): 115.5 classes, 91 open-studio hours and one 180 € voucher.
- Skipped: 178 expired, 13 used up.
- 1 upcoming booking copied into Cal.

**Before switching off Acuity:**
- re-run both imports on switch day (codes and bookings, then the history with fresh exports), to catch what changed since 22-24 September;
- mark the current members: Acuity has no export of them, so the studio sets "Membre jusqu’au" on each one's page in rūsc admin (Clients);
- reset the Acuity API key, which isn't needed any more (`.secrets/acuity.env`). Its copies in Vercel's environment were removed on 2026-09-24.
