import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in `out/`, deployed to Cloudflare Pages like the old site.
  output: "export",
  // `/en/` and `/conditions/` stay directory URLs (`en/index.html`).
  trailingSlash: true,
  // No image server with a static export; files are served as-is.
  images: { unoptimized: true },
};

export default nextConfig;
