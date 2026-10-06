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
  - The embed loads from the studio's self-hosted **Cal.diy** (the MIT fork of Cal.com) on Fly.io, account `raquel`: apps `rusc-cal` and `rusc-cal-db`, at https://rusc-cal.fly.dev until `booking.studio-rusc.com` is attached. Setup lives in `deploy/cal/` (steps 16–17).
  - People can book a class until 30 minutes after it starts (`deploy/cal/patches/late-booking.patch`, step 28).
  - **The studio's back office is one web app, rūsc admin** (`rusc-admin` on Fly, `deploy/admin/`, steps 18, 20 and 29), in French or English:
    - classes as a list, a month calendar or one day, with who's coming, how each paid, and Acuity's history;
    - clients;
    - codes (carnets, gift vouchers, codes issued for sales at the studio);
    - orders;
    - the timetable (Horaires).

    The booking page takes a class off a code through its API instead of sending it to the cart.
  - **Member accounts** (the site's Connexion page, step 31) are served by rūsc admin too (`/api/auth/*`).
  - Acuity, owner `19154889`, still runs the live studio-rusc.com until the switch.
- **Payments:** a site-wide cart (`lib/cart.ts`, `/panier/`, `/en/cart/`), paid with Stripe Checkout embedded in the cart page (`app/api/checkout/`). Both keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) are in Vercel since 2026-09-24, so the cart takes live payments (step 25); without them it would say online payment opens soon. Stripe's webhook goes to rūsc admin (`https://rusc-admin.fly.dev/stripe/webhook`, secret `STRIPE_WEBHOOK_SECRET` in its Fly secrets), which records orders, marks paid places and creates the codes for carnets and vouchers bought online (step 21).

## Where things stand (updated 2026-10-06)

Keep this section current; the migration log below keeps the history.

**Live**
- **Site:** https://studio-rusc.com and www (on Vercel, checked 2026-10-06: `server: Vercel`, today's build), also https://rusc-preview.vercel.app; built from `main`. Whether the other switch-day steps were done (Acuity imports re-run, Acuity stopped) isn't recorded here: ask the owner.
- **Booking:** Cal.diy on Fly (`rusc-cal`, account `raquel`) at https://booking.studio-rusc.com (the site's `NEXT_PUBLIC_CAL_ORIGIN`), one event type per class, embedded in the booking pages. Bookable until 30 minutes after a class starts (step 28). The booker follows the page's language, French in 24-hour time (step 34).
- **Places** (step 34): a class booked on the site goes to the cart, its places held 30 minutes (40 while paying), then freed unless paid. "Nombre de places" in the booker and + / − in the cart add or remove places for friends, up to the class's seats; "Retirer" frees them at once. Payment is per place (`rusc.paid_seats`, codes, Acuity). Open studio: members pick 1–4 hours in a row, and the cart holds them as one line (step 47).
- **Payments:** Stripe, live mode, account "Studio-rusc". Both keys are in Vercel. The webhook `we_1UIvjEBwkJn18YegcHTOBfMr` → `https://rusc-admin.fly.dev/stripe/webhook`. Until 2026-10-03 the webhook failed on any cart with a class (step 34); no real order had been paid yet.
- **Member price and codes in the cart** (Rrose, 2026-10-01, `64228bb`, `ef0afbd`; not yet checked end to end): signed-in members get 10% off classes and carnets at checkout (`lib/pricing.ts`; `MEMBER_DISCOUNT_PERCENT=0` in Vercel turns it off), and a euro code can pay part of a cart.
- **Gift vouchers:** fixed ones, and one of any amount (10–1,000 €, step 32), which becomes a euro code for every class.
- **Member accounts** (`/connexion/`, `/en/login/`): sign-up, sign-in, and the member's space (membership, coming classes, codes, past classes including Acuity's). The booking page fills in a signed-in member's name and e-mail (step 31).
- **rūsc admin** (`rusc-admin` on Fly), in French and English:
  - Cours (list, month calendar, day, with Acuity's history on past days);
  - Clients;
  - Codes;
  - Commandes (online and Acuity);
  - Horaires (step 29);
  - **+ Nouveau cours** (step 36): the studio creates a class (names FR/EN, price, length, places, photo, codes it takes, first session). rūsc admin makes its Cal event type like the seed script does; the booking page, cart, checkout, codes, Cours and Horaires all take it in.
  - **Modifier** (step 37): the same form edits the nine built-in classes too (names, price line, price, photo, description, length, places; hide). The site's own pages (Cours, Stages, Membres, home) keep their hand-written prices.
  - **At the desk** (step 45), in Cours:
    - "Encaisser" records a place paid at the studio (cash, card or offered);
    - "Venu·e / Absent·e" ticks who came, and a client's page counts their no-shows;
    - "Ajouter" books someone into a class (phone or walk-in) without Cal's booker, paid later, at once, or with a code.
  - Look (step 44): Geist, white cards on the warm canvas, pill controls, tinted badges, Iconsax icons (as on the site).
  - At-the-desk speed (step 46): desk actions update their class without a reload. "Aujourd’hui" sums up what's left. "Tout le monde est venu" ticks everyone at once. "Ajouter" suggests known clients and checks a code as it's typed.
- **Acuity continuity:**
  - 46 codes still worth something, and the 1 upcoming booking;
  - the whole history: 1,616 appointments, 216 orders, 730 clients plus 92 people under shared e-mails (step 30, `scripts/continuity/README.md`);
  - every URL of the old Squarespace site lands on a page of the new one (step 33).

**Waiting on the owner (Fekry)**
- **A small real purchase** in the live cart, then a refund in Stripe: a 10 € gift voucher, and one class. It checks payment, webhook, Commandes, the paid place in Cours and the code on the thank-you screen.
- **Booking emails (Resend):** the key in `rusc-cal` is valid, but studio-rusc.com isn't verified in Resend yet: add its 4 DNS records at Squarespace. Until then every Cal e-mail fails (logged, nothing sent). The sender is `EMAIL_FROM` in `deploy/cal/fly.toml`, now `rrose@studio-rusc.com`: pick the studio's address before e-mails go out.
- **One booking to check:** tournage, 22 October, unpaid, made on 3 October under a business address (not Gmail). It doesn't expire on its own. The 11 other unpaid test bookings of 2–3 October were freed on 2026-10-03 (owner's decision).
- **Domains:** studio-rusc.com is on Vercel (done), `booking.` serves Cal, and `SITE_ORIGIN` in `deploy/admin/fly.toml` is already `https://studio-rusc.com`. Optional: `admin.` on Fly.
- **Acuity key:** reset it in Acuity after the switch. Its copies in Vercel were removed (step 33).

**Decisions for Raquel**
- **Timetable:**
  - the children's class: 14:00–16:00 in Acuity, 13:30–15:30 on the site;
  - porcelain: 11:00 in Acuity, 10:00 on the site;
  - raw-glaze decoration on Thursdays or not;
  - school holidays (now closed from Horaires).
- **2-day gift voucher:** 260 € in Acuity, 280 € on the site. An imported 260 € voucher can't fully pay a 280 € class.
- **Member prices online:** the site shows them (10% off classes and carnets), but checkout still charges full price. Accounts now make it possible (next for agents), once Raquel confirms which items.
- **Members:** Acuity had no export of them. The studio marks each current member on their page in rūsc admin (Clients → "Membre jusqu’au").
- **2-hour carnets:** should the admin's 2-hour carnet presets also cover the children's class, as Acuity's carnets did?
- **Deleted Acuity products:** codes of products since deleted in Acuity (for example old 50/100/150 € value vouchers) weren't imported. If a customer shows one, create it by hand in rūsc admin.
- **Auto-cancel of unpaid bookings** (Rrose, `44d4ece`, 2026-10-06): meant to cancel every Cal booking still pending and unpaid an hour after it was made. Its loop threw on every run, which made most place holds and checkouts fail with a 500 from 09:03 UTC; step 36 contains the error, so nothing is cancelled. Fixing the loop turns it on, and it would at once cancel the unpaid 22 October booking (above), and a whole class booking if any one seat in it is unpaid. Decide before turning it on.
- **Layout changes since 24 September** (Rrose; Raquel says the look kept changing without her asking): the pot & wine banner on the home pages (`39957b6`), full-width stacked buttons on phones and even section padding (`97f77eb`, `85e7849`, `24ccea5`), pill navigation on long pages, a direct "Book a course" button (`0a7f8e9`), the site header and footer on the terms pages (`15194bd`). The hero photo is the original again (`edd349c`). Keep or undo each, then change nothing visual without her say.
- **A membership in her cart she didn't add:** no code adds one by itself. The cart is kept in the browser with no expiry, and "Adhérer" on the membership card adds it straight away. Her screenshot would tell which.

**Next for agents**
- **E-mails after payment:** once Resend works, Cal e-mails at booking time, before payment ("request received", and the studio gets a confirmation request for each cart booking). Better: turn Cal's class e-mails off (a patch: Cal.diy has no workflows) and have rūsc admin send "your place is confirmed" from the Stripe webhook.
- **Check member prices and codes in the cart end to end** (built by Rrose, not tested here).
- **Password reset by e-mail**, once Resend works. Today the studio makes a link from the client's page.
- **Switch day:** re-run both Acuity imports (`scripts/continuity/README.md`), then follow "Bascule finale" in `README.md`.

**How agents work here**
- **Secrets:** never ask for, read or paste a key.
  - Write a small script that asks for it hidden (`read -s` or `stty -echo`) and pipes it into `vercel env add` or `fly secrets import`.
  - Open it in the owner's terminal, and let them paste.
