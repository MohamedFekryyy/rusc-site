import type { Metadata } from "next";
import BookingEmbed from "@/components/BookingEmbed";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SectionHead from "@/components/SectionHead";
import { TERMS } from "@/lib/routes";
import logo from "@/assets/logo-rusc.webp";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "Book a workshop — rūsc, ceramics in Chamonix",
  description:
    "Book ceramics workshops, short courses and open studio slots at rūsc in Chamonix online. Class cards, membership and gift vouchers.",
  alternates: {
    canonical: "/en/booking/",
    languages: { fr: "/reserver/", en: "/en/booking/", "x-default": "/reserver/" },
  },
  openGraph: {
    type: "website",
    title: "Booking — rūsc",
    description: "Ceramics workshops, short courses, open studio, class cards and gift vouchers in Chamonix.",
    url: "/en/booking/",
    locale: "en_GB",
    alternateLocale: "fr_FR",
    siteName: "rūsc",
    images: logo.src,
  },
};

export default function Booking() {
  return (
    <>
      <Header lang="en" page="booking" />

      <section id="reservation">
        <div className="wrap">
          <SectionHead as="h1" title="booking" sub="Dare the experience" />
          <div style={{ maxWidth: "680px", margin: "0 auto 30px", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", marginBottom: "14px" }}>Places are limited to preserve the quality and attention given to each participant.</p>
            <p style={{ color: "var(--muted)", marginBottom: "26px" }}>Book your workshop directly below, or give the rūsc experience: our gift vouchers are valid across all workshops.</p>
          </div>

          <BookingEmbed lang="en" />
          <p className="bk-note">Secure booking by Cal.com. Class cards, the annual membership and gift vouchers (valid 1 year) are offered at checkout. The 10% member discount is applied automatically.</p>
          <p style={{ textAlign: "center", marginTop: "30px", fontSize: "14px", color: "var(--muted)" }}>
            <a href={TERMS.en} style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid var(--accent)" }}>Terms &amp; cancellation</a>
          </p>
        </div>
      </section>

      <Footer lang="en" />
    </>
  );
}
