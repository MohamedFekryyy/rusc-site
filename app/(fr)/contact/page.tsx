import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import ContactForm from "@/components/ContactForm";
import { EMAIL, INSTAGRAM, INSTAGRAM_HANDLE, PHONE, PHONE_HREF } from "@/lib/site";
import contact from "@/assets/photos/contact-o.webp";

export const metadata: Metadata = {
  title: "Contact — atelier rūsc, Chamonix",
  description:
    "Contactez l'atelier de céramique rūsc, 99 Promenade Marie Paradis, 74400 Chamonix-Mont-Blanc. Ouvert du lundi au vendredi, 14h – 18h.",
  alternates: { canonical: "/contact/", languages: { fr: "/contact/", en: "/en/contact/" } },
};

export default function Contact() {
  return (
    <SitePage lang="fr" page="contact" title="contact" sub={<>Où nous trouver</>}>
      <figure className="contact-ph"><Image src={contact} alt="L’atelier rūsc" /></figure>
      <div className="info">
        <div><h3>L&rsquo;atelier</h3><p>99 Promenade Marie Paradis<br />74400 Chamonix-Mont-Blanc</p></div>
        <div><h3>Ouverture au public</h3><p>Du lundi au vendredi<br />14h – 18h</p></div>
        <div>
          <h3>Nous joindre</h3>
          <p className="contact-links">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a href={PHONE_HREF}>{PHONE}</a>
            <a href={INSTAGRAM} target="_blank" rel="noopener">{INSTAGRAM_HANDLE}</a>
          </p>
        </div>
      </div>
      <ContactForm
        placeholders={{ firstName: "Prénom", lastName: "Nom", email: "Email", phone: "Téléphone", message: "Votre message" }}
        subjects={{
          placeholder: "Objet…",
          options: ["Ateliers", "Devenir membre", "Stages", "Résidence d’artiste", "Privatisation", "Autre"],
        }}
        send="Envoyer"
        sent="Merci — votre message est envoyé."
        mail={{ firstName: "Prénom : ", lastName: "Nom : ", email: "Email : ", phone: "Tél : " }}
      />
    </SitePage>
  );
}