- **Client data** (names, e-mails, codes): never in chat or in the repo. Report counts only.
  - Profile a new file by its header and value shapes first. Acuity's client list has no clean header and uses `;`, and a naive read printed one row (2026-09-24).
- **Studio accounts:** don't sign in to rūsc admin or Cal as the studio.
  - To see the admin, use its local preview (`deploy/admin/preview.mjs`).
  - The Acuity admin is the studio's account: only use it in the owner's browser, with their go-ahead.
- **Tests on live systems:** clean up after yourself. For example, a throwaway member account made to test sign-in is deleted right after (step 31). A test booking is freed with the cart's "Retirer" (or its hold run out), which cancels it in Cal.
- **Say "done" only after seeing it work** where Raquel will: the live site, in a real browser, French and English. Cal's booker is a cross-origin frame: screenshots and the network log are the only view into it.
- **Cal image:** each push to `deploy/cal/patches/` builds for about 13 minutes. Check the whole patch set applies on the pinned source first (`deploy/cal/patches/README.md`), batch changes, then `sh deploy/cal/deploy.sh` (it warms the bookers up).

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
  - Each session is **one** Cal event type, slug = its key (`OFFERS` in `lib/cal.ts`, `kind: "session"`), so French and English bookings fill the same places. Its French title and description carry an English translation (Cal's `EventTypeTranslation`), shown to visitors whose browser is in English; Cal's own labels follow the browser too. Products need no event type.
  - Classes the studio creates in rūsc admin (step 36) are sessions too, but they live in `rusc.classes` and Cal, not in `OFFERS`: the site loads them from rūsc admin's `GET /api/classes` (`lib/classes.ts`, `ClassOffer` in `lib/cal.ts`). Code that looks up an offer goes through `offerByKey`, which knows both.
  - Prices live in `OFFERS` (euro cents, TTC) for products. For classes, `rusc.classes` decides: the classes made in rūsc admin, and the nine of `OFFERS` as edited there (their values in `OFFERS` are only what shows until rūsc admin answers). The checkout route recomputes every total from them, and refuses a class when rūsc admin can't be reached; never trust a price from the browser.
  - `deploy/cal/seed-classes.mjs` skips every class with a row in `rusc.classes` (all nine have one): rūsc admin owns them now.
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
  - (Cal's classes are seated, so a booking holds its place at once; see step 17.)
  - Until the keys are set, "Payer" says online payment opens soon and links to the contact page.
- **Stripe account and webhook (2026-09-23):** the studio's Stripe account is "Studio-rusc" (live mode).
  - The owner logged the Stripe CLI in (live access only), and the live webhook endpoint `we_1UIvjEBwkJn18YegcHTOBfMr` was created from it: `checkout.session.completed` → `https://rusc-preview.vercel.app/api/stripe/webhook/`.
  - ~~When the site moves to studio-rusc.com, update its URL.~~ Superseded: since step 21 the webhook goes to rūsc admin (`https://rusc-admin.fly.dev/stripe/webhook`), which the site's domain change doesn't affect.
  - The owner pastes the keys and the endpoint's signing secret into Vercel; agents never handle them.
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
- **Owner's decision (2026-09-23):** Fly.io, where the owner already has an account, instead of a new Hetzner server. After downsizing (below) it costs about $8/month, against about €5 for a Hetzner CX22. The site itself stays on Vercel (owner: "keep front end on vercel, backend on fly").
- **Two apps** in the `personal` organisation, region `ams`. It is the cheapest EU region on Fly: `fra` costs about 15% more, `cdg` about 25% more.
  - `rusc-cal` (`fly.toml`): the same Cal.diy image, shared-cpu-1x with 1 GB plus 1 GB of swap, always on. `cron.sh` runs in the background of the same machine.
  - `rusc-cal-db` (`fly.db.toml`): `postgres:16-alpine`, 256 MB plus 512 MB of swap (`shared_buffers=64MB`, `max_connections=30`), a 1 GB volume with daily snapshots kept 14 days. It has no public address; Cal.diy reaches it at `rusc-cal-db.internal:5432`.
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
- **Deployed 2026-09-23** with `setup.sh`: https://rusc-cal.fly.dev. The first boot ran at 2 GB/512 MB; then both were downsized at the owner's request (about $15 → $8/month).
- **Memory:** Cal.diy's own `yarn start` goes through yarn → turbo → yarn → `next start`, and those launchers used about 330 MB of the 1 GB. `deploy/cal/start.sh` repeats the image's start steps and runs `next start` directly. Result: about 525 MB used, 435 MB available, swap unused. When updating Cal.diy, compare `start.sh` with the image's `scripts/start.sh`.
- **Background tasks, checked at the pinned commit:**
  - `/api/cron/credentials` and `/api/cron/queuedFormResponseCleanup` are listed in `vercel.json` but answer 404, so they're left out.
  - `/api/tasks/*` only accept `authorization: Bearer <CRON_SECRET>`.
  - `/api/cron/bookingReminder` (POST, every 15 minutes, raw `CRON_API_KEY` header) reminds the studio of bookings still waiting for confirmation. It was added, since the sessions use "requires confirmation".
- **Checked live:**
  - `/signup` redirects to "Signup is disabled in this instance";
  - `/auth/setup` is open (no user yet);
  - `/embed/embed.js` answers 200;
  - the `disable-signup` row is `true`;
  - the cron loop runs every minute.
- **Left for the owner:**
  - create the admin account at `/auth/setup`, then the event types;
  - Brevo SMTP (`fly secrets set`);
  - the `booking.studio-rusc.com` certificate and DNS;
  - the site's `NEXT_PUBLIC_CAL_ORIGIN` and `NEXT_PUBLIC_CAL_USERNAME` in Vercel.

### 17. The classes in Cal, and the site switched to it (2026-09-24)
- **Timetable from Acuity**, read from its public booking API, which carries no client data: `scripts/continuity/acuity-classes.mjs`, output in `data/acuity/`. Weekly classes:
  - tournage 2h, 7 places: Mon 16:00, Tue 18:30, Wed 18:00, Thu 17:00
  - modelage 2h, 8 places: Mon 16:00, Thu 17:00
  - décor à cru 1h, 8 places: Mon 16:00, Tue 18:30, Wed 18:00
  - cours enfant 2h, 8 places: Wed 14:00
  - atelier libre, 7 places, 1-hour slots: Tue 9–14, Thu 14–18
- **Dated classes:**
  - céramique 1j on 10 and 11 Oct (7 places);
  - 2j on 10–11 Oct;
  - porcelaine on 1 Nov 11:00, 6 h;
  - Pot & Wine on 9 Oct 18:00, 2 h 30, 8 places. It was an Acuity class missing from the site; it's now an offer (`pot-and-wine`, 75 €).
- **Setup script:** `deploy/cal/seed-classes.mjs` writes one schedule per class and a `-fr` and `-en` event type per class for `raquel`, with:
  - `interfaceLanguage` (a French or English booker);
  - times locked to Europe/Paris;
  - seats;
  - `disableGuests`;
  - a 30-minute slot interval (Cal only starts slots on multiples of the interval past the hour, and the Tuesday classes start at 18:30);
  - hidden from the profile page. Cal's sample types are hidden too.
- **Running SQL on the database:** `deploy/cal/db-run.sh` goes through the Machines API in 4 KB pieces. Uploads over `fly ssh` (stdin, sftp, long commands) stalled from this network, and the API refuses bigger commands.
- **Parallel classes** (`47c4a7f`): stock Cal.diy counts a booking of any event type as busy time for the host, so Monday 16:00 tournage would have blocked modelage and décor à cru.
  - `deploy/cal/patches/parallel-classes.patch` (applied by the image workflow, image tag `<commit>-<patches hash>`) counts only bookings of the same event type.
  - Checked live with a temporary booking: modelage stayed open next to a booked tournage slot, and the tournage slot closed.
- **Site** (`eb94d414`): `CAL_ORIGIN` defaults to `https://rusc-cal.fly.dev` and `CAL_USERNAME` to `raquel`, so "opens soon" became the real calendar.
- **Differences to confirm with Raquel:**
  - the Cours page says the kids' class is 13h30–15h30, but Acuity says 14h–16h (Cal follows Acuity);
  - the Stages pages say porcelaine is 10h–17h, but Acuity says 6 h from 11:00;
  - the site lists décor à cru on Thursdays too; Acuity doesn't;
  - a gift voucher for 2 days is 260 € in Acuity and 280 € on the site;
  - school holidays (kids' class) have to be blocked in Cal as date overrides.

### 18. Codes: carnets, vouchers and studio-issued codes (`deploy/codes/`, 2026-09-24)
- **Why:** members book with their Acuity codes, and the studio sells carnets in person (cash or card, outside the site). It needs to create codes for any class that customers then use online.
- **Service** (`b301694f`): `rusc-codes` on Fly (Node + `pg`, 256 MB, auto-stop, so it costs almost nothing).
  - Its tables are `rusc.codes` and `rusc.uses`, in the Cal database under the role `rusc_codes`, which can only read Cal's `Booking`, `BookingSeat`, `EventType` and `Attendee`.
  - `/admin` (Basic auth; the studio sets `CODES_ADMIN_PASSWORD`) creates codes from presets (carnet 5/10 cours 2h, atelier libre 10/20 h, gift vouchers, an amount in €), lists balances and uses, adjusts with a reason, and pauses codes.
  - The API: `POST /api/check`, `POST /api/redeem`.
- **Booking page** (`6eacc8f9`): a code row above each class's calendar.
  - Once a code is accepted, the class booked is taken off it, using the seat reference from Cal's `bookingSuccessful` event (V2 has no seat). If that fails, the class goes to the cart.
  - `lib/codes.ts` holds the client; `CODES_ORIGIN` defaults to `https://rusc-codes.fly.dev`.
- **Cancellations:** a use whose seat disappears, or whose booking is cancelled, gives the amount back. Checked at most every 5 minutes, on requests.
- **Checked:**
  - on Fly, with a temporary code and booking (removed afterwards): check; refused for another class; redeem 2 → 1; a second redeem refused; cancellation 1 → 2;
  - in the browser: an unknown code shows "Code inconnu.", a valid one shows its balance. The site's global `form{}` rule (contact form) had to be overridden on the code row.
- **Left:**
  - the studio sets the admin password;
  - import the Acuity codes with their balances (needs the codes list);
  - carnets and vouchers bought online could create their code from the Stripe webhook; for now the studio creates them in `/admin`.

### 19. One event type per class (`7fa2ebc4`, 2026-09-24)
- **Bug:** step 17 made two event types per class (`-fr`, `-en`), each with its own seats. With the parallel-classes patch, 7 French and 7 English bookings could fill a class with 7 wheels.
- **Fix:** `deploy/cal/seed-classes.mjs` now makes one event type per class (slug = the offer key), with the French title and description and English `TITLE`/`DESCRIPTION` rows in `EventTypeTranslation`. The booker picks the translation from `navigator.language` (`apps/web/modules/bookings/components/EventMeta.tsx`); `interfaceLanguage` is left empty so Cal's labels follow the browser.
- **Migration:** each `-fr` type was kept under the plain key, the bookings of the `-en` one moved onto it (one real booking: tournage 2h, Tue 29 Sept 18:30), and the `-en` types were removed. The site books `raquel/<key>` from both languages.
- **Checked live:** an English browser sees "wheel throwing 2h", and Tue 29 at 18:30 shows 6 places left out of 7.

### 20. One admin app: rūsc admin (2026-09-24)
- **Owner's decision:** "all admin should be one web app". The codes service became rūsc admin: `deploy/codes/` moved to `deploy/admin/`, and the Fly app `rusc-codes` was replaced by `rusc-admin`, which has a new database password for the same role `rusc_codes`. The site's `CODES_ORIGIN` now defaults to `https://rusc-admin.fly.dev`.
- **Sign-in:** a `/login` page (one password, `CODES_ADMIN_PASSWORD`) sets a signed HttpOnly cookie for 30 days, keyed on the password, so changing the password signs everyone out. It replaces HTTP Basic. Login attempts are rate-limited.
- **Menu:**
  - **Cours:** each class of the coming 14 (or 30) days, from Cal's schedules plus its bookings, with attendees (name, email, phone), places taken and payment. A code payment shows the code; others show "à vérifier" until card payments are recorded.
  - **Codes:** as in step 18.
  - **Commandes** and **Horaires:** coming next.
- **Next:**
  - Stripe notifies rūsc admin, so card-paid classes show as paid and online carnets/vouchers get their code. The signing secret goes into rusc-admin's Fly secrets, and Vercel keeps only the two keys.
  - The cart must store each class's seat reference.

### 21. Commandes: online orders in rūsc admin (2026-09-24)
- **Seats in the cart:** a class line now remembers the person's Cal seat (`seatReferenceUid` from the V1 `bookingSuccessful` event, which now handles both the cart and codes; V2 is only a fallback). Two places in the same class are two lines. The checkout's order summary uses the seat (`<key>x1@<seat>`).
- **Stripe → rūsc admin:** `POST /stripe/webhook` checks Stripe's signature itself (HMAC-SHA256 over `<t>.<body>`, 5-minute tolerance, no library). On `checkout.session.completed`, `recordOrder()`:
  - records the order once (`rusc.orders`);
  - marks paid seats (`rusc.paid_seats`);
  - creates one code per carnet or gift voucher bought (presets, source `online`, holder = the buyer);
  - records memberships (`rusc.members`, one year).
- **The site's webhook route** (`app/api/stripe/webhook/`) was removed. Vercel now only needs the two Stripe keys.
- **Thank-you screen:** the cart keeps the Checkout Session id and polls `GET /api/order?id=cs_…` (up to about 30 s) to show the new codes to the buyer.
- **Admin pages:**
  - **Commandes** lists orders: date, buyer, what was bought, total, codes created.
  - **Cours** shows "Payé en ligne" for paid places, and "à régler" for unpaid ones once Stripe is linked.
- **Checked locally with a fake database and a local-only test secret:**
  - a valid signature is accepted, and forged, tampered or 1-hour-old ones are refused;
  - a mixed order (carnet 10, 2 gift vouchers, membership, one class) created exactly 1 + 2 codes, the member and the paid seat;
  - the Commandes page renders.
- **Live:** the tables exist, and `/stripe/webhook` refuses unsigned calls.
- **For the owner:**
  - point the Stripe webhook endpoint (`we_1UIvjEBwkJn18YegcHTOBfMr`) at `https://rusc-admin.fly.dev/stripe/webhook`;
  - save its signing secret in rusc-admin (`fly secrets set -a rusc-admin STRIPE_WEBHOOK_SECRET=…`);
  - put the two keys in Vercel.

### 22. rūsc admin in French and English (`30dc5471`, 2026-09-24)
- **Owner's request:** an FR · EN switch in the admin. The links in the header (and on the sign-in page) set the cookie `rusc_lang` for a year and return to the same page, view included. French is the default.
- **In the code:** `tr("français", "English")` picks the page's language, which `AsyncLocalStorage` carries through each request. Dates and amounts follow it (`fr-FR` / `en-GB`). Offers, presets and products have both labels. Codes bought from the English site get English labels (the order's `metadata.lang`).

### 23. Acuity's codes and bookings carried over (2026-09-24)
- **Why:** continuity is a must. Anyone holding an Acuity carnet, open-studio hours or a gift voucher must be able to use its code on the new site.
- **How:** Acuity's API is closed on the studio's plan (403), so the data comes from its admin pages.
  - `scripts/continuity/acuity-extract.js` runs in the Acuity admin page, signed in as the studio. It reads every code of the 10 packages and gift certificates: all the `viewCodes` pages, 15 codes each, since the edit page only shows the oldest 15. It also reads the classes each code is valid for, and the upcoming appointments from Acuity's CSV export.
  - It sends them to rūsc admin's `POST /import/acuity`, which keeps them as received (`rusc.imports`). That route only exists while the Fly secret `IMPORT_TOKEN` is set, and only answers Acuity's admin. The secret was unset right after.
  - `scripts/continuity/acuity-apply.sql` (`sh deploy/cal/db-run.sh scripts/continuity/acuity-apply.sql`) turns the latest import into codes and Cal places, inside the database. It prints counts only. For a dry run, change its last `COMMIT;` to `ROLLBACK;`.
- **Conversion:**
  - Minutes become classes (2-hour cards) or hours (open studio), rounded down to a half. Euro vouchers stay in euros, and a booking takes the class price.
  - A code never used shows no balance in Acuity, only "Code has not been used". It gets its product's full value (the `products` table in the SQL, copied from each product's settings).
  - A card valid for wheel throwing is valid for every 2-hour class, as the site sells them.
  - On a re-run, a code already used in the new system keeps its balance.
- **Applied 2026-09-24:**
  - 237 codes read. 46 carried over (27 never used): 115.5 classes, 91 open-studio hours and one 180 € voucher.
  - Skipped: 178 expired, 13 used up. None had an unreadable balance, and none was only valid for classes we don't run.
  - The one upcoming Acuity booking is now a place in Cal. Cours shows how it was paid (`rusc.acuity_seats`: code, paid, or to pay).
- **On switch day:** set `IMPORT_TOKEN`, run the extract again from Acuity, apply, then unset the token. Afterwards, delete the raw imports (`DELETE FROM rusc.imports`), which hold client details.
- **Acuity API key:** `scripts/continuity/acuity-export.mjs` and the key in `.secrets/acuity.env` need the API, which the plan doesn't include. Reset that key after the switch. It's also in Vercel's environment (`ACUITY_USER_ID`, `ACUITY_API_KEY`), which the site doesn't use.

### 24. Cours as a calendar (`3645f418`, `021771e3`, 2026-09-24)
- **Owner's request:** a calendar view of the classes.
- **Two views in Cours:**
  - **List:** the coming 14 or 30 days, as before.
  - **Calendar** (`?vue=calendrier&mois=YYYY-MM`): a month, Monday to Sunday, with each class's time and places taken. A green edge means people are booked; orange means full. Past days only show classes someone was booked on. On a phone, the month becomes an agenda of the days that have classes.
- **Day page:** a day or a class in the calendar opens `?jour=YYYY-MM-DD`, past or coming. It lists everyone booked and how each paid, with links to the previous and next day.
- **Cal's date overrides:** the timetable now follows them. An override replaces the weekly hours that day, and 00:00–00:00 closes it. Horaires will write them.
- **Sign-in:** it now returns to the page asked for, view included.
- **Checked:**
  - with sample data, at 1366 px and 375 px (no sideways scroll), in FR and EN, including the three Acuity payment cases;
  - live: September renders (13 classes, 2 places booked), and `/import/acuity` answers 404.
- **Stripe, where it stands:** the webhook points at rūsc admin and its signing secret is saved there, and the publishable key is in Vercel. Only `STRIPE_SECRET_KEY` is missing from Vercel; the owner has it. After it's saved, redeploy production so the cart opens payment.

### 25. Stripe live (2026-09-24)
- **The key:** the owner saved the secret key in Vercel through a hidden prompt. The prompt first checked the key with a read-only Stripe call (`GET /v1/checkout/sessions?limit=1`), then ran `vercel env add STRIPE_SECRET_KEY production --sensitive`. The publishable key was already there.
- **Redeploy:** `vercel redeploy https://rusc-preview.vercel.app --target production --scope mohamedfekryyy-s-team`. Without `--scope`, the CLI looks in the wrong team. `NEXT_PUBLIC_*` values are built into the pages, so changing a key always needs a rebuild.
- **Checked:**
  - `POST /api/checkout/` with an empty cart answers `empty_cart` (400) instead of `checkout_unavailable` (503);
  - the cart's code carries the live publishable key.
- **Still to do:** one small real purchase and its refund (the owner).

### 26. rūsc admin: logo, icons, local preview (`c4f08ffa`, `b1896a64`, 2026-09-24)
- **Owner's requests:** Heroicons "only when provides value", following their design skill (`match-fekry-design`, utility mode), and the logo in place of the word rūsc on the sign-in page and in the header.
- **Logo:** `deploy/admin/logo.webp`, a copy of `assets/logo-rusc-trim.webp`, served at `/logo.webp`. On a phone, the menu now has its own row.
- **Icons:** Heroicons 2.2 (MIT), inlined in `ICONS`. They go:
  - on payment states (ticket, check, alert);
  - on e-mail and phone (the phone is now tap-to-call);
  - on the List / Calendar switch and the round previous/next arrows;
  - in the search field;
  - on where a code comes from, now translated (Atelier / Acuity / En ligne) instead of the raw database word;
  - on notices, and on a copy button beside a code. Where the clipboard is refused, the button selects the code instead.

  Menus, calendar entries and plain buttons stay text.
- **Preview:** `node deploy/admin/preview.mjs` (or the launch config `admin-preview`) serves the admin with made-up people: no database, no sign-in.
- **Checked:**
  - in the preview: 1280 and 1366 px, and 375 px with no sideways scroll, in FR and EN;
  - live: `/logo.webp` answers 200 (`image/webp`), and the sign-in page shows the logo.

### 27. Documentation for whoever follows up (2026-09-24)
- **Owner's request:** document everything so that agents can follow up.
- "Where things stand" at the top of this file: what's live, what waits on whom, and how agents work here.
- `deploy/admin/README.md` rewritten for today's admin (views, Acuity import, preview, look, what's left).
- New `scripts/continuity/README.md`: the Acuity import, and how to run it again on switch day.
- `deploy/cal/README.md`: one event type per class, and `db-run.sh` for SQL.
- `README.md` (French) brought up to date: configuration, structure, services, switch-day steps.

