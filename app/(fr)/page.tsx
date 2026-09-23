import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import BookingButton from "@/components/BookingButton";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import SectionHead from "@/components/SectionHead";
import { EMAIL, INSTAGRAM, PHONE, PHONE_HREF, SITE_URL, STUDIO_JSON_LD } from "@/lib/site";
import logo from "@/assets/logo-rusc.webp";
import drawing from "@/assets/dessin-sylwia.webp";
import hero from "@/assets/photos/hero-o.jpg";
import ceramique2h from "@/assets/photos/ceramique-2h-o.png";
import modelage2h from "@/assets/photos/modelage-2h-o.jpg";
import enfant from "@/assets/photos/enfant2-o.jpg";
import residence from "@/assets/photos/residence-o.jpg";
import ceramique1j from "@/assets/photos/ceramique-1j-o.jpg";
import ceramique2j from "@/assets/photos/ceramique-2j-o.jpg";
import porcelaine from "@/assets/photos/porcelaine-o.jpg";
import tapisserie from "@/assets/photos/tapisserie-o.jpg";
import logoWhite from "@/assets/logo-rusc.webp";
import mv3h from "@/assets/photos/model-vivant-3h-o.jpg";
import usRaquel from "@/assets/photos/us-raquel-o.webp";
import usChris from "@/assets/photos/us-chris-o.webp";
import contact from "@/assets/photos/contact-o.webp";
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

      <Header lang="fr" page="home" />

      <section className="hero wrap">
        <p className="eyebrow">Atelier de céramique · Chamonix</p>
        <h1>oser l&rsquo;art</h1>
        <span className="rule"></span>
        <p>Chez rūsc, nos ateliers sont ouverts à toutes et à tous, sans prérequis. Débutants curieux, amateurs en quête d’un moment créatif, ou passionnés souhaitant approfondir leur pratique : chacun trouve sa place.</p>
        <div className="actions">
          <a className="btn" href="#reservation">Réserver un atelier</a>
          <a className="btn ghost" href="#cours">Voir la programmation</a>
        </div>
      </section>

      <figure className="hero-photo">
        <Image src={hero} alt="Mains façonnant la terre à l’atelier rūsc, Chamonix" loading="eager" fetchPriority="high" />
      </figure>

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
                  <li style={rateRow}><span>Atelier libre — cours à l&rsquo;unité</span><span><strong>22,50&nbsp;€</strong> / heure</span></li>
                  <li style={rateRow}><span>Atelier libre — carnet 10&nbsp;h</span><span><strong>15&nbsp;€</strong> / heure · valable 6 mois</span></li>
                  <li style={rateRow}><span>Atelier libre — carnet 20&nbsp;h</span><span><strong>12&nbsp;€</strong> / heure · valable 1 an</span></li>
                </ul>
                <p style={{ marginTop: "14px", fontSize: "15px", color: "var(--muted)" }}>Les membres bénéficient de <strong>–10&nbsp;%</strong> sur le cours de 2&nbsp;heures (tournage ou modelage), le décor à cru à l&rsquo;heure, le carnet 5 cours et le carnet 10 cours. Avantage strictement personnel&nbsp;: réservé au membre, non transférable. L&rsquo;atelier libre est réservé aux membres.</p>
              </div>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <BookingButton lang="fr" view="catalog">Adhérer</BookingButton>
                <a className="btn ghost" href="#reservation">Réserver un créneau</a>
              </div>
            </div>
            <div className="art-stack">
              <Image className="drawing" src={drawing} alt="Dessin au trait de Sylwia — main, bouteilles, chaise" />
            </div>
          </div>
        </div>
      </section>

      <section id="cours">
        <div className="wrap">
          <SectionHead title="les cours" sub={<>Osez l&rsquo;expérience</>} />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={ceramique2h} alt="Cours de tournage en céramique à rūsc" />
              <p className="k">Cours de 2&nbsp;h</p>
              <h3>tournage 2h</h3>
              <p>Ateliers de tournage en céramique avec un professeur expérimenté qui vous guidera dans vos premiers pas. À votre rythme, sur des cours de 2h vous apprendrez toutes les étapes nécessaires à la réalisation de vos poteries.</p>
              <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€ · Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€ · Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <BookingButton lang="fr" workshop="atelier-ceramique-2h">S&rsquo;inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={modelage2h} alt="Cours de modelage de l’argile à rūsc" />
              <p className="k">Cours de 2&nbsp;h</p>
              <h3>modelage 2h</h3>
              <p>Que vous soyez débutants ou expérimentés, venez vous essayez au modelage et conceptualisez vos propres créations.</p>
              <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€ · Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€ · Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <BookingButton lang="fr" workshop="atelier-modelage-2h">S&rsquo;inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={logoWhite} alt="Décor à cru — rūsc" />
              <p className="k">Cours d&rsquo;1&nbsp;h</p>
              <h3>décor à cru 1h</h3>
              <p>Un cours d&rsquo;une heure dédié au décor à cru, pour personnaliser vos pièces avant la cuisson.</p>
              <p className="price">Cours d&rsquo;1h&nbsp;: 20&nbsp;€ · membre 18&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <details style={{ marginTop: "10px", fontSize: "14.5px" }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Horaires des créneaux</summary>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", color: "var(--muted)" }}>
                  <li>Lundi&nbsp;: 16h – 17h</li>
                  <li>Mardi&nbsp;: 18h30 – 19h30</li>
                  <li>Mercredi&nbsp;: 18h – 19h</li>
                  <li>Jeudi&nbsp;: 17h – 18h</li>
                </ul>
              </details>
              <BookingButton lang="fr">Réserver</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={enfant} alt="Cours enfant à rūsc" />
              <p className="k">Cours de 2&nbsp;h</p>
              <h3>cours enfant 2h</h3>
              <p>Pour les 7–12 ans. Tous les mercredis (hors vacances scolaires). Un temps ludique pour découvrir, façonner et créer.</p>
              <p className="price">Places limitées · réservation conseillée</p>
              <BookingButton lang="fr" workshop="modelage-enfant">Réserver</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={mv3h} alt="Cours de modèle vivant à rūsc" />
              <p className="k">Cours de 3&nbsp;h</p>
              <h3>model vivant 3h</h3>
              <p>Un cours de trois heures autour du modèle vivant&nbsp;: observer, dessiner, façonner d&rsquo;après le corps en mouvement.</p>
              <p className="price">Cours de 3h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€ · Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€ · Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <a className="btn" href="#contact">+ info</a>
            </article>
          </div>
        </div>
      </section>

      <section id="stages">
        <div className="wrap">
          <SectionHead title="stages" sub={<>Immersion · 10h – 17h</>} />
          <div className="grid">
            <article className="card">
              <Image className="thumb" src={ceramique2j} alt="Stage de tournage en grès sur deux jours à rūsc" />
              <p className="k">2 jours</p>
              <h3>céramique 2j</h3>
              <p>Imprégnez-vous du métier de céramiste durant deux journées consécutives. Ouvert à tous, cet atelier vous permet de voir toutes les étapes de la création&nbsp;: du tournage à l’engobage en passant par le tournassage.</p>
              <p className="price">Atelier tournage grès 2 jours&nbsp;: 280&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <BookingButton lang="fr" workshop="atelier-ceramique-2j">S’inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={ceramique1j} alt="Stage de tournage en grès — une journée à rūsc" />
              <p className="k">1 jour</p>
              <h3>céramique 1j</h3>
              <p>Que vous soyez débutant ou dans le cadre d’une reconversion professionnelle, nous vous guiderons afin de passer en revue toutes les étapes nécessaires au tournage d’une pièce en grès.</p>
              <p className="price">Atelier tournage grès&nbsp;: 180&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <BookingButton lang="fr" workshop="atelier-ceramique-1j">S’inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={porcelaine} alt="Stage de tournage en porcelaine à rūsc" />
              <p className="k">10h – 17h</p>
              <h3>porcelaine 1j</h3>
              <p>La porcelaine est une matière singulière&nbsp;: pure, exigeante, lumineuse. Peu d’ateliers permettent de l’aborder. Une fois par mois, nous proposons à nos élèves cette expérience rare&nbsp;: apprivoiser sa fragilité, explorer ses gestes précis et façonner leurs propres pièces au tour.</p>
              <p className="price">Atelier tournage porcelaine&nbsp;: 230&nbsp;€</p>
              <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
              <BookingButton lang="fr" workshop="porcelaine">S’inscrire</BookingButton>
            </article>
            <article className="card">
              <Image className="thumb" src={tapisserie} alt="Stage de tapisserie d’ameublement traditionnelle à rūsc" />
              <p className="k">2 jours</p>
              <h3>tapisserie 2j</h3>
              <p>Pour les débutants ou confirmés, venez apprendre toutes les étapes de la tapisserie d&rsquo;ameublement traditionnelle. Vous pouvez apporter votre projet personnel ou une chaise d&rsquo;école vous sera fournie pour pratiquer.</p>
              <p className="price">Sur demande · nous contacter</p>
              <a className="btn" href="#contact">+ info</a>
            </article>
          </div>
          <div className="head" style={{ marginTop: "52px" }}>
            <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Vous souhaitez offrir l&rsquo;expérience rūsc&nbsp;? Nos bons cadeaux sont valables sur l&rsquo;ensemble des ateliers.</p>
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
                <PriceRow label={<>Cours 2&nbsp;h</>} value={<>50&nbsp;€</>} valueNote={<>membre 45&nbsp;€</>} />
                <PriceRow label="Carnet 5 cours" note="valable 6 mois" value={<>210&nbsp;€</>} valueNote={<>membre 189&nbsp;€</>} />
                <PriceRow label="Carnet 10 cours" note="valable 1 an" value={<>350&nbsp;€</>} valueNote={<>membre 315&nbsp;€</>} />
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
                <PriceRow label={<>Cours à l&rsquo;unité</>} value={<>22,50&nbsp;€</>} valueNote="/ heure" />
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
              <div className="foot"><BookingButton lang="fr" view="gifts">Réserver / offrir</BookingButton></div>
            </article>
          </div>
          <p style={{ textAlign: "center", marginTop: "34px", fontSize: "14.5px", color: "var(--muted)", maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
            Les tarifs sont affichés ici et repris au moment de la réservation. La remise membre de 10&nbsp;% s&rsquo;applique automatiquement dès que votre adhésion est active.
          </p>
        </div>
      </section>

      <section id="cuisson">
        <div className="wrap">
          <SectionHead title="la cuisson" sub={<>Du cours à la pièce finie</>} />
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>pourquoi votre pièce ne peut pas partir le jour même</h3>
            <p style={{ fontSize: "15.5px", color: "var(--ink, inherit)" }}>Votre pièce n&rsquo;est pas terminée à la fin du cours — elle commence seulement son parcours. Deux passages au four sont nécessaires, et entre les deux, plusieurs étapes.</p>
            <p style={{ fontSize: "15.5px" }}><strong>Le dégourdi — 980&nbsp;°C.</strong> Une première cuisson lente qui élimine toute l&rsquo;eau contenue dans la terre et rend la pièce solide et poreuse. C&rsquo;est cette étape qui permet ensuite de l&rsquo;émailler sans qu&rsquo;elle s&rsquo;effondre ou se brise.</p>
            <p style={{ fontSize: "15.5px" }}><strong>L&rsquo;émail, puis la cuisson finale — 1280&nbsp;°C.</strong> La pièce est émaillée, séchée, puis enfournée une seconde fois à très haute température. C&rsquo;est là que l&rsquo;émail fond, vitrifie et devient cette surface lisse et lumineuse. Grès et porcelaine exigent cette température pour être durables.</p>

            <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>pourquoi le temps compte</h3>
            <ul style={{ paddingLeft: "20px", fontSize: "15.5px", lineHeight: 1.6 }}>
              <li style={{ marginBottom: "10px" }}><strong>Une pièce humide peut exploser au four.</strong> En montant en température, l&rsquo;eau qu&rsquo;elle contient se transforme en vapeur&nbsp;; la pression monte et la terre éclate de l&rsquo;intérieur. Les pièces épaisses, surtout, doivent être parfaitement sèches avant d&rsquo;être enfournées. Une bulle d&rsquo;air n&rsquo;explose pas en soi — mais elle emprisonne l&rsquo;humidité, et c&rsquo;est elle qui fait céder la pièce.</li>
              <li style={{ marginBottom: "10px" }}><strong>Le délai&nbsp;: comptez entre 2 semaines et 2 mois</strong>, selon la pièce, la saison et le rythme des fournées. Nos fours sont électriques&nbsp;: on ne les allume pas pour une seule pièce. On attend donc d&rsquo;avoir de quoi remplir une fournée avant de cuire — c&rsquo;est aussi ce qui explique le délai.</li>
              <li><strong>La terre travaille&nbsp;:</strong> la pièce rétrécit au séchage et à la cuisson — environ 10&nbsp;% pour le grès, jusqu&rsquo;à 20&nbsp;% pour la porcelaine. Ce que vous emportez n&rsquo;aura donc pas tout à fait la taille de ce que vous avez façonné.</li>
            </ul>

            <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>quelques repères</h3>
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Engobe ou émail&nbsp;?</p>
                <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>L&rsquo;engobe est une terre colorée liquide, appliquée sur la pièce crue — il fait corps avec elle. L&rsquo;émail est un enduit vitrifiable, qui fond et devient cette surface lisse et brillante. L&rsquo;un décore, l&rsquo;autre protège.</p>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>La matière et la chaleur</p>
                <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>La silice — composant du sable et de la roche — apporte la dureté et résiste à la chaleur. À 573&nbsp;°C, le quartz change brusquement de structure et de volume&nbsp;: c&rsquo;est pourquoi les montées et descentes en température sont lentes autour de ce palier, pour éviter les fissures.</p>
              </div>
            </div>

            <p style={{ fontSize: "14.5px", color: "var(--muted)", marginTop: "22px" }}>Photos de l&rsquo;enfournement et de l&rsquo;ouverture du four à venir.</p>
          </div>

          <details style={{ maxWidth: "760px", margin: "26px auto 0", border: "1px solid var(--line)", borderRadius: "10px", padding: "4px 18px" }}>
            <summary style={{ cursor: "pointer", padding: "14px 0", fontWeight: 600, listStyle: "none" }}>Voir le détail des tarifs de cuisson</summary>
            <div style={{ paddingBottom: "16px" }}>
              <p style={{ fontSize: "15px", color: "var(--muted)", margin: "6px 0 12px" }}>La cuisson est gérée par l&rsquo;équipe rūsc. Chaque pièce reçoit un émail transparent posé par nos soins. Le tarif dépend de la matière, de la taille et de l&rsquo;émail choisi.</p>
              <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "10px 0 6px" }}>Non-membres</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={rateRow}><span>Enfant</span><span><strong>6&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Grès</span><span><strong>8&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Grès — engobe petit</span><span><strong>10&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Grès — engobe ou neutre grand</span><span><strong>14&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Grès — effet (petit ou grand)</span><span><strong>15&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Porcelaine</span><span><strong>12&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Porcelaine — engobe petit</span><span><strong>14&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Porcelaine — engobe ou neutre grand</span><span><strong>18&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Porcelaine — effet (petit ou grand)</span><span><strong>17&nbsp;€</strong></span></li>
              </ul>
              <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "18px 0 6px" }}>Membres</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={rateRow}><span>Petit modèle</span><span><strong>7&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Grand modèle et assiette</span><span><strong>10&nbsp;€</strong></span></li>
                <li style={rateRow}><span>Enfant</span><span><strong>6&nbsp;€</strong></span></li>
              </ul>
              <p style={{ marginTop: "14px", fontSize: "14.5px", color: "var(--muted)" }}>Émail transparent inclus dans chaque cuisson. Les cuissons sont réalisées par l&rsquo;équipe rūsc&nbsp;; aucune cuisson n&rsquo;est laissée aux élèves.</p>
            </div>
          </details>
        </div>
      </section>

      <section id="adhesion">
        <div className="wrap">
          <SectionHead title={<>l&rsquo;adhésion rūsc</>} sub={<>50&nbsp;€ par an</>} />
          <div className="ad-wrap">
            <div>
              <p>L&rsquo;adhésion vous ouvre l&rsquo;atelier libre — un espace professionnel en autonomie, réservé aux membres — et vous fait profiter de <strong>–10&nbsp;%</strong> sur tous les cours et tous les carnets.</p>
              <ul className="ad-list">
                <li>Accès aux ateliers libres (7 tours, outils, matériaux)</li>
                <li><strong>–10&nbsp;%</strong> sur le cours 2&nbsp;h, le décor à cru et les carnets 5 et 10 cours</li>
                <li>Tarif horaire dégressif jusqu&rsquo;à 12&nbsp;€/h en carnet 20&nbsp;h</li>
                <li>Valable 12 mois, à date anniversaire</li>
              </ul>
              <p style={{ fontSize: "14.5px", opacity: 0.85 }}>Avantage strictement personnel&nbsp;: la remise membre est nominative et non transférable. Une adhésion active est requise pour réserver un atelier libre.</p>
            </div>
            <div className="ad-box">
              <p className="num">50&nbsp;€</p>
              <p className="per">Par an</p>
              <BookingButton lang="fr" view="catalog">Adhérer maintenant</BookingButton>
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
          {/* Each card opens the booking page (/reserver/) on that workshop or offer. */}
          <div className="price-grid">
            <LinkCard tag={<>Tournage · cours de 2&nbsp;h</>} title="atelier céramique 2h" unit={<>Cours 50&nbsp;€ · Carnet 5&nbsp;: 210&nbsp;€ · Carnet 10&nbsp;: 350&nbsp;€</>}>
              <BookingButton lang="fr" workshop="atelier-ceramique-2h">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag={<>Modelage · cours de 2&nbsp;h</>} title="atelier modelage 2h" unit={<>Cours 50&nbsp;€ · Carnet 5&nbsp;: 210&nbsp;€ · Carnet 10&nbsp;: 350&nbsp;€</>}>
              <BookingButton lang="fr" workshop="atelier-modelage-2h">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="7–12 ans · chaque mercredi" title="atelier enfant 2h30" unit="Un temps ludique pour découvrir, façonner et créer">
              <BookingButton lang="fr" workshop="modelage-enfant">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Tournage grès · 10h – 17h" title="atelier céramique 1j" unit={<>180&nbsp;€</>}>
              <BookingButton lang="fr" workshop="atelier-ceramique-1j">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Tournage grès · 2 jours" title="atelier céramique 2 jours" unit={<>280&nbsp;€</>}>
              <BookingButton lang="fr" workshop="atelier-ceramique-2j">S&rsquo;inscrire</BookingButton>
            </LinkCard>
            <LinkCard tag="Porcelaine · 10h – 17h" title="atelier porcelaine 1j" unit={<>230&nbsp;€</>}>
              <BookingButton lang="fr" workshop="porcelaine">S&rsquo;inscrire</BookingButton>
            </LinkCard>
          </div>
          <div className="price-grid" style={{ marginTop: "26px" }}>
            <LinkCard tag="Atelier libre · membres" title="réserver un créneau" unit={<>Accès autonome à l&rsquo;espace équipé</>}>
              <BookingButton lang="fr">Réserver</BookingButton>
            </LinkCard>
            <LinkCard tag="Offrir" title="bon cadeau" unit="Valable 1 an pour toute formation ou carnet de cours">
              <BookingButton lang="fr" view="gifts">+ info</BookingButton>
            </LinkCard>
          </div>
        </div>
      </section>

      <section id="privatisation">
        <div className="wrap">
          <SectionHead title="privatisation" sub={<>Sur mesure</>} />
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <p style={{ fontSize: "15.5px" }}>Anniversaire, EVJF, team building, dîner à thème, atelier créatif, expression corporelle, exposition… <strong>Privatisez l&rsquo;espace le temps d&rsquo;une demi-journée</strong> et créez votre propre pièce.</p>
            <p style={{ fontSize: "15.5px" }}>Au tour ou à la plaque, tout le matériel est mis à votre disposition pour partager un moment ludique et convivial.</p>
            <p style={{ fontSize: "15.5px" }}>Vous pouvez aussi privatiser l&rsquo;espace <strong>hors équipement céramique</strong>&nbsp;: vous bénéficiez alors d&rsquo;une cuisine équipée et d&rsquo;un espace de 60&nbsp;m² modulable.</p>
            <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
              <a className="btn" href="#contact">Demander un devis</a>
            </div>
          </div>
        </div>
      </section>

      <section id="residence">
        <div className="wrap">
          <SectionHead title="résidence d&rsquo;artiste" sub={<>Formule sur mesure</>} />
          <div className="feature">
            <div className="txt">
              <h2>un lieu pour vous exprimer</h2>
              <p>Artisans, artistes peintres, plasticiens, photographes… Vous cherchez un lieu pour vous exprimer&nbsp;? Vous avez besoin de matériel ou d&rsquo;un équipement spécifique à la poterie&nbsp;? L&rsquo;inspiration vous manque&nbsp;? Cette formule sur mesure est pour vous.</p>
              <p>Nous vous encadrons dans votre projet personnel jusqu&rsquo;au jour de l&rsquo;inauguration, où votre œuvre sera présentée à l&rsquo;atelier.</p>
              <p><strong>Les résidences sont d&rsquo;une durée minimale d&rsquo;un mois.</strong></p>
              <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
                <a className="btn" href="#contact">Candidater</a>
              </div>
            </div>
            <div className="art-stack">
              <Image src={residence} alt="Résidence d'artiste à l'atelier rūsc" />
            </div>
          </div>
        </div>
      </section>

      <section id="us">
        <div className="wrap">
          <SectionHead title="ūs" sub="« dare art… »" />
          <div className="about-grid">
            <figure className="about-ph"><Image src={usRaquel} alt="Raquel Calleja, cofondatrice de rūsc" /></figure>
            <figure className="about-ph"><Image src={usChris} alt="Chris Kerr, cofondateur de rūsc" /></figure>
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
              <Bio name="anaïs lejeune">Formée en tapisserie d&rsquo;ameublement depuis plus de 10 ans et passionnée par la décoration, Anaïs combine ces deux expertises pour donner vie à des créations uniques. Travailler avec ses mains, au milieu des odeurs de toile de jute et de crin, est bien plus qu&rsquo;un métier&nbsp;: c&rsquo;est une véritable passion. Au sein de rūsc, elle anime avec enthousiasme les ateliers de tapisserie pour transmettre son savoir-faire.</Bio>              <Bio name="élodie lecont">Élodie découvre très tôt l&rsquo;artisanat et se laisse séduire par la magie de la terre, matière tactile et vivante. Elle rejoint l&rsquo;équipe rūsc pour partager à son tour son amour du geste et de la création.</Bio>
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

      <Footer lang="fr" />
    </>
  );
}
