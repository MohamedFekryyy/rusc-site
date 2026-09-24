-- Turns the latest Acuity import (rusc.imports, sent by acuity-extract.js)
-- into rūsc admin codes and Cal places. Runs entirely in the database, so
-- no client data leaves it:
--   sh deploy/cal/db-run.sh scripts/continuity/acuity-apply.sql
-- Safe to run again (e.g. after a fresh import on switch day):
--   - a code already used in the new system keeps its balance;
--   - an upcoming booking already copied is skipped, one cancelled in
--     Acuity since is removed from Cal. Nobody is emailed.
-- Prints counts only.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL timezone = 'UTC';

CREATE TEMP TABLE imp ON COMMIT DROP AS
  SELECT payload FROM rusc.imports WHERE source = 'acuity' ORDER BY id DESC LIMIT 1;

-- Acuity appointment types: our offer key (lib/cal.ts), Acuity's name (as in
-- its CSV export) and its length in minutes (codes count minutes).
CREATE TEMP TABLE types (acuity text, offer text, name text, minutes int) ON COMMIT DROP;
INSERT INTO types VALUES
  ('37545405', 'atelier-ceramique-2h', 'atelier céramique 2 H', 120),
  ('83689322', 'atelier-modelage-2h', 'Atelier modelage 2h', 120),
  ('83714176', 'modelage-enfant', 'Modelage enfant 2h', 120),
  ('95579518', 'decor-a-cru-1h', 'Décor à cru', 60),
  ('96726687', 'atelier-libre-1h', 'Atelier libre 1 h réservé aux membres', 60),
  ('37557593', 'atelier-ceramique-1j', 'atelier céramique 1 J', 420),
  ('37557627', 'atelier-ceramique-2j', 'atelier céramique 2 J', 840),
  ('78615626', 'porcelaine', 'Atelier porcelaine 1j', 360),
  ('98575999', 'pot-and-wine', 'Pot & Wine', 150);

-- Acuity packages and gift certificates (products.php, by id): what a code is
-- worth before its first use, when Acuity shows no balance, only "Code has
-- not been used". In minutes, euros or classes, as set on each product.
CREATE TEMP TABLE products (id text, minutes int, euros numeric, classes int) ON COMMIT DROP;
INSERT INTO products VALUES
  ('1375543', 1200, NULL, NULL),  -- Carnet 10 x 2H
  ('1375544', 600, NULL, NULL),   -- Carnet 5 x 2H
  ('1670828', 600, NULL, NULL),   -- Bon Cadeau – Carnet 5 x 2H / 210 €
  ('1670833', NULL, 180, NULL),   -- Bon Cadeau – 180 € / 1 Jour Céramique ou tapisserie
  ('1670842', NULL, 260, NULL),   -- Bon Cadeau – 260 € / 2 Jours Céramique ou tapisserie
  ('1670850', 1200, NULL, NULL),  -- Bon Cadeau – Carnet 10 x 2H / 350 €
  ('1894814', 600, NULL, NULL),   -- atelier libre 10 h réservé aux membres
  ('1894815', 1200, NULL, NULL),  -- atelier libre 20 h réservé aux membres
  ('1903803', 120, NULL, NULL),   -- Bon Cadeau – séance 2H / 50€
  ('2274096', NULL, NULL, 2);     -- Client Achat boutique (2 wheel-throwing classes)

-- ---------------------------------------------------------------- codes
CREATE TEMP TABLE acodes ON COMMIT DROP AS
SELECT DISTINCT ON (key) *
  FROM (
    SELECT upper(regexp_replace(c->>'code', '[^A-Za-z0-9]', '', 'g')) AS key,
           upper(trim(c->>'code')) AS display,
           c->>'productId' AS product_id,
           c->>'product' AS product,
           nullif(trim(c->>'holder'), '') AS holder,
           ARRAY(SELECT jsonb_array_elements_text(c->'types')) AS acuity_types,
           coalesce(c->>'balance', '') AS balance,
           -- Never used: Acuity says so, or (extracts before that flag) shows no balance.
           coalesce((c->>'unused')::boolean, coalesce(c->>'balance', '') = '') AS unused,
           CASE WHEN c->>'expires' ~ '[A-Za-z]+ +[0-9]{1,2}, [0-9]{4}'
                THEN to_date(regexp_replace(substring(c->>'expires' from '([A-Za-z]+ +[0-9]{1,2}, [0-9]{4})'), ' +', ' ', 'g'), 'FMMonth FMDD, YYYY') END AS expires
      FROM imp, jsonb_array_elements(imp.payload->'codes') c
  ) x
 ORDER BY key;

ALTER TABLE acodes ADD COLUMN offers text[], ADD COLUMN unit text, ADD COLUMN per numeric,
                   ADD COLUMN remaining numeric, ADD COLUMN initial numeric;

