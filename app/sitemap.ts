import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

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

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: home.fr, alternates: { languages: home }, changeFrequency: "monthly", priority: 1 },
    { url: home.en, alternates: { languages: home }, changeFrequency: "monthly", priority: 0.9 },
    { url: booking.fr, alternates: { languages: booking }, changeFrequency: "weekly", priority: 0.9 },
    { url: booking.en, alternates: { languages: booking }, changeFrequency: "weekly", priority: 0.8 },
  ];
}
