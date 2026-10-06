-- Tables of rūsc admin (rusc-admin), in their own schema "rusc" of
-- the Cal.diy database, owned by the role rusc_codes (created by setup.sh).
-- Run as the database owner: sh ../cal/db-run.sh schema.sql. Safe to run again.

GRANT CONNECT ON DATABASE cal TO rusc_codes;
CREATE SCHEMA IF NOT EXISTS rusc AUTHORIZATION rusc_codes;

-- Cal's tables it reads to check a booking; it never writes them.
GRANT USAGE ON SCHEMA public TO rusc_codes;
GRANT SELECT ON public."Booking", public."BookingSeat", public."EventType", public."Attendee", public."Availability" TO rusc_codes;
-- Horaires (the timetable page) edits the classes' hours: Cal's Availability rows.
GRANT INSERT, UPDATE, DELETE ON public."Availability" TO rusc_codes;
GRANT USAGE, SELECT ON SEQUENCE public."Availability_id_seq" TO rusc_codes;
-- Places (/api/places): extra places someone books for friends are seats of
-- the same Cal booking; unpaid places are freed after a while; a paid (or
-- emptied) booking gets its status. Cal's trigger on "Booking" then refreshes
-- "BookingDenormalized" as this role, reading the host's name from users.
GRANT UPDATE (status, paid, "idempotencyKey") ON public."Booking" TO rusc_codes;
GRANT INSERT, DELETE ON public."Attendee", public."BookingSeat" TO rusc_codes;
GRANT USAGE, SELECT ON SEQUENCE public."Attendee_id_seq", public."BookingSeat_id_seq" TO rusc_codes;
GRANT SELECT, INSERT, DELETE ON public."BookingDenormalized" TO rusc_codes;
GRANT SELECT (id, email, name, username) ON public.users TO rusc_codes;
-- New classes (Cours → Nouveau cours): rūsc admin makes a class's Cal event
-- type, schedule and English translation, as deploy/cal/seed-classes.mjs does,
-- and edits its name, description, length and places. Cal's trigger copies a
-- new length into "BookingDenormalized".
GRANT INSERT ON public."EventType" TO rusc_codes;
GRANT UPDATE (title, description, length, "seatsPerTimeSlot") ON public."EventType" TO rusc_codes;
GRANT USAGE, SELECT ON SEQUENCE public."EventType_id_seq" TO rusc_codes;
GRANT SELECT, INSERT ON public."Schedule" TO rusc_codes;
GRANT UPDATE (name) ON public."Schedule" TO rusc_codes;
GRANT USAGE, SELECT ON SEQUENCE public."Schedule_id_seq" TO rusc_codes;
GRANT SELECT, INSERT ON public."_user_eventtype" TO rusc_codes;
GRANT SELECT, INSERT, DELETE ON public."EventTypeTranslation" TO rusc_codes;
GRANT UPDATE ("eventLength") ON public."BookingDenormalized" TO rusc_codes;

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

-- One-off imports (Acuity's codes and upcoming bookings, sent from the
-- Acuity admin page to POST /import/acuity), kept as received; the SQL in
-- scripts/continuity/acuity-apply.sql turns the latest one into codes and
-- Cal places.
CREATE TABLE IF NOT EXISTS rusc.imports (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  payload jsonb NOT NULL
);

-- Upcoming Acuity bookings copied into Cal, and how each was paid on Acuity.
CREATE TABLE IF NOT EXISTS rusc.acuity_seats (
  seat_uid text PRIMARY KEY,          -- the Cal seat ("acuity-<appointment id>")
  acuity_id text NOT NULL,
  pay text                            -- "payé 50 €", "code XXXX", "à régler"
);

-- The order a code was bought with (carnets and vouchers bought online).
ALTER TABLE rusc.codes ADD COLUMN IF NOT EXISTS order_id text REFERENCES rusc.orders (id);

RESET ROLE;

-- Tables added on 2026-09-24 were first created after RESET ROLE, as the
-- database owner: hand them to rusc_codes (no-op once done).
ALTER TABLE IF EXISTS rusc.clients OWNER TO rusc_codes;
ALTER TABLE IF EXISTS rusc.history OWNER TO rusc_codes;
ALTER TABLE IF EXISTS rusc.acuity_orders OWNER TO rusc_codes;
ALTER TABLE IF EXISTS rusc.accounts OWNER TO rusc_codes;
ALTER TABLE IF EXISTS rusc.account_tokens OWNER TO rusc_codes;

SET ROLE rusc_codes;

-- ---------------------------------------------------------------- history from Acuity
-- Everything the studio had in Acuity, so nothing is lost at the switch
-- (scripts/continuity/acuity-history.mjs and acuity-history.sql).

