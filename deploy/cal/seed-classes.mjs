// rūsc's classes as Cal.diy event types, with their timetable: one schedule
// per class, and two event types per class (`<key>-fr`, `<key>-en`, the keys
// of the sessions in lib/cal.ts), all hosted by the studio account.
//
//   node deploy/cal/seed-classes.mjs > /tmp/classes.sql && sh deploy/cal/db-run.sh /tmp/classes.sql
//
// Safe to run again: schedules and event types are matched by name and slug
// and updated in place; a schedule's times are replaced by the ones below.
// The timetable, places and durations come from Acuity (checked 2026-09-24
// with scripts/continuity/acuity-classes.mjs); descriptions from the site's
// Cours, Stages and Espace membre pages. Everything can be edited in Cal
// afterwards, but a new run of this script puts these values back.

const HOST = "raquel";
const TZ = "Europe/Paris";
const ADDRESS = "rūsc, 99 Promenade Marie Paradis, 74400 Chamonix-Mont-Blanc";

// days: 0 = Sunday … 6 = Saturday. dates: one-off days (stages).
// Cal only starts a slot on a multiple of the slot interval past the hour, so
// classes use a 30-minute interval (the Tuesday classes start at 18:30); each
// window is exactly one class long, so it still holds a single slot. Open
// studio keeps 1-hour slots.
const CLASSES = [
  {
    key: "atelier-ceramique-2h", minutes: 120, seats: 7,
    weekly: [[1, "16:00", "18:00"], [2, "18:30", "20:30"], [3, "18:00", "20:00"], [4, "17:00", "19:00"]],
    fr: ["tournage 2h", "Ateliers de tournage en céramique avec un professeur expérimenté qui vous guidera dans vos premiers pas. À votre rythme, sur des cours de 2h vous apprendrez toutes les étapes nécessaires à la réalisation de vos poteries."],
    en: ["wheel throwing 2h", "Ceramics throwing courses with an experienced teacher who will guide you through your first steps. At your own pace, over 2-hour courses you will learn every step needed to make your own pots."],
  },
  {
    key: "atelier-modelage-2h", minutes: 120, seats: 8,
    weekly: [[1, "16:00", "18:00"], [4, "17:00", "19:00"]],
    fr: ["modelage 2h", "Que vous soyez débutants ou expérimentés, venez vous essayer au modelage et conceptualisez vos propres créations."],
    en: ["hand-building 2h", "Whether you are a beginner or experienced, come and try your hand at hand-building and conceptualise your own creations."],
  },
  {
    key: "decor-a-cru-1h", minutes: 60, seats: 8,
    weekly: [[1, "16:00", "17:00"], [2, "18:30", "19:30"], [3, "18:00", "19:00"]],
    fr: ["décor à cru 1h", "Un cours d’une heure dédié au décor à cru, pour personnaliser vos pièces avant la cuisson."],
    en: ["raw-glaze decoration 1h", "A one-hour course dedicated to raw-glaze decoration, to personalise your pieces before firing."],
  },
  {
    key: "modelage-enfant", minutes: 120, seats: 8,
    weekly: [[3, "14:00", "16:00"]],
    fr: ["cours enfant 2h", "Pour les 7–12 ans, le mercredi (hors vacances scolaires). Un temps ludique pour découvrir, façonner et créer."],
    en: ["children’s course 2h", "For ages 7–12, on Wednesdays (outside school holidays). A playful time to discover, shape and create."],
  },
  {
    key: "atelier-libre-1h", minutes: 60, seats: 7, interval: 60,
    weekly: [[2, "09:00", "14:00"], [4, "14:00", "18:00"]],
    fr: ["atelier libre 1h", "Réservé aux membres : l’atelier en autonomie, 7 tours de potier, outils, grès, engobes et émail transparent à disposition."],
    en: ["open studio 1h", "Members only: the studio on your own, with 7 potter’s wheels, tools, stoneware, slips and clear glaze available."],
  },
  {
    key: "atelier-ceramique-1j", minutes: 420, seats: 7,
    dates: [["2026-10-10", "10:00", "17:00"], ["2026-10-11", "10:00", "17:00"]],
    fr: ["céramique 1j", "De 10h à 17h. Que vous soyez débutant ou dans le cadre d’une reconversion professionnelle, nous vous guiderons afin de passer en revue toutes les étapes nécessaires au tournage d’une pièce en grès."],
    en: ["ceramics 1 day", "10am to 5pm. Whether you are a beginner or considering a career change, we will guide you through every step needed to throw a stoneware piece."],
  },
  {
    key: "atelier-ceramique-2j", minutes: 420, seats: 7,
    dates: [["2026-10-10", "10:00", "17:00"]],
    fr: ["céramique 2j", "Deux journées consécutives, de 10h à 17h (l’horaire indiqué est celui du premier jour). Ouvert à tous : toutes les étapes de la création, du tournage à l’engobage en passant par le tournassage."],
    en: ["ceramics 2 days", "Two consecutive days, 10am to 5pm (the time shown is the first day). Open to all: every stage of creation, from throwing to glazing, including turning."],
  },
  {
    key: "porcelaine", minutes: 360, seats: 7,
    dates: [["2026-11-01", "11:00", "17:00"]],
    fr: ["porcelaine 1j", "Une fois par mois : apprivoiser la porcelaine, matière pure, exigeante et lumineuse, et façonner vos propres pièces au tour."],
    en: ["porcelain 1 day", "Once a month: tame porcelain, a pure, demanding and luminous material, and shape your own pieces on the wheel."],
  },
  {
    key: "pot-and-wine", minutes: 150, seats: 8,
    dates: [["2026-10-09", "18:00", "20:30"]],
    fr: ["pot & wine", "Un peu de terre, un verre de vin et une soirée entre amis : un apéro modelage au studio, de 18h à 20h30."],
    en: ["pot & wine", "A little clay, a glass of wine and an evening with friends: a hand-building apéro at the studio, 6pm to 8.30pm."],
  },
];

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const lines = ["\\set ON_ERROR_STOP on", "BEGIN;", "DO $rusc$", "DECLARE uid int; sid int; eid int;", "BEGIN"];
lines.push(`  SELECT id INTO uid FROM users WHERE username = ${q(HOST)};`);
lines.push(`  IF uid IS NULL THEN RAISE EXCEPTION 'no user ${HOST}'; END IF;`);

