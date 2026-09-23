import type { Lang } from "@/lib/routes";

// Cal.com config: the source of truth behind every booking since the
// Acuity -> Cal.com migration.
//
// Bookings never leave the site: Cal.com is only ever shown inside the
// booking pages (components/BookingEmbed.tsx). Nothing on the site links to
// cal.com.

// The Cal.com server behind the embed. cal.com's hosted app for now; set
// NEXT_PUBLIC_CAL_ORIGIN to the self-hosted instance's URL once it runs.
export const CAL_ORIGIN = process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "https://app.cal.com";

// Live Cal.com account. It was created as `fekry-aiad-qijijq` and renamed to
// `rusc-studio` in the Cal.com UI. Checked 2026-09-23: cal.com/rusc-studio
// answers 200 and cal.com/fekry-aiad-qijijq 404. Before changing this, check
// that the new username's page loads. Set NEXT_PUBLIC_CAL_USERNAME to override.
export const CAL_USERNAME = process.env.NEXT_PUBLIC_CAL_USERNAME ?? "rusc-studio";

// Cal link for the embed: "<username>/<event-slug>".
export function calLink(eventSlug: string) {
  return `${CAL_USERNAME}/${eventSlug}`;
}

// The booking page's tabs: what each one lists.
export const BOOKING_VIEWS = ["schedule", "catalog", "gifts"] as const;

export type BookingView = (typeof BOOKING_VIEWS)[number];

export function isBookingView(value: unknown): value is BookingView {
  return BOOKING_VIEWS.includes(value as BookingView);
}

type OfferText = {
  tag: string;
  title: string;
  // Price line, as on the content pages.
  unit: string;
  cta: string;
};

type OfferSource = {
  key: string;
  view: BookingView;
  // Button colour: member = deep green, guest = light green.
  tone: "guest" | "member";
  fr: OfferText;
  en: OfferText;
};

