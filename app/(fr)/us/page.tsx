import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import { Bio, muted } from "@/components/ui";
import usRaquel from "@/assets/photos/us-raquel-o.webp";
import usChris from "@/assets/photos/us-chris-o.webp";

export const metadata: Metadata = {
  title: "Ūs — l'atelier rūsc, Chamonix",
  description:
    "Découvrez l'équipe rūsc : Raquel Calleja, Chris Kerr et leurs invités. L'histoire d'un atelier de céramique à Chamonix, entre art, transmission et audace.",
  alternates: { canonical: "/us/", languages: { fr: "/us/", en: "/en/us/" } },
};

export default function Us() {
  return (
    <SitePage lang="fr" page="us" title="ūs" sub="« dare art… »">
      <div className="about-grid">
        <figure className="about-ph"><Image src={usRaquel} alt="Raquel Calleja, cofondatrice de rūsc" /></figure>
        <figure className="about-ph"><Image src={usChris} alt="Chris Kerr, cofondateur de rūsc" /></figure>
      </div>
      <div style={{ maxWidth: "720px", margin: "34px auto 0" }}>
        <p style={muted}>«&nbsp;Dare Art / Osez l&rsquo;art&nbsp;», disait Raquel Calleja. De ce rêve est né <strong>rūsc</strong>&nbsp;: créer à Chamonix un lieu où l&rsquo;art puisse circuler librement, entre effervescence et mémoire.</p>
        <p style={muted}>Raquel s&rsquo;est associée à Chris Kerr pour donner corps à cette vision. Ensemble, ils ont façonné un atelier qui leur ressemble&nbsp;: enraciné dans la céramique, leur base commune, mais ouvert à d&rsquo;autres pratiques invitées.</p>
        <p style={muted}><strong>rūsc</strong> signifie «&nbsp;ruche&nbsp;» dans de nombreuses langues anciennes. Et dans <strong>rūsc</strong>, il y a évidemment le <strong>R</strong> de Raquel et le <strong>C</strong> de Chris… mais avant tout <strong>ūs</strong>&nbsp;: nous tous, ceux qui donnent et ceux qui reçoivent, ceux qui partagent un geste et transmettent une expérience — mais surtout, ceux qui osent.</p>
        <p style={muted}>Aujourd&rsquo;hui, on y pratique la céramique, le modelage, la tapisserie… Demain, d&rsquo;autres disciplines encore. La programmation évolue au rythme des rencontres&nbsp;; pour la découvrir, suivez-nous ici ou sur Instagram.</p>
        <p style={muted}>Au cœur de rūsc, il y a de l&rsquo;audace&nbsp;: celle de créer sans retenue. Il y a aussi de la soif&nbsp;: celle d&rsquo;apprendre, de s&rsquo;exprimer et de transmettre avec intensité. rūsc, c&rsquo;est apprendre, explorer, créer, et laisser une trace dans cet élan partagé.</p>
        <p style={{ ...muted, marginBottom: "34px" }}>Envie de transmettre&nbsp;? Faites une demande pour rejoindre la famille rūsc via notre <a href="/contact/" style={{ color: "var(--accent)" }}>formulaire de contact</a>.</p>

        <div style={{ display: "grid", gap: "22px" }}>
          <Bio name="raquel calleja">Après une longue période à l&rsquo;étranger, c&rsquo;est en rentrant en France que Raquel découvre la céramique, une discipline qui deviendra bien plus qu&rsquo;un simple loisir&nbsp;: une véritable passion. Avec un parcours riche et éclectique, elle a d&rsquo;abord évolué dans le marketing, puis dans le management de luxe. Mais c&rsquo;est dans l&rsquo;art de la céramique que Raquel trouve son véritable épanouissement. Fascinée par l&rsquo;équilibre entre rigueur technique et liberté d&rsquo;expression, chaque geste, chaque cuisson, chaque émail est une quête d&rsquo;apprentissage et de perfection. Au sein de rūsc, elle partage cette passion avec une énergie contagieuse.</Bio>
          <Bio name="christopher kerr">Écossais d&rsquo;origine, Chris vit à Chamonix depuis plus de 15 ans. Après une carrière dans l&rsquo;immobilier et la gestion d&rsquo;entreprise, il découvre la céramique et s&rsquo;y investit pleinement, devenant le tout premier élève de Raquel. Aujourd&rsquo;hui partenaire essentiel de rūsc, il anime les séances du mercredi soir avec enthousiasme et bienveillance, et développe ses propres créations. Sa pédagogie naturelle et son dynamisme font de lui une figure incontournable de l&rsquo;atelier.</Bio>
          <Bio name="anaïs lejeune">Formée en tapisserie d&rsquo;ameublement depuis plus de 10 ans et passionnée par la décoration, Anaïs combine ces deux expertises pour donner vie à des créations uniques. Travailler avec ses mains, au milieu des odeurs de toile de jute et de crin, est bien plus qu&rsquo;un métier&nbsp;: c&rsquo;est une véritable passion. Au sein de rūsc, elle anime avec enthousiasme les ateliers de tapisserie pour transmettre son savoir-faire.</Bio>
        </div>
      </div>
    </SitePage>
  );
}
