import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const languages = {
  fr: `${SITE_URL}/`,
  en: `${SITE_URL}/en/`,
  "x-default": `${SITE_URL}/`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, alternates: { languages }, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/en/`, alternates: { languages }, changeFrequency: "monthly", priority: 0.9 },
  ];
}
