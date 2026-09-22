import type { ReactNode } from "react";
import { APPOINTMENT_TYPES, type AppointmentSlug, type BookingView } from "@/lib/acuity";

type Props = {
  view?: BookingView;
  // Open the scheduler straight on one workshop.
  appointment?: AppointmentSlug;
  children: ReactNode;
};

// A booking link that stays on the site: BookingEmbed picks up the click
// and loads the matching Acuity page in its iframe. Without JavaScript it
// is a plain jump to the booking section.
export default function BookingButton({ view = "schedule", appointment, children }: Props) {
  return (
    <a
      className="btn"
      href="#reservation"
      data-booking={view}
      data-appointment-type={appointment && APPOINTMENT_TYPES[appointment]}
    >
      {children}
    </a>
  );
}
