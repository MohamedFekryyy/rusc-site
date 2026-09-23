import type { ReactNode } from "react";
import type { BookingView, ServiceKey } from "@/lib/cal";
import { bookingHref, type Lang } from "@/lib/routes";

type Props = {
  lang: Lang;
  view?: BookingView;
  // Open the scheduler straight on one workshop.
  workshop?: ServiceKey;
  // Colour role: member = deep green, guest = light green.
  tone?: "member" | "guest";
  children: ReactNode;
};

// Link to the booking page, opened on one view or workshop. On the booking
// page itself, BookingEmbed catches the click and switches the embed in place.
export default function BookingButton({ lang, view = "schedule", workshop, tone, children }: Props) {
  return (
    <a
      className={"btn" + (tone ? ` ${tone}` : "")}
      href={bookingHref(lang, view, workshop)}
      data-booking={view}
      data-workshop={workshop}
    >
      {children}
    </a>
  );
}
