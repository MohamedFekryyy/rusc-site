import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import ceramique1j from "@/assets/photos/ceramique-1j-o.jpg";
import ceramique2j from "@/assets/photos/ceramique-2j-o.jpg";
import porcelaine from "@/assets/photos/porcelaine-o.jpg";
import tapisserie from "@/assets/photos/tapisserie-o.jpg";

export const metadata: Metadata = {
  title: "Intensives — ceramics, porcelain, upholstery · rūsc Chamonix",
  description:
    "Immersion intensives at rūsc, Chamonix: ceramics 1 and 2 days, porcelain throwing, traditional upholstery. 10am – 5pm.",
  alternates: { canonical: "/en/stages/", languages: { fr: "/stages/", en: "/en/stages/" } },
};

export default function Stages() {
  return (
    <SitePage lang="en" page="stages" title="intensives" sub="Immersion · 10am – 5pm">
      <div className="grid">
        <article className="card">
          <Image className="thumb" src={ceramique2j} alt="Two-day stoneware throwing intensive at rūsc" />
          <p className="k">2 days</p>
          <h3>ceramics 2 days</h3>
          <p>Immerse yourself in the ceramicist&rsquo;s craft over two consecutive days. Open to all, this course lets you see every stage of creation: from throwing to glazing, including turning.</p>
          <p className="price">2-day stoneware throwing: €280 · member €252</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €6 per piece · reduced rate for members</p>
          <BookingButton lang="en" workshop="atelier-ceramique-2j" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={ceramique1j} alt="One-day stoneware throwing intensive at rūsc" />
          <p className="k">1 day</p>
          <h3>ceramics 1 day</h3>
          <p>Whether you are a beginner or considering a career change, we will guide you through every step needed to throw a stoneware piece.</p>
          <p className="price">Stoneware throwing: €180 · member €162</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €6 per piece · reduced rate for members</p>
          <BookingButton lang="en" workshop="atelier-ceramique-1j" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={porcelaine} alt="Porcelain throwing intensive at rūsc" />
          <p className="k">10am – 5pm</p>
          <h3>porcelain 1 day</h3>
          <p>Porcelain is a singular material: pure, demanding, luminous. Few studios make it accessible. Once a month, we offer our students this rare experience: taming its fragility, exploring its precise gestures and shaping their own pieces on the wheel.</p>
          <p className="price">Porcelain throwing: €230 · member €207</p>
          <p className="price" style={{ fontSize: "13px", color: "var(--muted)" }}>+ firing from €6 per piece · reduced rate for members</p>
          <BookingButton lang="en" workshop="porcelaine" tone="guest">Book</BookingButton>
        </article>
        <article className="card">
          <Image className="thumb" src={tapisserie} alt="Traditional upholstery intensive at rūsc" />
          <p className="k">2 days</p>
          <h3>upholstery 2 days</h3>
          <p>For beginners or experienced, come and learn every stage of traditional upholstery. You can bring your own project or a school chair will be provided for you to practise on.</p>
          <p className="price">On request · contact us</p>
          <a className="btn" href="/en/contact/">+ info</a>
        </article>
      </div>
      <div className="head" style={{ marginTop: "52px" }}>
        <p className="sub" style={{ letterSpacing: ".1em", textTransform: "none", fontSize: "15px", color: "var(--muted)" }}>Want to give the rūsc experience? Our gift vouchers are valid across all courses.</p>
      </div>
    </SitePage>
  );
}
