import type { Metadata } from "next";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Privatisation — team building, EVJF, anniversaires · rūsc Chamonix",
  description:
    "Privatisez l'atelier rūsc pour un team building, un enterrement de vie de jeune fille, un anniversaire ou un dîner à thème. Demi-journée, matériel fourni, sur devis.",
  alternates: { canonical: "/privatisation/", languages: { fr: "/privatisation/", en: "/en/privatisation/" } },
};

export default function Privatisation() {
  return (
    <SitePage lang="fr" page="privatisation" title="privatisation" sub={<>Team building · EVJF · anniversaires</>}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ fontSize: "15.5px" }}><strong>Team building, enterrement de vie de jeune fille, anniversaires, dîners à thème</strong>, ateliers créatifs, expression corporelle, expositions… Privatisez l&rsquo;espace le temps d&rsquo;une demi-journée et créez votre propre pièce.</p>
        <p style={{ fontSize: "15.5px" }}>Au tour ou à la plaque, tout le matériel est mis à votre disposition pour partager un moment ludique et convivial, encadré par notre équipe.</p>
        <p style={{ fontSize: "15.5px" }}>Vous pouvez aussi privatiser l&rsquo;espace <strong>hors équipement céramique</strong>&nbsp;: vous bénéficiez alors d&rsquo;une cuisine équipée et d&rsquo;un espace de 60&nbsp;m² modulable — idéal pour un événement d&rsquo;entreprise ou une réception privée.</p>
        <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
          <a className="btn" href="/contact/">Demander un devis</a>
        </div>
      </div>
    </SitePage>
  );
}
