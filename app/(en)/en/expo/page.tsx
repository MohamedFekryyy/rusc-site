import type { Metadata } from "next";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Exhibitions — at the rūsc studio, Chamonix",
  description: "Exhibitions at the rūsc studio, Chamonix: now on, coming soon, and past exhibitions.",
  alternates: { canonical: "/en/expo/", languages: { fr: "/expo/", en: "/en/expo/" } },
};

// Living content: fill these lists as exhibitions come and go.
const NOW: { artist: string; title: string; meta?: string }[] = [];
const SOON: { artist: string; title: string; meta?: string }[] = [];
const PAST: { artist: string; title: string; meta?: string }[] = [];

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
    <SitePage lang="en" page="expo" title="exhibitions" sub="“dare art” — an open place">
      <Block heading="now on" empty="No exhibition running right now — check back soon." items={NOW} />
      <Block heading="coming soon" empty="The next programme is on its way — follow us on Instagram." items={SOON} />
      <Block heading="past exhibitions" empty="The archive is written here, exhibition after exhibition." items={PAST} />
    </SitePage>
  );
}
