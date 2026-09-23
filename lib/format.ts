import type { Lang } from "@/lib/routes";

const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB" };

// 21000 -> "210,00 €" (fr) / "€210.00" (en).
export function formatPrice(cents: number, lang: Lang) {
  return new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency: "EUR" }).format(cents / 100);
}

// A booked slot, in the studio's time zone: "mardi 14 octobre 2026 à 14:00".
export function formatSlot(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
