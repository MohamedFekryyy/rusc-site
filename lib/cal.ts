import type { Lang } from "@/lib/routes";

// Cal.com config: the source of truth behind every booking since the
// Acuity -> Cal.com migration.
//
// Bookings never leave the site: Cal.com is only ever shown inside the
// booking pages (components/BookingEmbed.tsx). Nothing on the site links to
// cal.com.
//
// The embed has no ?lang= param: the booker language follows the event type.
// To honour "FR page -> French booker, EN page -> English booker", each
// service has TWO event types (suffixed -fr / -en). FR pages embed the -fr
// slug, EN pages the -en slug.

// The Cal.com server behind the embed. cal.com's hosted app for now; set
// NEXT_PUBLIC_CAL_ORIGIN to the self-hosted instance's URL once it runs.
export const CAL_ORIGIN = process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "https://app.cal.com";

// Live Cal.com account. It was created as `fekry-aiad-qijijq` and renamed to
// `rusc-studio` in the Cal.com UI. Checked 2026-09-23: cal.com/rusc-studio
// answers 200 and cal.com/fekry-aiad-qijijq 404. Before changing this, check
// that the new username's page loads. Set NEXT_PUBLIC_CAL_USERNAME to override.
export const CAL_USERNAME = process.env.NEXT_PUBLIC_CAL_USERNAME ?? "rusc-studio";

// Cal link for the embed: "<username>" (the account page listing every event
// type) or "<username>/<event-slug>".
export function calLink(eventSlug?: string | null) {
  return eventSlug ? `${CAL_USERNAME}/${eventSlug}` : CAL_USERNAME;
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

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === "string" && serviceByKey(value) !== undefined;
}

// What the embed can show. Cal.com has no separate catalog the way Acuity
// did, so membership and gift vouchers are their own event-type slugs.
export const BOOKING_VIEWS = ["schedule", "catalog", "gifts"] as const;

export type BookingView = (typeof BOOKING_VIEWS)[number];

export function isBookingView(value: unknown): value is BookingView {
  return BOOKING_VIEWS.includes(value as BookingView);
}

// Cal.com event-type slugs for the two extra views (created in the account).
// Null = not yet created; the embed shows the account page instead.
export const VIEW_SLUGS: Record<Exclude<BookingView, "schedule">, Record<Lang, string | null>> = {
  catalog: { fr: null, en: null }, // membership / class cards
  gifts: { fr: null, en: null }, // gift vouchers
};

// The Cal link to embed for a view, or for one workshop.
export function bookingCalLink(lang: Lang, view: BookingView, workshop?: string | null) {
  if (workshop) {
    const service = serviceByKey(workshop);
    if (service) return calLink(service[lang]);
  }
  if (view !== "schedule") return calLink(VIEW_SLUGS[view][lang]);
  return calLink();
}
