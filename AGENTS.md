<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# rūsc site: notes for agents

Bilingual marketing site for rūsc, a ceramics studio in Chamonix: French at `/`, English at `/en/`, plus a terms page for each language (`/conditions/`, `/en/terms/`).

- **Stack:** Next.js 16 (App Router, TypeScript), exported as static HTML (`output: "export"`).
- **Hosting:** Cloudflare Pages. The test domain is rselavy.com; the target domain is studio-rusc.com. Squarespace only manages the domain now.
- **Bookings:** Acuity Scheduling, owner ID `19154889`, embedded in the page. The Acuity dashboard (services, hours, prices, payments) stays in Acuity.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Static export into `out/` (this folder is what gets deployed) |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |

## Rules of thumb

- **Keep the UI as it is.** The CSS was ported verbatim from the old static pages. Don't restyle anything unless asked.
- **FR and EN are separate pages, and they differ.** EN has no pricing section, membership band or booking cards, and its section IDs differ (`#workshops`, `#members`, `#about` versus `#ateliers`, `#membres`, `#us`). When content should stay in sync, edit both pages.
- **Link between the home and terms pages with plain `<a>`, not `next/link`.** The two page types style bare elements (`p`, `li`, `header`, `footer`) differently. Next.js does not unload global CSS on client-side navigation, so a `<Link>` would carry the home styles over into the terms page.
- **Bookings never leave the site.** Buttons carry `data-booking="schedule|catalog|gifts"` (and optionally `data-appointment-type`). The `BookingEmbed` client component catches those clicks and loads the matching Acuity page in its iframe. Do not link to `rusc.as.me` or `app.acuityscheduling.com` directly.
- **It's a static export,** so there's no `redirects()`, `headers()`, API routes or server actions. Redirects live in `public/_redirects` (Cloudflare Pages format).

## Migration log: static HTML → Next.js (2026-09-22)

Each step below is one commit on the `nextjs-migration` branch.

### 1. Tooling scaffold
- Copied the Next.js 16.3.6 `create-next-app` template (App Router, TypeScript, ESLint, no Tailwind) into the repo: `package.json`, `tsconfig.json`, `eslint.config.mjs`.
- `next.config.ts` sets `output: "export"`, which keeps Cloudflare Pages hosting as before. `trailingSlash: true` keeps `/en/` as a directory URL. `images.unoptimized` is on because a static export has no image server.
- `.gitignore` now ignores `node_modules`, `.next` and `out`.
- Added this file, plus `CLAUDE.md` (which just includes it).
- Starting point: `main` at `31c0342` ("Merge branch 'main'…"), a static site with `index.html`, `en/index.html`, `conditions.html`, `en/terms.html` and `assets/`.

### 2. Styles
- The old pages each carried an inline `<style>`. A script extracted them into:
  - `styles/globals.css`: reset, colour tokens and `body`, which were identical on every page. The font tokens now point at the `next/font` variables.
  - `styles/home.css`: the FR home stylesheet, verbatim. The EN home page had an older copy of the same sheet, and a rule-by-rule diff found only two differences that show: hero text width (640px vs 620px) and the colour of `<strong>` inside the membership price list. Both are kept as `html[lang="en"]` overrides at the end of the file.
  - `styles/legal.css`: the terms-page stylesheet, verbatim (FR and EN were identical).
- The terms sheet styles bare `p`, `li`, `header` and `footer`, so it must never share a page with `home.css` (see the rules of thumb above).
