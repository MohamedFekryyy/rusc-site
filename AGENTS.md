<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# rūsc site: notes for agents

Bilingual marketing site for rūsc, a ceramics studio in Chamonix. Each language has three pages: home (`/`, `/en/`), booking (`/reserver/`, `/en/booking/`) and terms (`/conditions/`, `/en/terms/`).

- **Stack:** Next.js 16 (App Router, TypeScript), exported as static HTML (`output: "export"`).
- **Hosting:**
  - Vercel project `rusc-preview`, connected to this GitHub repo. Every push to `main` deploys to https://rusc-preview.vercel.app; other branches get preview deploys behind Vercel login.
  - Cloudflare Pages (`rselavy` project) serves the test domain rselavy.com. It is deployed by hand with wrangler.
  - The target domain is studio-rusc.com. Squarespace only manages the domain now.
- **Bookings:** Acuity Scheduling, owner ID `19154889`, embedded in the booking pages. The Acuity dashboard (services, hours, prices, payments) stays in Acuity.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Static export into `out/` (this folder is what gets deployed) |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |

## Shipping (pushing to `main`)

- **`main` is production.** Every push to it redeploys https://rusc-preview.vercel.app. Run `npm run build` and `npm run lint` first; both must pass.
- **Vercel builds this as a Next.js app** because `vercel.json` pins `"framework": "nextjs"`. Keep that file: without a preset, Vercel served only `public/` and every page was a 404.
- **Check a deploy without the dashboard:** `gh api repos/MohamedFekryyy/rusc-site/commits/<sha>/status` returns the Vercel state; then open the public URL. The Vercel tools here can't read build logs (401).
- **rselavy.com is not deployed from Git.** After `main` changes, publish it by hand:

  ```bash
  npm run build && CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy out --project-name=rselavy
  ```
- **The owner also uses GitHub Desktop on this same checkout,** and may commit, push or switch branches while you work. Check `git branch --show-current` before every commit, and commit each step as soon as it's done.
- **Log each change** in the migration log below: what changed, why, and the commit.

## Rules of thumb

- **Keep the UI as it is.** The CSS was ported verbatim from the old static pages. Don't restyle anything unless asked.
- **FR and EN are separate pages, and they differ.** EN has no pricing section, membership band or booking cards, and its section IDs differ (`#workshops`, `#members`, `#about` versus `#ateliers`, `#membres`, `#us`). When content should stay in sync, edit both pages.
- **Link between the home and terms pages with plain `<a>`, not `next/link`.** The two page types style bare elements (`p`, `li`, `header`, `footer`) differently. Next.js does not unload global CSS on client-side navigation, so a `<Link>` would carry the home styles over into the terms page.
- **Bookings never leave the site.**
  - The FR home page lists everything bookable in `#reservation`. EN has no list.
  - Buttons that name a workshop or offer are `BookingButton`s. They link to the booking page with `?workshop=<slug>` or `?view=catalog|gifts` (see `bookingHref` in `lib/routes.ts`).
  - On the booking page, `BookingEmbed` opens the Acuity page that the URL names. Its tabs switch the view in place and update the URL.
  - Do not link to `rusc.as.me` or `app.acuityscheduling.com` directly.
- **It's a static export,** so there's no `redirects()`, `headers()`, API routes or server actions. Redirects live in `public/_redirects` (Cloudflare Pages format).

## Migration log: static HTML → Next.js (2026-09-22)

The work was done on the `nextjs-migration` branch and merged into `main` the same day (step 8). Some steps were committed from GitHub Desktop while the work was in progress: step 3 is `07008f5` ("push"), and the font change in step 4 is `5558a28`.

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

### 3. Pages and components (commit `07008f5`, "push")
- **Routing:** two route groups, `app/(fr)` and `app/(en)`, each with its own root layout, so every page gets the right `<html lang>`. Pages:
  - `/`: `app/(fr)/page.tsx`
  - `/conditions/`: `app/(fr)/conditions/page.tsx`
  - `/en/`: `app/(en)/en/page.tsx`
  - `/en/terms/`: `app/(en)/en/terms/page.tsx`
- **Markup:** JSX ported from the old HTML with the same classes and inline styles. Fonts come from `next/font` (`app/fonts.ts`).
- **Components:**
  - page chrome: `Header`, `Footer`, `SectionHead`, `LegalPage` (the terms-page shell)
  - interactive (client components): `BookingEmbed`, `ContactForm`
  - `BookingButton`: an in-site booking link
  - `JsonLd`: schema.org data
- **`lib/`:**
  - `site.ts`: contact details, `FORM_ENDPOINT` and the base schema.org data
  - `acuity.ts`: Acuity owner ID, appointment types and the URL builder
  - `contact.ts`: the `mailto:` builder for the contact form
- **Images:** imported from `assets/` through `next/image`, so width and height come from the file. Below-the-fold images load lazily; the hero is eager with `fetchPriority="high"`.
- **SEO:** metadata (title, description, canonical, hreflang, Open Graph), JSON-LD, `app/robots.ts`, `app/sitemap.ts`, and `public/_redirects` (old `.html` URLs and old Squarespace paths).
- **Merge leftovers in the old FR `index.html`, fixed on purpose:**
  1. A stray `</div>` in `#tarifs` pushed the price grid outside `.wrap`, so the cards ran edge to edge. They are back inside.
  2. The "Conditions générales" link under the booking embed appeared twice, with an empty `<p>` after it. Only one remains.
  3. A stray `</article>` and a dead `data-sb-navigate` attribute were dropped.
