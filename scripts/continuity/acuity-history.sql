-- Loads the latest Acuity history import (rusc.imports, source
-- 'acuity-history', sent by acuity-history.mjs) into rūsc admin's tables:
-- rusc.history (appointments), rusc.acuity_orders, rusc.clients.
--   sh deploy/cal/db-run.sh scripts/continuity/acuity-history.sql
-- Safe to run again with a newer export: rows are matched by Acuity's
-- appointment id, by order (date, buyer, total, products) and by e-mail.
-- Runs inside the database and prints counts only.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL timezone = 'UTC';

CREATE TEMP TABLE imp ON COMMIT DROP AS
  SELECT payload FROM rusc.imports WHERE source = 'acuity-history' ORDER BY id DESC LIMIT 1;

-- Acuity's appointment types → our offer keys (lib/cal.ts). Types not listed
-- keep their Acuity name in rusc.history.type, with no offer.
CREATE TEMP TABLE types (offer text, name text) ON COMMIT DROP;
INSERT INTO types VALUES
  ('atelier-ceramique-2h', 'atelier céramique 2 H'),
  ('atelier-modelage-2h', 'Atelier modelage 2h'),
  ('modelage-enfant', 'Modelage enfant 2h'),
  ('decor-a-cru-1h', 'Décor à cru'),
  ('atelier-libre-1h', 'Atelier libre 1 h réservé aux membres'),
  ('atelier-ceramique-1j', 'atelier céramique 1 J'),
  ('atelier-ceramique-2j', 'atelier céramique 2 J'),
  ('porcelaine', 'Atelier porcelaine 1j'),
  ('pot-and-wine', 'Pot & Wine');

-- "50.00", "50,00", "€1,050.00" → numeric; anything else → null.
CREATE FUNCTION pg_temp.num(v text) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN x ~ '^[0-9]+$' THEN x::numeric
    WHEN x ~ '^[0-9]+[.,][0-9]{1,2}$' THEN replace(x, ',', '.')::numeric
    WHEN x ~ '^[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?$' THEN replace(x, ',', '')::numeric
    WHEN x ~ '^[0-9]{1,3}(\.[0-9]{3})+(,[0-9]+)?$' THEN replace(replace(x, '.', ''), ',', '.')::numeric
  END
  FROM (SELECT regexp_replace(coalesce(v, ''), '[^0-9.,]', '', 'g') AS x) s $$;
-- "September 22, 2026 18:30" in the appointment's time zone → timestamptz.
CREATE FUNCTION pg_temp.at(v text, tz text) RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN v ~ '^[A-Za-z]+ +[0-9]{1,2}, [0-9]{4} [0-9]{1,2}:[0-9]{2}'
    THEN to_timestamp(regexp_replace(v, ' +', ' ', 'g'), 'FMMonth FMDD, YYYY HH24:MI')::timestamp AT TIME ZONE coalesce(nullif(tz, ''), 'Europe/Paris') END $$;
