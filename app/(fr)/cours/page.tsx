import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import decorACru from "@/assets/photos/decor-a-cru-o.jpg";
import ceramique2h from "@/assets/photos/ceramique-2h-o.png";
import modelage2h from "@/assets/photos/modelage-2h-o.jpg";
import enfant from "@/assets/photos/enfant2-o.jpg";
import mv3h from "@/assets/photos/model-vivant-3h-o.jpg";

export const metadata: Metadata = {
  title: "Les cours — céramique, modelage, modèle vivant · rūsc Chamonix",
  description:
    "Cours de tournage, modelage, décor à cru, cours enfant et modèle vivant à l'atelier rūsc, Chamonix. Cours à l'unité ou carnets, tarifs membres.",
  alternates: { canonical: "/cours/", languages: { fr: "/cours/", en: "/en/cours/" } },
};

export default function Cours() {
  return (
    <SitePage lang="fr" page="cours" title="les cours" sub={<>Osez l&rsquo;expérience</>}>
      <div className="grid">
        <article className="card">
          <Image className="thumb" src={ceramique2h} alt="Cours de tournage en céramique à rūsc" />
          <p className="k">Cours de 2&nbsp;h</p>
          <h3>tournage 2h</h3>
          <p>Ateliers de tournage en céramique avec un professeur expérimenté qui vous guidera dans vos premiers pas. À votre rythme, sur des cours de 2h vous apprendrez toutes les étapes nécessaires à la réalisation de vos poteries.</p>
          <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€<br />Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€<br />Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <BookingButton lang="fr" workshop="atelier-ceramique-2h" tone="guest">S&rsquo;inscrire</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={modelage2h} alt="Cours de modelage de l’argile à rūsc" />
          <p className="k">Cours de 2&nbsp;h</p>
          <h3>modelage 2h</h3>
          <p>Que vous soyez débutants ou expérimentés, venez vous essayer au modelage et concevez vos propres créations.</p>
          <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€<br />Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€<br />Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <BookingButton lang="fr" workshop="atelier-modelage-2h" tone="guest">S&rsquo;inscrire</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={decorACru} alt="Décor à cru — rūsc" />
          <p className="k">Cours d&rsquo;1&nbsp;h</p>
          <h3>décor à cru 1h</h3>
          <p>Un cours d&rsquo;une heure dédié au décor à cru, pour personnaliser vos pièces avant la cuisson.</p>
          <p className="price">Cours d&rsquo;1h&nbsp;: 20&nbsp;€ · membre 18&nbsp;€</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ cuisson à partir de 6&nbsp;€ la pièce · tarif réduit membre</p>
          <details style={{ marginTop: "10px", fontSize: "14.5px" }}>
            <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Horaires des créneaux</summary>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", color: "var(--muted)" }}>
              <li>Lundi&nbsp;: 16h – 17h</li>
              <li>Mardi&nbsp;: 18h30 – 19h30</li>
              <li>Mercredi&nbsp;: 18h – 19h</li>
              <li>Jeudi&nbsp;: 17h – 18h</li>
            </ul>
          </details>
          <BookingButton lang="fr" workshop="decor-a-cru-1h" tone="guest">Réserver</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={enfant} alt="Cours enfant à rūsc" />
          <p className="k">Cours de 2&nbsp;h</p>
          <h3>cours enfant 2h</h3>
          <p>Pour les 7–12 ans. Tous les mercredis de 13h30 à 15h30 (hors vacances scolaires). Un temps ludique pour découvrir, façonner et créer.</p>
          <p className="price">Cours de 2h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€<br />Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€<br />Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
          <BookingButton lang="fr" workshop="modelage-enfant" tone="guest">Réserver</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={mv3h} alt="Cours de modèle vivant à rūsc" />
          <p className="k">Cours de 3&nbsp;h</p>
          <h3>model vivant 3h</h3>
          <p>Un cours de trois heures autour du modèle vivant&nbsp;: observer, dessiner, façonner d&rsquo;après le corps en mouvement.</p>
          <p className="price">Cours de 3h&nbsp;: 50&nbsp;€ · membre 45&nbsp;€<br />Carnet de 5 cours&nbsp;: 210&nbsp;€ · membre 189&nbsp;€<br />Carnet de 10 cours&nbsp;: 350&nbsp;€ · membre 315&nbsp;€</p>
          <a className="btn" href="/contact/">+ info</a>
        </article>
      </div>
    </SitePage>
  );
}
