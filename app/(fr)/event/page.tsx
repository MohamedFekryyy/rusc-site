import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import videDressing from "@/assets/photos/event-vide-dressing-o.jpg";
import potAndWine from "@/assets/photos/event-pot-and-wine-o.jpg";

export const metadata: Metadata = {
  title: "rūsc event — événements à l'atelier · rūsc Chamonix",
  description:
    "Les événements de l'atelier rūsc à Chamonix : vide dressing, pot & wine, expositions. Passé, présent et à venir.",
  alternates: { canonical: "/event/", languages: { fr: "/event/", en: "/en/event/" } },
};

export default function Event() {
  return (
    <SitePage lang="fr" page="event" title="rūsc event" sub={<>Passé · présent · futur</>}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "15.5px", maxWidth: "720px", margin: "0 auto 40px" }}>
          Vide dressing, pot &amp; wine, expositions… Les événements qui font vivre l&rsquo;atelier, à Chamonix.
        </p>

        <div className="feature" style={{ marginBottom: "48px" }}>
          <div className="txt">
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>À venir</p>
            <h2>rūsc pot &amp; wine</h2>
            <p>Une soirée apéro modelage : la terre d&rsquo;un côté, un verre de l&rsquo;autre. Repartez avec votre pièce et le sourire.</p>
            <p><strong>Vendredi 9 octobre · 18h – 20h30</strong></p>
            <p>75 € · apéro et modelage inclus.</p>
            <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
              <BookingButton lang="fr" workshop="pot-and-wine" tone="guest">Je réserve</BookingButton>
            </div>
          </div>
          <div className="art-stack">
            <Image src={potAndWine} alt="rūsc pot & wine — apéro modelage" />
          </div>
        </div>

        <div className="feature">
          <div className="txt">
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>Passé</p>
            <h2>vide dressing</h2>
            <p>Deux jours pour chiner, échanger et repartir avec de belles pièces. En collaboration avec Rove Girls.</p>
            <p><strong>19 &amp; 20 septembre · 9h – 19h</strong></p>
            <p>Vêtements, chaussures, accessoires, céramique, outdoor, ski / snowboard.</p>
          </div>
          <div className="art-stack">
            <Image src={videDressing} alt="Vide dressing rūsc × Rove Girls, Chamonix" />
          </div>
        </div>
      </div>
    </SitePage>
  );
}
