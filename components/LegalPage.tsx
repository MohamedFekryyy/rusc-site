import { ArrowLeft } from "iconsax-reactjs";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Lang } from "@/lib/routes";
import "@/styles/legal.css";

type Props = {
  // Home page of the same language ("/" or "/en/").
  home: string;
  back: string;
  lang: Lang;
  children: ReactNode;
};

// Shell of the terms pages. Reuses the shared <Header> and <Footer> so the
// navbar is identical to every other page (burger, FR/EN, Réserver, Connexion,
// Panier) — no bespoke header here. Only the legal body uses legal.css.
export default function LegalPage({ home, back, lang, children }: Props) {
  return (
    <>
      <Header lang={lang} page="terms" />

      <main className="legal">
        {children}
        <a className="back" href={home} style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
          <ArrowLeft size={14} color="currentColor" aria-hidden />
          {back}
        </a>
      </main>

      <Footer lang={lang} />
    </>
  );
}