-- The classes: Acuity's types; a 2-hour class card is valid for every 2-hour
-- class (the site sells the carnets under wheel throwing and hand-building).
UPDATE acodes a SET offers = ARRAY(
  SELECT DISTINCT t.offer FROM types t
   WHERE t.acuity = ANY (a.acuity_types)
      OR ('37545405' = ANY (a.acuity_types) AND t.offer IN ('atelier-ceramique-2h', 'atelier-modelage-2h', 'modelage-enfant')));

-- The unit: euros for an amount; hours for open studio; otherwise classes, of
-- the shortest length the code is valid for (per = minutes in one unit).
UPDATE acodes a SET
  unit = CASE WHEN a.balance ~ '€' OR EXISTS (SELECT 1 FROM products p WHERE p.id = a.product_id AND p.euros IS NOT NULL) THEN 'euros'
              WHEN a.offers = ARRAY['atelier-libre-1h'] THEN 'hours'
              ELSE 'sessions' END,
  per = CASE WHEN a.offers = ARRAY['atelier-libre-1h'] THEN 60
             ELSE (SELECT min(t.minutes) FROM types t WHERE t.acuity = ANY (a.acuity_types)) END;

-- What's left and what it was: Acuity's balance ("540 minutes remaining (of
-- 600 total)", "€50 remaining (of €180 total)"), or for a code never used the
-- full value of its product. Minutes round down to half a class or hour.
UPDATE acodes a SET
  remaining = CASE
    WHEN a.balance ~ '€' THEN replace(substring(a.balance from '€ ?([0-9]+(?:[.,][0-9]+)?) remaining'), ',', '.')::numeric
    WHEN a.balance ~* 'minutes remaining' THEN floor(substring(a.balance from '([0-9]+) minutes remaining')::numeric / a.per * 2) / 2
    WHEN a.unused THEN (SELECT coalesce(p.euros, p.classes, floor(p.minutes / a.per * 2) / 2) FROM products p WHERE p.id = a.product_id) END,
  initial = CASE
    WHEN a.balance ~ '€' THEN replace(substring(a.balance from '\(of €? ?([0-9]+(?:[.,][0-9]+)?)'), ',', '.')::numeric
    WHEN a.balance ~* 'minutes remaining' THEN floor(substring(a.balance from '\(of ([0-9]+)')::numeric / a.per * 2) / 2
    WHEN a.unused THEN (SELECT coalesce(p.euros, p.classes, floor(p.minutes / a.per * 2) / 2) FROM products p WHERE p.id = a.product_id) END;

CREATE TEMP TABLE imported ON COMMIT DROP AS
SELECT * FROM acodes
 WHERE remaining > 0 AND cardinality(offers) > 0
   AND (expires IS NULL OR expires >= (now() AT TIME ZONE 'Europe/Paris')::date);

