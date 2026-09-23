import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import { rateRow } from "@/components/ui";

export const metadata: Metadata = {
  title: "La cuisson — double cuisson, délais, tarifs · rūsc Chamonix",
  description:
    "Comment fonctionne la cuisson à l'atelier rūsc : double cuisson (dégourdi 980 °C, cuisson finale 1280 °C), délais, rétrécissement, et tarifs par pièce (membres et non-membres).",
  alternates: { canonical: "/cuisson/", languages: { fr: "/cuisson/", en: "/en/cuisson/" } },
};

export default function Cuisson() {
  return (
    <SitePage lang="fr" page="cuisson" title="la cuisson" sub={<>Du cours à la pièce finie</>}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>pourquoi votre pièce ne peut pas partir le jour même</h3>
        <p style={{ fontSize: "15.5px" }}>Votre pièce n&rsquo;est pas terminée à la fin du cours — elle commence seulement son parcours. Deux passages au four sont nécessaires, et entre les deux, plusieurs étapes.</p>
        <p style={{ fontSize: "15.5px" }}><strong>Le dégourdi — 980&nbsp;°C.</strong> Une première cuisson lente qui élimine toute l&rsquo;eau contenue dans la terre et rend la pièce solide et poreuse. C&rsquo;est cette étape qui permet ensuite de l&rsquo;émailler sans qu&rsquo;elle s&rsquo;effondre ou se brise.</p>
        <p style={{ fontSize: "15.5px" }}><strong>L&rsquo;émail, puis la cuisson finale — 1280&nbsp;°C.</strong> La pièce est émaillée, séchée, puis enfournée une seconde fois à très haute température. C&rsquo;est là que l&rsquo;émail fond, vitrifie et devient cette surface lisse et lumineuse. Grès et porcelaine exigent cette température pour être durables.</p>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>pourquoi le temps compte</h3>
        <ul style={{ paddingLeft: "20px", fontSize: "15.5px", lineHeight: 1.6 }}>
          <li style={{ marginBottom: "10px" }}><strong>Une pièce humide peut exploser au four.</strong> En montant en température, l&rsquo;eau qu&rsquo;elle contient se transforme en vapeur&nbsp;; la pression monte et la terre éclate de l&rsquo;intérieur. Les pièces épaisses, surtout, doivent être parfaitement sèches avant d&rsquo;être enfournées. Une bulle d&rsquo;air n&rsquo;explose pas en soi — mais elle emprisonne l&rsquo;humidité, et c&rsquo;est elle qui fait céder la pièce.</li>
          <li style={{ marginBottom: "10px" }}><strong>Le délai&nbsp;: comptez entre 2 semaines et 2 mois</strong>, selon la pièce, la saison et le rythme des fournées. Nos fours sont électriques&nbsp;: on ne les allume pas pour une seule pièce. On attend donc d&rsquo;avoir de quoi remplir une fournée avant de cuire — c&rsquo;est aussi ce qui explique le délai.</li>
          <li><strong>La terre travaille&nbsp;:</strong> la pièce rétrécit au séchage et à la cuisson — environ 10&nbsp;% pour le grès, jusqu&rsquo;à 20&nbsp;% pour la porcelaine. Ce que vous emportez n&rsquo;aura donc pas tout à fait la taille de ce que vous avez façonné.</li>
        </ul>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>les terres façonnées à l&rsquo;atelier uniquement</h3>
        <p style={{ fontSize: "15.5px" }}>Nous ne cuisons <strong>que les pièces façonnées avec des terres achetées à l&rsquo;atelier</strong>. Chaque terre possède sa propre <strong>courbe de température</strong>&nbsp;: sa composition (argiles, silice, fondants) détermine la plage exacte de cuisson, le moment où l&rsquo;émail se forme et la température de vitrification. Une terre d&rsquo;origine inconnue peut fondre, gonfler, éclater — ou contaminer la fournée entière, nos émaux et nos étagères. En cuisant une terre que nous ne connaissons pas, nous risquerions d&rsquo;abîmer à la fois votre pièce, celles des autres, et le four. C&rsquo;est pourquoi nous garantissons la réussite de vos cuissons en travaillant exclusivement avec nos terres.</p>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>quelques repères</h3>
        <div style={{ display: "grid", gap: "14px" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Engobe ou émail&nbsp;?</p>
            <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>L&rsquo;engobe est une terre colorée liquide, appliquée sur la pièce crue — il fait corps avec elle. L&rsquo;émail est un enduit vitrifiable, qui fond et devient cette surface lisse et brillante. L&rsquo;un décore, l&rsquo;autre protège.</p>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>La matière et la chaleur</p>
            <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>La silice — composant du sable et de la roche — apporte la dureté et résiste à la chaleur. À 573&nbsp;°C, le quartz change brusquement de structure et de volume&nbsp;: c&rsquo;est pourquoi les montées et descentes en température sont lentes autour de ce palier, pour éviter les fissures.</p>
          </div>
        </div>

        <p style={{ fontSize: "14.5px", color: "var(--muted)", marginTop: "22px" }}>Photos de l&rsquo;enfournement et de l&rsquo;ouverture du four à venir.</p>
      </div>

      <details style={{ maxWidth: "760px", margin: "26px auto 0", border: "1px solid var(--line)", borderRadius: "10px", padding: "4px 18px" }}>
        <summary style={{ cursor: "pointer", padding: "14px 0", fontWeight: 600, listStyle: "none" }}>Voir le détail des tarifs de cuisson</summary>
        <div style={{ paddingBottom: "16px" }}>
          <p style={{ fontSize: "15px", color: "var(--muted)", margin: "6px 0 12px" }}>La cuisson est gérée par l&rsquo;équipe rūsc. Chaque pièce reçoit un émail transparent posé par nos soins. Le tarif dépend de la matière, de la taille et de l&rsquo;émail choisi.</p>
          <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "10px 0 6px" }}>Non-membres</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={rateRow}><span>Enfant</span><span><strong>6&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Grès</span><span><strong>8&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Grès — engobe petit</span><span><strong>10&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Grès — engobe ou neutre grand</span><span><strong>14&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Grès — effet (petit ou grand)</span><span><strong>15&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Porcelaine</span><span><strong>12&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Porcelaine — engobe petit</span><span><strong>14&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Porcelaine — engobe ou neutre grand</span><span><strong>18&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Porcelaine — effet (petit ou grand)</span><span><strong>17&nbsp;€</strong></span></li>
          </ul>
          <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "18px 0 6px" }}>Membres</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={rateRow}><span>Petit modèle</span><span><strong>7&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Grand modèle et assiette</span><span><strong>10&nbsp;€</strong></span></li>
            <li style={rateRow}><span>Enfant</span><span><strong>6&nbsp;€</strong></span></li>
          </ul>
          <p style={{ marginTop: "14px", fontSize: "14.5px", color: "var(--muted)" }}>Émail transparent inclus dans chaque cuisson. Les cuissons sont réalisées par l&rsquo;équipe rūsc&nbsp;; aucune cuisson n&rsquo;est laissée aux élèves.</p>
        </div>
      </details>
    </SitePage>
  );
}
