<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# rūsc site: notes for agents

Bilingual marketing site for rūsc, a ceramics studio in Chamonix. Each language has a home page (`/`, `/en/`), a booking page (`/reserver/`, `/en/booking/`), a terms page (`/conditions/`, `/en/terms/`) and nine content pages (`PAGES` in `lib/routes.ts`).

- **Stack:** Next.js 16 (App Router, TypeScript), hosted on Vercel. Every page is prerendered at build time.
- **Hosting:** Vercel only.
  - The Vercel project `rusc-preview` is connected to this GitHub repo. Every push to `main` deploys to https://rusc-preview.vercel.app; other branches get preview deploys behind Vercel login.
  - The target domain, studio-rusc.com, isn't attached to Vercel yet. Squarespace Domains stays the registrar.
  - rselavy.com, the old static site's test domain on Cloudflare Pages, is no longer used.
- **Bookings:** Cal.com, embedded in the booking pages (`components/BookingEmbed.tsx`; config in `lib/cal.ts`).
  - For now the embed loads from cal.com's hosted app, account `rusc-studio`.
  - It moves to a self-hosted **Cal.diy** (the MIT fork of Cal.com) on Fly.io: apps `rusc-cal` and `rusc-cal-db`, at https://rusc-cal.fly.dev until `booking.studio-rusc.com` is attached. Setup lives in `deploy/cal/` (step 16). The site then only needs `NEXT_PUBLIC_CAL_ORIGIN` (and `NEXT_PUBLIC_CAL_USERNAME`) pointed at it.
  - Acuity, owner `19154889`, still runs the live studio-rusc.com until the switch.
- **Payments:** a site-wide cart (`lib/cart.ts`, `/panier/`, `/en/cart/`), paid with Stripe Checkout embedded in the cart page (`app/api/checkout/`). Vercel needs `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET` (step 14). Until they're set, the cart says online payment opens soon.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build (`.next/`); Vercel runs the same command |
| `npm run start` | Serve the production build locally |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |

## Shipping (pushing to `main`)

- **`main` is production.** Every push to it redeploys https://rusc-preview.vercel.app. Run `npm run build` and `npm run lint` first; both must pass.
- **Vercel builds this as a Next.js app** because `vercel.json` pins `"framework": "nextjs"`. Keep that file: without a preset, Vercel served only `public/` and every page was a 404.
- **Check a deploy without the dashboard:** `gh api repos/MohamedFekryyy/rusc-site/commits/<sha>/status` returns the Vercel state; then open the public URL. The Vercel tools here can't read build logs (401).
- **The owner also uses GitHub Desktop on this same checkout,** and may commit, push or switch branches while you work. Check `git branch --show-current` before every commit, and commit each step as soon as it's done.
- **Log each change** in the migration log below: what changed, why, and the commit.

## Rules of thumb

- **Keep the UI as it is.** The CSS was ported verbatim from the old static pages. Don't restyle anything unless asked.
- **FR and EN are separate pages, and they differ.** EN has no pricing section, membership band or booking cards, and its section IDs differ (`#workshops`, `#members`, `#about` versus `#ateliers`, `#membres`, `#us`). When content should stay in sync, edit both pages.
- **Link between the home and terms pages with plain `<a>`, not `next/link`.** The two page types style bare elements (`p`, `li`, `header`, `footer`) differently. Next.js does not unload global CSS on client-side navigation, so a `<Link>` would carry the home styles over into the terms page.
- **Bookings never leave the site.** This was the owner's explicit requirement.
  - Nothing on the site links to cal.com, the Cal.com instance, Acuity or `rusc.as.me`. The booker only ever appears as the inline embed on the booking pages.
  - Buttons that name a workshop or offer are `BookingButton`s. They link to our booking page with `?workshop=<key>` or `?view=catalog|gifts` (`bookingHref` in `lib/routes.ts`).
  - On the booking page, `BookingEmbed` lists the offers of each tab as cards. A session opens Cal's inline booker in place; a product (card, membership, gift voucher) goes straight into the cart. The tabs and the chosen offer update the URL.
  - If an event type doesn't exist yet, the booking page says it opens soon, with a contact link (Cal's `linkFailed` event).
  - Each session has two event types, `<key>-fr` and `<key>-en` (`OFFERS` in `lib/cal.ts`, `kind: "session"`), because the embed has no language parameter. Products need none.
  - Prices live in `OFFERS` (euro cents, TTC). The checkout route recomputes every total from them; never trust a price from the browser.
