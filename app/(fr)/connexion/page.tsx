import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import AccountArea from "@/components/AccountArea";

export const metadata: Metadata = {
  title: "Connexion — espace client rūsc, Chamonix",
  description:
    "Créez votre compte ou connectez-vous à votre espace rūsc. Suivez vos réservations, vos carnets et votre statut membre.",
  alternates: { canonical: "/connexion/", languages: { fr: "/connexion/", en: "/en/login/" } },
  robots: { index: false },
};

export default function Connexion() {
  return (
    <SitePage lang="fr" page="connexion" title="connexion" sub="Votre espace rūsc">
      <AccountArea lang="fr" />
    </SitePage>
  );
}
