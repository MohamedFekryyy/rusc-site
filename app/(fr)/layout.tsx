import type { Metadata } from "next";
import type { ReactNode } from "react";
import { gilda, jost } from "../fonts";
import SmoothScroll from "@/components/SmoothScroll";
import { SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

// Root layout of the French pages (/ and /conditions/). The English pages
// have their own root layout so each document gets the right <html lang>.
export default function FrenchLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${gilda.variable} ${jost.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
