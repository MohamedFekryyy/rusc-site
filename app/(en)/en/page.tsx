import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import BookingButton from "@/components/BookingButton";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import SectionHead from "@/components/SectionHead";
import { BOOKING } from "@/lib/routes";
import { EMAIL, INSTAGRAM, PHONE, PHONE_HREF, SITE_URL, STUDIO_JSON_LD } from "@/lib/site";
import logo from "@/assets/logo-rusc.webp";
import drawing from "@/assets/dessin-sylwia.webp";
import atelier01 from "@/assets/photos/atelier-01.jpg";
import atelier03 from "@/assets/photos/atelier-03.jpg";
import atelier04 from "@/assets/photos/atelier-04.jpg";
import atelier06 from "@/assets/photos/atelier-06.jpg";
import atelier07 from "@/assets/photos/atelier-07.jpg";
import atelier10 from "@/assets/photos/atelier-10.jpg";
import contact from "@/assets/photos/contact.jpg";
import us03 from "@/assets/photos/us-03.jpg";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "rūsc — ceramics studio in Chamonix · dare art",
  description:
    "rūsc, a ceramics studio in Chamonix. Workshops open to everyone, members-only open studio, annual membership. Dare art.",
  alternates: {
    canonical: "/en/",
    languages: { fr: "/", en: "/en/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    title: "rūsc — dare art",
    description: "Ceramics studio in Chamonix. Workshops open to everyone, open studio for members.",
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
    "Ceramics studio in Chamonix: workshops open to all, members-only open studio, ceramics, porcelain, upholstery, hand-building.",
  url: `${SITE_URL}/en/`,
  inLanguage: "en",
};

const muted: CSSProperties = { color: "var(--muted)", marginBottom: "16px" };
const rateRow: CSSProperties = {
  padding: "7px 0",
  borderBottom: "1px solid var(--line)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <Header lang="en" page="home" />

      <section className="hero wrap">
        <p className="eyebrow">Ceramics studio · Chamonix</p>
        <h1>dare art</h1>
        <span className="rule"></span>
        <p>At rūsc, our workshops are open to everyone, with no prerequisites. Curious beginners, amateurs looking for a creative moment, or enthusiasts wanting to deepen their practice: everyone finds their place.</p>
        <div className="actions">
          <a className="btn" href={BOOKING.en}>Book a workshop</a>
          <a className="btn ghost" href="#workshops">See the programme</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={atelier01} alt="Hands shaping clay at rūsc studio, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

      <section id="workshops">
        <div className="wrap">
          <SectionHead title="our workshops" sub="Dare the experience" />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={atelier07} alt="Children's workshop, ages 7–12, at rūsc" />
              <p className="k">Every Wednesday</p>
              <h3>children&rsquo;s workshops</h3>
              <p>For ages 7–12. A playful time to discover clay, shape and create, outside school holidays.</p>
              <p className="price">Limited places · booking recommended</p>
              <BookingButton lang="en" workshop="modelage-enfant">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier03} alt="Wheel-throwing — short course at rūsc" />
              <p className="k">Day or weekend</p>
              <h3>short courses</h3>
              <p>Ceramics, porcelain and other disciplines. A full immersion to learn the gestures and leave with your pieces.</p>
              <p className="price">One-day or weekend formats</p>
              <a className="btn" href={BOOKING.en}>Book</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier10} alt="Regular ceramics classes in Chamonix" />
              <p className="k">All year round</p>
              <h3>regular classes</h3>
              <p>Progress step by step, session after session. Ceramics is at its heart, enriched by other invited disciplines: upholstery, hand-building, guest tutors.</p>
              <p className="price">5-session card valid 6 months · 10-session card valid 1 year</p>
              <a className="btn" href={BOOKING.en}>Book</a>
            </article>
          </div>
          <div className="head" style={{ marginTop: "52px" }}>
            <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Want to give the rūsc experience? Our gift vouchers are valid across all workshops.</p>
          </div>
        </div>
      </section>

      <section id="members">
        <div className="wrap">
          <SectionHead title="become a member" sub="Open studio" />
          <div className="feature">
            <div className="txt">
              <h2>a professional space, at your own pace</h2>
              <p>rūsc offers open studio sessions exclusively for its members. A professional space equipped with quality material, ideal for amateur and experienced ceramicists alike.</p>
              <ul>
                <li>7 potter&rsquo;s wheels, for throwing and hand-building</li>
                <li>A full selection of shaping tools</li>
                <li>Materials included: stoneware, slips, clear glaze</li>
                <li>Unsupervised sessions — the team stays available</li>
                <li>Firing handled by the rūsc team — €6 per piece, paid before firing</li>
              </ul>
              <p><strong>Access conditions:</strong> having taken at least one 2-hour initiation with one of our teachers, and holding an active membership. If these conditions are not met, we reserve the right to refuse access.</p>
              <div className="pricing" style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "18px" }}>
                <p className="price" style={{ marginBottom: "12px" }}><strong>Membership: €50 / year</strong> — preferential rates and access to open studio sessions.</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={rateRow}><span>Open studio 10h</span><span><strong>€150</strong> · valid 6 months</span></li>
                  <li style={rateRow}><span>Open studio 20h</span><span><strong>€240</strong> · valid 1 year</span></li>
                </ul>
                <p style={{ marginTop: "14px", fontSize: "15px", color: "var(--muted)" }}>Members get <strong>–10%</strong> on the 2-hour session, the 5-session card and the 10-session card. This is a strictly personal benefit: reserved for the member, non-transferable.</p>
              </div>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <BookingButton lang="en" view="catalog">Join</BookingButton>
                <a className="btn ghost" href={BOOKING.en}>Book a slot</a>
              </div>
            </div>
            <div className="art-stack">
              <Image src={atelier04} alt="The rūsc studio: 7 potter's wheels, professional space" />
              <Image className="drawing" src={drawing} alt="Line drawing by Sylwia — hand, bottles, chair" />
            </div>
          </div>
        </div>
      </section>


      <section id="about">
        <div className="wrap">
          <SectionHead title="about" sub="“dare art…”" />
          <div className="about-grid">
            <figure className="about-ph"><Image src={atelier06} alt="Raquel Calleja, co-founder of rūsc" /></figure>
            <figure className="about-ph"><Image src={us03} alt="Chris Kerr, co-founder of rūsc" /></figure>
          </div>
          <div style={{ maxWidth: "720px", margin: "34px auto 0" }}>
            <p style={muted}>&ldquo;Dare Art&rdquo;, said Raquel Calleja.</p>
            <p style={muted}>From that dream <strong>rūsc</strong> was born: to create in Chamonix a place where art can circulate freely, between effervescence and memory.</p>
            <p style={muted}>Raquel joined forces with Chris Kerr to give this vision a body. Together they shaped a studio that resembles them: rooted in ceramics, their common ground, yet open to other invited practices.</p>
            <p style={{ color: "var(--muted)" }}><strong>rūsc</strong> means &ldquo;hive&rdquo; in many ancient languages. And in <strong>rūsc</strong> there is of course the <strong>R</strong> of Raquel and the <strong>C</strong> of Chris… but above all <strong>ūs</strong>: all of us, those who give and those who receive, those who share a gesture and pass on an experience — but above all, those who dare.</p>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <SectionHead title="contact" sub="Where to find us" />
          <figure className="contact-ph"><Image src={contact} alt="The rūsc studio" /></figure>
          <div className="info">
            <div><h3>The studio</h3><p>99 Promenade Marie Paradis<br />74400 Chamonix-Mont-Blanc<br />France</p></div>
            <div><h3>Open to the public</h3><p>Monday to Friday<br />2pm – 6pm</p></div>
            <div><h3>Get in touch</h3><p><a href={`mailto:${EMAIL}`}>{EMAIL}</a><br /><a href={PHONE_HREF}>{PHONE}</a><br /><a href={INSTAGRAM} target="_blank" rel="noopener">@studiorusc</a></p></div>
          </div>
          <ContactForm
            placeholders={{ firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone", message: "Your message" }}
            subjects={{
              placeholder: "Subject…",
              options: ["Workshops", "Membership", "Short courses", "Artist residency", "Space hire", "Other"],
            }}
            send="Send"
            sent="Thank you — your message has been sent."
            mail={{ firstName: "First name: ", lastName: "Last name: ", email: "Email: ", phone: "Phone: " }}
          />
        </div>
      </section>

      <Footer lang="en" />
    </>
  );
}
