// Cal.com config. This is the target behind every booking once the migration
// from Acuity is complete; until then it lives alongside lib/acuity.ts and
// nothing imports it yet.
//
// The plain-Cal.com embed has no ?lang= param: the booker language follows the
// browser/account locale. To honour the site rule "FR page -> French booker,
// EN page -> English booker", each service gets TWO event types (suffixed
// -fr / -en) and the FR pages link the -fr slug, the EN pages the -en slug.
// Fill CAL_USERNAME once the rūsc Cal.com account exists.

export const CAL_USERNAME = process.env.NEXT_PUBLIC_CAL_USERNAME ?? "";

// Public Cal.com URL for one username + optional event-type slug.
// e.g. https://cal.com/rusc/atelier-ceramique-2h-fr
export function calUrl(username: string, eventSlug?: string) {
  return `https://cal.com/${username}${eventSlug ? `/${eventSlug}` : ""}`;
}

// One service in the studio. `fr` and `en` are the Cal.com event-type slugs
// (the part after cal.com/<username>/). Same order as the old Acuity types.
export const SERVICES = [
  { key: "atelier-ceramique-2h", fr: "atelier-ceramique-2h-fr", en: "atelier-ceramique-2h-en" },
  { key: "atelier-modelage-2h", fr: "atelier-modelage-2h-fr", en: "atelier-modelage-2h-en" },
  { key: "modelage-enfant", fr: "modelage-enfant-fr", en: "modelage-enfant-en" },
  { key: "atelier-ceramique-1j", fr: "atelier-ceramique-1j-fr", en: "atelier-ceramique-1j-en" },
  { key: "atelier-ceramique-2j", fr: "atelier-ceramique-2j-fr", en: "atelier-ceramique-2j-en" },
  { key: "porcelaine", fr: "porcelaine-fr", en: "porcelaine-en" },
] as const;

export type ServiceKey = (typeof SERVICES)[number]["key"];

// Look up a service by its stable key (used in ?workshop=<key> URLs).
export function serviceByKey(key: string) {
  return SERVICES.find((s) => s.key === key);
}

// What the embed can show. Cal.com has no separate "catalog"/"gifts" view the
// way Acuity did; membership and gift vouchers are their own event types or
// handled in Cal.com, so map only the scheduler here for now.
export const BOOKING_VIEWS = ["schedule"] as const;

export type BookingView = (typeof BOOKING_VIEWS)[number];

export function isBookingView(value: unknown): value is BookingView {
  return BOOKING_VIEWS.includes(value as BookingView);
}