### 28. Booking until 30 minutes after a class starts (`de125f27`, 2026-09-24)
- **Owner's request:** "people need to be able to book even 30 mins after the class starts; now I cannot book even same day".
- **Cause:** every class had Cal's default minimum booking notice, 2 hours. At 16:04 the 17:00 classes were closed. Stock Cal.diy also refuses any time before now, and its notice can't go below 0.
- **At once:** the notice was set to 0 on the 9 classes (same-day booking until the start). Checked: the 17:00 classes came back.
- **Patch** (`deploy/cal/patches/late-booking.patch`, `packages/lib/isOutOfBounds.tsx`): a **negative** notice is a grace period after the start, in the one guard that refuses past times. Slots already start from "now + notice".
  - The image built in 13 minutes and was deployed with `deploy.sh`.
  - The classes then got `minimumBookingNotice = -30`, and `seed-classes.mjs` writes it too.
- **Checked live at 16:26:** open studio's 16:00 slot, started 26 minutes earlier, was offered. The booking check goes through the same function.

### 29. rūsc admin: Acuity history, Clients, Horaires, member accounts, centred menu (`ad8fe9c2`, `ff45729f`, `e66902bd`, 2026-09-24)
- **Owner's requests:**
  - historical bookings and data in the admin;
  - Horaires, which was greyed out;
  - member sign-in that works;
  - the menu centred, not packed beside the logo.
