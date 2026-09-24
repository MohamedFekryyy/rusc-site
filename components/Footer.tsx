import Image from "next/image";
import logoWhite from "@/assets/logo-rusc-white.webp";
import { TERMS, type Lang } from "@/lib/routes";
import { EMAIL, INSTAGRAM, INSTAGRAM_HANDLE, PHONE, PHONE_HREF } from "@/lib/site";

const TEXT = {
  fr: {
    address: "99 Promenade Marie Paradis · 74400 Chamonix-Mont-Blanc",
    hours: "Ouverture au public : du lundi au vendredi, 14h – 18h",
    terms: "Conditions générales & annulation",
    copy: "© rūsc — tous droits réservés",
  },
  en: {
    address: "99 Promenade Marie Paradis · 74400 Chamonix-Mont-Blanc · France",
    hours: "Open to the public: Monday to Friday, 2pm – 6pm",
    terms: "Terms & cancellation",
    copy: "© rūsc — all rights reserved",
  },
};

export default function Footer({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  return (
    <footer>
      <div className="word">
        <Image
          src={logoWhite}
          alt="rūsc"
          style={{ height: "44px", width: "auto", display: "inline-block" }}
        />
      </div>
      <address>
        {t.address}<br />
        {t.hours}<br /><br />
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · <a href={PHONE_HREF}>{PHONE}</a><br />
        <a href={INSTAGRAM}>{INSTAGRAM_HANDLE}</a>
      </address>
      <p style={{ marginTop: "10px" }}>
        {/* Plain <a>: the terms page loads its own stylesheet. */}
        <a href={TERMS[lang]}>{t.terms}</a>
      </p>
      <p className="copy">{t.copy}</p>
    </footer>
  );
}
