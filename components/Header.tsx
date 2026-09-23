"use client";

import Image from "next/image";
import { useState } from "react";
import logoImg from "@/assets/logo-rusc-trim.webp";
import { cartCount, useCart } from "@/lib/cart";
import { BOOKING, CART, HOME, LOGIN, PAGES, type Lang, type PageKey } from "@/lib/routes";

export type NavPage = "home" | "booking" | "cart" | "connexion" | PageKey;

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

type Props = {
  lang: Lang;
  page: NavPage;
};

export default function Header({ lang, page }: Props) {
  const [open, setOpen] = useState(false);
  const labels = LABELS[lang];
  const cta = CTA[lang];
  // FR/EN switch keeps you on the same page when possible.
  const same = page === "home" ? HOME : page === "booking" ? BOOKING : page === "cart" ? CART : page === "connexion" ? LOGIN : PAGES[page];
  const frHref = same.fr;
  const enHref = same.en;
  const count = cartCount(useCart());
  const close = () => setOpen(false);

  return (
    <>
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

        {/* Left brand block: wordmark + tagline */}
        <a href={page === "home" ? "#" : HOME[lang]} className="logo logo-word" onClick={close}>
          <span className="logo-mark">
            <Image src={logoImg} alt="rūsc" width={719} height={118} />
          </span>
          <span className="logo-line">{SLOGAN[lang]}</span>
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
          {/* Login / account: leads to the sign-in & sign-up page. */}
          <a className="auth" href={LOGIN[lang]}>
            {AUTH_LABEL[lang]}
          </a>
          {/* Cart (lib/cart.ts): its item count, live across the site. */}
          <a className="cart" href={CART[lang]}>
            {CART_LABEL[lang]}
            {count > 0 && ` (${count})`}
          </a>
        </div>
      </div>
    </header>

      {/* Dropdown panel (mobile + desktop burger). Kept mounted so it can
          animate both in and out; `open` class drives the transition and a
          scrim closes it on click. Both sit outside <header>: the header's
          backdrop-filter would otherwise confine the scrim to the header
          strip, and the header (z-index 70) stays above them so the X is
          always visible and clickable. */}
      <div
        className={"mobile-panel" + (open ? " open" : "")}
        data-lenis-prevent
        aria-hidden={!open}
        onClick={close}
      >
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
      {open && <div className="panel-scrim" onClick={close} />}
    </>
  );
}