- **Cours:** past days also show Acuity's appointments (`rusc.history`), grouped into classes, with how each paid. Types no longer run keep their Acuity name.
- **Clients** (new): Acuity's client list and history, then everyone who books, buys or opens an account (`reconcile()` adds them). A client's page has:
  - contact, notes, and the other people under the same e-mail;
  - membership, editable by hand;
  - their online account, with a 7-day password link;
  - codes, every booking (with Acuity's notes) and every order.
- **Commandes:** Acuity's orders below the online ones.
- **Horaires** (new): each class's weekly slots and dates, to add or remove; days to close (Cal date overrides, 00:00–00:00) or reopen. It writes Cal's `Availability`, with a grant in `schema.sql`.
- **`/api/auth/*`:** see step 31.
- **Header:** the logo on the left, the menu centred, language and sign-out on the right; on a phone the menu takes its own row.
- **Mistake, fixed** (`e66902bd`): the new tables were created after `schema.sql`'s `RESET ROLE`, so the database owner kept them. rūsc admin got "permission denied" (sign-in answered 500). They were handed to `rusc_codes`, and that part of the schema now runs under that role.

### 30. Acuity's history imported (`041bfe87`, `ff45729f`, 2026-09-24)
- `scripts/continuity/acuity-history.mjs` read the owner's three Acuity exports in `data/acuity/` and posted them to the one-off import route (`?source=acuity-history`). The token was set, used and unset within minutes.
- `acuity-history.sql` loaded them:
  - **1,616 appointments** (Feb 2020 to 22 Sept 2026), 1,594 matched to our classes;
  - **216 orders**;
  - **730 clients**.
- Acuity's client list has 688 e-mails for 780 people: 68 e-mails are shared (families). One row per e-mail would have dropped 92 names, so each client keeps the others under its e-mail (`rusc.clients.others`).
- Re-run it on switch day with fresh exports.

### 31. Member accounts on the site (`06be878d`, 2026-09-24)
- **Owner's report:** member login and sign-up didn't work. The page, written earlier by Rrose, was a preview with no backend.
- **Backend** (rūsc admin, `/api/auth/*`):
  - signup, login, logout, session, account, codes, reset;
  - scrypt password hashes and SHA-256 tokens, sent as `Authorization: Bearer …`;
  - a year with "rester connecté·e", otherwise a day; rate-limited;
  - CORS for the site's origins.
- **Site** (`lib/auth.ts`, `AuthForm`, `AccountArea`):
  - sign-up and sign-in, with errors in FR and EN;
  - the member's space: membership, coming classes, codes with "add a code", past classes;
  - `?reset=` links from the studio;
  - the header says "Mon compte" when signed in;
  - the booking page fills in the member's name and e-mail in Cal.
- **Checked live** with a throwaway account (deleted right after):
  - wrong login, short password, duplicate e-mail, e-mail in capitals;
  - session, account and unknown code;
  - logout ends only that token.

### 32. Gift voucher of any amount (`146c089a`, `94a13d27`, `b3cc7482`, 2026-09-24)
- **Owner's request:** "buy X amount of money gift card that can be used for whatever".
- **The offer:** `bon-cadeau-montant` in the gifts tab, with an amount field: 10–1,000 €, whole euros, 50 € shown first. The cart keeps one line per amount.
- **Checkout:** checks the amount again on the server, charges it, and writes `<key>:<cents>x<qty>` in the order.
- **rūsc admin:** turns each voucher into a euro code, valid for every class for 6 months (the "montant" preset). It's labelled "Bon cadeau · 120 €" or "Gift voucher · €120", and shown on the thank-you screen.
- **Checked:**
  - in the browser: the card adds `{amount: 12000}` and the cart shows "Bon cadeau · 120,00 €";
  - with a fake database: the codes created;
  - live: 9.99 € and 1,000.50 € are refused (`bad_amount`).
- **Mistake, fixed** (`b3cc7482`): the checkout route imported `lib/cart.ts`, which uses React hooks, so the production build failed. My build command piped through `grep | head`, which hid the failure, and the commit was pushed; Vercel kept the previous deployment live. The amount helpers moved to `lib/cal.ts`. **Check the build's exit status before pushing** (`set -o pipefail`).
- **Not yet:** a code can't pay for a cart product (see "Next for agents").

### 33. Nothing lost from the old setup (2026-09-24)
- **Old Squarespace URLs:** its sitemap lists 8 pages (`/`, `/about`, `/appointments-1-2`, `/atelier-cramique-2h`, `/contact`, `/membre`, `/rserver`, `/workshop`), and each lands on a live page of the new site.
- **Acuity:** codes, upcoming bookings, the whole history and the client list are in rūsc admin (steps 23 and 30). Members are marked by hand, since Acuity has no export of them.
- **Vercel:** the unused `ACUITY_USER_ID` and `ACUITY_API_KEY` were removed.
- **Booking emails:** `deploy/cal/set-smtp.sh` saves the Brevo SMTP login in rusc-cal, the key typed hidden. The owner runs it.

### 34. After Rrose's handoff: places, payment, languages, branding (2026-10-03)
- **Context:** from 1 to 3 October another agent (Rrose) changed the site and Cal without logging it here: member price and codes in the cart (`64228bb`, `ef0afbd`), classes PENDING until paid (`bee9f73`), a "number of places" selector (`70d7e2f`), booker language via `?lang=` (`fca5b4e`, `3d49a33`), no Cal.diy branding (`a07bb7d`), no Cal success card in the embed (`5fc2d8e`), class wording (`70605b3`, `93a3596`), e-mail through Resend, and layout changes on the home pages. Its handoff listed what went wrong; Raquel listed five problems. All checked against the live systems before fixing.
- **"No availability" wasn't a data problem.** The slots API returned every class. The first booker Cal renders after a restart takes about 17 s and the site shows an empty frame meanwhile. `deploy/cal/deploy.sh` now opens every class's booker after a deploy (`bbf8ac1`). A booker can still take several seconds in the browser: Cal's page is about 730 KB of HTML plus its scripts.
- **Unpaid places never ended** (Raquel: classes stay taken when not paid or removed from the cart). Nothing freed a PENDING place, and "Retirer" only emptied the browser's cart. rūsc admin now holds the places of a cart for 30 minutes, then frees them in Cal; "Retirer" frees them at once; Cal's cron loop wakes rūsc admin every 5 minutes (`/tasks/release-places`). `0b6f71b`, `e8e5e72`.
- **Several places** (Rrose's selector only worked for the first person in a class, made its extra seats inside Cal's booking engine, and the cart charged one place for all of them): Cal now books only the booker's place and passes the number asked (`booking.ruscPlaces`); rūsc admin adds the others as anonymous seats of the same Cal booking, linked to the booker's seat, within the class's seats (`dd78526`, `0b6f71b`). The cart has + and − on classes (Raquel: "you can't add a spot from the cart"), and checkout charges each class for its unpaid places as rūsc admin counts them (`e8e5e72`).
- **The webhook failed on every cart with a class**: `bee9f73` made it `UPDATE "Booking"`, but `rusc_codes` could only read that table, so the whole order rolled back (no order, no codes, no paid seat). No real order had been paid yet. `schema.sql` grants the columns needed, and what Cal's `BookingDenormalized` trigger writes (`0b6f71b`). Payment is now recorded per place; everyone in a class shares one Cal booking, so its status says little.
- **Held places counted as free:** Cal counts only ACCEPTED bookings for the places left, and classes stay PENDING until paid, so a class held full still showed 7 places. `seats-pending.patch` counts PENDING too (`c673ac3`).
- **FR/EN mix** (Raquel): the booker's title and description followed the browser, the French booker showed 4:00pm, and Cal's root layout took its language from the browser's `Accept-Language`, so a French browser on the English page got both languages (checked with curl: `<html lang="fr">`). `booker-lang.patch` makes `?lang=` decide all three (`dd78526`, `bbf8ac1`, `a88e3d9`). "Places disponibles" is lower-case.
- **Branding:** the booking form still said "you agree to Cal.diy's Terms and Privacy Policy", linking to cal.com. Off (`c673ac3`); the booking pages link the studio's terms.
- **Also fixed:** classes paid with a code stayed PENDING and were hidden from the member's space (Rrose's `0e1fcc0` listed only ACCEPTED bookings): a code payment confirms the class, and the space lists places paid or confirmed, not those waiting in a cart. Rūsc admin's Cours says "dans un panier · libéré à HH:MM"; extra places show no contact and don't join Clients.
- **Checked:**
  - rūsc admin against a local Postgres with the live table definitions: hold, add, full, remove, release (a lone booker cancels the booking and clears its idempotency key), expiry (paid places kept), a signed test webhook paying 2 places, the member's space, Cours;
  - live, from a local build of the site: booked 2 places in a class, the cart showed 2, + made 3, − made 2, Cal and rūsc admin agreed; the hold was run out, both places were freed and the booking cancelled in Cal, and the cart said so. That test booking is the only one made; nothing of it remains.
