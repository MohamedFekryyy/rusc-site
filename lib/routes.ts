import type { AppointmentSlug, BookingView } from "./acuity";

export type Lang = "fr" | "en";

export const HOME = { fr: "/", en: "/en/" } as const;
export const BOOKING = { fr: "/reserver/", en: "/en/booking/" } as const;
export const TERMS = { fr: "/conditions/", en: "/en/terms/" } as const;

// Booking page URL for one view of the embed (?view=catalog|gifts) or one
// workshop (?workshop=<slug>). BookingEmbed reads these on load.
export function bookingHref(lang: Lang, view: BookingView = "schedule", workshop?: AppointmentSlug) {
  const params = new URLSearchParams();
  if (workshop) params.set("workshop", workshop);
  else if (view !== "schedule") params.set("view", view);
  const query = params.toString();
  return BOOKING[lang] + (query ? `?${query}` : "");
}
