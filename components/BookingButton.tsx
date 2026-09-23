import type { ReactNode } from "react";
import { offerByKey, type BookingView, type OfferKey } from "@/lib/cal";
import { bookingHref, type Lang } from "@/lib/routes";

type Props = {
  lang: Lang;
  view?: BookingView;
  // Open the booking page straight on one offer (OFFERS in lib/cal.ts).
  workshop?: OfferKey;
  // Colour role: member = deep green, guest = light green.
  tone?: "member" | "guest";
  children: ReactNode;
};

// Link to the booking page, opened on one tab or offer. On the booking page
// itself, BookingEmbed catches the click and switches in place.
export default function BookingButton({ lang, view = "schedule", workshop, tone, children }: Props) {
  const tab = workshop ? (offerByKey(workshop)?.view ?? view) : view;
  return (
    <a
      className={"btn" + (tone ? ` ${tone}` : "")}
      href={bookingHref(lang, tab, workshop)}
      data-booking={tab}
      data-workshop={workshop}
    >
      {children}
    </a>
  );
}
