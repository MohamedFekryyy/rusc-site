import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // URLs keep their trailing slash (/en/, /reserver/), as on the old site.
  trailingSlash: true,
  // Photos are served as they are, without Vercel image optimisation.
  images: { unoptimized: true },
  async redirects() {
    return [
      // URLs of the old static site
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/conditions.html", destination: "/conditions/", permanent: true },
      { source: "/en/index.html", destination: "/en/", permanent: true },
      { source: "/en/terms.html", destination: "/en/terms/", permanent: true },

      // Easy-to-guess addresses for the booking pages
      { source: "/reservation", destination: "/reserver/", permanent: true },
      { source: "/en/reservation", destination: "/en/booking/", permanent: true },

      // Old Squarespace pages, once studio-rusc.com points at this site
      { source: "/about", destination: "/#us", permanent: true },
      { source: "/contact", destination: "/#contact", permanent: true },
      { source: "/workshop", destination: "/#ateliers", permanent: true },
      { source: "/atelier-cramique-2h", destination: "/reserver/?workshop=atelier-ceramique-2h", permanent: true },
      { source: "/appointments-1-2", destination: "/reserver/", permanent: true },
      { source: "/rserver", destination: "/reserver/", permanent: true },
      { source: "/membre", destination: "/#membres", permanent: true },
      { source: "/member-site", destination: "/#membres", permanent: true },
      { source: "/cart", destination: "/reserver/", permanent: true },
    ];
  },
};

export default nextConfig;