- **Image tags:** the live image is `54343aa685ae-<first 8 of the patches' sha256>`, as `deploy.sh` computes; `fly status -a rusc-cal` shows it.
- **Deployed:** image `54343aa685ae-78a293ac` (the owner ran `deploy.sh`). Checked live: a French browser on the English page and an English one on the French page each get one language only (`<html lang>` and strings, with curl); the French booker in an English browser shows "tournage 2h", "16:00", "7 places disponibles" and no Cal.diy terms line or cal.com link; the one unpaid booking left (22 October) shows as a place taken.
- **Test bookings:** the owner chose to free the 11 unpaid ones of 2–3 October on Gmail addresses, through the release path (an expired hold, then `/tasks/release-places`): their places are gone and the bookings cancelled. The 22 October one is left for him to check.
- **Not done here** (see "Where things stand"): the 22 October booking, the layout changes (Raquel decides), the membership in Raquel's cart, e-mails (Resend DNS, sender address, e-mail after payment).

### 35. FR/EN keeps your place on the page (`fa97ed9`, 2026-10-04)
- **Owner's request:** switching language sent the page back to the top; it should switch in place.
- **Why it jumped:** FR and EN pages have separate root layouts, so the switch is always a full page load, which opens at the top.
- **How:** clicking FR or EN (in the header or the menu panel) saves the element under the header's bottom edge as a path of child indices, with how far into each element that line falls (`lib/keepPlace.ts`, sessionStorage, 15 s). The new page's inline script (`components/KeepPlace.tsx`, end of `<body>` in both root layouts) follows the same path before the first paint, scrolls there, and settles once more after fonts and images unless the visitor has scrolled. The two languages' markup runs in parallel, so the path matches; landing at a fraction of the element absorbs the different text lengths. If the path doesn't match, it falls back to the same fraction of the page.
- **Also fixed:** the terms pages passed `page="home"` to the header, so FR/EN on `/conditions/` led to `/en/`. They now switch to `/en/terms/` and back.
- **Lint:** Rrose's "Pay directly" (`5fe7e53`) failed `react-hooks/set-state-in-effect` in `CartView`; a one-time read of `?pay=1` after hydration is what it should do, so the rule is disabled on that line with the reason (`bcc0992`).
- **Checked** in the browser (dev): Stages FR→EN at 1280 px ("Atelier tournage grès : 180 €" → "Stoneware throwing: €180" at the same height), home EN→FR (same cards), terms FR→EN (same section), Cours FR→EN at 375 px from the top switch and EN→FR from the menu panel ("cours enfant 2h" ↔ "children's course 2h"); no console errors. The terms pages' header isn't sticky (legal.css), so there the switch is only reachable near the top.
- **Checked live** after the deploy (`f843dc2`): home EN→FR at 1500 px landed at 1498 px on the same cards; a local production build put Stages FR→EN on the same price line. The browser tool's click-by-reference moves the page before clicking, so test with a click by coordinates.

