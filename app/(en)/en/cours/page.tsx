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
  title: "Courses — ceramics, hand-building, life drawing · rūsc Chamonix",
  description:
    "Throwing, hand-building, raw-glaze decoration, children's course and life drawing at rūsc, Chamonix. Single courses or cards, member rates.",
  alternates: { canonical: "/en/cours/", languages: { fr: "/cours/", en: "/en/cours/" } },
};

export default function Cours() {
  return (
    <SitePage lang="en" page="cours" title="courses" sub="Dare the experience">
      <div className="grid">
        <article className="card">
          <Image className="thumb" src={ceramique2h} alt="Wheel-throwing ceramics course at rūsc" />
          <p className="k">2-hour course</p>
          <h3>wheel throwing 2h</h3>
          <p>Ceramics throwing courses with an experienced teacher who will guide you through your first steps. At your own pace, over 2-hour courses you will learn every step needed to make your own pots.</p>
          <p className="price">2h course: €50 · member €45<br />5-course card: €210 · member €189<br />10-course card: €350 · member €315</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €7 member · €8 non-member</p>
          <BookingButton lang="en" workshop="atelier-ceramique-2h" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={modelage2h} alt="Hand-building course at rūsc" />
          <p className="k">2-hour course</p>
          <h3>hand-building 2h</h3>
          <p>Whether you are a beginner or experienced, come and try your hand at hand-building and conceptualise your own creations.</p>
          <p className="price">2h course: €50 · member €45<br />5-course card: €210 · member €189<br />10-course card: €350 · member €315</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €7 member · €8 non-member</p>
          <BookingButton lang="en" workshop="atelier-modelage-2h" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={decorACru} alt="Raw-glaze decoration — rūsc" />
          <p className="k">1-hour course</p>
          <h3>raw-glaze decoration 1h</h3>
          <p>A one-hour course dedicated to raw-glaze decoration, to personalise your pieces before firing.</p>
          <p className="price">1h course: €20 · member €18</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €7 member · €8 non-member</p>
          <details style={{ marginTop: "10px", fontSize: "14.5px" }}>
            <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Session times</summary>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", color: "var(--muted)" }}>
              <li>Monday: 4pm – 5pm</li>
              <li>Tuesday: 6:30pm – 7:30pm</li>
              <li>Wednesday: 6pm – 7pm</li>
              <li>Thursday: 5pm – 6pm</li>
            </ul>
          </details>
          <BookingButton lang="en" workshop="decor-a-cru-1h" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={enfant} alt="Children's course at rūsc" />
          <p className="k">2-hour course</p>
          <h3>children&rsquo;s course 2h</h3>
          <p>For ages 7–12. Every Wednesday from 1.30pm to 3.30pm (outside school holidays). A playful time to discover, shape and create.</p>
          <p className="price">2h course: €50 · member €45<br />5-course card: €210 · member €189<br />10-course card: €350 · member €315</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing €6 per piece</p>
          <BookingButton lang="en" workshop="modelage-enfant" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={mv3h} alt="Life-drawing course at rūsc" />
          <p className="k">3-hour course</p>
          <h3>life drawing 3h</h3>
          <p>A three-hour course around the life model: observe, draw, shape from the moving body.</p>
          <p className="price">3h course: €50 · member €45<br />5-course card: €210 · member €189<br />10-course card: €350 · member €315</p>
          <a className="btn" href="/en/contact/">+ info</a>
        </article>
      </div>
    </SitePage>
  );
}