// Everything bookable, in the order the booking page lists it. Names and
// prices are the ones on the Cours, Stages and Espace membre pages.
//
// Each offer is TWO Cal.com event types, `<key>-fr` and `<key>-en`: the embed
// has no language parameter, so the FR page books the -fr type and the EN
// page the -en type. This list is also the checklist of event types to
// create in Cal.com.
export const OFFERS = [
  // Cours & stages
  {
    key: "atelier-ceramique-2h", view: "schedule", tone: "guest",
    fr: { tag: "Cours de 2 h", title: "tournage 2h", unit: "50 € · membre 45 €", cta: "Réserver" },
    en: { tag: "2-hour course", title: "wheel throwing 2h", unit: "€50 · member €45", cta: "Book" },
  },
  {
    key: "atelier-modelage-2h", view: "schedule", tone: "guest",
    fr: { tag: "Cours de 2 h", title: "modelage 2h", unit: "50 € · membre 45 €", cta: "Réserver" },
    en: { tag: "2-hour course", title: "hand-building 2h", unit: "€50 · member €45", cta: "Book" },
  },
  {
    key: "decor-a-cru-1h", view: "schedule", tone: "guest",
    fr: { tag: "Cours d’1 h", title: "décor à cru 1h", unit: "20 € · membre 18 €", cta: "Réserver" },
    en: { tag: "1-hour course", title: "raw-glaze decoration 1h", unit: "€20 · member €18", cta: "Book" },
  },
  {
    key: "modelage-enfant", view: "schedule", tone: "guest",
    fr: { tag: "7–12 ans · le mercredi", title: "cours enfant 2h", unit: "Places limitées · réservation conseillée", cta: "Réserver" },
    en: { tag: "Ages 7–12 · Wednesdays", title: "children’s course 2h", unit: "Limited places · booking recommended", cta: "Book" },
  },
  {
    key: "atelier-ceramique-1j", view: "schedule", tone: "guest",
    fr: { tag: "Stage · 10h – 17h", title: "céramique 1j", unit: "180 €", cta: "Réserver" },
    en: { tag: "Intensive · 10am – 5pm", title: "ceramics 1 day", unit: "€180", cta: "Book" },
  },
  {
    key: "atelier-ceramique-2j", view: "schedule", tone: "guest",
    fr: { tag: "Stage · 2 jours", title: "céramique 2j", unit: "280 €", cta: "Réserver" },
    en: { tag: "Intensive · 2 days", title: "ceramics 2 days", unit: "€280", cta: "Book" },
  },
  {
    key: "porcelaine", view: "schedule", tone: "guest",
    fr: { tag: "Stage · 10h – 17h", title: "porcelaine 1j", unit: "230 €", cta: "Réserver" },
    en: { tag: "Intensive · 10am – 5pm", title: "porcelain 1 day", unit: "€230", cta: "Book" },
  },

  // Adhésion & carnets
  {
    key: "adhesion", view: "catalog", tone: "member",
    fr: { tag: "Membres", title: "adhésion annuelle", unit: "50 € / an · atelier libre et –10 %", cta: "Adhérer" },
    en: { tag: "Members", title: "annual membership", unit: "€50 / year · open studio and 10% off", cta: "Join" },
  },
  {
    key: "carnet-5-cours", view: "catalog", tone: "guest",
    fr: { tag: "Carnet · cours de 2 h", title: "carnet 5 cours", unit: "210 € · membre 189 €", cta: "Acheter" },
    en: { tag: "Card · 2-hour courses", title: "5-course card", unit: "€210 · member €189", cta: "Buy" },
  },
  {
    key: "carnet-10-cours", view: "catalog", tone: "guest",
    fr: { tag: "Carnet · cours de 2 h", title: "carnet 10 cours", unit: "350 € · membre 315 €", cta: "Acheter" },
    en: { tag: "Card · 2-hour courses", title: "10-course card", unit: "€350 · member €315", cta: "Buy" },
  },
  {
    key: "atelier-libre-1h", view: "catalog", tone: "member",
    fr: { tag: "Atelier libre · membres", title: "atelier libre 1h", unit: "22,50 € / heure", cta: "Réserver" },
    en: { tag: "Open studio · members", title: "open studio 1h", unit: "€22.50 / hour", cta: "Book" },
  },
  {
    key: "atelier-libre-10h", view: "catalog", tone: "member",
    fr: { tag: "Atelier libre · membres", title: "carnet atelier libre 10h", unit: "150 € · 15 € / heure · valable 6 mois", cta: "Acheter" },
    en: { tag: "Open studio · members", title: "open studio 10h card", unit: "€150 · €15 / hour · valid 6 months", cta: "Buy" },
  },
  {
    key: "atelier-libre-20h", view: "catalog", tone: "member",
    fr: { tag: "Atelier libre · membres", title: "carnet atelier libre 20h", unit: "240 € · 12 € / heure · valable 1 an", cta: "Acheter" },
    en: { tag: "Open studio · members", title: "open studio 20h card", unit: "€240 · €12 / hour · valid 1 year", cta: "Buy" },
  },

  // Bons cadeaux
  {
    key: "bon-cadeau-cours-2h", view: "gifts", tone: "guest",
    fr: { tag: "Bon cadeau", title: "un cours de 2h", unit: "50 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "one 2-hour course", unit: "€50", cta: "Give" },
  },
  {
    key: "bon-cadeau-carnet-5", view: "gifts", tone: "guest",
    fr: { tag: "Bon cadeau", title: "carnet 5 cours", unit: "210 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "5-course card", unit: "€210", cta: "Give" },
  },
  {
    key: "bon-cadeau-carnet-10", view: "gifts", tone: "guest",
    fr: { tag: "Bon cadeau", title: "carnet 10 cours", unit: "350 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "10-course card", unit: "€350", cta: "Give" },
  },
  {
    key: "bon-cadeau-stage-1j", view: "gifts", tone: "guest",
    fr: { tag: "Bon cadeau", title: "un stage d’1 jour", unit: "180 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "a 1-day intensive", unit: "€180", cta: "Give" },
  },
  {
    key: "bon-cadeau-stage-2j", view: "gifts", tone: "guest",
    fr: { tag: "Bon cadeau", title: "un stage de 2 jours", unit: "280 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "a 2-day intensive", unit: "€280", cta: "Give" },
  },
] as const satisfies readonly OfferSource[];

export type Offer = (typeof OFFERS)[number];
export type OfferKey = Offer["key"];

export function offerByKey(key: string): Offer | undefined {
  return OFFERS.find((o) => o.key === key);
}

export function isOfferKey(value: unknown): value is OfferKey {
  return typeof value === "string" && offerByKey(value) !== undefined;
}

export function offersIn(view: BookingView) {
  return OFFERS.filter((o) => o.view === view);
}

// The Cal event type for an offer in one language, e.g. "rusc-studio/porcelaine-fr".
export function offerCalLink(offer: Offer, lang: Lang) {
  return calLink(`${offer.key}-${lang}`);
}
