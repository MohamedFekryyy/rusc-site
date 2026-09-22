import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import BookingButton from "@/components/BookingButton";
import BookingEmbed from "@/components/BookingEmbed";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import SectionHead from "@/components/SectionHead";
import { EMAIL, INSTAGRAM, PHONE, PHONE_HREF, SITE_URL, STUDIO_JSON_LD } from "@/lib/site";
import logo from "@/assets/logo-rusc.webp";
import drawing from "@/assets/dessin-sylwia.webp";
import atelier01 from "@/assets/photos/atelier-01.jpg";
import atelier02 from "@/assets/photos/atelier-02.jpg";
import atelier03 from "@/assets/photos/atelier-03.jpg";
import atelier04 from "@/assets/photos/atelier-04.jpg";
import atelier05 from "@/assets/photos/atelier-05.jpg";
import atelier06 from "@/assets/photos/atelier-06.jpg";
import atelier07 from "@/assets/photos/atelier-07.jpg";
import atelier08 from "@/assets/photos/atelier-08.jpg";
import atelier09 from "@/assets/photos/atelier-09.jpg";
import atelier10 from "@/assets/photos/atelier-10.jpg";
import contact from "@/assets/photos/contact.jpg";
import us03 from "@/assets/photos/us-03.jpg";
import "@/styles/home.css";

