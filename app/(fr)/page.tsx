import type { Metadata } from "next";
import Image from "next/image";
import BookingButton from "@/components/BookingButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import SectionHead from "@/components/SectionHead";
import { PAGES } from "@/lib/routes";
import { SITE_URL, STUDIO_JSON_LD } from "@/lib/site";
import logo from "@/assets/logo-rusc.webp";
import hero from "@/assets/photos/hero-o.jpg";
import ceramique2h from "@/assets/photos/ceramique-2h-o.png";
import residence from "@/assets/photos/residence-o.jpg";
import privateisation from "@/assets/photos/atelier-05.jpg";
import membre from "@/assets/dessin-sylwia-light.webp";
import stages from "@/assets/photos/stages-o.jpg";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "rūsc — atelier de céramique à Chamonix · oser l'art",
  description:
    "rūsc, atelier de céramique à Chamonix : cours, stages, privatisation, résidence d'artiste, expositions. Un lieu ouvert à tous, sans prérequis. Osez l'art.",
  alternates: { canonical: "/", languages: { fr: "/", en: "/en/", "x-default": "/" } },
  openGraph: {
    type: "website",
    title: "rūsc — oser l'art",
    description: "Atelier de céramique à Chamonix. Cours, stages, privatisation, résidence d'artiste, expositions.",
    url: "/",
    locale: "fr_FR",
    alternateLocale: "en_GB",
    siteName: "rūsc",
    images: logo.src,
  },
};

const jsonLd = {
  ...STUDIO_JSON_LD,
  slogan: "oser l'art",
  description:
    "Atelier de céramique à Chamonix : cours, stages, privatisation, résidence d'artiste, expositions. Osez l'art.",
  url: `${SITE_URL}/`,
  inLanguage: "fr",
};

const CARDS: { href: string; img: typeof hero; tag: string; title: string; text: string; drawing?: boolean }[] = [
  {
    href: PAGES.membres.fr,
    img: membre,
    tag: "Ateliers libres",
    title: "espace membre",
    text: "Un espace pro équipé, en autonomie. Adhésion 50 €/an et tarifs préférentiels.",
    drawing: true,
  },
  {
    href: PAGES.cours.fr,
    img: ceramique2h,
    tag: "Osez l'expérience",
    title: "les cours",
    text: "Tournage, modelage, décor à cru, cours enfant, modèle vivant. À l'unité ou en carnet.",
  },
  {
    href: PAGES.stages.fr,
    img: stages,
    tag: "Immersion · 10h – 17h",
    title: "les stages",
    text: "Céramique 1 et 2 jours, porcelaine, tapisserie d'ameublement.",
  },
  {
    href: PAGES.privatisation.fr,
    img: privatisation,
    tag: "Sur mesure",
    title: "privatisation",
    text: "Team building, EVJF, anniversaires, dîners à thème. Privatisez l'atelier.",
  },
  {
    href: PAGES.residence.fr,
    img: residence,
    tag: "Résidence",
    title: "résidence d'artiste",
    text: "Artisans, peintres, plasticiens, photographes. Une formule sur mesure, accompagnée jusqu'à l'inauguration.",
  },
];

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <Header lang="fr" page="home" />

      <section className="hero wrap">
        <p className="eyebrow">Atelier de céramique · Chamonix</p>
        <h1>oser l&rsquo;art</h1>
        <span className="rule"></span>
        <p>Chez rūsc, nos ateliers sont ouverts à toutes et à tous, sans prérequis. Débutants curieux, amateurs en quête d&rsquo;un moment créatif, ou passionnés souhaitant approfondir leur pratique : chacun trouve sa place.</p>
        <div className="actions">
          <a className="btn member" href={PAGES.membres.fr}>Espace membre</a>
          <a className="btn guest" href={PAGES.cours.fr}>Choisir un cours</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={hero} alt="Mains façonnant la terre à l’atelier rūsc, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

      <section id="decouvrir">
        <div className="wrap">
          <SectionHead title="l&rsquo;atelier" sub="Ce que vous trouverez ici" />
          <div className="grid">
            {CARDS.map((c) => (
              <article className={c.drawing ? "card member" : "card"} key={c.href}>
                {c.drawing ? (
                  <div className="thumb drawing">
                    <Image src={c.img} alt={c.title} style={{ width: "auto", height: "auto", maxHeight: "220px" }} />
                  </div>
                ) : (
                  <Image className="thumb" src={c.img} alt={c.title} />
                )}
                <p className="k">{c.tag}</p>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <div className="foot" style={{ marginTop: "auto", paddingTop: "14px" }}>
                  <a className="btn" href={c.href}>Découvrir</a>
                </div>
              </article>
            ))}
          </div>
          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "34px" }}>
            <a className="btn ghost" href={PAGES.expo.fr}>Expo</a>
            <a className="btn ghost" href={PAGES.cuisson.fr}>Cuisson</a>
            <a className="btn ghost" href={PAGES.us.fr}>Ūs</a>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="wrap" style={{ textAlign: "center", paddingBottom: "60px" }}>
          <BookingButton lang="fr" view="catalog" tone="member">Devenir membre</BookingButton>
          <span style={{ display: "inline-block", width: "12px" }}></span>
          <BookingButton lang="fr" view="gifts" tone="guest">&nbsp;Bon cadeau</BookingButton>
        </div>
      </section>

      <Footer lang="fr" />
    </>
  );
}
