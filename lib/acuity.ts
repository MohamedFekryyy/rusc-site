// Acuity Scheduling account behind every booking. Services, hours, prices
// and payments are managed in the Acuity dashboard; the site only embeds it.
export const ACUITY_OWNER = "19154889";

const BASE = "https://app.acuityscheduling.com";

// Appointment types behind the old rusc.as.me/<slug> direct links.
export const APPOINTMENT_TYPES = {
  "atelier-ceramique-2h": "37545405",
  "atelier-modelage-2h": "83689322",
  "modelage-enfant": "83714176",
  "atelier-ceramique-1j": "37557593",
  "atelier-ceramique-2j": "37557627",
  porcelaine: "78615626",
} as const;

export type AppointmentSlug = keyof typeof APPOINTMENT_TYPES;

// What the embed can show: the scheduler, the catalog (class cards,
// membership) or the gift-voucher category of the catalog.
export const BOOKING_VIEWS = ["schedule", "catalog", "gifts"] as const;

export type BookingView = (typeof BOOKING_VIEWS)[number];

export function isBookingView(value: unknown): value is BookingView {
  return BOOKING_VIEWS.includes(value as BookingView);
}

export function bookingUrl(view: BookingView, appointmentType?: string) {
  const params = new URLSearchParams({ owner: ACUITY_OWNER });
  if (view === "gifts") params.set("category", "Bons Cadeaux");
  if (view === "schedule" && appointmentType) {
    params.set("appointmentType", appointmentType);
  }
  params.set("ref", "embedded_csp");
  const page = view === "schedule" ? "schedule.php" : "catalog.php";
  return `${BASE}/${page}?${params}`;
}

// Acuity's client self-service login: existing clients enter their email to
// see, reschedule or cancel their own appointments. Opens in a new tab because
// Acuity blocks this page from being embedded (X-Frame-Options: SAMEORIGIN).
export const clientLoginUrl = `${BASE}/client-login.php?owner=${ACUITY_OWNER}`;
