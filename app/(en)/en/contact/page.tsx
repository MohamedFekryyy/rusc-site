import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import ContactForm from "@/components/ContactForm";
import { EMAIL, INSTAGRAM, PHONE, PHONE_HREF } from "@/lib/site";
import contact from "@/assets/photos/contact-o.webp";

export const metadata: Metadata = {
  title: "Contact — rūsc studio, Chamonix",
  description:
    "Get in touch with the rūsc ceramics studio, 99 Promenade Marie Paradis, 74400 Chamonix-Mont-Blanc. Open Monday to Friday, 2pm – 6pm.",
  alternates: { canonical: "/en/contact/", languages: { fr: "/contact/", en: "/en/contact/" } },
};

export default function Contact() {
  return (
    <SitePage lang="en" page="contact" title="contact" sub="Where to find us">
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
    </SitePage>
  );
}
