# rūsc admin: the studio's back office

One web app for everything the studio manages, at https://rusc-admin.fly.dev (later `admin.studio-rusc.com`). Sign in at `/login` with the studio's password. Every page is in French or English (the FR · EN links in the header; cookie `rusc_lang`, French by default).

The menu:
- **Cours / Classes:** from Cal's bookings and timetable. For each class: who's coming (name, email, tap-to-call phone), places taken, and how each person paid:
  - with a code;
  - paid online;
  - booked on Acuity before the switch (code, paid, or to pay);
  - still to pay.

  Three views:
  - **List** (`/admin/cours`): the coming 14 or 30 days.
  - **Calendar** (`?vue=calendrier&mois=YYYY-MM`): a month, Monday to Sunday, with each class's time and places taken. A green edge means people are booked; orange means full. Past days only show classes someone was booked on. On a phone it becomes an agenda.
  - **Day** (`?jour=YYYY-MM-DD`): one day's classes and everyone booked, past or coming. The calendar opens it.
- **Clients:** everyone the studio knows. That's Acuity's client list and history, then everyone who books, buys or opens an account (added every few minutes). A client's page shows:
  - contact, and the studio's notes from Acuity;
  - other people listed under the same e-mail (a parent booking for their children…);
  - membership, which can be set by hand ("Membre jusqu’au"), since Acuity had no export of members;
  - their account on the site, with a button making a 7-day password link to send them;
  - their codes, every booking (Acuity's and Cal's, with Acuity's notes), and every order.
- **Codes:** carnets, gift vouchers and codes the studio issues (below).
- **Commandes / Orders:** online orders from the cart (Stripe). Carnets and vouchers bought online get their code automatically, and the buyer sees it on the thank-you screen. Classes paid by card show as paid in Cours, and memberships are recorded. Stripe calls `POST /stripe/webhook` (event `checkout.session.completed`), checked with the endpoint's signing secret, which is the Fly secret `STRIPE_WEBHOOK_SECRET`.
- **Horaires / Timetable:** each class's weekly slots and coming dates, to add or remove, and days to close (holidays) or reopen, for all or some classes. It writes Cal's `Availability` rows directly (a date override from 00:00 to 00:00 closes a class that day), so the booking calendar and Cours follow at once. Bookings already made don't move. Open studio takes a span (start and end), cut into 1-hour slots; other classes last their length unless an end is given.

Cal's own admin (https://rusc-cal.fly.dev) is then only needed for rare settings.

| | |
|---|---|
| Fly app | `rusc-admin`, region `ams`, 256 MB. It sleeps when unused and wakes in about a second, so it costs almost nothing. |
| Address | https://rusc-admin.fly.dev |
| Data | Schema `rusc` of the Cal.diy database (`schema.sql`), under its own role `rusc_codes`. It reads Cal's bookings, seats, event types and attendees, and writes only the classes' timetable (`Availability`, for Horaires). |
| Code | `server.mjs`: Node, one dependency (`pg`), server-rendered HTML with inline CSS, no build step. `logo.webp` is a copy of the site's `assets/logo-rusc-trim.webp`. |
| Secrets (Fly) | `DATABASE_URL`, `CODES_ADMIN_PASSWORD` (the studio's), `STRIPE_WEBHOOK_SECRET`. `IMPORT_TOKEN` only during an Acuity import. |
| Tables | Schema `rusc`, all owned by `rusc_codes`: codes, uses, orders, paid_seats, members, imports, acuity_seats, history, acuity_orders, clients, accounts, account_tokens. `schema.sql` also grants it write access to Cal's `Availability` (Horaires). |

Cours also shows Acuity's appointments on past days (`rusc.history`), grouped into classes with how each person paid.

**Member accounts (the site's Connexion page)** are served here too: `/api/auth/*` (signup, login, logout, session, account, codes, reset), called by `lib/auth.ts`.
- Passwords are stored as scrypt hashes and tokens as SHA-256 (`rusc.accounts`, `rusc.account_tokens`).
- A token travels as `Authorization: Bearer …`. It lasts a year with "rester connecté·e", otherwise a day.
- Sign-ins are rate-limited per visitor.
- A member's space shows their membership, coming classes, codes (added to the account, or in their name), and past classes including Acuity's.
- A forgotten password: the studio makes a link from the client's page. There's no e-mail reset yet; Cal's Brevo login could send one later.
- `SITE_ORIGIN` (default `https://rusc-preview.vercel.app`) is the address used in those links. Set it in `fly.toml` when the site moves to studio-rusc.com.

**Agents:** don't sign in to the live admin; the password is the studio's. To see a page, use the local preview (below). Its pages hold client data, so only ever report counts from them.

## Codes

Customers pay for a class in two ways:
- **by card, in the site's cart** (Stripe);
- **with a code**: a carnet, a gift voucher, a member's hours, or any code the studio creates itself, for example for a carnet paid in cash or by card at the studio.

rūsc admin keeps every code and its balance. On the booking page (`components/BookingEmbed.tsx`), a customer types their code above the calendar and sees what's left. The class they book is then taken off the code instead of going to the cart.

### For the studio: `/admin/codes`

- **New code:** pick a type (carnet 5 or 10 cours, atelier libre 10 h or 20 h, gift vouchers, an amount in €) and adjust it if needed:
  - quantity and unit (sessions, hours or €);
  - which classes it's valid for;
  - end date;
  - customer and note.

  The code is generated (`RUSC-XXXX-XXXX`) unless you type one. A copy button next to it puts it on the clipboard, to give to the customer. They use it on the site's booking page.
- **A code's page:** its balance, where it comes from (studio, Acuity or online), and every booking made with it (class, date, name). You can:
  - add or remove sessions with a reason, for example a class booked by phone;
  - pause the code.
- **Cancellations:** when a booking made with a code is cancelled in Cal, its session goes back on the code automatically, within a few minutes (`reconcile()`).

### How a code is used

1. `POST /api/check {code, offer}`: the booking page asks whether the code can pay for this class. Codes are read in capitals, and spaces and dashes are ignored. The answer is its label, what's left, the end date, or why not: unknown, expired, not valid for this class, used up.
2. The customer books in the Cal calendar. Cal's `bookingSuccessful` event gives the page the attendee's **seat reference**, which is unique per person in a class.
3. `POST /api/redeem {code, seatUid}`: the service finds that seat in Cal's database (class, time, name). It checks the code again, takes 1 session off, or the hours booked, or the class's price for a code worth an amount, and records the use. A seat can only be used once.

Visitors are rate-limited (40 requests per 10 minutes each), so codes can't be guessed by trying.

### Codes from Acuity

The 46 Acuity codes still worth something were imported on 2026-09-24 (`source = 'acuity'`), and the one upcoming Acuity booking became a place in Cal. The same day, Acuity's whole history came in: 1,616 appointments, 216 orders, 730 clients (plus 92 people under shared e-mails). `POST /import/acuity` receives the data from the Acuity admin page; it only exists while the Fly secret `IMPORT_TOKEN` is set, and answers 404 otherwise. The whole procedure, to repeat on switch day, is in `scripts/continuity/README.md`.

## Preview locally

```bash
node deploy/admin/preview.mjs    # http://localhost:8191/admin/cours
```

In the desktop app, use the launch config `admin-preview` instead. It serves `server.mjs` unchanged, with made-up people around today's date, no database and no sign-in. Forms don't save. Check list, calendar, day, codes and orders, in FR and EN, at desktop and phone width (no sideways scroll), before each deploy.

## Look

Utility first:
- warm off-white page (`--bg`) and one green accent (`--accent`), set in `STYLE`;
- orange (`--warn`) only for what needs action: to pay, full, paused.

**Icons:** [Heroicons](https://heroicons.com) 2.2 (MIT), inlined as path data in `ICONS` and drawn with `icon(name, label?)`. Add one only where it carries meaning:
- a payment state (ticket, check, alert);
- a kind of contact (e-mail, phone);
- a control (previous/next arrows, the List / Calendar switch, copy);
- the search field, where a code comes from, a notice.

Menus, calendar entries and plain buttons stay text. Take new icons from the npm package `heroicons`:
- `16/solid` (micro) next to text;
- `20/solid` (mini) in the round `.ibtn` buttons.

## Setup (done 2026-09-24; first deployed as `rusc-codes`, renamed `rusc-admin` the same day)

```bash
cd deploy/admin && sh setup.sh
```

The script:
- creates the app;
- creates the `rusc_codes` database role with a generated password, which is piped into Postgres and into Fly's secrets and never printed;
- applies `schema.sql`;
- deploys.

It's safe to run again. Last step, **for the studio**, choosing the admin password (done):

```bash
fly secrets set -a rusc-admin CODES_ADMIN_PASSWORD='…'
```

## Updating

1. Edit `server.mjs`, then check it in the preview (above).
2. `cd deploy/admin && fly deploy`. Fly builds the image from the `Dockerfile`, which copies only `server.mjs` and `logo.webp`.
3. Check live without signing in: `/health` answers 200, `/admin/cours` redirects to `/login`, `/logo.webp` is an image.

Schema changes go in `schema.sql`, applied with `sh ../cal/db-run.sh schema.sql`.

The list of classes (`OFFERS` in `server.mjs`) must match the sessions in `lib/cal.ts`. Prices matter for codes worth an amount.

## Still to do

- **Gift cards and codes for cart products:** codes (including the any-amount gift voucher, in euros) pay for classes at booking. They can't yet pay for a cart product (a carnet, the membership). That would need a code field in the cart, and a Stripe coupon for the amount covered.
- **Member prices online:** the site shows member prices (10% off classes and carnets). With accounts, the checkout could apply them for signed-in members once Raquel confirms the rule.
- **Own address:** `admin.studio-rusc.com` (Fly certificate plus a DNS record at Squarespace), then update `ALLOWED_ORIGINS` in `fly.toml` if the site's domain changes.
- **Decisions for Raquel:**
  - Should the 2-hour carnet presets (`TWO_HOUR`) also cover the children's class, as Acuity's carnets did? Imported Acuity cards already do.
  - Member prices (the 10% member discount) aren't applied online yet.
