import type { Metadata } from "next";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Space hire — team building, hen parties, birthdays · rūsc Chamonix",
  description:
    "Hire the rūsc studio for a team building, a hen party, a birthday or a themed dinner. Half a day, equipment provided, on request.",
  alternates: { canonical: "/en/privatisation/", languages: { fr: "/privatisation/", en: "/en/privatisation/" } },
};

export default function Privatisation() {
  return (
    <SitePage lang="en" page="privatisation" title="space hire" sub="Team building · hen parties · birthdays">
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ fontSize: "15.5px" }}><strong>Team building, hen party, birthdays, themed dinners</strong>, creative workshops, body expression, exhibitions… Privatise the space for half a day and create your own piece.</p>
        <p style={{ fontSize: "15.5px" }}>On the wheel or with slabs, all the equipment is at your disposal for a playful, friendly moment, guided by our team.</p>
        <p style={{ fontSize: "15.5px" }}>You can also hire the space <strong>without the ceramics equipment</strong>: you then have a fully equipped kitchen and a 60&nbsp;m² modular space — ideal for a corporate event or a private reception.</p>
        <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
          <a className="btn" href="/en/contact/">Request a quote</a>
        </div>
      </div>
    </SitePage>
  );
}
