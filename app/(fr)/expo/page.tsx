import type { Metadata } from "next";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Expo — expositions à l'atelier rūsc, Chamonix",
  description:
    "Les expositions à l'atelier rūsc, Chamonix : en ce moment, à venir, et les expositions passées.",
  alternates: { canonical: "/expo/", languages: { fr: "/expo/", en: "/en/expo/" } },
};

// Contenu vivant : remplir ces listes au fil des expositions.
const NOW: { artist: string; title: string; note?: string }[] = [];
const SOON: { artist: string; title: string; when?: string }[] = [];
const PAST: { artist: string; title: string }[] = [];

function Block({ heading, items, empty }: { heading: string; items: { artist: string; title: string; meta?: string }[]; empty: string }) {
  return (
    <div style={{ maxWidth: "760px", margin: "0 auto 34px" }}>
      <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>{heading}</h2>
      {items.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "15.5px" }}>{empty}</p>
      ) : (
        <div className="grid">
          {items.map((it, i) => (
            <article className="card" key={i}>
              <h3>{it.title}</h3>
              <p className="k" style={{ marginTop: 0 }}>{it.artist}</p>
              {it.meta ? <p style={{ color: "var(--muted)" }}>{it.meta}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Expo() {
  return (
    <SitePage lang="fr" page="expo" title="expo" sub={<>« dare art » — un lieu ouvert</>}>
      <Block
        heading="en ce moment"
        empty="Aucune exposition en cours pour le moment — revenez bientôt."
        items={NOW.map((x) => ({ artist: x.artist, title: x.title, meta: x.note }))}
      />
      <Block
        heading="à venir"
        empty="La prochaine programmation arrive — suivez-nous sur Instagram."
        items={SOON.map((x) => ({ artist: x.artist, title: x.title, meta: x.when }))}
      />
      <Block
        heading="expositions passées"
        empty="Les archives s'écrivent ici, exposition après exposition."
        items={PAST.map((x) => ({ artist: x.artist, title: x.title }))}
      />
    </SitePage>
  );
}
