import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import residence from "@/assets/photos/residence-o.jpg";

export const metadata: Metadata = {
  title: "Résidence d'artiste — rūsc, Chamonix",
  description:
    "Résidence d'artiste à l'atelier rūsc, Chamonix : artisans, peintres, plasticiens, photographes. Formule sur mesure, accompagnement jusqu'à l'inauguration, durée minimale d'un mois.",
  alternates: { canonical: "/residence/", languages: { fr: "/residence/", en: "/en/residence/" } },
};

export default function Residence() {
  return (
    <SitePage lang="fr" page="residence" title="résidence d&rsquo;artiste" sub={<>Formule sur mesure</>}>
      <div className="feature">
        <div className="txt">
          <h2>un lieu pour vous exprimer</h2>
          <p>Artisans, artistes peintres, plasticiens, photographes… Vous cherchez un lieu pour vous exprimer&nbsp;? Vous avez besoin de matériel ou d&rsquo;un équipement spécifique à la poterie&nbsp;? L&rsquo;inspiration vous manque&nbsp;? Cette formule sur mesure est pour vous.</p>
          <p>Nous vous encadrons dans votre projet personnel jusqu&rsquo;au jour de l&rsquo;inauguration, où votre œuvre sera présentée à l&rsquo;atelier.</p>
          <p><strong>Les résidences sont d&rsquo;une durée minimale d&rsquo;un mois.</strong></p>
          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
            <a className="btn" href="/contact/">Candidater</a>
          </div>
        </div>
        <div className="art-stack">
          <Image src={residence} alt="Résidence d'artiste à l'atelier rūsc" />
        </div>
      </div>
    </SitePage>
  );
}
