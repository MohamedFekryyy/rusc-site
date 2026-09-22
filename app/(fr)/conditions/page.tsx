import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { EMAIL, PHONE, PHONE_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales & annulation — rūsc",
  description:
    "Conditions générales de réservation et politique d'annulation de l'atelier de céramique rūsc, Chamonix.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/conditions/" },
};

export default function Conditions() {
  return (
    <LegalPage
      home="/"
      back="Retour au site"
      address="99 Promenade Marie Paradis · 74400 Chamonix-Mont-Blanc"
      copy="© rūsc — tous droits réservés"
    >
      <h1>Conditions générales</h1>
      <p className="sub">Réservation &amp; annulation</p>

      <h2>réservation</h2>
      <p>La réservation des ateliers, des stages et des créneaux d&rsquo;atelier libre se fait en ligne. Les places sont limitées afin de préserver la qualité et l&rsquo;attention donnée à chaque participant.</p>
      <p>Le paiement est effectué en ligne au moment de la réservation.</p>

      <h2>report &amp; annulation</h2>
      <div className="note">
        <p><strong>Annulation au moins 24&nbsp;heures avant le cours</strong> — 50&nbsp;% du montant vous est remboursé.</p>
        <p><strong>Annulation moins de 24&nbsp;heures avant le cours</strong> — aucun remboursement.</p>
        <p>Aucun remboursement partiel en dehors de ces conditions.</p>
      </div>

      <h2>abonnements et carnets</h2>
      <p>Tous les abonnements et carnets sont valables <strong>un an</strong> à compter de leur date d&rsquo;achat.</p>

      <h2>adhésion membre</h2>
      <p>L&rsquo;adhésion annuelle (50&nbsp;€) est réservée aux élèves ayant suivi au minimum deux heures de cours à rūsc et bénéficié d&rsquo;une présentation du fonctionnement de l&rsquo;atelier. Elle donne accès aux créneaux d&rsquo;atelier libre.</p>
      <p>Si ces conditions ne sont pas remplies, nous nous réservons le droit de refuser l&rsquo;accès.</p>

      <h2>cuissons</h2>
      <p>Les cuissons des pièces et l&rsquo;utilisation des fours haute température sont exclusivement gérées par l&rsquo;équipe de rūsc. Les pièces peuvent être cuites pour un montant de 6&nbsp;€ par pièce, à régler avant la cuisson.</p>

      <h2>bons cadeaux</h2>
      <p>Nos bons cadeaux sont valables sur l&rsquo;ensemble des ateliers, pour une durée d&rsquo;un an.</p>

      <h2>contact</h2>
      <p>Pour toute question : <a href={`mailto:${EMAIL}`}>{EMAIL}</a> — <a href={PHONE_HREF}>{PHONE}</a>.</p>
    </LegalPage>
  );
}
