import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import ceramique1j from "@/assets/photos/ceramique-1j-o.jpg";
import ceramique2j from "@/assets/photos/ceramique-2j-o.jpg";
import porcelaine from "@/assets/photos/porcelaine-o.jpg";
import tapisserie from "@/assets/photos/tapisserie-o.jpg";

export const metadata: Metadata = {
  title: "Les stages — céramique, porcelaine, tapisserie · rūsc Chamonix",
  description:
    "Stages d'immersion à l'atelier rūsc, Chamonix : céramique 1 et 2 jours, tournage en porcelaine, tapisserie d'ameublement. 10h – 17h.",
  alternates: { canonical: "/stages/", languages: { fr: "/stages/", en: "/en/stages/" } },
};

export default function Stages() {
  return (
    <SitePage lang="fr" page="stages" title="stages" sub={<>Immersion · 10h – 17h</>}>
      <div className="grid">
        <article className="card">
          <Image className="thumb" src={ceramique2j} alt="Stage de tournage en grès sur deux jours à rūsc" />
          <p className="k">2 jours</p>
          <h3>céramique 2j</h3>
          <p>Imprégnez-vous du métier de céramiste durant deux journées consécutives. Ouvert à tous, cet atelier vous permet de voir toutes les étapes de la création&nbsp;: du tournage à l’engobage en passant par le tournassage.</p>
          <p className="price">Atelier tournage grès 2 jours&nbsp;: 280&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <BookingButton lang="fr" workshop="atelier-ceramique-2j">S’inscrire</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={ceramique1j} alt="Stage de tournage en grès — une journée à rūsc" />
          <p className="k">1 jour</p>
          <h3>céramique 1j</h3>
          <p>Que vous soyez débutant ou dans le cadre d’une reconversion professionnelle, nous vous guiderons afin de passer en revue toutes les étapes nécessaires au tournage d’une pièce en grès.</p>
          <p className="price">Atelier tournage grès&nbsp;: 180&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <BookingButton lang="fr" workshop="atelier-ceramique-1j">S’inscrire</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={porcelaine} alt="Stage de tournage en porcelaine à rūsc" />
          <p className="k">10h – 17h</p>
          <h3>porcelaine 1j</h3>
          <p>La porcelaine est une matière singulière&nbsp;: pure, exigeante, lumineuse. Peu d’ateliers permettent de l’aborder. Une fois par mois, nous proposons à nos élèves cette expérience rare&nbsp;: apprivoiser sa fragilité, explorer ses gestes précis et façonner leurs propres pièces au tour.</p>
          <p className="price">Atelier tournage porcelaine&nbsp;: 230&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <BookingButton lang="fr" workshop="porcelaine">S’inscrire</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={tapisserie} alt="Stage de tapisserie d’ameublement traditionnelle à rūsc" />
          <p className="k">2 jours</p>
          <h3>tapisserie 2j</h3>
          <p>Pour les débutants ou confirmés, venez apprendre toutes les étapes de la tapisserie d&rsquo;ameublement traditionnelle. Vous pouvez apporter votre projet personnel ou une chaise d&rsquo;école vous sera fournie pour pratiquer.</p>
          <p className="price">Sur demande · nous contacter</p>
          <a className="btn" href="/contact/">+ info</a>
        </article>
      </div>
      <div className="head" style={{ marginTop: "52px" }}>
        <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Vous souhaitez offrir l&rsquo;expérience rūsc&nbsp;? Nos bons cadeaux sont valables sur l&rsquo;ensemble des ateliers.</p>
      </div>
    </SitePage>
  );
}
