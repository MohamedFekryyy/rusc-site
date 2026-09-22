import Image from "next/image";
import logoWhite from "@/assets/logo-rusc-white.webp";
import { EMAIL, INSTAGRAM, PHONE, PHONE_HREF } from "@/lib/site";

type Props = {
  address: string;
  hours: string;
  terms: { href: string; label: string };
  copy: string;
};

export default function Footer({ address, hours, terms, copy }: Props) {
  return (
    <footer>
      <div className="word">
        <Image
          src={logoWhite}
          alt="rūsc"
          style={{ height: "44px", width: "auto", display: "inline-block" }}
        />
      </div>
      <address>
        {address}<br />
        {hours}<br /><br />
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · <a href={PHONE_HREF}>{PHONE}</a><br />
        <a href={INSTAGRAM}>@studiorusc</a>
      </address>
      <p style={{ marginTop: "10px" }}>
        {/* Plain <a>: the terms page loads its own stylesheet. */}
        <a href={terms.href}>{terms.label}</a>
      </p>
      <p className="copy">{copy}</p>
    </footer>
  );
}
