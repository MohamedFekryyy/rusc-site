import { setClassOffers, toClassOffer, type ClassOffer } from "@/lib/cal";
import { CODES_ORIGIN } from "@/lib/codes";

// The classes the studio made in rūsc admin (Cours → Nouveau cours), added to
// the site's offers (lib/cal.ts). The booking page lists the active ones once
// they've loaded; the checkout route loads them on every payment and charges
// their price from here, never the browser's. null: rūsc admin out of reach.
export async function loadClasses(): Promise<ClassOffer[] | null> {
  try {
    const res = await fetch(`${CODES_ORIGIN}/api/classes`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { classes?: unknown };
    const list = (Array.isArray(data.classes) ? data.classes : []).map(toClassOffer).filter((c): c is ClassOffer => !!c);
    setClassOffers(list);
    return list;
  } catch {
    return null;
  }
}
