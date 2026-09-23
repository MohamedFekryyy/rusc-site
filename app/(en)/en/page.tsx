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
import hero from "@/assets/photos/hero-o.jpg";
import ceramique2h from "@/assets/photos/ceramique-2h-o.png";
import modelage2h from "@/assets/photos/modelage-2h-o.jpg";
import enfant from "@/assets/photos/enfant-o.jpg";
import residence from "@/assets/photos/residence-o.jpg";
import mv3h from "@/assets/photos/model-vivant-3h-o.jpg";
import ceramique1j from "@/assets/photos/ceramique-1j-o.jpg";
import ceramique2j from "@/assets/photos/ceramique-2j-o.jpg";
import porcelaine from "@/assets/photos/porcelaine-o.jpg";
import tapisserie from "@/assets/photos/tapisserie-o.jpg";
import contact from "@/assets/photos/contact-o.webp";
import usRaquel from "@/assets/photos/us-raquel-o.webp";
import usChris from "@/assets/photos/us-chris-o.webp";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "rūsc — ceramics studio in Chamonix · dare art",
  description:
    "rūsc, a ceramics studio in Chamonix. Courses and workshops open to everyone, members-only open studio, annual membership. Dare art.",
  alternates: {
    canonical: "/en/",
    languages: { fr: "/", en: "/en/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    title: "rūsc — dare art",
    description: "Ceramics studio in Chamonix. Courses open to all, open studio for members.",
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
    "Ceramics studio in Chamonix: courses open to all, members-only open studio, ceramics, porcelain, upholstery, hand-building.",
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

const cuissonNote = <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €6 per piece · reduced rate for members</p>;

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <Header lang="en" page="home" />

      <section className="hero wrap">
        <p className="eyebrow">Ceramics studio · Chamonix</p>
        <h1>dare art</h1>
        <span className="rule"></span>
        <p>At rūsc, our courses are open to everyone, with no prerequisites. Curious beginners, amateurs looking for a creative moment, or enthusiasts wanting to deepen their practice: everyone finds their place.</p>
        <div className="actions">
          <a className="btn" href={BOOKING.en}>Book a course</a>
          <a className="btn ghost" href="#courses">See the programme</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={hero} alt="Potter's hands shaping clay at rūsc studio, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

      <section id="members">
        <div className="wrap">
          <SectionHead title="member area" sub="Open studio" />
          <div className="feature">
            <div className="txt">
              <h2>a professional space, at your own pace</h2>
              <p>rūsc offers open studio sessions exclusively for its members. A professional space equipped with quality material, ideal for amateur and experienced ceramicists alike.</p>
              <p>Open studio is dedicated to ceramics and gives rūsc members autonomous access to our fully equipped space. Whether you want to refine your technique or simply experiment, our studio is designed for your creative needs in an inspiring, professional setting.</p>
              <ul>
                <li>7 potter&rsquo;s wheels, for throwing and hand-building</li>
                <li>A full selection of shaping tools</li>
                <li>Materials included: stoneware, slips, clear glaze</li>
                <li>Unsupervised sessions — the team stays available</li>
              </ul>
              <p><strong>Access conditions:</strong> these sessions are reserved for members who have taken at least one 2-hour initiation with one of our teachers. An active membership is required to access the space.</p>
              <div className="pricing" style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "18px" }}>
                <p className="price" style={{ marginBottom: "12px" }}><strong>Membership: €50 / year</strong> — preferential rates and access to open studio sessions.</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={rateRow}><span>Open studio — single hour</span><span><strong>€22.50</strong> / hour</span></li>
                  <li style={rateRow}><span>Open studio — 10h card</span><span><strong>€15</strong> / hour · valid 6 months</span></li>
                  <li style={rateRow}><span>Open studio — 20h card</span><span><strong>€12</strong> / hour · valid 1 year</span></li>
                </ul>
                <p style={{ marginTop: "14px", fontSize: "15px", color: "var(--muted)" }}>Members get <strong>–10%</strong> on the 2-hour course, the hourly raw-glaze decoration, and the 5- and 10-course cards. This is a strictly personal benefit: reserved for the member, non-transferable. Open studio is reserved for members.</p>
              </div>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <BookingButton lang="en" view="catalog">Join</BookingButton>
                <a className="btn ghost" href={BOOKING.en}>Book a slot</a>
              </div>
            </div>
            <div className="art-stack">
              <Image className="drawing" src={drawing} alt="Line drawing by Sylwia — hand, bottles, chair" />
            </div>
          </div>
        </div>
      </section>

      <section id="courses">
        <div className="wrap">
          <SectionHead title="courses" sub="Dare the experience" />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={ceramique2h} alt="Wheel-throwing ceramics course at rūsc" />
              <p className="k">2-hour course</p>
              <h3>wheel throwing 2h</h3>
              <p>Ceramics throwing courses with an experienced teacher who will guide you through your first steps. At your own pace, over 2-hour courses you will learn every step needed to make your own pots.</p>
              <p className="price">2h course: €50 · member €45 · 5-course card: €210 · member €189 · 10-course card: €350 · member €315</p>
              {cuissonNote}
              <BookingButton lang="en" workshop="atelier-ceramique-2h">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={modelage2h} alt="Hand-building course at rūsc" />
              <p className="k">2-hour course</p>
              <h3>hand-building 2h</h3>
              <p>Whether you are a beginner or experienced, come and try your hand at hand-building and conceptualise your own creations.</p>
              <p className="price">2h course: €50 · member €45 · 5-course card: €210 · member €189 · 10-course card: €350 · member €315</p>
              {cuissonNote}
              <BookingButton lang="en" workshop="atelier-modelage-2h">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={logo} alt="Raw-glaze decoration — rūsc" />
              <p className="k">1-hour course</p>
              <h3>raw-glaze decoration 1h</h3>
              <p>A one-hour course dedicated to raw-glaze decoration, to personalise your pieces before firing.</p>
              <p className="price">1h course: €20 · member €18</p>
              {cuissonNote}
              <details style={{ marginTop: "10px", fontSize: "14.5px" }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Session times</summary>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", color: "var(--muted)" }}>
                  <li>Monday: 4pm – 5pm</li>
                  <li>Tuesday: 6:30pm – 7:30pm</li>
                  <li>Wednesday: 6pm – 7pm</li>
                  <li>Thursday: 5pm – 6pm</li>
                </ul>
              </details>
              <BookingButton lang="en">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={enfant} alt="Children's course at rūsc" />
              <p className="k">2-hour course</p>
              <h3>children&rsquo;s course 2h</h3>
              <p>For ages 7–12. Every Wednesday (outside school holidays). A playful time to discover, shape and create.</p>
              <p className="price">2h course: €50 · firing from €6 per piece</p>
              <BookingButton lang="en" workshop="modelage-enfant">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={mv3h} alt="Life-drawing course at rūsc" />
              <p className="k">3-hour course</p>
              <h3>life drawing 3h</h3>
              <p>A three-hour course around the life model: observe, draw, shape from the moving body.</p>
              <p className="price">3h course: €50 · member €45 · 5-course card: €210 · member €189 · 10-course card: €350 · member €315</p>
              {cuissonNote}
              <a className="btn" href="#contact">+ info</a>
            </article>
          </div>
        </div>
      </section>

      <section id="intensives">
        <div className="wrap">
          <SectionHead title="intensives" sub="Immersion · 10am – 5pm" />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={ceramique2j} alt="Two-day stoneware throwing intensive at rūsc" />
              <p className="k">2 days</p>
              <h3>ceramics 2 days</h3>
              <p>Immerse yourself in the ceramicist&rsquo;s craft over two consecutive days. Open to all, this course lets you see every stage of creation: from throwing to glazing, including turning.</p>
              <p className="price">2-day stoneware throwing: €280</p>
              {cuissonNote}
              <BookingButton lang="en" workshop="atelier-ceramique-2j">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={ceramique1j} alt="One-day stoneware throwing intensive at rūsc" />
              <p className="k">1 day</p>
              <h3>ceramics 1 day</h3>
              <p>Whether you are a beginner or considering a career change, we will guide you through every step needed to throw a stoneware piece.</p>
              <p className="price">Stoneware throwing: €180</p>
              {cuissonNote}
              <BookingButton lang="en" workshop="atelier-ceramique-1j">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={porcelaine} alt="Porcelain throwing intensive at rūsc" />
              <p className="k">10am – 5pm</p>
              <h3>porcelain 1 day</h3>
              <p>Porcelain is a singular material: pure, demanding, luminous. Few studios make it accessible. Once a month, we offer our students this rare experience: taming its fragility, exploring its precise gestures and shaping their own pieces on the wheel.</p>
              <p className="price">Porcelain throwing: €230</p>
              {cuissonNote}
              <BookingButton lang="en" workshop="porcelaine">Book</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={tapisserie} alt="Traditional upholstery intensive at rūsc" />
              <p className="k">2 days</p>
              <h3>upholstery 2 days</h3>
              <p>For beginners or experienced, come and learn every stage of traditional upholstery. You can bring your own project or a school chair will be provided for you to practise on.</p>
              <p className="price">On request · contact us</p>
              <a className="btn" href="#contact">+ info</a>
            </article>
          </div>
          <div className="head" style={{ marginTop: "52px" }}>
            <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Want to give the rūsc experience? Our gift vouchers are valid across all courses.</p>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <SectionHead title="prices" sub="Clear rates" />
          <div className="price-grid">
            <article className="pcard">
              <p className="tag">Courses</p>
              <div className="rows">
                <PriceRow label="2-hour course" value="€50" valueNote="member €45" />
                <PriceRow label="5-course card" note="valid 6 months" value="€210" valueNote="member €189" />
                <PriceRow label="10-course card" note="valid 1 year" value="€350" valueNote="member €315" />
                <PriceRow label="Raw-glaze decoration" note="per hour" value="€20" valueNote="member €18" />
              </div>
              <div className="foot"><BookingButton lang="en">Book a course</BookingButton></div>
            </article>
            <article className="pcard">
              <p className="tag">Open studio · members only</p>
              <div className="rows">
                <PriceRow label="Single hour" value="€22.50" valueNote="/ hour" />
                <PriceRow label="10-hour card" note="valid 6 months" value="€15" valueNote="/ hour" />
                <PriceRow label="20-hour card" note="valid 1 year" value="€12" valueNote="/ hour" />
                <PriceRow label="Firing" note="per piece" value="€6" />
              </div>
              <div className="foot"><BookingButton lang="en" view="catalog">Become a member</BookingButton></div>
            </article>
            <article className="pcard">
              <p className="tag">Intensives &amp; gifts</p>
              <div className="rows">
                <PriceRow label="Ceramics 1 day" value="€180" />
                <PriceRow label="Ceramics 2 days" value="€280" />
                <PriceRow label="Porcelain 1 day" note="once a month" value="€230" />
                <PriceRow label="Gift voucher" note="any amount · valid 1 year" value="from €50" />
              </div>
              <div className="foot"><BookingButton lang="en" view="gifts">Book / give</BookingButton></div>
            </article>
          </div>
          <p style={{ textAlign: "center", marginTop: "34px", fontSize: "14.5px", color: "var(--muted)", maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
            Prices shown here are also shown at the time of booking. The 10% member discount applies automatically as soon as your membership is active.
          </p>
        </div>
      </section>

      <section id="firing">
        <div className="wrap">
          <SectionHead title="firing" sub="From course to finished piece" />
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>why your piece can&rsquo;t leave the studio the same day</h3>
            <p style={{ fontSize: "15.5px" }}>Your piece isn&rsquo;t finished when the course ends — it is only beginning its journey. It goes through the kiln twice, and there are several steps in between.</p>
            <p style={{ fontSize: "15.5px" }}><strong>The bisque firing — 980&nbsp;°C.</strong> A slow first firing that removes all the water in the clay and makes the piece solid and porous. This is what allows it to be glazed afterwards without collapsing or breaking.</p>
            <p style={{ fontSize: "15.5px" }}><strong>Glazing, then the final firing — 1280&nbsp;°C.</strong> The piece is glazed, dried, then fired a second time at very high temperature. This is when the glaze melts, vitrifies and becomes that smooth, luminous surface. Stoneware and porcelain need this temperature to be truly durable.</p>

            <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>why time matters</h3>
            <ul style={{ paddingLeft: "20px", fontSize: "15.5px", lineHeight: 1.6 }}>
              <li style={{ marginBottom: "10px" }}><strong>A damp piece can explode in the kiln.</strong> As the temperature rises, the water inside turns to steam; pressure builds and the clay bursts from within. Thick pieces especially must be bone dry before firing. An air bubble doesn&rsquo;t explode on its own — but it traps moisture, and that is what makes the piece give way.</li>
              <li style={{ marginBottom: "10px" }}><strong>The delay: allow between 2 weeks and 2 months</strong>, depending on the piece, the season and the firing schedule. Our kilns are electric: we don&rsquo;t fire them for a single piece. We wait until we have enough to fill a kiln load — which is also why the delay is what it is.</li>
              <li><strong>The clay moves too:</strong> a piece shrinks as it dries and fires — about 10% for stoneware, up to 20% for porcelain. What you take home won&rsquo;t be quite the size of what you shaped.</li>
            </ul>

            <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>a few notes</h3>
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Slip or glaze?</p>
                <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>Slip (engobe) is liquid coloured clay, applied to the raw piece — it becomes one with it. Glaze is a vitrifiable coating that melts into a smooth, glossy surface. One decorates, the other protects.</p>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Material and heat</p>
                <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>Silica — the main component of sand and rock — brings hardness and resists heat. At 573&nbsp;°C, quartz abruptly changes structure and volume: that&rsquo;s why heating and cooling are slow around this point, to prevent cracking.</p>
              </div>
            </div>

            <p style={{ fontSize: "14.5px", color: "var(--muted)", marginTop: "22px" }}>Photos of the kiln loading and opening to come.</p>
          </div>

          <details style={{ maxWidth: "760px", margin: "26px auto 0", border: "1px solid var(--line)", borderRadius: "10px", padding: "4px 18px" }}>
            <summary style={{ cursor: "pointer", padding: "14px 0", fontWeight: 600 }}>See firing rates in detail</summary>
            <div style={{ paddingBottom: "16px" }}>
              <p style={{ fontSize: "15px", color: "var(--muted)", margin: "6px 0 12px" }}>Firing is handled by the rūsc team. Every piece receives a clear glaze applied by us. The rate depends on the material, the size and the glaze chosen.</p>
              <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "10px 0 6px" }}>Non-members</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={rateRow}><span>Children</span><span><strong>€6</strong></span></li>
                <li style={rateRow}><span>Stoneware</span><span><strong>€8</strong></span></li>
                <li style={rateRow}><span>Stoneware — small slip</span><span><strong>€10</strong></span></li>
                <li style={rateRow}><span>Stoneware — large slip or neutral</span><span><strong>€14</strong></span></li>
                <li style={rateRow}><span>Stoneware — effect (small or large)</span><span><strong>€15</strong></span></li>
                <li style={rateRow}><span>Porcelain</span><span><strong>€12</strong></span></li>
                <li style={rateRow}><span>Porcelain — small slip</span><span><strong>€14</strong></span></li>
                <li style={rateRow}><span>Porcelain — large slip or neutral</span><span><strong>€18</strong></span></li>
                <li style={rateRow}><span>Porcelain — effect (small or large)</span><span><strong>€17</strong></span></li>
              </ul>
              <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "18px 0 6px" }}>Members</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={rateRow}><span>Small piece</span><span><strong>€7</strong></span></li>
                <li style={rateRow}><span>Large piece and plate</span><span><strong>€10</strong></span></li>
                <li style={rateRow}><span>Children</span><span><strong>€6</strong></span></li>
              </ul>
              <p style={{ marginTop: "14px", fontSize: "14.5px", color: "var(--muted)" }}>Clear glaze included in every firing. Firings are carried out by the rūsc team; no firing is left to students.</p>
            </div>
          </details>
        </div>
      </section>

      <section id="membership">
        <div className="wrap">
          <SectionHead title="rūsc membership" sub="€50 per year" />
          <div className="ad-wrap">
            <div>
              <p>Membership opens the open studio — a professional space, in autonomy, reserved for members — and gives you <strong>–10%</strong> on all courses and all cards.</p>
              <ul>
                <li>Access to open studio sessions</li>
                <li>–10% on courses and cards</li>
                <li>Priority booking on limited places</li>
                <li>Access to members-only events and firing news</li>
              </ul>
            </div>
            <div className="ad-card">
              <p className="num">€50</p>
              <p className="per">per year</p>
              <BookingButton lang="en" view="catalog">Join rūsc</BookingButton>
            </div>
          </div>
        </div>
      </section>

      <section id="booking">
        <div className="wrap">
          <SectionHead title="book" sub="Members, courses, cards and gifts" />
          <div className="price-grid">
            <LinkCard tag="Wheel throwing · 2-hour course" title="ceramics 2h" unit="Course €50 · 5-card €210 · 10-card €350">
              <BookingButton lang="en" workshop="atelier-ceramique-2h">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Hand-building · 2-hour course" title="hand-building 2h" unit="Course €50 · 5-card €210 · 10-card €350">
              <BookingButton lang="en" workshop="atelier-modelage-2h">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Children · every Wednesday" title="children&rsquo;s course 2h" unit="2-hour course">
              <BookingButton lang="en" workshop="modelage-enfant">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Raw-glaze · 1 hour" title="raw-glaze decoration" unit="Course €20 · member €18">
              <BookingButton lang="en">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Life drawing · 3-hour course" title="life drawing 3h" unit="Course €50 · 5-card €210 · 10-card €350">
              <a className="btn" href="#contact">+ info</a>
            </LinkCard>
            <LinkCard tag="Stoneware · 10am – 5pm" title="ceramics 1 day" unit="€180">
              <BookingButton lang="en" workshop="atelier-ceramique-1j">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Stoneware · 2 days" title="ceramics 2 days" unit="€280">
              <BookingButton lang="en" workshop="atelier-ceramique-2j">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Porcelain · 10am – 5pm" title="porcelain 1 day" unit="€230">
              <BookingButton lang="en" workshop="porcelaine">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Open studio · members" title="book a slot" unit="Autonomous access to the equipped space">
              <BookingButton lang="en" view="catalog">Book</BookingButton>
            </LinkCard>
            <LinkCard tag="Gift voucher" title="give the experience" unit="Any amount · valid 1 year">
              <BookingButton lang="en" view="gifts">Give</BookingButton>
            </LinkCard>
          </div>
        </div>
      </section>

      <section id="privatisation">
        <div className="wrap">
          <SectionHead title="space hire" sub="Tailor-made" />
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <p style={{ fontSize: "15.5px" }}>Birthday, hen party, team building, themed dinner, creative workshop, body expression, exhibition… <strong>Privatise the space for half a day</strong> and create your own piece.</p>
            <p style={{ fontSize: "15.5px" }}>On the wheel or with slabs, all the equipment is at your disposal for a playful, friendly moment.</p>
            <p style={{ fontSize: "15.5px" }}>You can also hire the space <strong>without the ceramics equipment</strong>: you then have a fully equipped kitchen and a 60&nbsp;m² modular space.</p>
            <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
              <a className="btn" href="#contact">Request a quote</a>
            </div>
          </div>
        </div>
      </section>

      <section id="residence">
        <div className="wrap">
          <SectionHead title="artist residency" sub="Tailor-made programme" />
          <div className="feature">
            <div className="txt">
              <h2>a place to express yourself</h2>
              <p>Artisans, painters, visual artists, photographers… Looking for a place to express yourself? Need specific pottery equipment? Short of inspiration? This tailor-made programme is for you.</p>
              <p>We support you through your personal project up to the opening day, when your work is presented at the studio.</p>
              <p><strong>Residencies last a minimum of one month.</strong></p>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <a className="btn" href="#contact">Apply</a>
              </div>
            </div>
            <div className="art-stack">
              <Image src={residence} alt="Artist residency at the rūsc studio" />
            </div>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="wrap">
          <SectionHead title="about" sub="“dare art…”" />
          <div className="about-grid">
            <figure className="about-ph"><Image src={usRaquel} alt="Raquel Calleja, co-founder of rūsc" /></figure>
            <figure className="about-ph"><Image src={usChris} alt="Chris Kerr, co-founder of rūsc" /></figure>
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
              options: ["Courses", "Membership", "Intensives", "Artist residency", "Space hire", "Other"],
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

function PriceRow({ label, note, value, valueNote }: { label: React.ReactNode; note?: React.ReactNode; value: React.ReactNode; valueNote?: React.ReactNode }) {
  return (
    <div className="rows" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      <div style={rateRow}>
        <span>
          {label}
          {note ? <span style={{ color: "var(--muted)", fontSize: "13.5px" }}> · {note}</span> : null}
        </span>
        <span style={{ textAlign: "right" }}>
          <strong>{value}</strong>
          {valueNote ? <span style={{ color: "var(--muted)", fontSize: "13.5px" }}> {valueNote}</span> : null}
        </span>
      </div>
    </div>
  );
}

function LinkCard({ tag, title, unit, children }: { tag: React.ReactNode; title: React.ReactNode; unit?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <article className="pcard">
      <p className="tag">{tag}</p>
      <h3 style={{ margin: "6px 0 4px" }}>{title}</h3>
      {unit ? <p className="unit">{unit}</p> : null}
      {children}
    </article>
  );
}
