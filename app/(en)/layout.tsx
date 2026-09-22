import type { Metadata } from "next";
import type { ReactNode } from "react";
import { gilda, jost } from "../fonts";
import { SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

// Root layout of the English pages (/en/ and /en/terms/).
export default function EnglishLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${gilda.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
