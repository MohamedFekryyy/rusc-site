export const SITE_URL = "https://studio-rusc.com";

export const EMAIL = "info@studio-rusc.com";
// Studio contact line (Lena).
export const PHONE = "+33 7 82 73 96 97";
export const PHONE_HREF = "tel:+33782739697";
// WhatsApp direct link (wa.me) with a pre-filled greeting.
export const WHATSAPP_HREF = "https://wa.me/33782739697?text=" + encodeURIComponent("Bonjour rūsc, je vous écris depuis le site.");
export const INSTAGRAM = "https://www.instagram.com/studiorusc";
export const INSTAGRAM_HANDLE = "@studiorusc";

// Contact form backend. Our own route (app/api/contact/route.ts) sends the
// message via Brevo; it stays empty until that route is live, in which case
// the form falls back to opening the visitor's mail app (mailto:). Set this
// to "/api/contact" to use the site's own endpoint.
export const FORM_ENDPOINT: string = "/api/contact";

// schema.org data shared by both home pages; each page adds its own
// slogan, description and url.
export const STUDIO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "PotteryStudio",
  name: "rūsc",
  email: EMAIL,
  telephone: "+33782739697",
  address: {
    "@type": "PostalAddress",
    streetAddress: "99 Promenade Marie Paradis",
    postalCode: "74400",
    addressLocality: "Chamonix-Mont-Blanc",
    addressCountry: "FR",
  },
  geo: { "@type": "GeoCoordinates", latitude: 45.9237, longitude: 6.8694 },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "14:00",
      closes: "18:00",
    },
  ],
  sameAs: [INSTAGRAM],
  priceRange: "€€",
};
