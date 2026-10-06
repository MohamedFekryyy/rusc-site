"use client";

import { ShoppingCart } from "iconsax-reactjs";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import logoImg from "@/assets/logo-rusc-trim.webp";
import { AUTH_EVENT, getToken } from "@/lib/auth";
import { cartCount, useCart } from "@/lib/cart";
import { savePlace } from "@/lib/keepPlace";
import { BOOKING, CART, HOME, LOGIN, PAGES, TERMS, URL_EVENT, type Lang, type PageKey } from "@/lib/routes";

export type NavPage = "home" | "booking" | "cart" | "connexion" | "terms" | PageKey;

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
    event: "Event",
    cuisson: "Cuisson",
    contact: "Contact",
  },
  en: {
    us: "Ūs",
    membres: "Member area",
    cours: "Courses",
    stages: "Workshops",
    privatisation: "Space hire",
    residence: "Artist residency",
    event: "Event",
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
  "cuisson",
  "contact",
];

const CTA = {
  fr: { href: BOOKING.fr, label: "Réserver" },
  en: { href: BOOKING.en, label: "Book" },
};

const AUTH_LABEL = { fr: "Connexion", en: "Log in" };
const ACCOUNT_LABEL = { fr: "Mon compte", en: "My account" };

// Signed in on this browser (lib/auth.ts keeps the token): the header says
// "Mon compte". Follows sign-ins in this tab and in others.
function subscribeAuth(notify: () => void) {
  window.addEventListener(AUTH_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(AUTH_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
const useSignedIn = () => useSyncExternalStore(subscribeAuth, () => Boolean(getToken()), () => false);
// The booking page rewrites its query in place as the tab or class changes
// (replaceUrl in lib/routes.ts): re-read it then, so FR/EN keeps the offer.
function subscribeSearch(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(URL_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(URL_EVENT, notify);
  };
}
const CART_LABEL = { fr: "Panier", en: "Cart" };
const CART_COUNT = { fr: (n: number) => `Panier, ${n} article${n > 1 ? "s" : ""}`, en: (n: number) => `Cart, ${n} item${n > 1 ? "s" : ""}` };
// The FR/EN links' accessible names, each in its own language.
const LANG_NAME = { fr: "Français", en: "English" };

// FR ⇄ EN is a page load (each language has its own root layout). Where the
// browser supports cross-document view transitions (styles/globals.css), the
// two pages crossfade and the FR/EN marker slides across; every other
// navigation skips it, so only the language switch animates.
type PageSwap = Event & { viewTransition?: { skipTransition(): void; ready: Promise<unknown> } | null };
const MENU_LABEL = { fr: "Menu", en: "Menu" };
// Tagline shown as the center brand mark in the header (in place of the logo).
const SLOGAN = { fr: "oser l'art", en: "dare art" };

type Props = {
  lang: Lang;
  page: NavPage;
};

export default function Header({ lang, page }: Props) {
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn();
  const labels = LABELS[lang];
  const cta = CTA[lang];
  // FR/EN switch keeps you on the same page when possible.
  const same =
    page === "home" ? HOME
    : page === "booking" ? BOOKING
    : page === "cart" ? CART
    : page === "connexion" ? LOGIN
    : page === "terms" ? TERMS
    : PAGES[page];
  // On the booking page, keep the selected tab or offer across the switch
  // (?view=… / ?workshop=…), so the customer lands on the same product.
  // Read reactively from the URL (SSR has no window; client reads after hydration).
  const search = useSyncExternalStore(
    subscribeSearch,
    () => window.location.search,
    () => ""
  );
  // Only the booking page carries the offer/tab in the URL query.
  const bookingQuery = page === "booking" ? search : "";
  const frHref = same.fr + bookingQuery;
  const enHref = same.en + bookingQuery;
  const count = cartCount(useCart());
  const close = () => setOpen(false);
  // ...and at the same place on it (lib/keepPlace.ts), with the query as it
  // is now (the booking page may have changed it since the last render).
  const switchingLanguage = useRef(false);
  const keepPlace = (event: MouseEvent<HTMLAnchorElement>) => {
    const link = event.currentTarget;
    if (page === "booking") link.href = new URL(link.pathname + window.location.search, window.location.href).href;
    // A plain click leaves for the other language here (not a new tab).
    switchingLanguage.current = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    savePlace(link.href);
  };
  useEffect(() => {
    const onSwap = (event: Event) => {
      const transition = (event as PageSwap).viewTransition;
      if (!transition || switchingLanguage.current) return;
      // Skipping rejects the transition's ready promise: expected, not an error.
      transition.ready.catch(() => {});
      transition.skipTransition();
    };
    window.addEventListener("pageswap", onSwap);
    return () => window.removeEventListener("pageswap", onSwap);
  }, []);

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

        {/* Right: lang switch + login + cart + Réserver (Réserver far right) */}
        <div className="nav-right">
          <span className="lang lang-top" data-lang={lang}>
            <span className="lang-pill" aria-hidden />
            <a href={frHref} hrefLang="fr" lang="fr" aria-label={LANG_NAME.fr} aria-current={lang === "fr" ? "true" : undefined} className={lang === "fr" ? "on" : undefined} onClick={keepPlace}>FR</a>
            <a href={enHref} hrefLang="en" lang="en" aria-label={LANG_NAME.en} aria-current={lang === "en" ? "true" : undefined} className={lang === "en" ? "on" : undefined} onClick={keepPlace}>EN</a>
          </span>
          {/* Login / account: the sign-in page, or the member's space once signed in. */}
          <a className="auth" href={LOGIN[lang]}>
            {signedIn ? ACCOUNT_LABEL[lang] : AUTH_LABEL[lang]}
          </a>
          {/* Cart (lib/cart.ts): an icon, with its item count live across the site. */}
          <a className="cart" href={CART[lang]} aria-label={count > 0 ? CART_COUNT[lang](count) : CART_LABEL[lang]} title={CART_LABEL[lang]}>
            <ShoppingCart className="cart-icon" color="currentColor" aria-hidden />
            {count > 0 && <span className="cart-count" aria-hidden>{count}</span>}
          </a>
          <a className="cta" href={cta.href}>
            {cta.label}
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
          <a href={frHref} hrefLang="fr" lang="fr" aria-label={LANG_NAME.fr} aria-current={lang === "fr" ? "true" : undefined} className={lang === "fr" ? "on" : undefined} onClick={keepPlace}>FR</a>
          <a href={enHref} hrefLang="en" lang="en" aria-label={LANG_NAME.en} aria-current={lang === "en" ? "true" : undefined} className={lang === "en" ? "on" : undefined} onClick={keepPlace}>EN</a>
        </span>
      </div>
      {open && <div className="panel-scrim" onClick={close} />}
    </>
  );
}
