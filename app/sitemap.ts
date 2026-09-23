import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PAGES, type PageKey } from "@/lib/routes";

const fr = (p: string) => `${SITE_URL}${p}`;

const home = {
  fr: `${SITE_URL}/`,
  en: `${SITE_URL}/en/`,
  "x-default": `${SITE_URL}/`,
};
const booking = {
  fr: `${SITE_URL}/reserver/`,
  en: `${SITE_URL}/en/booking/`,
  "x-default": `${SITE_URL}/reserver/`,
};
const terms = {
  fr: `${SITE_URL}/conditions/`,
  en: `${SITE_URL}/en/terms/`,
  "x-default": `${SITE_URL}/conditions/`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const pageEntries: MetadataRoute.Sitemap = (Object.keys(PAGES) as PageKey[]).flatMap((key) => {
    const langs = {
      fr: fr(PAGES[key].fr),
      en: fr(PAGES[key].en),
      "x-default": fr(PAGES[key].fr),
    };
    return [
      { url: langs.fr, alternates: { languages: langs }, changeFrequency: "monthly" as const, priority: 0.7 },
      { url: langs.en, alternates: { languages: langs }, changeFrequency: "monthly" as const, priority: 0.6 },
    ];
  });

  return [
    { url: home.fr, alternates: { languages: home }, changeFrequency: "monthly", priority: 1 },
    { url: home.en, alternates: { languages: home }, changeFrequency: "monthly", priority: 0.9 },
    ...pageEntries,
    { url: booking.fr, alternates: { languages: booking }, changeFrequency: "weekly", priority: 0.9 },
    { url: booking.en, alternates: { languages: booking }, changeFrequency: "weekly", priority: 0.8 },
    { url: terms.fr, alternates: { languages: terms }, changeFrequency: "yearly", priority: 0.3 },
    { url: terms.en, alternates: { languages: terms }, changeFrequency: "yearly", priority: 0.3 },
  ];
}
