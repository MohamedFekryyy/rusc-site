import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import residence from "@/assets/photos/residence-o.jpg";

export const metadata: Metadata = {
  title: "Artist residency — rūsc, Chamonix",
  description:
    "Artist residency at the rūsc studio, Chamonix: artisans, painters, visual artists, photographers. Tailor-made programme, support up to the opening, minimum one month.",
  alternates: { canonical: "/en/residence/", languages: { fr: "/residence/", en: "/en/residence/" } },
};

export default function Residence() {
  return (
    <SitePage lang="en" page="residence" title="artist residency" sub="Tailor-made programme">
      <div className="feature">
        <div className="txt">
          <h2>a place to express yourself</h2>
          <p>Artisans, painters, visual artists, photographers… Looking for a place to express yourself? Need specific pottery equipment? Short of inspiration? This tailor-made programme is for you.</p>
          <p>We support you through your personal project up to the opening day, when your work is presented at the studio.</p>
          <p><strong>Residencies last a minimum of one month.</strong></p>
          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
            <a className="btn" href="/en/contact/">Apply</a>
          </div>
        </div>
        <div className="art-stack">
          <Image src={residence} alt="Artist residency at the rūsc studio" />
        </div>
      </div>
    </SitePage>
  );
}