export const metadata: Metadata = {
  title: "rūsc — atelier de céramique à Chamonix · oser l'art",
  description:
    "rūsc, atelier de céramique à Chamonix : tournage, modelage, porcelaine, tapisserie. Ateliers ouverts à tous sans prérequis, ateliers libres pour les membres, adhésion annuelle. Osez l'art.",
  alternates: {
    canonical: "/",
    languages: { fr: "/", en: "/en/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    title: "rūsc — oser l'art",
    description: "Atelier de céramique à Chamonix. Ateliers ouverts à tous, ateliers libres pour les membres.",
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
    "Atelier de céramique à Chamonix : ateliers ouverts à tous, ateliers libres pour les membres, céramique, porcelaine, tapisserie, modelage.",
  url: SITE_URL,
};

const muted: CSSProperties = { color: "var(--muted)", marginBottom: "16px" };
const rateRow: CSSProperties = {
  padding: "7px 0",
  borderBottom: "1px solid var(--line)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};
const termsLink: CSSProperties = {
  color: "var(--accent)",
  textDecoration: "none",
  borderBottom: "1px solid var(--accent)",
};

function PriceRow({ label, note, value, valueNote }: {
  label: ReactNode;
  note?: ReactNode;
  value: ReactNode;
  valueNote?: ReactNode;
}) {
  return (
    <div className="row">
      <span className="lbl">{label}{note && <small>{note}</small>}</span>
      <span className="val">{value}{valueNote && <small>{valueNote}</small>}</span>
    </div>
  );
}

function LinkCard({ tag, title, unit, children }: {
  tag: ReactNode;
  title: ReactNode;
  unit: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="pcard">
      <p className="tag">{tag}</p>
      <h3>{title}</h3>
      <p className="unit">{unit}</p>
      <div className="foot">{children}</div>
    </article>
  );
}

function Bio({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
      <h3 style={{ fontSize: "22px", marginBottom: "8px" }}>{name}</h3>
      <p style={{ color: "var(--muted)", fontSize: "16px" }}>{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <Header
        lang="fr"
        links={[
          { href: "#ateliers", label: "Workshop" },
          { href: "#membres", label: "Devenir membre" },
          { href: "#tarifs", label: "Tarifs" },
          { href: "#reservation", label: "Réservation" },
          { href: "#us", label: "Ūs" },
          { href: "#contact", label: "Contact" },
        ]}
        cta="Réserver"
      />

      <section className="hero wrap">
        <p className="eyebrow">Atelier de céramique · Chamonix</p>
        <h1>oser l&rsquo;art</h1>
        <span className="rule"></span>
        <p>Chez rūsc, nos ateliers sont ouverts à toutes et à tous, sans prérequis. Débutants curieux, amateurs en quête d’un moment créatif, ou passionnés souhaitant approfondir leur pratique : chacun trouve sa place.</p>
        <div className="actions">
          <a className="btn" href="#reservation">Réserver un atelier</a>
          <a className="btn ghost" href="#ateliers">Voir la programmation</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={atelier01} alt="Mains façonnant la terre à l’atelier rūsc, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

      <section id="ateliers">
        <div className="wrap">
          <SectionHead title="nos ateliers" sub={<>Osez l&rsquo;expérience</>} />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={atelier03} alt="Tournage en céramique sur tour de potier à rūsc" />
              <p className="k">Séances de 2&nbsp;h</p>
              <h3>atelier céramique 2h</h3>
              <p>Ateliers de tournage en céramique avec un professeur expérimenté qui vous guidera dans vos premiers pas. À votre rythme, sur des séances de 2h vous apprendrez toutes les étapes nécessaires à la réalisation de vos poteries.</p>
              <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · Carnet de 5 cours de 2h&nbsp;: 210&nbsp;€ · Carnet de 10 cours de 2h&nbsp;: 350&nbsp;€</p>
              <BookingButton appointment="atelier-ceramique-2h">S&rsquo;inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier02} alt="Modelage de l’argile à l’atelier rūsc" />
              <p className="k">Séances de 2&nbsp;h</p>
              <h3>atelier modelage 2h</h3>
              <p>Que vous soyez débutants ou expérimentés, venez vous essayez au modelage et conceptualisez vos propres créations.</p>
              <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · Carnet de 5 cours de 2h&nbsp;: 210&nbsp;€ · Carnet de 10 cours de 2h&nbsp;: 350&nbsp;€</p>
              <BookingButton appointment="atelier-modelage-2h">S&rsquo;inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier07} alt="Atelier enfants 7–12 ans à rūsc" />
              <p className="k">Chaque mercredi</p>
              <h3>atelier enfant 2h30</h3>
              <p>Pour les 7–12 ans. Tous les mercredis (hors vacances scolaires). Un temps ludique pour découvrir, façonner et créer.</p>
              <p className="price">Places limitées · réservation conseillée</p>
              <a className="btn" href="#reservation">Réserver</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier03} alt="Tournage sur tour de potier — stage rūsc" />
              <p className="k">Journée ou week-end</p>
              <h3>stages</h3>
              <p>Céramique, porcelaine et autres disciplines. Une immersion complète pour apprendre les gestes et repartir avec vos pièces.</p>
              <p className="price">Formules d’une journée ou de week-end</p>
              <a className="btn" href="#reservation">Réserver</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier10} alt="Ateliers réguliers de céramique à Chamonix" />
              <p className="k">Toute l’année</p>
              <h3>ateliers réguliers</h3>
              <p>Progresser pas à pas, séance après séance. La céramique en est le cœur, enrichie par d’autres disciplines invitées : tapisserie, modelage, intervenants invités.</p>
              <p className="price">Carnet 5 séances valable 6 mois · Carnet 10 séances valable 1 an</p>
              <p className="price" style={{ color: "var(--ink)" }}>Séance 2&nbsp;h&nbsp;: 50&nbsp;€ · Carnet 5&nbsp;: 210&nbsp;€ · Carnet 10&nbsp;: 350&nbsp;€<br /><span style={{ color: "var(--accent)" }}>Membre&nbsp;: –10&nbsp;% (45&nbsp;€ / 189&nbsp;€ / 315&nbsp;€)</span></p>
              <a className="btn" href="#reservation">Réserver</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier05} alt="Atelier de tournage en grès — journée à rūsc" />
              <p className="k">10h – 17h</p>
              <h3>atelier céramique 1j</h3>
              <p>Que vous soyez débutant ou dans le cadre d’une reconversion professionnelle, nous vous guiderons afin de passer en revue toutes les étapes nécessaires au tournage d’une pièce en grès.</p>
              <p className="price">Atelier tournage grès&nbsp;: 180&nbsp;€</p>
              <a className="btn" href="#reservation">S’inscrire</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier08} alt="Atelier de tournage en grès sur deux jours à rūsc" />
              <p className="k">10h – 17h</p>
              <h3>atelier céramique 2 jours</h3>
              <p>Imprégnez-vous du métier de céramiste durant deux journées consécutives. Ouvert à tous, cet atelier vous permet de voir toutes les étapes de la création&nbsp;: du tournage à l’engobage en passant par le tournassage.</p>
              <p className="price">Atelier tournage grès 2 jours&nbsp;: 280&nbsp;€</p>
              <a className="btn" href="#reservation">S’inscrire</a>
            </article>
            <article className="card">
              <Image className="thumb" src={atelier09} alt="Atelier de tournage en porcelaine à rūsc" />
              <p className="k">10h – 17h</p>
              <h3>atelier porcelaine 1j</h3>
              <p>La porcelaine est une matière singulière&nbsp;: pure, exigeante, lumineuse. Peu d’ateliers permettent de l’aborder. Une fois par mois, nous proposons à nos élèves cette expérience rare&nbsp;: apprivoiser sa fragilité, explorer ses gestes précis et façonner leurs propres pièces au tour.</p>
              <p className="price">Atelier tournage porcelaine&nbsp;: 230&nbsp;€</p>
              <a className="btn" href="#reservation">S’inscrire</a>
            </article>
          </div>
          <div className="head" style={{ marginTop: "52px" }}>
            <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Vous souhaitez offrir l&rsquo;expérience rūsc&nbsp;? Nos bons cadeaux sont valables sur l&rsquo;ensemble des ateliers.</p>
          </div>
        </div>
      </section>

      <section id="membres">
        <div className="wrap">
          <SectionHead title="devenir membre" sub="Ateliers libres" />
          <div className="feature">
            <div className="txt">
              <h2>un espace pro, en autonomie</h2>
              <p>rūsc propose des ateliers libres destinés exclusivement à ses membres. Un espace professionnel équipé de matériel de qualité, idéal pour les céramistes amateurs comme confirmés.</p>
              <p>Des matériaux fournis, vous permettant de vous concentrer sur votre créativité sans souci logistique. La possibilité de travailler à votre rythme tout en bénéficiant d&rsquo;un environnement convivial et stimulant.</p>
              <h3 style={{ fontSize: "19px", margin: "22px 0 10px" }}>que sont les ateliers libres&nbsp;?</h3>
              <p>Les ateliers libres sont dédiés à la céramique et offrent aux membres rūsc un accès autonome à notre espace entièrement équipé. Que vous souhaitiez perfectionner vos techniques ou simplement expérimenter, notre atelier est conçu pour répondre à vos besoins créatifs dans un cadre inspirant et professionnel.</p>
              <h3 style={{ fontSize: "19px", margin: "22px 0 10px" }}>équipements et matériel à disposition</h3>
              <ul>
                <li>7 tours de potier pour vos travaux de tournage et modelage</li>
                <li>Une sélection complète des outils nécessaires au façonnage et au tournage de la terre</li>
                <li>Les matériaux inclus&nbsp;: grès, engobes, et émail transparent pour finaliser vos créations</li>
              </ul>
              <p><strong>Conditions d&rsquo;accès&nbsp;:</strong> ces ateliers sont exclusivement réservés aux membres ayant suivi au moins une initiation de 2&nbsp;heures avec l&rsquo;un de nos enseignants. Une adhésion active est requise pour accéder à cet espace.</p>
              <p><strong>Cuissons et fours&nbsp;:</strong> les cuissons des pièces et l&rsquo;utilisation des fours haute température (jusqu&rsquo;à 1280&nbsp;°C) sont exclusivement gérées par l&rsquo;équipe de rūsc. Toutefois, vos pièces peuvent être cuites pour un montant de 6&nbsp;€ par pièce, à régler avant la cuisson.</p>
              <div className="pricing" style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "18px" }}>
                <p className="price" style={{ marginBottom: "12px" }}><strong>Adhésion membre&nbsp;: 50&nbsp;€ / an</strong> — tarifs préférentiels et accès aux ateliers libres.</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={rateRow}><span>Atelier libre — séance à l&rsquo;unité</span><span><strong>22,50&nbsp;€</strong> / heure</span></li>
                  <li style={rateRow}><span>Atelier libre — carnet 10&nbsp;h</span><span><strong>15&nbsp;€</strong> / heure · valable 6 mois</span></li>
                  <li style={rateRow}><span>Atelier libre — carnet 20&nbsp;h</span><span><strong>12&nbsp;€</strong> / heure · valable 1 an</span></li>
                </ul>
                <p style={{ marginTop: "14px", fontSize: "15px", color: "var(--muted)" }}>Les membres bénéficient de <strong>–10&nbsp;%</strong> sur la séance de 2&nbsp;heures (tournage ou modelage), le décor à cru à l&rsquo;heure, le carnet 5 séances et le carnet 10 séances. Avantage strictement personnel&nbsp;: réservé au membre, non transférable. L&rsquo;atelier libre est réservé aux membres.</p>
              </div>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <BookingButton view="catalog">Adhérer</BookingButton>
                <a className="btn ghost" href="#reservation">Réserver un créneau</a>
              </div>
            </div>
            <div className="art-stack">
              <Image src={atelier04} alt="L’atelier rūsc : 7 tours de potier, espace professionnel" />
              <Image className="drawing" src={drawing} alt="Dessin au trait de Sylwia — main, bouteilles, chaise" />
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs">
        <div className="wrap">
          <SectionHead title="tarifs" sub="clairs, sans surprise" />
          <div className="bk-shell" style={{ boxShadow: "none" }}>
            <div className="bk-bar"><span><b>Tout compris</b> · terre, engobes, émail et cuisson d&apos;une pièce inclus</span></div>
          </div>
          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--muted)" }}>Prix affichés TTC. La cuisson d’une pièce est comprise ; terre, engobes et émail transparent fournis.</p>
          <div className="price-grid" style={{ marginTop: "26px" }}>
            <article className="pcard">
              <p className="tag">Ouvert à tous · sans prérequis</p>
              <h3>ateliers 2h — céramique &amp; modelage</h3>
              <p className="unit">Tournage ou modelage avec un professeur · 2&nbsp;heures</p>
              <div className="rows">
                <PriceRow label={<>Séance 2&nbsp;h</>} value={<>50&nbsp;€</>} valueNote={<>membre 45&nbsp;€</>} />
                <PriceRow label="Carnet 5 séances" note="valable 6 mois" value={<>210&nbsp;€</>} valueNote={<>membre 189&nbsp;€</>} />
                <PriceRow label="Carnet 10 séances" note="valable 1 an" value={<>350&nbsp;€</>} valueNote={<>membre 315&nbsp;€</>} />
                <PriceRow label="Décor à cru" note={<>à l&rsquo;heure</>} value={<>20&nbsp;€</>} valueNote={<>membre 18&nbsp;€</>} />
              </div>
              <div className="foot"><a className="btn" href="#reservation">Réserver</a></div>
            </article>

            <article className="pcard highlight">
              <span className="member-badge">Membres uniquement</span>
              <p className="tag">Adhésion requise</p>
              <h3>atelier libre</h3>
              <p className="unit">En autonomie, à l&rsquo;heure</p>
              <div className="rows">
                <PriceRow label={<>Séance à l&rsquo;unité</>} value={<>22,50&nbsp;€</>} valueNote="/ heure" />
                <PriceRow label={<>Carnet 10&nbsp;heures</>} note="valable 6 mois" value={<>15&nbsp;€</>} valueNote="/ heure" />
                <PriceRow label={<>Carnet 20&nbsp;heures</>} note="valable 1 an" value={<>12&nbsp;€</>} valueNote="/ heure" />
                <PriceRow label="Cuisson" note="par pièce" value={<>6&nbsp;€</>} />
              </div>
              <div className="saving">Le format le plus économique : 12&nbsp;€/h en carnet 20&nbsp;h, contre 22,50&nbsp;€/h à l&rsquo;unité.</div>
              <div className="foot" style={{ marginTop: "16px" }}><a className="btn" href="#adhesion">Devenir membre</a></div>
            </article>

            <article className="pcard">
              <p className="tag">Journée ou week-end</p>
              <h3>stages &amp; bons cadeaux</h3>
              <p className="unit">Immersion complète · 10h – 17h</p>
              <div className="rows">
                <PriceRow label="Atelier céramique 1 jour" value={<>180&nbsp;€</>} />
                <PriceRow label="Atelier céramique 2 jours" value={<>280&nbsp;€</>} />
                <PriceRow label="Atelier porcelaine 1 jour" note="une fois par mois" value={<>230&nbsp;€</>} />
                <PriceRow label="Bon cadeau" note="montant libre · valable 1 an" value={<>dès 50&nbsp;€</>} />
              </div>
              <div className="foot"><BookingButton view="gifts">Réserver / offrir</BookingButton></div>
            </article>
          </div>
          <p style={{ textAlign: "center", marginTop: "34px", fontSize: "14.5px", color: "var(--muted)", maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
            Les tarifs sont affichés ici et repris au moment de la réservation. La remise membre de 10&nbsp;% s&rsquo;applique automatiquement dès que votre adhésion est active.
          </p>
        </div>
      </section>

      <section id="adhesion">
        <div className="wrap">
          <SectionHead title={<>l&rsquo;adhésion rūsc</>} sub={<>50&nbsp;€ par an</>} />
          <div className="ad-wrap">
            <div>
              <p>L&rsquo;adhésion vous ouvre l&rsquo;atelier libre — un espace professionnel en autonomie, réservé aux membres — et vous fait profiter de <strong>–10&nbsp;%</strong> sur toutes les séances et tous les carnets.</p>
              <ul className="ad-list">
                <li>Accès aux ateliers libres (7 tours, outils, matériaux)</li>
                <li><strong>–10&nbsp;%</strong> sur la séance 2&nbsp;h, le décor à cru et les carnets 5 et 10 séances</li>
                <li>Tarif horaire dégressif jusqu&rsquo;à 12&nbsp;€/h en carnet 20&nbsp;h</li>
                <li>Valable 12 mois, à date anniversaire</li>
              </ul>
              <p style={{ fontSize: "14.5px", opacity: 0.85 }}>Avantage strictement personnel&nbsp;: la remise membre est nominative et non transférable. Une adhésion active est requise pour réserver un atelier libre.</p>
            </div>
            <div className="ad-box">
              <p className="num">50&nbsp;€</p>
              <p className="per">Par an</p>
              <BookingButton view="catalog">Adhérer maintenant</BookingButton>
              <p className="fine">Dès le premier carnet de 20&nbsp;h, l&rsquo;adhésion est déjà amortie par la remise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews: hidden until there are quotes to show (styles: .proof / .quote). */}
      <section id="avis" style={{ display: "none" }}></section>

      <section id="reservation">
        <div className="wrap">
          <SectionHead title="réserver" sub={<>Osez l&rsquo;expérience</>} />
          {/* Each card opens its workshop in the booking embed below. */}
          <div className="price-grid">
            <LinkCard tag={<>Tournage · séances de 2&nbsp;h</>} title="atelier céramique 2h" unit={<>Cours 50&nbsp;€ · Carnet 5&nbsp;: 210&nbsp;€ · Carnet 10&nbsp;: 350&nbsp;€</>}>
              <BookingButton appointment="atelier-ceramique-2h">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag={<>Modelage · séances de 2&nbsp;h</>} title="atelier modelage 2h" unit={<>Cours 50&nbsp;€ · Carnet 5&nbsp;: 210&nbsp;€ · Carnet 10&nbsp;: 350&nbsp;€</>}>
              <BookingButton appointment="atelier-modelage-2h">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="7–12 ans · chaque mercredi" title="atelier enfant 2h30" unit="Un temps ludique pour découvrir, façonner et créer">
              <BookingButton appointment="modelage-enfant">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Tournage grès · 10h – 17h" title="atelier céramique 1j" unit={<>180&nbsp;€</>}>
              <BookingButton appointment="atelier-ceramique-1j">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Tournage grès · 2 jours" title="atelier céramique 2 jours" unit={<>280&nbsp;€</>}>
              <BookingButton appointment="atelier-ceramique-2j">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Porcelaine · 10h – 17h" title="atelier porcelaine 1j" unit={<>230&nbsp;€</>}>
              <BookingButton appointment="porcelaine">S&rsquo;inscrire</BookingButton>
            </LinkCard>
          </div>
          <div className="price-grid" style={{ marginTop: "26px" }}>
            <LinkCard tag="Atelier libre · membres" title="réserver un créneau" unit={<>Accès autonome à l&rsquo;espace équipé</>}>
              <BookingButton>Réserver</BookingButton>
            </LinkCard>
            <LinkCard tag="Offrir" title="bon cadeau" unit="Valable 1 an pour toute formation ou carnet de cours">
              <BookingButton view="gifts">+ info</BookingButton>
            </LinkCard>
            <LinkCard tag="Sur mesure" title={<>location d&rsquo;espace &amp; résidence</>} unit={<>Anniversaire, EVJF, team building, résidence d&rsquo;artiste…</>}>
              <a className="btn" href="#contact">Nous contacter</a>
            </LinkCard>
          </div>

          <BookingEmbed
            heading="Réservation en ligne"
            caption="ateliers, stages & créneaux libres"
            tabs={{ schedule: "Ateliers", catalog: "Carnets & adhésion", gifts: "Bons cadeaux" }}
            title="Réservation rūsc"
          />
          <p className="bk-note">Réservation sécurisée par Acuity Scheduling. Les carnets, l’adhésion annuelle et les bons cadeaux (valables 1 an) sont proposés au moment de la réservation. La remise membre de 10&nbsp;% s’applique automatiquement.</p>

          <p style={{ textAlign: "center", marginTop: "34px", fontSize: "14px", color: "var(--muted)" }}>
            <a href="/conditions/" style={termsLink}>Conditions générales &amp; annulation</a>
          </p>
        </div>
      </section>

      <section id="us">
        <div className="wrap">
          <SectionHead title="ūs" sub="« dare art… »" />
          <div className="about-grid">
            <figure className="about-ph"><Image src={atelier06} alt="Raquel Calleja, cofondatrice de rūsc" /></figure>
            <figure className="about-ph"><Image src={us03} alt="Chris Kerr, cofondateur de rūsc" /></figure>
          </div>
          <div style={{ maxWidth: "720px", margin: "34px auto 0" }}>
            <p style={muted}>«&nbsp;Dare Art / Osez l&rsquo;art&nbsp;», disait Raquel Calleja. De ce rêve est né <strong>rūsc</strong>&nbsp;: créer à Chamonix un lieu où l&rsquo;art puisse circuler librement, entre effervescence et mémoire.</p>
            <p style={muted}>Raquel s&rsquo;est associée à Chris Kerr pour donner corps à cette vision. Ensemble, ils ont façonné un atelier qui leur ressemble&nbsp;: enraciné dans la céramique, leur base commune, mais ouvert à d&rsquo;autres pratiques invitées.</p>
            <p style={muted}><strong>rūsc</strong> signifie «&nbsp;ruche&nbsp;» dans de nombreuses langues anciennes. Et dans <strong>rūsc</strong>, il y a évidemment le <strong>R</strong> de Raquel et le <strong>C</strong> de Chris… mais avant tout <strong>ūs</strong>&nbsp;: nous tous, ceux qui donnent et ceux qui reçoivent, ceux qui partagent un geste et transmettent une expérience — mais surtout, ceux qui osent.</p>
            <p style={muted}>Aujourd&rsquo;hui, on y pratique la céramique, le modelage, la tapisserie… Demain, d&rsquo;autres disciplines encore. La programmation évolue au rythme des rencontres&nbsp;; pour la découvrir, suivez-nous ici ou sur Instagram.</p>
            <p style={muted}>Au cœur de rūsc, il y a de l&rsquo;audace&nbsp;: celle de créer sans retenue. Il y a aussi de la soif&nbsp;: celle d&rsquo;apprendre, de s&rsquo;exprimer et de transmettre avec intensité. rūsc, c&rsquo;est apprendre, explorer, créer, et laisser une trace dans cet élan partagé.</p>
            <p style={{ ...muted, marginBottom: "34px" }}>Envie de transmettre&nbsp;? Faites une demande pour rejoindre la famille rūsc via notre <a href="#contact" style={{ color: "var(--accent)" }}>formulaire de contact</a>.</p>

            <div style={{ display: "grid", gap: "22px" }}>
              <Bio name="raquel calleja">Après une longue période à l&rsquo;étranger, c&rsquo;est en rentrant en France que Raquel découvre la céramique, une discipline qui deviendra bien plus qu&rsquo;un simple loisir&nbsp;: une véritable passion. Avec un parcours riche et éclectique, elle a d&rsquo;abord évolué dans le marketing, puis dans le management de luxe. Mais c&rsquo;est dans l&rsquo;art de la céramique que Raquel trouve son véritable épanouissement. Fascinée par l&rsquo;équilibre entre rigueur technique et liberté d&rsquo;expression, chaque geste, chaque cuisson, chaque émail est une quête d&rsquo;apprentissage et de perfection. Au sein de rūsc, elle partage cette passion avec une énergie contagieuse.</Bio>
              <Bio name="christopher kerr">Écossais d&rsquo;origine, Chris vit à Chamonix depuis plus de 15 ans. Après une carrière dans l&rsquo;immobilier et la gestion d&rsquo;entreprise, il découvre la céramique et s&rsquo;y investit pleinement, devenant le tout premier élève de Raquel. Aujourd&rsquo;hui partenaire essentiel de rūsc, il anime les séances du mercredi soir avec enthousiasme et bienveillance, et développe ses propres créations. Sa pédagogie naturelle et son dynamisme font de lui une figure incontournable de l&rsquo;atelier.</Bio>
              <Bio name="anaïs lejeune">Formée en tapisserie d&rsquo;ameublement depuis plus de 10 ans et passionnée par la décoration, Anaïs combine ces deux expertises pour donner vie à des créations uniques. Travailler avec ses mains, au milieu des odeurs de toile de jute et de crin, est bien plus qu&rsquo;un métier&nbsp;: c&rsquo;est une véritable passion. Au sein de rūsc, elle anime avec enthousiasme les ateliers de tapisserie pour transmettre son savoir-faire.</Bio>
              <Bio name="élodie lecont">Élodie découvre très tôt l&rsquo;artisanat et se laisse séduire par la magie de la terre, matière tactile et vivante. Elle rejoint l&rsquo;équipe rūsc pour partager à son tour son amour du geste et de la création.</Bio>
            </div>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <SectionHead title="contact" sub="Où nous trouver" />
          <figure className="contact-ph"><Image src={contact} alt="L’atelier rūsc" /></figure>
          <div className="info">
            <div><h3>L&rsquo;atelier</h3><p>99 Promenade Marie Paradis<br />74400 Chamonix-Mont-Blanc</p></div>
            <div><h3>Ouverture au public</h3><p>Du lundi au vendredi<br />14h – 18h</p></div>
            <div><h3>Nous joindre</h3><p><a href={`mailto:${EMAIL}`}>{EMAIL}</a><br /><a href={PHONE_HREF}>{PHONE}</a><br /><a href={INSTAGRAM} target="_blank" rel="noopener">@studiorusc</a></p></div>
          </div>
          <ContactForm
            placeholders={{ firstName: "Prénom", lastName: "Nom", email: "Email", phone: "Téléphone", message: "Votre message" }}
            subjects={{
              placeholder: "Objet…",
              options: ["Ateliers", "Devenir membre", "Stages", "Résidence d’artiste", "Location d’espace", "Autre"],
            }}
            send="Envoyer"
            sent="Merci — votre message est envoyé."
            mail={{ firstName: "Prénom : ", lastName: "Nom : ", email: "Email : ", phone: "Tél : " }}
          />
        </div>
      </section>

      <Footer
        address="99 Promenade Marie Paradis · 74400 Chamonix-Mont-Blanc"
        hours="Ouverture au public : du lundi au vendredi, 14h – 18h"
        terms={{ href: "/conditions/", label: "Conditions générales & annulation" }}
        copy="© rūsc — tous droits réservés"
      />
    </>
  );
}
