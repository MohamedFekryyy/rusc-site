"use client";

import Image from "next/image";
import { useState } from "react";
import logo from "@/assets/logo-rusc.webp";
import { BOOKING, HOME, PAGES, bookingHref, type Lang, type PageKey } from "@/lib/routes";
import { clientLoginUrl } from "@/lib/acuity";

export type NavPage = "home" | "booking" | PageKey;

// Menu order (validated by Raquel): Ūs · Espace membre · Cours · Stages ·
// Privatisation · Résidence d'artiste · Expo · Cuisson · Contact.
const LABELS: Record<Lang, Record<PageKey, string>> = {
  fr: {
    us: "Ūs",
    membres: "Espace membre",
    cours: "Cours",
    stages: "Stages",
    privatisation: "Privatisation",
    residence: "Résidence d'artiste",
    expo: "Expo",
    cuisson: "Cuisson",
    contact: "Contact",
  },
  en: {
    us: "Ūs",
    membres: "Member area",
    cours: "Courses",
    stages: "Intensives",
    privatisation: "Space hire",
    residence: "Artist residency",
    expo: "Exhibitions",
    cuisson: "Firing",
    contact: "Contact",
  },
};

const ORDER: PageKey[] = [
  "us",
  "membres",
  "cours",
  "stages",
  "privatisation",
  "residence",
  "expo",
  "cuisson",
  "contact",
];

const CTA = {
  fr: { href: BOOKING.fr, label: "Réserver" },
  en: { href: BOOKING.en, label: "Book" },
};

const AUTH_LABEL = { fr: "Connexion", en: "Log in" };
const CART_LABEL = { fr: "Panier", en: "Cart" };
const MENU_LABEL = { fr: "Menu", en: "Menu" };

type Props = {
  lang: Lang;
  page: NavPage;
};

export default function Header({ lang, page }: Props) {
  const [open, setOpen] = useState(false);
  const labels = LABELS[lang];
  const cta = CTA[lang];
  // FR/EN switch keeps you on the same page when possible.
  const frHref = page === "home" ? HOME.fr : page === "booking" ? BOOKING.fr : PAGES[page].fr;
  const enHref = page === "home" ? HOME.en : page === "booking" ? BOOKING.en : PAGES[page].en;
  const close = () => setOpen(false);

  return (
    <header>
      <div className="wrap nav">
        {/* Left: burger menu */}
        <div className="nav-left">
          <button
            type="button"
            className="burger"
            aria-label={MENU_LABEL[lang]}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={open ? "x" : ""}></span>
          </button>
        </div>

        {/* Center: logo */}
        <a href={page === "home" ? "#" : HOME[lang]} className="logo" onClick={close}>
          <Image src={logo} alt="rūsc" loading="eager" />
        </a>

        {/* Right: lang switch + Réserver + login + cart */}
        <div className="nav-right">
          <span className="lang lang-top">
            <a href={frHref} className={lang === "fr" ? "on" : undefined}>FR</a>
            <a href={enHref} className={lang === "en" ? "on" : undefined}>EN</a>
          </span>
          <a className="cta" href={cta.href}>
            {cta.label}
          </a>
          {/* Login: Acuity client self-service (new tab — Acuity blocks framing). */}
          <a className="auth" href={clientLoginUrl} target="_blank" rel="noopener">
            {AUTH_LABEL[lang]}
          </a>
          {/* Cart: no native Acuity cart — points to the catalog (class cards,
              membership, gift vouchers), which is where a purchase happens. */}
          <a className="cart" href={bookingHref(lang, "catalog")}>
            {CART_LABEL[lang]}
          </a>
        </div>
      </div>

      {/* Dropdown panel (mobile + desktop burger) */}
      {open && (
        <div className="mobile-panel" onClick={close}>
          <nav>
            {ORDER.map((key) => (
              <a key={key} href={PAGES[key][lang]} className={page === key ? "on" : undefined}>
                {labels[key]}
              </a>
            ))}
          </nav>
          <span className="lang">
            <a href={frHref} className={lang === "fr" ? "on" : undefined}>FR</a>
            <a href={enHref} className={lang === "en" ? "on" : undefined}>EN</a>
          </span>
        </div>
      )}
    </header>
  );
}