### 36. New classes from rūsc admin (2026-10-06)
- **Owner's request:** "allow creating new classes on admin", coherent with Cal.diy, the site and everything else.
- **Before:** a class lived in three hand-kept lists: the site's `OFFERS` (`lib/cal.ts`), rūsc admin's `OFFERS` (`server.mjs`) and `deploy/cal/seed-classes.mjs`. Adding one meant code in all three and a deploy of each.
- **rūsc admin** (`/admin/cours/nouveau`, "+ Nouveau cours" on Cours and Horaires):
  - The form: names FR/EN, price per place, length, places, the lines above the name and after the price (FR/EN, defaults from the length), descriptions FR/EN, a photo from the site's (thumbnails in `deploy/admin/photos/`), which codes pay for it, and an optional first session.
  - Creating writes, in one transaction and as `rusc_codes`, what the seed script writes: `Schedule`, `EventType` (host `raquel`, slug = key from the French name, seats, notice −30, pending until paid, hidden, Paris time, 30-minute interval, the studio's address), `_user_eventtype`, the English `EventTypeTranslation`s, the first `Availability` row, and a row in the new `rusc.classes` (names, price, photo, codes, listed or not).
  - Keys never take a built-in or product key, a slug Cal already has, a prefix the member prices read (`atelier-libre`, `bon-cadeau`, `adhesion`, `carnet`), or an `-fr`/`-en` ending (the old twins, which `apiRedeem` strips).
  - `OFFERS` there is now the built-in nine plus `rusc.classes` (`syncClasses`, every 30 s and after each change), so codes, places, the Stripe webhook, Cours, Horaires, Codes and Commandes all know a new class. Presets add the new classes their codes pay for (`presetOffers`), and ticking "bons en euros" or "carnets 2h" adds the class to existing codes of that kind (`shareCodes`).
  - Editing (`/admin/cours/offre/<key>`) updates Cal and `rusc.classes`; a new length moves the end of each one-class-long slot. "Retirer du site" hides it; nothing is ever deleted.
  - `GET /api/classes` (public, cached 30 s) gives the site every class made there, hidden ones flagged.
- **Database** (`schema.sql`): `rusc.classes`, and grants for `rusc_codes`: insert on `EventType` and update of its title, description, length and seats; `Schedule` (insert, rename); `_user_eventtype`; `EventTypeTranslation`; and `BookingDenormalized."eventLength"`, which Cal's trigger writes when a length changes.
- **Site:** `ClassOffer` and a run-time list in `lib/cal.ts`, filled by `lib/classes.ts`. `offerByKey` and `offersIn` know both lists, so the booking page lists active classes once they load (and opens `?workshop=<key>` then), OfferCard shows their photo, a cart line keeps its class with it (named and priced on any page), the checkout route reloads the list and charges its price from rūsc admin, and the member's space names them in its language. `deploy/cal/deploy.sh` warms their bookers up too.
- **Checked locally**, against a Postgres mirror of the Cal tables rūsc admin touches (columns, keys and triggers read from the live database) with the real `schema.sql`, as `rusc_codes`:
  - creating three classes (keys `raku-1-jour`, `cours-atelier-libre-en-1`, `raku-1-jour-2`), the rows in Cal, the translations, the first weekly slot; refusals for a bad price and an incomplete first session;
  - editing (length 360 → 300 moved the slot's end and went through Cal's trigger; places, translations, code options both ways), hiding, `/api/check` for each kind of code;
  - a booking in a new class: hold of 2 places, checkout view, a signed test webhook paying both places and confirming the booking;
  - every admin page in FR and EN, the form at 375 px without sideways scroll;
  - the site built against that admin: the cards, `?workshop=` deep link in English, the cart (name, 3 places, + / −), and the checkout route pricing the class (up to Stripe, with a fake key).
- **Found on the way:** Rrose's `cancelUnpaidPending()` (`44d4ece`, live since 09:03 UTC) loops over the query result instead of its rows, so it threw on every run. It runs inside `releaseExpired()`, so holds (`/api/places`) and checkouts (`/api/places/checkout`) answered 500 whenever that ran (it runs at most every 20 s). The call is now caught and logged; the loop is left as it is, since fixing it would start cancelling bookings (see "Decisions for Raquel").
- **Deployed:** `schema.sql` on the live database (grants read back: insert on `EventType`, `Schedule`, `_user_eventtype`, `EventTypeTranslation`; the column updates; both sequences; `rusc.classes` owned by `rusc_codes`), rūsc admin on Fly (release 41, which also carries Rrose's 8 commits of the morning, rebased), and the site (`5f8802c`, Vercel success).
- **Checked live:** `/api/classes` answers with CORS for the site and a 30 s cache; `/photos/*` serve; the new pages ask for the studio's sign-in; `/api/places` answers 200 again. Then a test class made with classCreate's statements, as `rusc_codes`, with no hours (unbookable): rūsc admin listed it within 30 s, the French booking page showed its card, `?workshop=` opened it on the English page, and Cal's embedded booker showed "agent test (to delete)" with its English description, 2 h, the address and Paris time ("no availability", as it had no hours). It was then deleted (event type, translations, schedule, row); Cal answers 404 for it and nothing of it remains. The form itself wasn't used live: agents don't sign in to rūsc admin.

### 37. Edit the current classes from rūsc admin (2026-10-06)
- **Owner's request:** "integrate a feature to edit current classes", with the same form as for a new class.
- **Data:** `rusc.classes` gets `builtin`, `show_price` and `show_member_price`, and `schema.sql` adds a row for each of the nine classes of `lib/cal.ts`, filled from the site's texts and prices and from Cal's descriptions (French, and English from `EventTypeTranslation`). Nothing changes on the site until someone edits.
- **rūsc admin:** "Modifier" on every class in Horaires opens the same form (`/admin/cours/offre/<key>`). For a built-in class it hides the code options (its codes stay as they are), keeps open studio's 1-hour length, and says the site's own pages keep their text. The price line now has "Afficher le prix" and "Et le prix membre (−10 %)"; a note starting with "/" follows the price. `OFFERS` there starts from the built-in values and takes each row's names and price, so codes worth euros, Cours, Commandes and the booking e-mails follow an edit.
- **Site:** `toClassOffer` accepts a built-in row (`builtin`), which `offerByKey` and `offersIn` lay over the offer of `lib/cal.ts` (keeping its tab, colour and members-only rule); a hidden one isn't listed and a link to it opens its tab. OfferCard uses the row's photo with the class's own icon. The booker follows the class's key only, so edited values arriving after the page don't mount it twice. The cart loads the classes to show edited names and prices, and the checkout returns 503 rather than charge a class when rūsc admin can't be reached.
- **Seed script:** skips any class with a row in `rusc.classes`, so a run never puts back old names, lengths, places or hours.
- **Checked locally** (Postgres mirror of the Cal tables, real `schema.sql`, rūsc admin as `rusc_codes`): the nine rows, twice idempotent; `/api/classes` against `lib/cal.ts` field by field for the nine, FR and EN (0 differences); editing tournage (55 €, member price shown, English name, 6 places) reached Cal's event type and translation, left the codes as they were and made a euro code need 55 €; open studio kept 60 minutes when sent 90; porcelaine hidden; the seed script skipped all nine and left the 6 places. Site built against it: both booking pages showed "55 € · membre 49,50 €" / "€55 · member €49.50" and no porcelaine, `?workshop=atelier-ceramique-2h` mounted Cal's booker once, `?workshop=porcelaine` showed the list, the cart priced 2 places at €110.
- **Deployed:** `schema.sql` on the live database (`INSERT 0 9`: the nine rows), rūsc admin on Fly, the site (`f7a1877`, Vercel success).
- **Checked live:** `/api/classes` against `lib/cal.ts` for the nine, FR and EN: 0 differences (lengths and places come from Cal). The live booking pages show the same cards and price lines as before in both tabs, open studio still in "Membership & cards" with "€22.50 / hour", `?workshop=atelier-ceramique-2h` mounts Cal's booker once, no console errors. No live class was edited as a test, so nothing visitors see changed; the first real edit is the studio's.

### 38. Member's space: spacing, what's left, a 1-hour session (2026-10-06)
- **Owner's requests** (from a phone screenshot of the English member's space): add "book a 1h session" under "Book a class" for members; clean the spacing; show the member's quota simply.
- **Spacing:** the space's blocks were `<section>`s, which `home.css` pads by 48–84 px top and bottom, hence the big empty bands. They're plain blocks now, one rhythm, separated by hairlines (`components/AccountArea.tsx`).
- **What's left:** each code takes three short lines: its name with the balance on the right (the number in the display face, then "of 10 classes left", "heures restantes sur 10", "left of €120"), a thin meter (one notch per class or hour for a card of up to 20, a half one half filled; a bar for euros), then the code and its expiry. The owner then asked for it smaller: 18 px headings, 20 px numbers, 4 px meters, tighter blocks, and the two booking buttons a size smaller, filling the column's width. Codes that can still pay come first; used up, expired or paused ones are faded. Membership shows "Member until …" with its days left, a thin bar, and "Renouveler / Renew" in the last 30 days.
- **1-hour session:** for an active member, "Réserver une séance d’1h / Book a 1h session" under "Book a class" opens open studio's booker (`?workshop=atelier-libre-1h`).
- **Dev sample:** in `next dev`, `/connexion/?sample=1` and `/en/login/?sample=1` show a made-up member's space (`SAMPLE`, null in production builds), to check the layout without an account.
- **Checked** in the dev server: FR and EN at 375 px and 1280 px, the 1h link's target, no console errors.

### 39. English booker in English; header spacing (2026-10-06)
- **Owner's report:** the English booker said "Nécessite une confirmation" under an English title.
- **Cause:** the site sent the page language twice in the booker's address: on the calLink (`?lang=en`) and in the embed's `config.lang`, which Cal's embed also turns into a query parameter (`…?lang=en&…&lang=en`). With two values, `context.query.lang` is a list, so `booker-lang.patch` fell back to the event type's interface language (none) and the page's labels came out French, while the middleware and `EventMeta`, which read the first value, kept the title and `<html lang>` English. Since Rrose's two commits (`796bff9`, `fca5b4e`), every English booker showed French labels, weekdays and "places disponibles"; step 34 checked the English page with curl, which doesn't run the booker's client side.
- **Fix:** `config.lang` is gone (`components/BookingEmbed.tsx`); the calLink's `?lang=` stays the one source. Checked in a browser on the live Cal: with one `lang=en`, "Requires confirmation", "7 places available", "wheel throwing 2h"; with `lang=fr`, all French and 24-hour times. `booker-lang.patch` could also take the first value of a list; not needed now, and it would cost a Cal image build.
- **Header:** `.nav{padding:12px 0}` came after `.wrap{padding:0 26px}` and cancelled the header's side padding, so below 1080 px the menu icon and BOOK sat flush against the window's edges. `.nav` now sets only top and bottom padding (26 px sides, 16 px on phones as before). The right-hand items are spaced evenly: 20 px on desktop (was 10), 14 px up to 820 px, 10 px from 561 to 640 px (was 4); the one-row phone header is unchanged. Checked at 1440, 1024, 800, 600 and 375 px in FR and EN: even gaps, no sideways scroll.
- **Not changed (owner to decide):** on a phone in French, the longer labels (CONNEXION, PANIER, RÉSERVER) squeeze the logo to nothing and the FR/EN pill covers it; the live site does the same. English fits.

### 40. Iconsax icons; the language switch keeps everything (2026-10-06)
- **Owner's requests:** the cart as an icon in the navbar; Iconsax wherever the site needs an icon, and the previous pack removed; switching language on the booking page went back to the list, and should keep everything and swap "elegantly, up to 2026 web standards".
- **Icons:** `lucide-react` is removed; `iconsax-reactjs` (MIT, the React 19 build of the Iconsax set, no `prop-types`, tree-shaken) replaces it, Linear style. The cart in the header is now an icon with its count in a small badge (`aria-label` "Panier, 2 articles" / "Cart, 2 items"); the booking cards' icons (Clock, Calendar, EmojiHappy, Glass, Key, Ticket, Timer1, Gift); the password eye (was an emoji); the tick when a code is accepted (was ✓); the back links (was ←) on the booking, cart and terms pages; the cart's − / + buttons. The burger stays CSS (it animates into an X). rūsc admin keeps its inline Heroicons.
- **Why the switch lost the class:** the header built its FR/EN links from the address at load, and listened for `pushstate`/`replacestate` events that nothing fires; the booking page changes its query with `history.replaceState` as the tab or class changes. `replaceUrl()` (`lib/routes.ts`) now replaces it (keeping Next's history state) and fires `rusc:url`, which the header follows; the click also reads the address at that moment.
- **The swap:** a cross-document View Transition (`@view-transition { navigation: auto }` in `styles/globals.css`): the two pages crossfade (0.32 s) and the green FR/EN marker, now its own element (`.lang-pill`), slides to the new language. The header's `pageswap` listener skips the transition for every other navigation; reduced motion turns it off. The FR/EN links carry `hreflang`, `lang`, an accessible name in their language and `aria-current`. The scroll position is kept as before (step 35).
- **Checked** in the dev server: on `/en/booking/?workshop=atelier-ceramique-2h`, FR went to `/reserver/?workshop=atelier-ceramique-2h` with the class open, the French booker and the same scroll, and the browser offered the transition. Firing `pageswap` by hand: an ordinary navigation is skipped, a language switch isn't. (The browser pane runs no transitions while it's hidden, `visibilityState: hidden`.) The cart icon, badge and label, the marker under the active language, the eye, the back links and the steppers render; no sideways scroll.
- **Not kept yet:** the day chosen inside Cal's booker. Cal's embed doesn't tell the page (its route event carries no data); see step 41.

### 41. The booker's day survives the language switch (2026-10-06)
- **Why:** step 40 kept the class and the scroll, but the day picked in Cal's booker was lost: the booker is a cross-origin frame and Cal's embed reports route changes without data.
- **Cal** (`deploy/cal/patches/booker-day.patch`, `BookerWebWrapper.tsx`): the booker fires `ruscBookerDay` with its month and day on every change. Also, `booker-lang.patch` now reads a doubled `lang` as its first value (step 39's bug can't return that way). The patch set was applied to the pinned sources in a scratch repo: all nine apply, both locale files stay valid JSON.
- **Site** (`components/BookingEmbed.tsx`): the booking page keeps `?month=&date=` in its address as the booker reports them (`replaceUrl`, so the FR/EN link carries them), and opens the booker with them on the calLink; Cal's booker store reads both. Going back to the list or opening another class drops them. Without the new image the event never comes and nothing changes.
- **Deployed:** the Cal image `54343aa685ae-0bbd0d40` (`deploy.sh`, bookers warmed). **Checked live:** on `/en/booking/?workshop=atelier-ceramique-2h` the booker's own first day (7 October) reached the address; clicking 13 October in the booker made it `&month=2026-10&date=2026-10-13` and the FR link followed; FR opened `/reserver/` on the same class with "mar. 13", its 18:30 slot and "7 places disponibles". The scroll position wasn't kept there (fixed in step 42).

### 42. Lighter photos, motion, and odd UI fixed (2026-10-06)
- **Owner's requests:** no bottom border under the cart's last (or only) item; fix odd UI; make the site smooth, fast and elegant in motion, with the design skill (`match-fekry-design`: motion that orients, 0.3–0.8 s, soft easing, opacity and position only).
- **Measured first** (`puppeteer-core` driving the installed Chrome, cache off, 390 px and 1280 px, every page): photos weighed 4 MB on the home and Cours pages (one 3 MB PNG) and 1.5–2.3 MB on the booking page, because `images.unoptimized` had stayed on since the static export (step 1); the sign-in page shifted (CLS 0.18 on desktop); no page scrolled sideways and no image was broken.
- **Photos:** Vercel image optimisation is on (`next.config.ts`: WebP, `qualities: [75]`, required since Next 16, and a 31-day cache since the imports are hashed), and the 20 card photos have `sizes`. Same pictures, sized for the screen: home 4,052 → 374 KB, Cours 4,646 → 270 KB, booking 1,565 → 339 KB, Stages 886 → 162 KB (local production build). The wordmark's deprecated `priority` is `loading="eager"`.
- **Sign-in page:** while the account loads, the placeholder is as tall as the form that follows (CLS 0.18 → 0.009).
- **Language switch:** the scroll restore (`lib/keepPlace.ts`) kept giving up before the booking page's Cal booker had mounted, so FR/EN from inside the booker landed at the top. It now settles again whenever the page grows, for 8 seconds, until the visitor scrolls, taps or types.
- **Odd UI:**
  - Card titles in a row sat at different heights: `.card p{flex:1}` stretched the tag line as well as the description. Only the description stretches now; checked: each row's titles at the same height.
  - The "Ūs" button under the home cards had no margin and touched them: `.grid + .actions` gets 40 px (only the hero's buttons had a margin).
  - The event banner had its text on the left and its button centred under it: the button now sits on the right, level with the text's last line; stacked on phones.
  - The French phone header squeezed the logo to 16 px and its "oser l'art" ran under the FR/EN pill: on phones the account link is an Iconsax `User` icon like the cart (named for screen readers), and the logo block clips; the logo is back to 63 px.
  - The cart's last item lost its bottom border; the Total row's line is the only one.
- **Motion** (`styles/home.css`, all inside `prefers-reduced-motion: no-preference`): cards and section titles rise 16 px and fade in as they come on screen (a CSS scroll-driven animation, no script, ignored where unsupported); the booking page's list or chosen class fades in when it changes; "added to your cart" rises in; the member's meters fill from the left. The FR/EN crossfade is step 40's.

### 43. rūsc admin: phones, quieter lists, safer actions (2026-10-06)
- **Owner's request:** "now admin improvements". Audited every page in the local preview (`deploy/admin/preview.mjs`, made-up data; agents don't sign in to the live admin), at 390 and 1280 px.
- **Found:** the admin was already light (no script, about 10 KB, no layout shift), but on a phone the Clients, Codes and Commandes tables ran off the screen (pages 585, 509 and 443 px wide); Cours gave every empty class a full box and squeezed how each person paid into a narrow column on phones; Horaires repeated a full "add hours" form under every class; "Retirer" took hours off the booking calendar with no confirmation; Codes put its creation form above the list the studio uses most.
- **Changes** (`deploy/admin/server.mjs`):
  - Phones: tables with headers stack into rows, each cell labelled with its column (a small script in `page()` copies the headers into `data-label`; empty cells are hidden); a class's people list puts the payment under each name. Every page now fits 390 px.
  - Cours: a class nobody has booked is one quiet line; a full class says "complet · 7 / 7"; the first days read "Aujourd'hui · …" and "Demain · …".
  - Horaires: each class's add form folds behind "+ Ajouter un horaire". Removing hours and closing days ask for confirmation (reopening doesn't).
  - Codes: search and list first; "+ Nouveau code" unfolds the form (open when a preset or a client is given, and the preset switch keeps them); each balance has a small meter (a notch per class or hour, or a bar), also on a code's page and in a client's codes. A client's page has "+ Nouveau code" with their name and e-mail filled in. Pausing a code and taking a class off the site ask for confirmation.
  - Polish: quiet row hover, a visible keyboard focus, saved notes and opened forms settle in (off for reduced motion).
