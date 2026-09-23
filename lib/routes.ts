import type { BookingView, OfferKey } from "./cal";

export type Lang = "fr" | "en";

export const HOME = { fr: "/", en: "/en/" } as const;
export const BOOKING = { fr: "/reserver/", en: "/en/booking/" } as const;
export const TERMS = { fr: "/conditions/", en: "/en/terms/" } as const;

// One entry per menu item. slug is the URL segment; en pages live under /en/.
export const PAGES: Record<PageKey, { fr: string; en: string }> = {
  us: { fr: "/us/", en: "/en/us/" },
  membres: { fr: "/membres/", en: "/en/membres/" },
  cours: { fr: "/cours/", en: "/en/cours/" },
  stages: { fr: "/stages/", en: "/en/stages/" },
  privatisation: { fr: "/privatisation/", en: "/en/privatisation/" },
  residence: { fr: "/residence/", en: "/en/residence/" },
  expo: { fr: "/expo/", en: "/en/expo/" },
  cuisson: { fr: "/cuisson/", en: "/en/cuisson/" },
  contact: { fr: "/contact/", en: "/en/contact/" },
};

export type PageKey = "us" | "membres" | "cours" | "stages" | "privatisation" | "residence" | "expo" | "cuisson" | "contact";

// Booking page URL for one tab (?view=catalog|gifts) or one offer
// (?workshop=<offer key>, see OFFERS in lib/cal.ts). BookingEmbed reads these on load.
export function bookingHref(lang: Lang, view: BookingView = "schedule", workshop?: OfferKey) {
  const params = new URLSearchParams();
  if (workshop) params.set("workshop", workshop);
  else if (view !== "schedule") params.set("view", view);
  const query = params.toString();
  return BOOKING[lang] + (query ? `?${query}` : "");
}
