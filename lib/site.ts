export const SITE_URL = "https://studio-rusc.com";

export const EMAIL = "info@studio-rusc.com";
// Public studio line (landline/mobile printed on studio-rusc.com).
export const PHONE = "+33 7 82 40 60 16";
export const PHONE_HREF = "tel:+33782406016";
// Direct mobile for Raquel (used on the contact block).
export const MOBILE = "+33 7 82 73 96 97";
export const MOBILE_HREF = "tel:+33782739697";
export const INSTAGRAM = "https://www.instagram.com/studiorusc";
export const INSTAGRAM_HANDLE = "@studiorusc";

// Contact form backend (Formspree, Basin…). Empty: the form opens the
// visitor's mail app with the message prefilled, addressed to EMAIL.
export const FORM_ENDPOINT: string = "";

// schema.org data shared by both home pages; each page adds its own
// slogan, description and url.
export const STUDIO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "PotteryStudio",
  name: "rūsc",
  email: EMAIL,
  telephone: "+33782406016",
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
