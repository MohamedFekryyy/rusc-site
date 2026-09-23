import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import AuthForm from "@/components/AuthForm";

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
      <AuthForm
        title="connexion"
        subtitle="Votre espace rūsc"
        signInTitle="Connexion"
        signUpTitle="Inscription"
        name="Nom complet"
        email="Email"
        password="Mot de passe (8 caractères minimum)"
        stayLoggedIn="Rester connecté·e"
        signIn="Se connecter"
        signUp="Créer mon compte"
        switchToSignUp="Créer un compte"
        switchToSignIn="Se connecter"
        haveAccount="Déjà un compte ?"
        noAccount="Pas encore de compte ?"
        errorGeneric="Une erreur est survenue, veuillez réessayer."
        preview="Le service de connexion sera bientôt disponible — cet écran est en préparation."
      />
    </SitePage>
  );
}