INSERT INTO rusc.codes (key, display, label, unit, offers, initial, remaining, expires_on, holder, note, source)
SELECT key, display, product, unit, offers, round(greatest(coalesce(initial, remaining), remaining), 2), round(remaining, 2), expires, holder,
       'Importé d’Acuity le ' || to_char(now() AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY'), 'acuity'
  FROM imported
ON CONFLICT (key) DO UPDATE SET remaining = EXCLUDED.remaining, initial = EXCLUDED.initial,
       expires_on = EXCLUDED.expires_on, offers = EXCLUDED.offers
 WHERE rusc.codes.source = 'acuity' AND NOT EXISTS (SELECT 1 FROM rusc.uses u WHERE u.key = rusc.codes.key);

-- ---------------------------------------------------------------- bookings
CREATE TEMP TABLE aappts ON COMMIT DROP AS
SELECT a->>'id' AS aid, t.offer AS slug,
       (to_timestamp(a->>'start', 'FMMonth FMDD, YYYY HH24:MI')::timestamp AT TIME ZONE coalesce(nullif(a->>'timezone', ''), 'Europe/Paris')) AT TIME ZONE 'UTC' AS starts,
       (to_timestamp(a->>'start', 'FMMonth FMDD, YYYY HH24:MI')::timestamp AT TIME ZONE coalesce(nullif(a->>'timezone', ''), 'Europe/Paris')) AT TIME ZONE 'UTC'
         + make_interval(mins => t.minutes) AS ends,
       coalesce(nullif(trim(coalesce(a->>'firstName', '') || ' ' || coalesce(a->>'lastName', '')), ''), 'Client Acuity') AS name,
       coalesce(nullif(a->>'email', ''), 'acuity-' || (a->>'id') || '@clients.studio-rusc.com') AS email,
       nullif(a->>'phone', '') AS phone,
       CASE WHEN coalesce(a->>'certificate', '') <> '' THEN 'code ' || upper(a->>'certificate')
            WHEN lower(a->>'paid') = 'yes' THEN trim('payé ' || coalesce(nullif(a->>'amountPaid', ''), ''))
            ELSE 'à régler' END AS pay
  FROM imp, jsonb_array_elements(imp.payload->'appointments') a
  JOIN types t ON lower(t.name) = lower(a->>'type');

DO $acuity$
DECLARE r record; host int; eid int; bid int; att int;
BEGIN
  SELECT id INTO host FROM users WHERE username = 'raquel';
  -- Upcoming bookings cancelled in Acuity since the last run leave Cal.
  FOR r IN SELECT s.id AS seat, s."attendeeId" AS attendee, s."bookingId" AS booking, x.seat_uid
             FROM rusc.acuity_seats x JOIN "BookingSeat" s ON s."referenceUid" = x.seat_uid
             JOIN "Booking" b ON b.id = s."bookingId"
            WHERE b."startTime" >= now() AT TIME ZONE 'UTC' AND x.acuity_id NOT IN (SELECT aid FROM aappts) LOOP
    DELETE FROM "BookingSeat" WHERE id = r.seat;
    DELETE FROM "Attendee" WHERE id = r.attendee;
    DELETE FROM rusc.acuity_seats WHERE seat_uid = r.seat_uid;
    DELETE FROM "Booking" b WHERE b.id = r.booking AND NOT EXISTS (SELECT 1 FROM "Attendee" a WHERE a."bookingId" = b.id);
  END LOOP;
  -- New ones join their class: one Cal booking per class and time, one seat each.
  FOR r IN SELECT * FROM aappts WHERE starts >= now() AT TIME ZONE 'UTC' - interval '12 hours' LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM "BookingSeat" WHERE "referenceUid" = 'acuity-' || r.aid);
    SELECT id INTO eid FROM "EventType" WHERE "userId" = host AND slug = r.slug;
    CONTINUE WHEN eid IS NULL;
    SELECT id INTO bid FROM "Booking" WHERE "eventTypeId" = eid AND "startTime" = r.starts AND status = 'accepted' ORDER BY id LIMIT 1;
    IF bid IS NULL THEN
      INSERT INTO "Booking" (uid, title, "startTime", "endTime", "userId", "eventTypeId", status)
      SELECT 'acuity' || substr(md5(random()::text || clock_timestamp()::text), 1, 16), e.title, r.starts, r.ends, host, eid, 'accepted'
        FROM "EventType" e WHERE e.id = eid
      RETURNING id INTO bid;
    END IF;
    INSERT INTO "Attendee" (email, name, "timeZone", "bookingId", locale, "phoneNumber")
    VALUES (r.email, r.name, 'Europe/Paris', bid, 'fr', r.phone) RETURNING id INTO att;
    INSERT INTO "BookingSeat" ("referenceUid", "bookingId", "attendeeId", data)
    VALUES ('acuity-' || r.aid, bid, att, jsonb_build_object('responses', jsonb_build_object('name', r.name, 'email', r.email)));
    INSERT INTO rusc.acuity_seats (seat_uid, acuity_id, pay) VALUES ('acuity-' || r.aid, r.aid, r.pay)
    ON CONFLICT (seat_uid) DO UPDATE SET pay = EXCLUDED.pay;
  END LOOP;
END
$acuity$;

-- ---------------------------------------------------------------- report (counts only)
\pset format unaligned
\pset footer off
SELECT 'codes read' AS what, count(*)::text AS n FROM acodes
UNION ALL SELECT 'codes imported or refreshed', count(*)::text FROM imported
UNION ALL SELECT '  of which never used', count(*)::text FROM imported WHERE unused
UNION ALL SELECT 'skipped: expired', count(*)::text FROM acodes WHERE expires < (now() AT TIME ZONE 'Europe/Paris')::date
UNION ALL SELECT 'skipped: used up, still dated', count(*)::text FROM acodes
   WHERE remaining <= 0 AND (expires IS NULL OR expires >= (now() AT TIME ZONE 'Europe/Paris')::date)
UNION ALL SELECT 'skipped: balance not understood (check!)', count(*)::text FROM acodes
   WHERE remaining IS NULL AND (expires IS NULL OR expires >= (now() AT TIME ZONE 'Europe/Paris')::date)
UNION ALL SELECT 'skipped: for no class we run (check!)', count(*)::text FROM acodes
   WHERE remaining > 0 AND cardinality(offers) = 0 AND (expires IS NULL OR expires >= (now() AT TIME ZONE 'Europe/Paris')::date)
UNION ALL SELECT 'upcoming bookings in the import', count(*)::text FROM aappts
UNION ALL SELECT 'Acuity places now in Cal', count(*)::text FROM rusc.acuity_seats;
SELECT product, unit, count(*) AS codes, round(sum(remaining), 1) AS left_in_total FROM imported GROUP BY product, unit ORDER BY product;
COMMIT;
