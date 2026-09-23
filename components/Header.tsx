"use client";

import { useState } from "react";
import { BOOKING, HOME, PAGES, bookingHref, type Lang, type PageKey } from "@/lib/routes";

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
// Tagline shown as the center brand mark in the header (in place of the logo).
const SLOGAN = { fr: "oser l'art", en: "dare art" };
// Sub-line shown under the tagline in the header.
const SUBLINE = { fr: "Atelier de céramique à Chamonix", en: "Ceramics studio in Chamonix" };

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

        {/* Left brand block: tagline + subline */}
        <a href={page === "home" ? "#" : HOME[lang]} className="logo logo-word" onClick={close}>
          <span className="logo-line">{SLOGAN[lang]}</span>
          <span className="logo-sub">{SUBLINE[lang]}</span>
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
          {/* Login: Cal.com has no client login, and nothing on the site may
              send visitors to cal.com, so this leads to the member area. */}
          <a className="auth" href={PAGES.membres[lang]}>
            {AUTH_LABEL[lang]}
          </a>
          {/* Cart: points to the catalog (class cards, membership, gift
              vouchers) in the booking embed, where a purchase happens. */}
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
