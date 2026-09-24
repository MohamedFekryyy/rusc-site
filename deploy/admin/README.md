# rūsc admin: the studio's back office

One web app for everything the studio manages, at https://rusc-admin.fly.dev (later `admin.studio-rusc.com`). Sign in at `/login` with the studio's password. The menu has:
- **Cours:** the coming classes, from Cal's bookings and timetable. For each one: who's coming (name, email, phone), places left, and how each person paid.
- **Codes:** carnets, gift vouchers and codes the studio issues (below).
- **Commandes:** online orders from the cart (Stripe). Carnets and vouchers bought online get their code automatically; the buyer sees it on the thank-you screen. Classes paid by card show as paid in Cours, and memberships are recorded. Stripe calls `POST /stripe/webhook` (event `checkout.session.completed`), checked with the endpoint's signing secret, which is the Fly secret `STRIPE_WEBHOOK_SECRET`.
- **Horaires** (next): add a stage date, block a holiday, move a class, without opening Cal.

Cal's own admin (https://rusc-cal.fly.dev) is then only needed for rare settings.

## Codes

Customers pay for a class in two ways:
- **by card, in the site's cart** (Stripe);
- **with a code**: a carnet, a gift voucher, a member's hours, or any code the studio creates itself, for example for a carnet paid in cash or by card at the studio.

rūsc admin keeps every code and its balance. On the booking page (`components/BookingEmbed.tsx`), a customer types their code above the calendar and sees what's left. The class they book is then taken off the code instead of going to the cart.

| | |
|---|---|
| Fly app | `rusc-admin`, region `ams`, 256 MB. It sleeps when unused and wakes in about a second, so it costs almost nothing. |
| Address | https://rusc-admin.fly.dev |
| Data | Schema `rusc` of the Cal.diy database (`schema.sql`), under its own role `rusc_codes`. It can only *read* Cal's bookings, seats, event types and attendees. |
| Code | `server.mjs` (Node, one dependency: `pg`) |

## For the studio: `/admin/codes`

Sign in at https://rusc-admin.fly.dev/login with the password the studio chose (see setup).

- **New code:** pick a type (carnet 5 or 10 cours, atelier libre 10 h or 20 h, gift vouchers, an amount in €) and adjust it if needed:
  - quantity and unit (sessions, hours or €);
  - which classes it's valid for;
  - end date;
  - customer and note.

  The code is generated (`RUSC-XXXX-XXXX`) unless you type one. Give it to the customer: they use it on the site's booking page.
- **A code's page:** its balance and every booking made with it (class, date, name). You can:
  - add or remove sessions with a reason, for example a class booked by phone;
  - pause the code.
- **Cancellations:** when a booking made with a code is cancelled in Cal, its session goes back on the code automatically, within a few minutes.

## How a code is used

1. `POST /api/check {code, offer}`: the booking page asks whether the code can pay for this class. Codes are read in capitals, and spaces and dashes are ignored. The answer is its label, what's left, the end date, or why not: unknown, expired, not valid for this class, used up.
2. The customer books in the Cal calendar. Cal's `bookingSuccessful` event gives the page the attendee's **seat reference**, which is unique per person in a class.
3. `POST /api/redeem {code, seatUid}`: the service finds that seat in Cal's database (class, time, name). It checks the code again, takes 1 session off, or the hours booked, or the class's price for a code worth an amount, and records the use. A seat can only be used once.

Visitors are rate-limited (40 requests per 10 minutes each), so codes can't be guessed by trying.

## Setup (done 2026-09-24; first deployed as `rusc-codes`, renamed `rusc-admin` the same day)

```bash
cd deploy/admin && sh setup.sh
```

The script:
- creates the app;
- creates the `rusc_codes` database role with a generated password, which is piped into Postgres and into Fly's secrets and never printed;
- applies `schema.sql`;
- deploys.

It's safe to run again. Last step, **for the studio**, choosing the admin password:

```bash
fly secrets set -a rusc-admin CODES_ADMIN_PASSWORD='…'
```

## Updating

Edit `server.mjs`, then `cd deploy/admin && fly deploy`. Fly builds the image from the `Dockerfile`. Schema changes go in `schema.sql`, applied with `sh ../cal/db-run.sh schema.sql`.

The list of classes (`OFFERS` in `server.mjs`) must match the sessions in `lib/cal.ts`. Prices matter for codes worth an amount.

## Still to do

- **Acuity codes:** import the carnets and vouchers still valid in Acuity, with their balances (`source = 'acuity'`). Waiting for the codes export.
- **Online sales:** carnets and vouchers bought in the cart could create their code automatically from the Stripe webhook. For now the studio creates them in `/admin` after the payment.
