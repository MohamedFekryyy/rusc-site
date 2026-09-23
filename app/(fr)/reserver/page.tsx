import type { Metadata } from "next";
import BookingEmbed from "@/components/BookingEmbed";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SectionHead from "@/components/SectionHead";
import { PAGES, TERMS } from "@/lib/routes";
import logo from "@/assets/logo-rusc.webp";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "Réserver un atelier — rūsc, céramique à Chamonix",
  description:
    "Réservez en ligne vos ateliers de céramique, stages et créneaux d'atelier libre chez rūsc à Chamonix. Carnets, adhésion et bons cadeaux.",
  alternates: {
    canonical: "/reserver/",
    languages: { fr: "/reserver/", en: "/en/booking/", "x-default": "/reserver/" },
  },
  openGraph: {
    type: "website",
    title: "Réserver — rūsc",
    description: "Ateliers de céramique, stages, atelier libre, carnets et bons cadeaux à Chamonix.",
    url: "/reserver/",
    locale: "fr_FR",
    alternateLocale: "en_GB",
    siteName: "rūsc",
    images: logo.src,
  },
};

export default function Reserver() {
  return (
    <>
      <Header lang="fr" page="booking" />

      <section id="reservation">
        <div className="wrap">
          <SectionHead as="h1" title="réserver" sub={<>Osez l&rsquo;expérience</>} />
          <BookingEmbed lang="fr" />
          <p className="bk-note">Réservation sécurisée par Cal.com. Les carnets, l’adhésion annuelle et les bons cadeaux (valables 1 an) sont proposés au moment de la réservation. La remise membre de 10&nbsp;% s’applique automatiquement.</p>
          <p className="bk-note">Vous avez un carnet ou un bon cadeau acheté avant ce nouveau système&nbsp;? Il reste valable jusqu&rsquo;à sa date d&rsquo;expiration&nbsp;: <a href={PAGES.contact.fr} style={{ color: "var(--accent)" }}>écrivez-nous</a> avec votre code, nous réservons pour vous.</p>

          <p style={{ textAlign: "center", marginTop: "34px", fontSize: "14px", color: "var(--muted)" }}>
            <a href={TERMS.fr} style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid var(--accent)" }}>Conditions générales &amp; annulation</a>
          </p>
        </div>
      </section>

      <Footer lang="fr" />
    </>
  );
}
