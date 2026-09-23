import type { Metadata } from "next";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Firing — double firing, delays, rates · rūsc Chamonix",
  description:
    "How firing works at rūsc: double firing (bisque 980 °C, final firing 1280 °C), delays, shrinkage, and rates per piece (members and non-members).",
  alternates: { canonical: "/en/cuisson/", languages: { fr: "/cuisson/", en: "/en/cuisson/" } },
};

export default function Cuisson() {
  return (
    <SitePage lang="en" page="cuisson" title="firing" sub="From course to finished piece">
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>why your piece can&rsquo;t leave the studio the same day</h3>
        <p style={{ fontSize: "15.5px" }}>Your piece isn&rsquo;t finished when the course ends — it is only beginning its journey. It goes through the kiln twice, and there are several steps in between.</p>
        <p style={{ fontSize: "15.5px" }}><strong>The bisque firing — 980&nbsp;°C.</strong> A slow first firing that removes all the water in the clay and makes the piece solid and porous. This is what allows it to be glazed afterwards without collapsing or breaking.</p>
        <p style={{ fontSize: "15.5px" }}><strong>Glazing, then the final firing — 1280&nbsp;°C.</strong> The piece is glazed, dried, then fired a second time at very high temperature. This is when the glaze melts, vitrifies and becomes that smooth, luminous surface. Stoneware and porcelain need this temperature to be truly durable.</p>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>why time matters</h3>
        <ul style={{ paddingLeft: "20px", fontSize: "15.5px", lineHeight: 1.6 }}>
          <li style={{ marginBottom: "10px" }}><strong>A damp piece can explode in the kiln.</strong> As the temperature rises, the water inside turns to steam; pressure builds and the clay bursts from within. Thick pieces especially must be bone dry before firing. An air bubble doesn&rsquo;t explode on its own — but it traps moisture, and that is what makes the piece give way.</li>
          <li style={{ marginBottom: "10px" }}><strong>The delay: allow between 2 weeks and 2 months</strong>, depending on the piece, the season and the firing schedule. Our kilns are electric: we don&rsquo;t fire them for a single piece. We wait until we have enough to fill a kiln load — which is also why the delay is what it is.</li>
          <li><strong>The clay moves too:</strong> a piece shrinks as it dries and fires — about 10% for stoneware, up to 20% for porcelain. What you take home won&rsquo;t be quite the size of what you shaped.</li>
        </ul>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>studio clay only</h3>
        <p style={{ fontSize: "15.5px" }}>We fire <strong>only pieces made with clay purchased at the studio</strong>. Every clay has its own <strong>firing curve</strong>: its composition (clays, silica, fluxes) determines the exact firing range, the point at which the glaze forms, and the vitrification temperature. Clay of unknown origin can melt, swell, burst — or contaminate the whole kiln load, our glazes and our shelves. Firing a clay we don&rsquo;t know risks damaging your piece, everyone else&rsquo;s, and the kiln itself. That is why we guarantee the success of your firings by working exclusively with our own clays.</p>

        <h3 style={{ fontSize: "20px", margin: "26px 0 10px" }}>a few notes</h3>
        <div style={{ display: "grid", gap: "14px" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Slip or glaze?</p>
            <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>Slip (engobe) is liquid coloured clay, applied to the raw piece — it becomes one with it. Glaze is a vitrifiable coating that melts into a smooth, glossy surface. One decorates, the other protects.</p>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Material and heat</p>
            <p style={{ margin: "6px 0 0", fontSize: "15px", color: "var(--muted)" }}>Silica — the main component of sand and rock — brings hardness and resists heat. At 573&nbsp;°C, quartz abruptly changes structure and volume: that&rsquo;s why heating and cooling are slow around this point, to prevent cracking.</p>
          </div>
        </div>

        <p style={{ fontSize: "14.5px", color: "var(--muted)", marginTop: "22px" }}>Photos of the kiln loading and opening to come.</p>
      </div>

      <details style={{ maxWidth: "760px", margin: "26px auto 0", border: "1px solid var(--line)", borderRadius: "10px", padding: "4px 18px" }}>
        <summary style={{ cursor: "pointer", padding: "14px 0", fontWeight: 600 }}>See firing rates in detail</summary>
        <div style={{ paddingBottom: "16px" }}>
          <p style={{ fontSize: "15px", color: "var(--muted)", margin: "6px 0 12px" }}>Firing is handled by the rūsc team. Every piece receives a clear glaze applied by us. The rate depends on the material, the size and the glaze chosen.</p>
          <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "10px 0 6px" }}>Non-members</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Children</span><span><strong>€6</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Stoneware</span><span><strong>€8</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Stoneware — small slip</span><span><strong>€10</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Stoneware — large slip or neutral</span><span><strong>€14</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Stoneware — effect (small or large)</span><span><strong>€15</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Porcelain</span><span><strong>€12</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Porcelain — small slip</span><span><strong>€14</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Porcelain — large slip or neutral</span><span><strong>€18</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Porcelain — effect (small or large)</span><span><strong>€17</strong></span></li>
          </ul>
          <p style={{ fontSize: "14px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", margin: "18px 0 6px" }}>Members</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Small piece</span><span><strong>€7</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Large piece and plate</span><span><strong>€10</strong></span></li>
            <li style={{ padding: "7px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: "12px" }}><span>Children</span><span><strong>€6</strong></span></li>
          </ul>
          <p style={{ marginTop: "14px", fontSize: "14.5px", color: "var(--muted)" }}>Clear glaze included in every firing. Firings are carried out by the rūsc team; no firing is left to students.</p>
        </div>
      </details>
    </SitePage>
  );
}
