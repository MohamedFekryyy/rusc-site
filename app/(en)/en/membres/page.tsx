import type { Metadata } from "next";
import Image from "next/image";
import SitePage from "@/components/SitePage";
import BookingButton from "@/components/BookingButton";
import { rateRow } from "@/components/ui";
import drawing from "@/assets/dessin-sylwia.webp";

export const metadata: Metadata = {
  title: "Member area — open studio rūsc, Chamonix",
  description:
    "The rūsc open studio: a professional, fully equipped space, for members only. €50/year membership, preferential rates and open studio access.",
  alternates: { canonical: "/en/membres/", languages: { fr: "/membres/", en: "/en/membres/" } },
};

export default function Membres() {
  return (
    <SitePage lang="en" page="membres" title="member area" sub="Open studio">
      <div className="feature">
        <div className="txt">
          <h2>a professional space, at your own pace</h2>
          <p>rūsc offers open studio sessions exclusively for its members. A professional space equipped with quality material, ideal for amateur and experienced ceramicists alike.</p>
          <p>Materials are provided, letting you focus on your creativity with no logistics to worry about — and work at your own pace in a friendly, stimulating environment.</p>
          <h3 style={{ fontSize: "19px", margin: "22px 0 10px" }}>what is open studio?</h3>
          <p>Open studio is dedicated to ceramics and gives rūsc members autonomous access to our fully equipped space. Whether you want to refine your technique or simply experiment, our studio is designed for your creative needs in an inspiring, professional setting.</p>
          <h3 style={{ fontSize: "19px", margin: "22px 0 10px" }}>equipment available</h3>
          <ul>
            <li>7 potter&rsquo;s wheels, for throwing and hand-building</li>
            <li>A full selection of tools for shaping and throwing clay</li>
            <li>Materials included: stoneware, slips and clear glaze to finish your pieces</li>
          </ul>
          <p><strong>Access conditions:</strong> these sessions are reserved for members who have taken at least one 2-hour initiation with one of our teachers. An active membership is required to access the space.</p>
          <div className="pricing" style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "18px" }}>
            <p className="price" style={{ marginBottom: "12px" }}><strong>Membership: €50 / year</strong> — preferential rates and open studio access.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={rateRow}><span>Open studio — single hour</span><span><strong>€22.50</strong> / hour</span></li>
              <li style={rateRow}><span>Open studio — 10h card</span><span><strong>€15</strong> / hour · valid 6 months</span></li>
              <li style={rateRow}><span>Open studio — 20h card</span><span><strong>€12</strong> / hour · valid 1 year</span></li>
            </ul>
            <p style={{ marginTop: "14px", fontSize: "15px", color: "var(--muted)" }}>Members get <strong>–10%</strong> on the 2-hour course (throwing or hand-building), hourly raw-glaze decoration, and the 5- and 10-course cards. Strictly personal benefit: for the member, non-transferable. Open studio is for members only.</p>
          </div>
          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
            <BookingButton lang="en" workshop="adhesion" tone="member">Join</BookingButton>
            <BookingButton lang="en" workshop="atelier-libre-1h" tone="guest">Book a slot</BookingButton>
          </div>
        </div>
        <div className="art-stack">
          <Image className="drawing" src={drawing} alt="Line drawing by Sylwia — hand, bottles, chair" />
        </div>
      </div>
    </SitePage>
  );
}