- **Checked** in the preview: every page at 390 and 1280 px fits and has no layout shift; FR and EN; the folds open; the confirmations are on Retirer and Fermer but not on Rouvrir; the client shortcut opens the form with the holder filled.

### 44. rūsc admin: a modern look, Iconsax icons (2026-10-06)
- **Owner's request:** "improve UI system to look less like 90s and use icons where u see fit, Iconsax". Design skill `match-fekry-design`, utility mode.
- **Style** (`STYLE` in `deploy/admin/server.mjs`, rewritten around tokens on `:root`):
  - Geist and Geist Mono (Google Fonts) instead of the system font, with tabular figures;
  - the same warm canvas and green accent; white cards with hairline borders, 12–14 px corners and a faint shadow for list tables, class boxes, forms and the month calendar (one card, 1 px lines between days, today's date in a green dot);
  - pill buttons and inputs with a focus ring;
  - tinted badges for states: green paid, orange to pay or full, grey neutral;
  - table headers in sentence case.
- **Header:** sticky and blurred over the page, outside `<main>`. The menu is a pill switcher with an icon per section (on phones, a five-column tab bar under the logo). FR · EN is a small pill, and sign-out is an icon button. List · Calendar is the same kind of switch, with "Nouveau cours" beside it.
- **Icons:** Iconsax, Linear set (MIT, the site's `iconsax-reactjs`), rendered once to path data and inlined in `ICONS`. They replace the Heroicons, keep their old keys (`check-circle`, `ticket`, …), and add the menu's, add, edit, trash, undo, sign-out and the desk actions'. Buttons that act (Nouveau cours / code, Ajouter un horaire, Modifier, Retirer, Rouvrir, Ses horaires) carry one.
- **Sign-in:** one centred card, the logo and FR · EN above it.

### 45. rūsc admin: paid at the desk, attendance, adding someone (2026-10-06)
- **Owner's request:** integrate three features offered after step 43:
  - mark a place paid at the studio (an unpaid place stayed "à régler" for ever);
  - add someone to a class from the admin, for phone or walk-in bookings, without going into Cal;
  - attendance, ticking who came, to spot no-shows.
- **Database** (`schema.sql`, under `rusc_codes`):
  - `rusc.desk_payments`: one row per Cal seat, with method `cash` / `card` / `free` and the amount in cents.
  - `rusc.attendance`: one row per seat, `came` true or false.
  - Grants: insert on `Booking` and its sequence.
- **Paid at the desk.** "Encaisser" under any place still to pay (method, amount pre-filled with the class price) records it and confirms the Cal booking, as a code does. The place then reads "Payé à l'atelier · espèces · 50 €" (or "Offert à l'atelier"), with "Annuler" (asks first). A place already paid (online, code, desk, or on Acuity) is refused; an Acuity place "à régler" can be paid.
  - `PAID_SEAT` counts desk payments, so the cart, holds, checkout and the member's space treat them as paid.
  - Rrose's dormant clean-up (`cancelUnpaidPending`) skips them too.
  - The team calendar feed says "Payé à l'atelier" or "Offert".
- **Attendance.** From the day of a class, each person has a "Venu·e / Absent·e" switch (pressing the lit one clears it). The class's head counts them ("3 venu·es · 1 absent·e"). A client's page tags each booking and counts their no-shows next to "Réservations".
- **Adding someone.** "Ajouter" on any class of ours, today or later, with places left, opens a form with these fields:
  - name;
  - e-mail and phone (optional);
  - places;
  - payment: to pay later, paid (cash, card), or offered;
  - or a code.

  How it books:
  - The person joins the class's Cal booking at that time, as everyone in a class shares one, and it becomes accepted. If there is none, a new accepted booking is made, the way `acuity-apply.sql` made Acuity's.
  - Extra places are seats linked to theirs, as the cart's are.
  - Without an e-mail, the attendee gets an `@anonymous.invalid` placeholder: no contact shown, not added to Clients, no e-mail sent (`sendBookingConfirmation` now skips those addresses).
  - A code is checked for every place before anything is booked, so a typo books nobody; then it's taken off per place as on the site.
  - Unpaid, the place reads "à régler à l'atelier".
  - Each form returns to its page and class with a short note.
- **Also:** class anchors include the date (`c20261007-1600-atelier-modelage-2h`), since the list shows the same class on several days.
- **Checked** against a local Postgres:
  - Setup: Cal's tables and Cal's own `BookingDenormalized` triggers (from the pinned Cal.diy migration), the real `schema.sql` (run twice), and rūsc admin connected as `rusc_codes`.
  - Adding someone:
    - a new booking in Paris time, accepted, with its `BookingDenormalized` row;
    - joining a cart's pending booking, which becomes accepted;
    - a full class refused, a past day refused;
    - a carnet paying 1 and then 3 places (10 → 9 → 6);
    - an unknown code booking nobody.
  - Payments and attendance:
    - cash for 2 places, card with "45,50", offered;
    - paying twice and a bad amount refused;
    - undo;
    - came, no-show, clear;
    - `/api/places` counting a desk-paid place as paid.
  - In the browser (a local copy accepting the http origin, deleted after): the switch, "Encaisser" and "Ajouter" by real clicks, each returning to its class with its note. FR and EN.
  - Preview (made-up data): every page at 390 and 1280 px, no sideways scroll.
- **Deployed** (`bca010d3`, steps 44 and 45):
  - `schema.sql` on the live database: both tables created, owned by `rusc_codes`; insert on `Booking` and its sequence read back as granted; the nine class rows untouched (`INSERT 0 0`).
  - rūsc admin on Fly. Live: `/health`, `/login` (the new look, Geist), `/api/classes`, `/api/places` and `/tasks/release-places` answer 200, and `/admin/cours` asks for sign-in.
  - The only log error is the known `cancel pending rows is not iterable` (step 36, caught).
  - The desk features weren't used live (agents don't sign in to rūsc admin): the studio's first "Encaisser", tick or "Ajouter" is the first.
- **Not done:** no e-mail goes to someone the studio adds (bookings made outside Cal's booker send none, and Resend isn't verified yet). Paying at the desk doesn't create an order in Commandes; the place's own line says how it was paid.

### 46. rūsc admin: faster at the desk (2026-10-06)
- **Owner's request:** "improve UX too", after step 45's restyle and desk features.
- **No reloads for desk actions.** The page script (`ADMIN_JS`, inline in `page()`, replacing the table-label one-liner) sends Cours's desk forms (`data-inplace`) in the background: came / no-show, Encaisser, Annuler, Ajouter and "Tout le monde est venu". The answer is the page the server redirects to, and the script swaps in that class's card and the day's strip. The page doesn't move, and a short message shows at the bottom. The attendance switch lights at once. A refusal (bad amount, full class, code refused) shows its reason in orange and leaves the form open. Without the script, or if the request fails, the form submits the ordinary way.
- **Each form sends once.** On every page, the button is marked busy until the answer comes. A double click on "Ajouter au cours" no longer books twice (checked).
- **Today at a glance:** the list, and today's day page, start with a strip: the classes and people of the day, how many places are left to pay, and how many to tick ("tout est réglé", "présences faites" when done).
- **Per class:**
  - an orange "N à régler" badge;
  - "Tout le monde est venu", or "Les N autres sont venu·es", when at least two places aren't ticked yet (from the class's day).