-- The studio's clients: Acuity's client list, then everyone who books, buys
-- or opens an account (reconcile() adds new e-mails every few minutes).
CREATE TABLE IF NOT EXISTS rusc.clients (
  id bigserial PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  phone text,
  notes text,                          -- the studio's notes, from Acuity
  source text NOT NULL DEFAULT 'acuity', -- acuity, cal, online, account
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_email ON rusc.clients (lower(email)) WHERE email IS NOT NULL;
-- Other people Acuity listed under the same e-mail (a parent booking for
-- their children…): [{first_name, last_name, phone, notes}], kept so no name is lost.
ALTER TABLE rusc.clients ADD COLUMN IF NOT EXISTS others jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Acuity's appointments, as exported. Upcoming ones at the switch are also
-- Cal places (rusc.acuity_seats); the admin shows these for past days only.
CREATE TABLE IF NOT EXISTS rusc.history (
  acuity_id text PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  type text NOT NULL,                  -- Acuity's appointment type
  offer text,                          -- our offer key (lib/cal.ts), when there's one
  first_name text,
  last_name text,
  email text,
  phone text,
  price numeric,
  paid boolean,
  amount_paid numeric,
  certificate text,                    -- the code it was paid with
  notes text,
  label text,
  scheduled_by text,
  scheduled_on date,
  rescheduled_on date,
  canceled boolean NOT NULL DEFAULT false,
  canceled_on date
);
CREATE INDEX IF NOT EXISTS history_starts ON rusc.history (starts_at);
CREATE INDEX IF NOT EXISTS history_email ON rusc.history (lower(email));

-- Acuity's orders (packages and gift certificates bought online).
CREATE TABLE IF NOT EXISTS rusc.acuity_orders (
  id text PRIMARY KEY,                 -- md5 of the row: the export has no order number
  ordered_at timestamp NOT NULL,       -- Paris time, as exported
  first_name text,
  last_name text,
  email text,
  phone text,
  total numeric,
  status text,
  notes text,
  products text
);
CREATE INDEX IF NOT EXISTS acuity_orders_email ON rusc.acuity_orders (lower(email));

-- ---------------------------------------------------------------- member accounts
-- The site's Connexion page (/connexion/, /en/login/): accounts and their
-- sign-in tokens. Passwords are only kept as scrypt hashes, tokens as SHA-256.
CREATE TABLE IF NOT EXISTS rusc.accounts (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  password text NOT NULL,              -- scrypt$<salt>$<hash>
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email ON rusc.accounts (lower(email));

CREATE TABLE IF NOT EXISTS rusc.account_tokens (
  hash text PRIMARY KEY,               -- SHA-256 of the token
  account_id bigint NOT NULL REFERENCES rusc.accounts (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('session', 'reset')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- A code a member added to their account (shown in their space).
ALTER TABLE rusc.codes ADD COLUMN IF NOT EXISTS account_id bigint REFERENCES rusc.accounts (id) ON DELETE SET NULL;

-- Code payment for cart products (W3): a monetary hold on a euro-valued code.
-- A pending use reserves part of the code while a Stripe checkout is open; it
-- is finalized on checkout.session.completed and rolled back if the session
-- expires or the payment fails (the code's balance is returned).
ALTER TABLE rusc.uses ADD COLUMN IF NOT EXISTS pending boolean NOT NULL DEFAULT false;
ALTER TABLE rusc.uses ADD COLUMN IF NOT EXISTS order_id text REFERENCES rusc.orders (id) ON DELETE SET NULL;
-- The code (and how much it covered) applied to an online order.
ALTER TABLE rusc.orders ADD COLUMN IF NOT EXISTS code_key text;
ALTER TABLE rusc.orders ADD COLUMN IF NOT EXISTS code_covered_cents integer;

-- Places booked on the site and sitting in a cart, unpaid: held for a while
-- (HOLD_MINUTES in server.mjs, longer while paying), then freed in Cal unless
-- paid. One row per booker; the extra places they added point to their seat
-- (BookingSeat.data->>'rusc_holder').
CREATE TABLE IF NOT EXISTS rusc.holds (
  seat_uid text PRIMARY KEY,           -- the booker's own seat (Cal's reference)
  booking_uid text NOT NULL,
  offer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz              -- freed: ran out, or removed from the cart
);
CREATE TABLE IF NOT EXISTS rusc.unsubscribed (
  email text PRIMARY KEY,               -- lower(email), refusé du mailing
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS holds_open ON rusc.holds (expires_at) WHERE released_at IS NULL;

-- Classes created in rūsc admin, on top of those in the site's lib/cal.ts.
-- Each is one Cal event type (slug = key) that rūsc admin made; its length and
-- places live there. The site lists the active ones on its booking page
-- (GET /api/classes); a hidden one keeps its bookings, codes and orders.
CREATE TABLE IF NOT EXISTS rusc.classes (
  key text PRIMARY KEY,                -- the Cal event type's slug
  event_type_id integer NOT NULL UNIQUE,
  title_fr text NOT NULL,
  title_en text NOT NULL,
  tag_fr text NOT NULL,                -- the line above the name ("Stage · 10h – 17h")
  tag_en text NOT NULL,
  note_fr text,                        -- after the price ("75 € · apéro et modelage")
  note_en text,
  description_fr text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents > 0),
  image text NOT NULL,                 -- one of the site's photos (PHOTOS in server.mjs)
  euro_codes boolean NOT NULL DEFAULT true,   -- gift vouchers in euros pay for it
  class_cards boolean NOT NULL DEFAULT false, -- 2-hour class cards pay for it
  active boolean NOT NULL DEFAULT true,       -- listed on the site
  created_at timestamptz NOT NULL DEFAULT now()
);

RESET ROLE;