- **Keep secrets and client data out of the repo, which is public on GitHub.**
  - Keys go in `.secrets/`, which is git-ignored (the Cal.com key is `.secrets/cal.env`).
  - Client exports go in `data/`, also git-ignored (for example the Acuity CSVs).
  - Anything the site needs at runtime goes in Vercel's environment variables.
- **Hosting is Vercel (the owner's decision).** Ignore older instructions about Cloudflare Pages, a static export or `public/_redirects`, including in the Cal.com brief.
- **Redirects live in `next.config.ts`** (`redirects()`), and Vercel runs them. Old paths without an extension take two hops: the trailing slash is added first, then the redirect applies.

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

### 9. Vercel only (no Cloudflare)
- **Hosting:** the site is hosted on Vercel only. Cloudflare Pages hosted the old static site (rselavy.com, deployed with wrangler), and that setup is dropped. Mentions of Cloudflare and `out/` in steps 1–8 are history.
- **Normal Next.js build:** `output: "export"` is removed from `next.config.ts`. Every page is still prerendered (○ static). `trailingSlash` and unoptimised images are kept.
- **Redirects:** moved from `public/_redirects` (Cloudflare's format, which Vercel ignores) into `redirects()` in `next.config.ts`; `public/` is gone. Checked with `next start`:
  - old `.html` URLs redirect in one hop
  - `/about` goes to `/about/`, then to `/#us`
  - `/atelier-cramique-2h` lands on `/reserver/?workshop=atelier-ceramique-2h`
  - `/rserver` and `/cart` land on `/reserver/`
- **Smaller changes:**
  - `dynamic = "force-static"` is dropped from the robots and sitemap routes (only the static export needed it).
  - A `npm run start` script is added.
  - `.claude/launch.json` now has `dev` and `prod` (next start on :3001).

### 10. Acuity → Cal.com (other agent, 2026-09-23)
- **Why:** the studio is replacing Acuity. The brief from the studio's other agent lists three reasons: Acuity blocks API use, bilingual booking is clumsy, and the studio doesn't own its client list.
- **The plan:**
  - Cal.com takes bookings and payments (Stripe), with bilingual `-fr`/`-en` event-type pairs.
  - Brevo is proposed for the client list: about 688 unique clients from the Acuity export.
  - The 10% member discount is deferred.
- **Code:** commits `ea5697b` … `37f4fc6` added `lib/cal.ts` (`CAL_USERNAME`, the `SERVICES` slug pairs, `VIEW_SLUGS`) and re-pointed `BookingButton`/`bookingHref` at Cal.com. They also removed `lib/acuity.ts`.

### 11. Embed-only booking and self-hosting readiness (`dd61517`, `792f3fb`)
- **Secrets guard:** `.secrets/` and `data/` were not git-ignored, so one "commit all" would have published the Cal.com key and client exports. Both are now ignored.
- **Real inline embed:** the step 10 embed rendered a plain link to cal.com, and its tabs linked to cal.com too. `BookingEmbed` now:
  - loads Cal.com's embed script through a small loader, written against Cal's `window.Cal` queue contract (Cal's embed npm packages are under a commercial license, so they aren't bundled);
  - mounts the inline booker with one Cal namespace per view, since one namespace holds one iframe;
  - styles it with the site's accent colour.
- **Username:** `rusc-studio`. The account was created as `fekry-aiad-qijijq` and later renamed. Commit `7a0fae0` pointed the site back at the old name, which now answers 404, so it was reverted. Checked 2026-09-23: `cal.com/rusc-studio` answers 200 and `cal.com/fekry-aiad-qijijq` 404. Load the page before changing the username.
- **Header:** "Connexion" used to open cal.com in a new tab. It now leads to the member area, because Cal.com has no client login.
- **Checked** with `next start`, in the browser:
  - `?workshop=porcelaine` falls back to the account page, because that event type doesn't exist yet.
  - Choosing an event opens the calendar inside the page, and the address stays on the site.
  - The tabs switch in place.
  - `/en/booking/` works; there's no sideways scroll at 375px; no console errors.
- **Self-hosting (Cal.diy):**
  - The `calcom/cal.com` repo is now `calcom/cal.diy`: an MIT community fork with the enterprise features removed (Teams, Organizations, Insights, SSO/SAML, and **Workflows, so no automated reminder emails**).
  - It still includes the Stripe payment app, the embed and API v2.
  - Recommended deploy: the Docker image `calcom/cal.diy`, with PostgreSQL 13+ and Node 18+. On Vercel it needs the Pro plan (serverless function limits).
  - Required env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY`, `NEXT_PUBLIC_WEBAPP_URL`, plus SMTP for emails and Stripe keys for payments.
  - Once it runs, set `NEXT_PUBLIC_CAL_ORIGIN` (and `NEXT_PUBLIC_CAL_USERNAME`) in Vercel and redeploy.
- **Still open** (decisions for Raquel and Fekry):
  - where to host Cal.diy;
  - the event types and prices;
  - whether the member discount is manual or automatic. The booking pages currently say it "s'applique automatiquement" / "is applied automatically", which Cal.com doesn't do;
  - Brevo for the client list.

### 12. Booking server on Hetzner (`deploy/cal/`)
- **Owner's decisions (2026-09-23):** a new Hetzner server (not Lena's), at `booking.studio-rusc.com`, with Brevo sending the emails. The site stays on Vercel. Vercel would have needed the Pro plan: Cal.diy has too many functions for Hobby, and its crons run every minute.
- **Image:** Cal.diy publishes no Docker image (the last tag, v6.2.0, predates the fork and still contains enterprise code), and its build needs about 6 GB of memory.
  - `.github/workflows/cal-image.yml` builds `ghcr.io/mohamedfekryyy/rusc-cal:<12-char sha>` from the `calcom/cal.diy` commit pinned in `deploy/cal/CAL_DIY_REF`.
  - It uses the same build arguments as Cal.diy's own release workflow, with placeholder secrets only.
  - It runs when `CAL_DIY_REF` changes, or by hand.
- **Server stack** (`deploy/cal/docker-compose.yml`): Cal.diy, Postgres 16, Caddy (HTTPS), a cron loop and nightly `pg_dump` backups. Only Caddy is published.
  - The cron loop hits `/api/tasks/cron` every minute, plus the calendar and cleanup endpoints, on Cal's Vercel schedule.
  - `setup.sh` generates the secrets into `.env` on the server; `update.sh` pulls and restarts.
- **Sign-up:** Caddy returns 404 for `/signup*` and `/api/auth/signup*`. The Dockerfile doesn't pass `NEXT_PUBLIC_DISABLE_SIGNUP` through, so a build argument would be ignored. The first admin account comes from `/auth/setup`, which Cal.diy only allows while there are zero users.
- **Not run end to end yet.** Checked so far: the YAML parses, the shell syntax is valid, and the `.env` generation was simulated. The first setup on the server (`deploy/cal/README.md`) is the real test.

### 13. Booking page, header and scrolling (2026-09-23)
- **Booking page** (`ae42c5f`, `6746a6c`, `4182ec1`): each tab lists its offers as cards (`OfferCard`: photo, a thin lucide icon, title, price, button). Choosing a session opens its Cal booker in place, with a link back to the list.
- **Deep links** (`cefdd23`): buttons on the content pages open their exact offer (`BookingButton workshop=…`).
- **Old carnets and vouchers** (`a262813`): the booking pages say they stay valid, and to write to the studio with the code (see step 15).
- **Menu** (`ea184da`, committed from GitHub Desktop): the panel and its scrim now render after `<header>`. The header's `backdrop-filter` made it the containing block of its fixed children, so the panel covered the X and the scrim only covered the header strip.
- **Phones** (`9c91503`): at ≤560px the header is two rows (menu, logo, Réserver / FR-EN, Connexion, Panier), so nothing overlaps.
- **Smooth scrolling** (`b83891f`): Lenis with `lerp: 0.2` (a light effect), off for `prefers-reduced-motion`. `html{scroll-behavior:smooth}` was removed from `home.css`, since the two fight. The menu panel has `data-lenis-prevent` so it scrolls on its own.

### 14. Cart and Stripe (2026-09-23)
- **Why:** the owner wants a Shopify-style cart for everything the studio sells, paid without leaving the site.
- **Offers** (`2320feb`): each offer in `lib/cal.ts` has a `kind` (`session`: a dated booking; `product`: cards, membership, gift vouchers) and a `price` in euro cents, TTC.
- **Checkout** (`1692fdf`):
  - `POST /api/checkout/` builds a Checkout Session in embedded mode (`ui_mode: "embedded_page"`, `redirect_on_completion: "never"`) from offer keys and quantities. Prices come from `OFFERS` on the server.
  - The session metadata lists the order (`items_1`, `items_2`, …: `<key>x<qty>[@<Cal booking uid>]`).
  - `POST /api/stripe/webhook/` checks the signature and logs paid orders (session id and metadata only).
- **Cart** (`6bb4477`): kept in `localStorage` (`rusc-cart-v1`) and synced across tabs. The header shows the item count. `/panier/` and `/en/cart/` (noindex) list the lines, then mount Stripe's checkout in place.
- **Booking page** (`fd3f9b4`): products get an "add to cart" button. A booked session (Cal's `bookingSuccessfulV2`) joins the cart with its date, to be paid there.
- **Trailing slash** (`6021189`): with `trailingSlash`, `/api/checkout` answered a 308 first, so the cart calls `/api/checkout/`. Register the webhook in Stripe **with** its slash, `https://<site>/api/stripe/webhook/`, because Stripe does not follow redirects.
- **To go live:**
  - In Vercel, set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_WEBHOOK_SECRET` (webhook event: `checkout.session.completed`).
  - In Cal, turn on "requires confirmation" for the sessions (`deploy/cal/README.md`).
  - Until the keys are set, "Payer" says online payment opens soon and links to the contact page.
- **Fulfilment is manual for now:** the studio sends voucher and card codes, and confirms paid Cal bookings. Member prices are not applied online; that decision is Raquel's.
- **Checked** with `next start`:
  - a real click adds a gift voucher, and the header count updates;
  - the quantity buttons update the total;
  - the "opens soon" fallback shows;
  - both API routes answer 503 without keys.

### 15. Continuity with the old system
- **Data:** the owner provided three Acuity exports: orders, the schedule up to 2026-09-22, and the client list. They stay in `data/` (git-ignored). Nothing from them goes in the repo or in chat beyond counts.
- **Findings:** the exports show prepaid carnets with hours or sessions left, and gift vouchers sold within the last year. But the orders export has no codes, so no carnet or voucher can be checked against it.
- **Before the switch:**
  - export the certificates/codes list with balances from Acuity;
  - get the member list (there is no membership export);
  - re-export future bookings on switch day.
- **Until then:** the booking pages ask customers to write with their code (step 13).

### 16. Booking server on Fly.io instead of Hetzner (`deploy/cal/`)
- **Owner's decision (2026-09-23):** Fly.io, where he already has an account, instead of a new Hetzner server. It costs more: about $15/month against about €5 for a Hetzner CX22.
- **Two apps** in the `personal` organisation, region `ams`. It is the cheapest EU region on Fly: `fra` costs about 15% more, `cdg` about 25% more.
  - `rusc-cal` (`fly.toml`): the same Cal.diy image, shared-cpu-1x with 2 GB, always on. `cron.sh` runs in the background of the same machine.
  - `rusc-cal-db` (`fly.db.toml`): `postgres:16-alpine`, 512 MB, a 1 GB volume with daily snapshots kept 14 days. It has no public address; Cal.diy reaches it at `rusc-cal-db.internal:5432`.
- **No Caddy:** Fly serves HTTPS.
  - Sign-up is closed with Cal.diy's `disable-signup` feature flag, a row in the `Feature` table. At the pinned commit, both the sign-up API and the sign-up page check it.
  - `/auth/setup` ignores the flag: it only checks that no user exists. `setup.sh` turns the flag on as soon as the migrations have created it.
- **Secrets:** `setup.sh` generates them with openssl and pipes them into `fly secrets import`, so they are never printed or written to disk. The Brevo SMTP login is set by the owner with `fly secrets set`.
- **Removed:** the Hetzner-only files (`docker-compose.yml`, `Caddyfile`, `backup.sh`, `example.env`, `update.sh`). They are in `5c01a68` if needed. `deploy.sh` replaces `update.sh`.
- **Checked:**
  - `fly config validate --strict` passes for both configs;
  - the scripts parse (`sh -n`);
  - the image is public on GHCR (anonymous pull of the manifest answers 200);
  - the image has `wget` for the cron loop.
- **Not deployed yet.**
