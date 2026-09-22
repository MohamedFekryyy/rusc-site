import Image from "next/image";
import logo from "@/assets/logo-rusc.webp";

type Props = {
  lang: "fr" | "en";
  links: { href: string; label: string }[];
  cta: string;
};

export default function Header({ lang, links, cta }: Props) {
  return (
    <header>
      <div className="wrap nav">
        <a href="#" className="logo">
          <Image src={logo} alt="rūsc" loading="eager" />
        </a>
        <nav>
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          {/* Plain <a>: FR and EN are separate root layouts (full page load). */}
          <span className="lang">
            <a href="/" className={lang === "fr" ? "on" : undefined}>FR</a>
            <a href="/en/" className={lang === "en" ? "on" : undefined}>EN</a>
          </span>
          <a className="cta" href="#reservation">
            {cta}
          </a>
        </nav>
      </div>
    </header>
  );
}
