import type { ReactNode } from "react";

// A small sticky table of contents for long studio pages (Cours, Espace
// membre…). Each entry is an anchor to an id further down the same page.
// Hiding it on narrow screens keeps mobile clean: the page itself is one
// scroll, and the nav is reachable from the burger.
export default function PageNav({ items }: { items: { id: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <nav className="page-nav" aria-label="Sommaire" data-lenis-prevent>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export type { ReactNode };
