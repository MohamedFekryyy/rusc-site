# rūsc codes: carnets, gift vouchers and studio codes

Customers pay for a class in two ways:
- **by card, in the site's cart** (Stripe);
- **with a code**: a carnet, a gift voucher, a member's hours, or any code the studio creates itself, for example for a carnet paid in cash or by card at the studio.

This small service keeps every code and its balance. On the booking page (`components/BookingEmbed.tsx`), a customer types their code above the calendar and sees what's left. The class they book is then taken off the code instead of going to the cart.

| | |
|---|---|
| Fly app | `rusc-codes`, region `ams`, 256 MB. It sleeps when unused and wakes in about a second, so it costs almost nothing. |
| Address | https://rusc-codes.fly.dev |
| Data | Schema `rusc` of the Cal.diy database (`schema.sql`), under its own role `rusc_codes`. It can only *read* Cal's bookings, seats, event types and attendees. |
| Code | `server.mjs` (Node, one dependency: `pg`) |

## For the studio: `/admin`

https://rusc-codes.fly.dev/admin, user `rusc`, password chosen by the studio (see setup).

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

## Setup (done 2026-09-24)

```bash
cd deploy/codes && sh setup.sh
```

The script:
- creates the app;
- creates the `rusc_codes` database role with a generated password, which is piped into Postgres and into Fly's secrets and never printed;
- applies `schema.sql`;
- deploys.

It's safe to run again. Last step, **for the studio**, choosing the admin password:

```bash
fly secrets set -a rusc-codes CODES_ADMIN_PASSWORD='…'
```

## Updating

Edit `server.mjs`, then `cd deploy/codes && fly deploy`. Fly builds the image from the `Dockerfile`. Schema changes go in `schema.sql`, applied with `sh ../cal/db-run.sh schema.sql`.

The list of classes (`OFFERS` in `server.mjs`) must match the sessions in `lib/cal.ts`. Prices matter for codes worth an amount.

## Still to do

- **Acuity codes:** import the carnets and vouchers still valid in Acuity, with their balances (`source = 'acuity'`). Waiting for the codes export.
- **Online sales:** carnets and vouchers bought in the cart could create their code automatically from the Stripe webhook. For now the studio creates them in `/admin` after the payment.