- **Ajouter:**
  - The form opens right under the class's title, with the cursor in "Nom".
  - Typing a name suggests known clients (`GET /admin/clients/suggest`, 8 at most, names starting with it first). Picking one fills in their e-mail and phone.
  - A code is checked as it's typed and as the places change (`GET /admin/codes/check`): "Carnet 10 cours 2h · reste 10 séances, ce cours en prend 2 séances", or why it can't pay.
- **Smaller:**
  - A note in the address (`?note=`) is removed once shown, so a reload or the language switch doesn't repeat it (the FR · EN link drops it too).
  - Esc folds an open Ajouter or Encaisser form.
  - `/` jumps to the page's search field.
  - A busy button stays busy only until the page is shown again from the back button.
- **Checked** against a local Postgres (Cal's tables and triggers, the real `schema.sql`), with a local-only copy of rūsc admin accepting the http origin (deleted after), in the browser:
  - "Mari" suggested the test client and filled her e-mail and phone;
  - the code check said "unknown" for a wrong code, then the balance, and followed the places;
  - a double click on "Ajouter au cours" booked once (2 places, the carnet 10 → 8);
  - no-show, then "Les 2 autres sont venu·es", then clearing, each updating the badge and the strip;
  - a bad amount refused with its message, a card payment, and undo.

  None of it reloaded the page.
- Preview (made-up data): the list, the day, the calendar, Codes, a client and Horaires at 390 and 1280 px, with no sideways scroll and no layout shift.
- **Deployed** (`56c1d4ca`): rūsc admin on Fly; no database change. Live: the sign-in page carries the new script, and `/admin/clients/suggest` and `/admin/codes/check` ask for sign-in like every studio page. `/health`, `/api/classes` and `/api/places` answer 200. The only log error is the known one (step 36).

### 47. Open studio: several hours in a row (2026-10-06)
- **Owner's request:** "members should be able to book more than 1hr at once as well". (An earlier request for this was withdrawn the same day; this one replaces it.)
- **How it books.** Open studio stays a 1-hour Cal event type: its places are counted hour by hour, and a 2-hour Cal booking on a seated event would block or overlap the hours around it.
  - On the booking page, "Combien d’heures ? / How many hours?" (1 h · 2 h · 3 h · 4 h) sits under the code row, for open studio only. The member picks the start time in Cal's booker as before.
  - After Cal books that first hour, the site's hold (`/api/places`, op `hold`) carries `hours`. rūsc admin then books the following hours (`addHours`, `HOURLY`, `MAX_HOURS` = 4): each joins the Cal booking at that time, or makes one, pending until paid, with the same people.
  - It stops at the first hour that's closed (Cal's hours that day, overrides included) or full, and answers `note: "hours"`. The page then says how many of the hours asked for were booked.
- **One group across hours.** The later hours' seats point to the booker's (`rusc_holder`), and each copy of a person to that person's first-hour seat (`rusc_copy`). `placeGroup` now gathers the group from every hour and locks their bookings.
  - The booker is themselves again in each hour (their name and e-mail: the hours show in Cours and in their space); friends stay anonymous.
  - Cart + / − add or remove a friend in every hour.
  - A hold, its expiry and "Retirer" free every hour, cancelling the bookings left empty.
  - The checkout charges each place: 3 hours for one person is 3 × 22,50 €.
  - A code pays hour by hour (an hours carnet loses one hour each).
  - The Stripe webhook marks every hour paid and confirms all its bookings.
  - `placeState` adds `hours`; `places` now means people (per hour); `end` is the last hour's.
- **Cart:** the line reads "samedi 10 octobre 2026 à 09:00 – 12:00 · 3 h". Its + / − count people, and its price is people × hours × 22,50 €.
- **Also fixed:** the booking confirmation e-mail wrote its times with the server's clock, which is UTC on Fly (18:00 would have read 16:00). They're formatted in Paris time now. E-mails weren't going out yet (Resend), so none was wrong.
- **Checked** against a local Postgres (Cal's tables and triggers, the real `schema.sql`), with an open-studio class of 3 places open 09:00–12:00:
  - 3 hours held from 09:00;
  - a friend added in every hour, then removed;
  - holding again changed nothing;
  - an hours carnet paying the 3 hours (10 → 7);
  - stopping at closing time (11:00, 2 h asked, 1 booked) and at a full hour (09:00, 10:00 full, 1 booked);
  - a signed test webhook paying a 3-hour group (3 paid seats, 3 bookings confirmed);
  - "Retirer" cancelling three bookings left empty;
  - Cours showing the member in each hour, with how each was paid.

  A local build of the site against it, with a throwaway local member (deleted after):
  - the picker shows for a member, in FR and EN;
  - the cart line reads "09:00 – 12:00 · 3 h" at 67,50 €;
  - + made it 2 people and 135,00 € (the friend in all three hours in the database), and − brought it back;
  - no console errors.

  Not tried: a booking through the live Cal booker. It needs a member account on the live site, which agents don't create; the first one is the studio's or a member's.

