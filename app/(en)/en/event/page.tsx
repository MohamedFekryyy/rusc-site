import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import videDressing from "@/assets/photos/event-vide-dressing-o.jpg";
import potAndWine from "@/assets/photos/event-pot-and-wine-o.jpg";

export const metadata: Metadata = {
  title: "rūsc event — studio events · rūsc Chamonix",
  description:
    "Events at rūsc studio in Chamonix: closet sale, pot & wine, exhibitions. Past, present and upcoming.",
  alternates: { canonical: "/en/event/", languages: { fr: "/event/", en: "/en/event/" } },
};

export default function Event() {
  return (
    <SitePage lang="en" page="event" title="rūsc event" sub={<>Past · present · future</>}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "15.5px", maxWidth: "720px", margin: "0 auto 40px" }}>
          Closet sale, pot &amp; wine, exhibitions… The events that bring the studio to life, in Chamonix.
        </p>

        <div className="feature" style={{ marginBottom: "48px" }}>
          <div className="txt">
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>Upcoming</p>
            <h2>rūsc pot &amp; wine</h2>
            <p>An evening of hand-building with a drink in hand — clay on one side, a glass on the other. Leave with your piece and a smile.</p>
            <p><strong>Friday 9 October · 6pm – 8.30pm</strong></p>
            <p>€75 · drinks and hand-building included.</p>
            <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
              <BookingButton lang="en" workshop="pot-and-wine" tone="guest">Book now</BookingButton>
            </div>
          </div>
          <div className="art-stack">
            <Image src={potAndWine} alt="rūsc pot & wine — drinks and hand-building" />
          </div>
        </div>

        <div className="feature">
          <div className="txt">
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>Past</p>
            <h2>closet sale</h2>
            <p>Two days to browse, swap and leave with lovely pieces. In collaboration with Rove Girls.</p>
            <p><strong>19 &amp; 20 September · 9am – 7pm</strong></p>
            <p>Clothes, shoes, accessories, ceramics, outdoor gear, ski / snowboard.</p>
          </div>
          <div className="art-stack">
            <Image src={videDressing} alt="Closet sale rūsc × Rove Girls, Chamonix" />
          </div>
        </div>
      </div>
    </SitePage>
  );
}
