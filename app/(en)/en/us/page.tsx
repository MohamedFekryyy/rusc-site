import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import { Bio, muted } from "@/components/ui";
import Image from "next/image";
import usRaquel from "@/assets/photos/us-raquel-o.webp";
import usChris from "@/assets/photos/us-chris-o.webp";

export const metadata: Metadata = {
  title: "Ūs — the rūsc studio, Chamonix",
  description:
    "Meet the rūsc team: Raquel Calleja, Chris Kerr and their guests. The story of a ceramics studio in Chamonix — art, transmission and daring.",
  alternates: { canonical: "/en/us/", languages: { fr: "/us/", en: "/en/us/" } },
};

export default function Us() {
  return (
    <SitePage lang="en" page="us" title="ūs" sub="“dare art…”">
      <div className="about-grid">
        <figure className="about-ph"><Image src={usRaquel} alt="Raquel Calleja, co-founder of rūsc" /></figure>
        <figure className="about-ph"><Image src={usChris} alt="Chris Kerr, co-founder of rūsc" /></figure>
      </div>
      <div style={{ maxWidth: "720px", margin: "34px auto 0" }}>
        <p style={muted}>“Dare Art”, said Raquel Calleja. From that dream <strong>rūsc</strong> was born: to create in Chamonix a place where art can circulate freely, between effervescence and memory.</p>
        <p style={muted}>Raquel joined forces with Chris Kerr to give this vision a body. Together they shaped a studio that resembles them: rooted in ceramics, their common ground, yet open to other invited practices.</p>
        <p style={muted}><strong>rūsc</strong> means “hive” in many ancient languages. And in <strong>rūsc</strong> there is of course the <strong>R</strong> of Raquel and the <strong>C</strong> of Chris… but above all <strong>ūs</strong>: all of us, those who give and those who receive, those who share a gesture and pass on an experience — but above all, those who dare.</p>
        <p style={{ ...muted, marginBottom: "34px" }}>Want to pass something on? Get in touch through our <a href="/en/contact/" style={{ color: "var(--accent)" }}>contact form</a>.</p>
        <div style={{ display: "grid", gap: "22px" }}>
          <Bio name="raquel calleja">Raquel discovered ceramics on returning to France after years abroad — a discipline that became far more than a hobby. With a rich, eclectic career in marketing and luxury management, she found her true fulfilment in the art of ceramics. Fascinated by the balance between technical rigour and freedom of expression, every gesture, every firing, every glaze is a quest for learning and perfection. At rūsc she shares this passion with contagious energy.</Bio>
          <Bio name="christopher kerr">Originally from Scotland, Chris has lived in Chamonix for over 15 years. After a career in real estate and business management, he discovered ceramics and threw himself into it, becoming Raquel&rsquo;s very first student. Today an essential partner at rūsc, he runs the Wednesday evening sessions with enthusiasm and warmth, and develops his own creations.</Bio>
          <Bio name="anaïs lejeune">Trained in traditional upholstery for over 10 years and passionate about decoration, Anaïs combines both skills to bring unique creations to life. Working with her hands, among the smells of jute and horsehair, is more than a job — it&rsquo;s a true passion. At rūsc she runs the upholstery courses to pass on her craft.</Bio>
        </div>
      </div>
    </SitePage>
  );
}