- **Behaviour change (the owner asked that bookings stay on the site):** these buttons used to open `rusc.as.me/<slug>` in a new tab:
  - the two workshop cards
  - the six booking cards
  - "réserver un créneau"
  - the gift-voucher "+ info"

  They now load the matching Acuity page inside the embed. The appointment-type IDs in `lib/acuity.ts` come from where each `rusc.as.me` link redirects.
- **Booking embed loading order:** the iframe mounts after hydration, and only then does Acuity's `embed.js` load (via `next/script`). The script only attaches to iframes that already point at Acuity when it runs. Switching views clears the pinned iframe height so `embed.js` can measure the new page.

### 4. Checked against the old site
- **Method:** the old static site (`31c0342`) and the new `out/` were served side by side and compared element by element. Each visible element's position within its section, size, font, colour and text were compared at 1280×800 and 375×812, on `/`, `/en/`, `/conditions/` and `/en/terms/`.
- **Found and fixed:**
  - `next/image` writes `width`/`height` attributes, which made `.card .thumb` and `.about-ph img` as tall as the source photos. They now have `height:auto` (the last rule of `styles/home.css`).
  - "← Back to site" was split into two text nodes, which made it 1px wider. It's now a single string.
  - Jost italic was preloaded on every page, but only the hidden reviews block uses italic. It was dropped; `app/fonts.ts` explains how to add it back.
- **Result:** identical everywhere except the two intended FR fixes from step 3 (price grid back inside `.wrap`, duplicate terms link removed). Remaining differences aren't visible: `next/image` makes alt text transparent while an image loads, and Next adds `twitter:*` tags and an absolute `og:image` URL.
- **Booking embed, tested with real clicks:**
  - The scheduler loads on page load.
  - A workshop button opens that workshop (`appointmentType=…`).
  - The tabs switch to the catalog and to gift vouchers.
  - Each time, `embed.js` resizes the iframe and scrolls it into place just below the sticky nav.
- **Contact form:** `mailtoHref()` produces the same output as the old inline script, in both FR and EN.

### 5. Removed the static version
- Deleted:
  - the old pages: `index.html`, `en/index.html`, `conditions.html`, `en/terms.html`
  - `robots.txt` and `sitemap.xml`, which are now generated
  - `assets/acuity-embed.js`, replaced by `BookingEmbed`
- `README.md` is rewritten for Next.js (still in French). Deploying now means `npm run build`, then publishing `out/`.
- `.claude/launch.json` has two configs: `dev` (next dev) and `export` (serves `out/` on :8125).

### 6. Booking on its own page
- **New pages:** `/reserver/` and `/en/booking/`. Each holds the page title (an `h1` styled like the section titles), the Acuity embed, the payment note and the terms link. Nothing else, so a specific booking lands straight on its form.
- **Home pages:**
  - The FR home keeps its list of bookable items (`#reservation`, where it always was).
  - Every card button opens the booking page on that item: `?workshop=<slug>`, `?view=catalog` (membership) or `?view=gifts`.
  - General "Réserver" links (header, hero, generic cards) still scroll to that list.
  - EN has no list, so its booking links go straight to `/en/booking/`.
- **Deep links from the home workshop cards:** céramique 2h, modelage 2h, enfant, céramique 1j, céramique 2 jours and porcelaine all open their own workshop. Only "stages" and "ateliers réguliers" stay generic.
- **Shared components:** `Header` and `Footer` now take `lang` (and `page` for the header). Nav links point at `/#section`, so they work from any page, and the FR/EN switch keeps you on the same page.
- **URLs and SEO:**
  - The sitemap lists both booking pages with hreflang.
  - `public/_redirects` sends `/rserver`, `/cart`, `/appointments-1-2`, `/reservation` and `/en/reservation` to the booking pages, and `/atelier-cramique-2h` to that workshop.
- **Checked:**
  - The home sections have the same sizes as the verified port.
  - Clicking a list card opens `/reserver/?workshop=porcelaine` directly on that workshop.
  - The tabs update the URL.
  - `/en/booking/?view=gifts` opens on the gift vouchers.
  - No sideways scrolling at 375px.

### 7. Vercel preview project
- The repo's Vercel project (`rusc-preview`) had no framework preset, so it served `public/` (only `_redirects`) and returned 404 everywhere, even before the migration.
- `vercel.json` now pins `"framework": "nextjs"`. Vercel then builds the app and serves the static export at rusc-preview.vercel.app.
- This doesn't affect Cloudflare: that deploy still publishes `out/` with wrangler.

### 8. Pushed to `main`
- **Merge:** at 22:13, GitHub Desktop fast-forwarded `main` to `nextjs-migration` (`d2e916a`, steps 1–5) and pushed it.
- **Later commits:** step 6 (`012b84a`, booking pages) and step 7 (`fd35a29`, `vercel.json`) were committed straight on `main` and pushed. `nextjs-migration` was moved to the same commit; it has nothing extra and can be deleted.
- **Vercel production for `fd35a29` is live** at https://rusc-preview.vercel.app. All seven routes return 200: `/`, `/en/`, `/reserver/`, `/en/booking/`, `/conditions/`, `/en/terms/`, `/sitemap.xml`. It is the Next.js build:
  - `/_next/static/*` is served with `max-age=31536000, immutable`
  - routes are matched Next-style (`x-matched-path: /reserver`)
  - `/reserver` redirects with a 308 to `/reserver/`
- **Not updated yet:** rselavy.com (Cloudflare) still serves the old static site until the wrangler deploy under "Shipping" is run.
- **This documentation** (the "Shipping" section, this step, `CLAUDE.md`, README) was committed on `main` and pushed as well.
