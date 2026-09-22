import Image from "next/image";
import type { ReactNode } from "react";
import logo from "@/assets/logo-rusc.webp";
import { EMAIL, PHONE, PHONE_HREF } from "@/lib/site";
import "@/styles/legal.css";

type Props = {
  // Home page of the same language ("/" or "/en/").
  home: string;
  back: string;
  address: string;
  copy: string;
  children: ReactNode;
};

// Shell of the terms pages. Links back home are plain <a> on purpose: the
// home stylesheet must not be loaded on top of legal.css (or the reverse).
export default function LegalPage({ home, back, address, copy, children }: Props) {
  return (
    <>
      <header>
        <div className="wrap nav">
          <a href={home}>
            <Image src={logo} alt="rūsc" loading="eager" />
          </a>
          <a href={home}>{back}</a>
        </div>
      </header>

      <main className="wrap">
        {children}
        <a className="back" href={home}>{`← ${back}`}</a>
      </main>

      <footer>
        {address}<br />
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · <a href={PHONE_HREF}>{PHONE}</a><br />
        {copy}
      </footer>
    </>
  );
}