CREATE FUNCTION pg_temp.day(v text) RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN substr(v, 1, 10)::date END $$;
CREATE FUNCTION pg_temp.clean(v text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT nullif(trim(coalesce(v, '')), '') $$;

-- ---------------------------------------------------------------- appointments
INSERT INTO rusc.history (acuity_id, starts_at, ends_at, type, offer, first_name, last_name, email, phone,
                          price, paid, amount_paid, certificate, notes, label, scheduled_by,
                          scheduled_on, rescheduled_on, canceled, canceled_on)
SELECT DISTINCT ON (a->>'id')
       a->>'id', pg_temp.at(a->>'start', a->>'timezone'), pg_temp.at(a->>'end', a->>'timezone'),
       a->>'type', t.offer, pg_temp.clean(a->>'firstName'), pg_temp.clean(a->>'lastName'),
       lower(pg_temp.clean(a->>'email')), pg_temp.clean(a->>'phone'),
       pg_temp.num(a->>'price'), lower(coalesce(a->>'paid', '')) = 'yes', pg_temp.num(a->>'amountPaid'),
       upper(pg_temp.clean(a->>'certificate')), pg_temp.clean(a->>'notes'), pg_temp.clean(a->>'label'),
       pg_temp.clean(a->>'scheduledBy'), pg_temp.day(a->>'scheduled'), pg_temp.day(a->>'rescheduled'),
       lower(coalesce(a->>'canceled', '')) IN ('yes', 'true', '1'), pg_temp.day(a->>'canceledOn')
  FROM imp, jsonb_array_elements(imp.payload->'appointments') a
  LEFT JOIN types t ON lower(t.name) = lower(a->>'type')
 WHERE coalesce(a->>'id', '') <> '' AND pg_temp.at(a->>'start', a->>'timezone') IS NOT NULL
 ORDER BY a->>'id'
ON CONFLICT (acuity_id) DO UPDATE SET
  starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, type = EXCLUDED.type, offer = EXCLUDED.offer,
  first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
  price = EXCLUDED.price, paid = EXCLUDED.paid, amount_paid = EXCLUDED.amount_paid, certificate = EXCLUDED.certificate,
  notes = EXCLUDED.notes, label = EXCLUDED.label, scheduled_by = EXCLUDED.scheduled_by,
  scheduled_on = EXCLUDED.scheduled_on, rescheduled_on = EXCLUDED.rescheduled_on,
  canceled = EXCLUDED.canceled, canceled_on = EXCLUDED.canceled_on;

-- ---------------------------------------------------------------- orders
INSERT INTO rusc.acuity_orders (id, ordered_at, first_name, last_name, email, phone, total, status, notes, products)
SELECT DISTINCT ON (id) * FROM (
  SELECT md5(concat_ws('|', o->>'date', lower(o->>'email'), o->>'total', o->>'products', o->>'firstName', o->>'lastName')) AS id,
         (o->>'date')::timestamp AS ordered_at, pg_temp.clean(o->>'firstName') AS first_name, pg_temp.clean(o->>'lastName') AS last_name,
         lower(pg_temp.clean(o->>'email')) AS email, pg_temp.clean(o->>'phone') AS phone, pg_temp.num(o->>'total') AS total,
         pg_temp.clean(o->>'status') AS status, pg_temp.clean(o->>'notes') AS notes, pg_temp.clean(o->>'products') AS products
    FROM imp, jsonb_array_elements(imp.payload->'orders') o
   WHERE o->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
) x ORDER BY id
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ---------------------------------------------------------------- clients
-- The client list (with the studio's notes), then anyone else who booked or
-- ordered on Acuity. An e-mail already known keeps its row; empty fields fill in.
CREATE TEMP TABLE people ON COMMIT DROP AS
SELECT DISTINCT ON (lower(email)) lower(email) AS email, first_name, last_name, phone, notes, rank
  FROM (
    SELECT pg_temp.clean(c->>'email') AS email, pg_temp.clean(c->>'firstName') AS first_name, pg_temp.clean(c->>'lastName') AS last_name,
           pg_temp.clean(c->>'phone') AS phone, pg_temp.clean(c->>'notes') AS notes, 1 AS rank
      FROM imp, jsonb_array_elements(imp.payload->'clients') c
    UNION ALL
    SELECT email, first_name, last_name, phone, NULL, 2 FROM rusc.history
    UNION ALL
    SELECT email, first_name, last_name, phone, NULL, 3 FROM rusc.acuity_orders
  ) x
 WHERE email ~ '@'
 ORDER BY lower(email), rank;

INSERT INTO rusc.clients (email, first_name, last_name, phone, notes, source)
SELECT email, first_name, last_name, phone, notes, 'acuity' FROM people
ON CONFLICT (lower(email)) WHERE email IS NOT NULL DO UPDATE SET
  first_name = coalesce(rusc.clients.first_name, EXCLUDED.first_name),
  last_name = coalesce(rusc.clients.last_name, EXCLUDED.last_name),
  phone = coalesce(rusc.clients.phone, EXCLUDED.phone),
  notes = coalesce(EXCLUDED.notes, rusc.clients.notes);

-- Several people under one e-mail (a parent booking for their children…):
-- the first stays the client, the others are kept with it, so no name is lost.
CREATE TEMP TABLE listed ON COMMIT DROP AS
SELECT lower(pg_temp.clean(c->>'email')) AS email, pg_temp.clean(c->>'firstName') AS first_name, pg_temp.clean(c->>'lastName') AS last_name,
       pg_temp.clean(c->>'phone') AS phone, pg_temp.clean(c->>'notes') AS notes
  FROM imp, jsonb_array_elements(imp.payload->'clients') c
 WHERE c->>'email' ~ '@';
UPDATE rusc.clients k SET others = coalesce((
  SELECT jsonb_agg(DISTINCT jsonb_strip_nulls(jsonb_build_object('first_name', l.first_name, 'last_name', l.last_name, 'phone', l.phone, 'notes', l.notes)))
    FROM listed l
   WHERE l.email = lower(k.email)
     AND (lower(coalesce(l.first_name, '')), lower(coalesce(l.last_name, ''))) <> (lower(coalesce(k.first_name, '')), lower(coalesce(k.last_name, '')))
), '[]'::jsonb)
 WHERE k.email IS NOT NULL AND EXISTS (SELECT 1 FROM listed l WHERE l.email = lower(k.email));

-- Clients without an e-mail: kept once each.
INSERT INTO rusc.clients (first_name, last_name, phone, notes, source)
SELECT DISTINCT pg_temp.clean(c->>'firstName'), pg_temp.clean(c->>'lastName'), pg_temp.clean(c->>'phone'), pg_temp.clean(c->>'notes'), 'acuity'
  FROM imp, jsonb_array_elements(imp.payload->'clients') c
 WHERE coalesce(c->>'email', '') !~ '@'
   AND coalesce(pg_temp.clean(c->>'firstName'), pg_temp.clean(c->>'lastName'), pg_temp.clean(c->>'phone')) IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM rusc.clients k WHERE k.email IS NULL
                     AND k.first_name IS NOT DISTINCT FROM pg_temp.clean(c->>'firstName')
                     AND k.last_name IS NOT DISTINCT FROM pg_temp.clean(c->>'lastName')
                     AND k.phone IS NOT DISTINCT FROM pg_temp.clean(c->>'phone'));

-- ---------------------------------------------------------------- report (counts only)
\pset format unaligned
\pset footer off
SELECT 'appointments in the import' AS what, jsonb_array_length(payload->'appointments')::text AS n FROM imp
UNION ALL SELECT 'appointments kept (rusc.history)', count(*)::text FROM rusc.history
UNION ALL SELECT '  past, not cancelled', count(*)::text FROM rusc.history WHERE starts_at < now() AND NOT canceled
UNION ALL SELECT '  cancelled', count(*)::text FROM rusc.history WHERE canceled
UNION ALL SELECT '  matched to one of our classes', count(*)::text FROM rusc.history WHERE offer IS NOT NULL
UNION ALL SELECT '  first and last', to_char(min(starts_at) AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') || ' → ' || to_char(max(starts_at) AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') FROM rusc.history
UNION ALL SELECT 'orders in the import', jsonb_array_length(payload->'orders')::text FROM imp
UNION ALL SELECT 'orders kept (rusc.acuity_orders)', count(*)::text FROM rusc.acuity_orders
UNION ALL SELECT 'clients in the import', jsonb_array_length(payload->'clients')::text FROM imp
UNION ALL SELECT 'clients now (rusc.clients)', count(*)::text FROM rusc.clients
UNION ALL SELECT '  with a note from Acuity', count(*)::text FROM rusc.clients WHERE notes IS NOT NULL
UNION ALL SELECT '  other people kept under a shared e-mail', coalesce(sum(jsonb_array_length(others)), 0)::text FROM rusc.clients;
-- Acuity types with no class of ours (names only, no client data).
SELECT type AS acuity_type_without_offer, count(*) AS appointments FROM rusc.history WHERE offer IS NULL GROUP BY type ORDER BY 2 DESC;
COMMIT;
