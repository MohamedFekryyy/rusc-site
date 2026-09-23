import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import { rateRow } from "@/components/ui";
import drawing from "@/assets/dessin-sylwia.webp";

export const metadata: Metadata = {
  title: "Espace membre — ateliers libres rūsc, Chamonix",
  description:
    "Les ateliers libres rūsc : un espace professionnel équipé, en autonomie, réservé aux membres. Adhésion 50 €/an, tarifs préférentiels et accès à l'atelier libre.",
  alternates: { canonical: "/membres/", languages: { fr: "/membres/", en: "/en/membres/" } },
};

export default function Membres() {
  return (
    <SitePage lang="fr" page="membres" title="espace membre" sub="Ateliers libres">
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
          <p><strong>Cuissons et fours&nbsp;:</strong> les cuissons des pièces et l&rsquo;utilisation des fours haute température (jusqu&rsquo;à 1280&nbsp;°C) sont exclusivement gérées par l&rsquo;équipe de rūsc. Retrouvez le détail des tarifs sur la page <a href="/cuisson/">Cuisson</a>.</p>
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
            <a className="btn ghost" href="/reserver/">Réserver un créneau</a>
          </div>
        </div>
        <div className="art-stack">
          <Image className="drawing" src={drawing} alt="Dessin au trait de Sylwia — main, bouteilles, chaise" />
        </div>
      </div>
    </SitePage>
  );
}
