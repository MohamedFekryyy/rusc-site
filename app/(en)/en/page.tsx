import type { Metadata } from "next";
import Image from "next/image";
import BookingButton from "@/components/BookingButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import SectionHead from "@/components/SectionHead";
import { PAGES, bookingHref } from "@/lib/routes";
import { SITE_URL, STUDIO_JSON_LD } from "@/lib/site";
import logo from "@/assets/logo-rusc-trim.webp";
import hero from "@/assets/photos/hero-o.jpg";
import ceramique2h from "@/assets/photos/ceramique-2h-o.png";
import residence from "@/assets/photos/residence-o.jpg";
import membre from "@/assets/dessin-sylwia-light.webp";
import stages from "@/assets/photos/stages-o.jpg";
import boncadeau from "@/assets/photos/bon-cadeau-o.jpg";
import event from "@/assets/photos/event-o.jpg";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "rūsc — ceramics studio in Chamonix · dare art",
  description:
    "rūsc, a ceramics studio in Chamonix: courses, workshops, space hire, artist residency. A place open to all, no prerequisites. Dare art.",
  alternates: { canonical: "/en/", languages: { fr: "/", en: "/en/", "x-default": "/" } },
  openGraph: {
    type: "website",
    title: "rūsc — dare art",
    description: "Ceramics studio in Chamonix. Courses, workshops, space hire, artist residency.",
    url: "/en/",
    locale: "en_GB",
    alternateLocale: "fr_FR",
    siteName: "rūsc",
    images: logo.src,
  },
};

const jsonLd = {
  ...STUDIO_JSON_LD,
  slogan: "dare art",
  description:
    "Ceramics studio in Chamonix: courses, workshops, space hire, artist residency. Dare art.",
  url: `${SITE_URL}/en/`,
  inLanguage: "en",
};

const bookGifts = (lang: "fr" | "en") => bookingHref(lang, "gifts");

const CARDS: { href: string; img: typeof hero; tag: string; title: string; text: string; drawing?: boolean }[] = [
  { href: PAGES.membres.en, img: membre, tag: "Open studio", title: "member area", text: "A professional, fully equipped space, in autonomy. €50/year and preferential rates.", drawing: true },
  { href: PAGES.event.en, img: event, tag: "Past · present · future", title: "rūsc event", text: "Closet sale, pot & wine, exhibitions: the events that bring the studio to life." },
  { href: PAGES.cours.en, img: ceramique2h, tag: "Dare the experience", title: "courses", text: "Wheel throwing, hand-building, raw-glaze decoration, children's course, life drawing. Single session, or with a class pass." },
  { href: PAGES.stages.en, img: stages, tag: "Immersion · 10am – 5pm", title: "workshops", text: "Ceramics 1 and 2 days, porcelain, traditional upholstery." },
  { href: "/en/contact/", img: residence, tag: "Tailor-made", title: "residency & space hire", text: "Artist residency, team building, hen parties, events. A programme shaped to your project — quote on request." },
  { href: bookGifts("en"), img: boncadeau, tag: "To give", title: "gift voucher", text: "Want to treat someone? Offer a gift voucher of your chosen amount, valid for 1 year." },
];

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <Header lang="en" page="home" />

      <section className="hero wrap">
        <Image className="wordmark" src={logo} alt="rūsc" priority />
        <span className="rule"></span>
        <h1 className="tagline">Pottery studio in Chamonix.</h1>
        <p className="intro">At rūsc, our courses are open to everyone, with no prerequisites. Curious beginners, amateurs looking for a creative moment, or enthusiasts wanting to deepen their practice: everyone finds their place.</p>
        <div className="actions">
          <a className="btn member" href={PAGES.membres.en}>Member area</a>
          <a className="btn guest" href={PAGES.cours.en}>Choose a course</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={hero} alt="Potter's hands shaping clay at rūsc studio, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

      <section id="discover">
        <div className="wrap">
          <SectionHead title="the studio" sub="What you'll find here" />
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
                  <a className="btn" href={c.href}>Discover</a>
                </div>
              </article>
            ))}
          </div>
          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "34px" }}>
            <a className="btn ghost" href={PAGES.us.en}>Ūs</a>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="wrap" style={{ textAlign: "center", paddingBottom: "60px" }}>
          <BookingButton lang="en" workshop="adhesion" tone="member">Become a member</BookingButton>
          <span style={{ display: "inline-block", width: "12px" }}></span>
          <BookingButton lang="en" view="gifts" tone="guest">&nbsp;Gift voucher</BookingButton>
        </div>
      </section>

      <Footer lang="en" />
    </>
  );
}
