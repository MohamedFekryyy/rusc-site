import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EMAIL, PHONE, PHONE_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & cancellation — rūsc",
  description: "Booking terms and cancellation policy for rūsc ceramics studio, Chamonix.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/en/terms/" },
};

export default function Terms() {
  return (
    <LegalPage
      home="/en/"
      back="Back to site"
      address="99 Promenade Marie Paradis · 74400 Chamonix-Mont-Blanc · France"
      copy="© rūsc — all rights reserved"
    >
      <h1>Terms &amp; conditions</h1>
      <p className="sub">Booking &amp; cancellation</p>

      <h2>booking</h2>
      <p>Workshops, short courses and open studio slots are booked online. Places are limited to preserve the quality and attention given to each participant.</p>
      <p>Payment is made online at the time of booking.</p>

      <h2>rescheduling &amp; cancellation</h2>
      <div className="note">
        <p><strong>Cancellation at least 24 hours before the class</strong> — 50% of the amount is refunded.</p>
        <p><strong>Cancellation less than 24 hours before the class</strong> — no refund.</p>
        <p>No partial refund outside these conditions.</p>
      </div>

      <h2>subscriptions and class passes</h2>
      <p>All subscriptions and class passes are valid for <strong>one year</strong> from the date of purchase.</p>

      <h2>membership</h2>
      <p>The annual membership (€50) is reserved for students who have taken at least two hours of classes at rūsc and received an introduction to how the studio works. It gives access to open studio slots.</p>
      <p>If these conditions are not met, we reserve the right to refuse access.</p>

      <h2>firing</h2>
      <p>Firing of pieces and use of the high-temperature kilns are handled exclusively by the rūsc team. Pieces can be fired for €6 per piece, paid before firing.</p>

      <h2>gift vouchers</h2>
      <p>Our gift vouchers are valid across all workshops, for one year.</p>

      <h2>contact</h2>
      <p>Any questions: <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — <a href={PHONE_HREF}>{PHONE}</a>.</p>
    </LegalPage>
  );
}
