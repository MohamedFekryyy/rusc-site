-- Tables of rūsc admin (rusc-admin), in their own schema "rusc" of
-- the Cal.diy database, owned by the role rusc_codes (created by setup.sh).
-- Run as the database owner: sh ../cal/db-run.sh schema.sql. Safe to run again.

GRANT CONNECT ON DATABASE cal TO rusc_codes;
CREATE SCHEMA IF NOT EXISTS rusc AUTHORIZATION rusc_codes;

-- Cal's tables it reads to check a booking; it never writes them.
GRANT USAGE ON SCHEMA public TO rusc_codes;
GRANT SELECT ON public."Booking", public."BookingSeat", public."EventType", public."Attendee", public."Availability" TO rusc_codes;

SET ROLE rusc_codes;

-- One row per code: a carnet, a gift voucher, a code issued at the studio.
CREATE TABLE IF NOT EXISTS rusc.codes (
  key text PRIMARY KEY,               -- the code in capitals, letters and digits only
  display text NOT NULL,              -- as given to the customer (RUSC-AB12-CD34)
  label text NOT NULL,                -- what it is, shown to the customer
  unit text NOT NULL CHECK (unit IN ('sessions', 'hours', 'euros')),
  offers text[] NOT NULL,             -- classes it pays for (offer keys of lib/cal.ts)
  initial numeric NOT NULL CHECK (initial > 0),
  remaining numeric NOT NULL CHECK (remaining >= 0),
  expires_on date,                    -- last valid day; null = no end
  holder text,                        -- customer's name or email, for the studio
  note text,
  source text NOT NULL DEFAULT 'studio' CHECK (source IN ('studio', 'acuity', 'online')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every change to a balance: a booking paid with the code (seat_uid set), or
-- an adjustment by the studio. amount > 0 is taken from the code, < 0 given
-- back. A cancelled booking gets cancelled_at and its amount back.
CREATE TABLE IF NOT EXISTS rusc.uses (
  id bigserial PRIMARY KEY,
  key text NOT NULL REFERENCES rusc.codes (key),
  seat_uid text UNIQUE,               -- Cal's seat reference: one per attendee and class
  booking_uid text,
  offer text,
  starts_at timestamptz,
  attendee text,                      -- name · email from the Cal booking
  amount numeric NOT NULL,
  note text,
  at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE INDEX IF NOT EXISTS uses_key ON rusc.uses (key);

-- Online orders (the site's cart, paid with Stripe), recorded from Stripe's
-- checkout.session.completed event. items is the site's order summary:
-- "<offer key>x<qty>[@<Cal seat or booking>] …".
CREATE TABLE IF NOT EXISTS rusc.orders (
  id text PRIMARY KEY,                -- Stripe Checkout Session (cs_…)
  created_at timestamptz NOT NULL DEFAULT now(),
  email text,
  name text,
  amount numeric NOT NULL,            -- euros TTC
  lang text,
  items text NOT NULL,
  livemode boolean
);

-- Places in a class paid by card (one per person: Cal's seat reference).
CREATE TABLE IF NOT EXISTS rusc.paid_seats (
  seat_uid text PRIMARY KEY,
  order_id text NOT NULL REFERENCES rusc.orders (id),
  offer text
);

-- Members: from memberships bought online (and added by hand later).
CREATE TABLE IF NOT EXISTS rusc.members (
  email text PRIMARY KEY,
  name text,
  since date NOT NULL DEFAULT current_date,
  until date NOT NULL,
  order_id text REFERENCES rusc.orders (id),
  note text
);

-- The order a code was bought with (carnets and vouchers bought online).
ALTER TABLE rusc.codes ADD COLUMN IF NOT EXISTS order_id text REFERENCES rusc.orders (id);

RESET ROLE;