CLASSES.forEach((c, index) => {
  const schedule = `rūsc · ${c.fr[0]}`;
  lines.push(`  -- ${c.key}`);
  lines.push(`  SELECT id INTO sid FROM "Schedule" WHERE "userId" = uid AND name = ${q(schedule)};`);
  lines.push(`  IF sid IS NULL THEN INSERT INTO "Schedule" ("userId", name, "timeZone") VALUES (uid, ${q(schedule)}, ${q(TZ)}) RETURNING id INTO sid; END IF;`);
  lines.push(`  UPDATE "Schedule" SET "timeZone" = ${q(TZ)} WHERE id = sid;`);
  lines.push(`  DELETE FROM "Availability" WHERE "scheduleId" = sid;`);
  for (const [day, start, end] of c.weekly ?? []) {
    lines.push(`  INSERT INTO "Availability" ("scheduleId", days, "startTime", "endTime") VALUES (sid, ARRAY[${day}], ${q(start)}, ${q(end)});`);
  }
  for (const [date, start, end] of c.dates ?? []) {
    lines.push(`  INSERT INTO "Availability" ("scheduleId", days, date, "startTime", "endTime") VALUES (sid, ARRAY[]::int[], ${q(date)}, ${q(start)}, ${q(end)});`);
  }
  for (const lang of ["fr", "en"]) {
    const [title, description] = c[lang];
    const slug = `${c.key}-${lang}`;
    const locations = JSON.stringify([{ type: "inPerson", address: ADDRESS, displayLocationPublicly: true }]);
    lines.push(`  SELECT id INTO eid FROM "EventType" WHERE "userId" = uid AND slug = ${q(slug)};`);
    lines.push(`  IF eid IS NULL THEN INSERT INTO "EventType" (title, slug, length, "userId") VALUES (${q(title)}, ${q(slug)}, ${c.minutes}, uid) RETURNING id INTO eid; END IF;`);
    lines.push(
      `  UPDATE "EventType" SET title = ${q(title)}, description = ${q(description)}, length = ${c.minutes},` +
        ` "scheduleId" = sid, "seatsPerTimeSlot" = ${c.seats}, "seatsShowAvailabilityCount" = true, "seatsShowAttendees" = false,` +
        ` locations = ${q(locations)}::jsonb, "interfaceLanguage" = ${q(lang)},` +
        ` "lockTimeZoneToggleOnBookingPage" = true, "lockedTimeZone" = ${q(TZ)}, "disableGuests" = true,` +
        ` "requiresConfirmation" = false, hidden = true, "slotInterval" = ${c.interval ?? 30},` +
        ` position = ${(CLASSES.length - index) * 2 - (lang === "fr" ? 0 : 1)}` +
        ` WHERE id = eid;`,
    );
    lines.push(`  INSERT INTO "_user_eventtype" ("A", "B") VALUES (eid, uid) ON CONFLICT DO NOTHING;`);
  }
});
// Cal creates sample event types with a new account; keep them off the
// public profile page.
lines.push(`  UPDATE "EventType" SET hidden = true WHERE "userId" = uid AND slug IN ('15min', '30min', 'secret');`);
// Times as 16:00 rather than 4:00pm in the booker and in emails.
lines.push(`  UPDATE users SET "timeFormat" = 24 WHERE id = uid;`);
// A default schedule for the account (Cal's availability page expects one).
lines.push(`  UPDATE users SET "defaultScheduleId" = (SELECT min(id) FROM "Schedule" WHERE "userId" = uid) WHERE id = uid AND "defaultScheduleId" IS NULL;`);
lines.push("END", "$rusc$;", "COMMIT;");
lines.push(`SELECT slug, length, "seatsPerTimeSlot", "interfaceLanguage" FROM "EventType" WHERE "userId" = (SELECT id FROM users WHERE username = ${q(HOST)}) ORDER BY position DESC;`);
console.log(lines.join("\n"));
