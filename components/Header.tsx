import Image from "next/image";
import logo from "@/assets/logo-rusc.webp";
import { BOOKING, HOME, type Lang } from "@/lib/routes";

// Section links point at the home page, so the same nav works on every page.
const NAV = {
  fr: {
    links: [
      { href: "/#cours", label: "Workshop" },
      { href: "/#stages", label: "Stages" },
      { href: "/#cuisson", label: "Cuisson" },
      { href: "/#membres", label: "Devenir membre" },
      { href: "/#tarifs", label: "Tarifs" },
      { href: "/#reservation", label: "Réservation" },
      { href: "/#us", label: "Ūs" },
      { href: "/#contact", label: "Contact" },
    ],
    // The home page lists everything bookable; each item opens /reserver/.
    cta: { href: "/#reservation", label: "Réserver" },
  },
  en: {
    links: [
      { href: "/en/#workshops", label: "Workshop" },
      { href: "/en/#members", label: "Become a member" },
      { href: BOOKING.en, label: "Booking" },
      { href: "/en/#about", label: "Ūs" },
      { href: "/en/#contact", label: "Contact" },
    ],
    cta: { href: BOOKING.en, label: "Book" },
  },
};

type Props = {
  lang: Lang;
  page: "home" | "booking";
};

export default function Header({ lang, page }: Props) {
  const { links, cta } = NAV[lang];
  // The FR / EN switch keeps you on the same page.
  const versions = page === "home" ? HOME : BOOKING;
  return (
    <header>
      <div className="wrap nav">
        <a href={page === "home" ? "#" : HOME[lang]} className="logo">
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
            <a href={versions.fr} className={lang === "fr" ? "on" : undefined}>FR</a>
            <a href={versions.en} className={lang === "en" ? "on" : undefined}>EN</a>
          </span>
          <a className="cta" href={cta.href}>
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}
