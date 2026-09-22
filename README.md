# rūsc — site (Next.js)

Site bilingue FR/EN de l'atelier rūsc (Chamonix) : Next.js 16 (App Router), exporté en HTML statique et hébergé sur Cloudflare Pages. Les réservations passent par Acuity Scheduling, intégré dans la page.

Notes détaillées pour les agents et l'historique de la migration : [AGENTS.md](AGENTS.md).

## Développement

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # export statique dans out/
npm run lint
```

## Structure

```
app/(fr)/page.tsx              accueil FR (/) — avec la liste des réservations
app/(fr)/reserver/page.tsx     réservation Acuity (/reserver/)
app/(fr)/conditions/page.tsx   conditions générales (/conditions/)
app/(en)/en/page.tsx           accueil EN (/en/)
app/(en)/en/booking/page.tsx   réservation Acuity EN (/en/booking/)
app/(en)/en/terms/page.tsx     terms (/en/terms/)
components/                    en-tête, pied de page, réservation Acuity, formulaire…
lib/                           coordonnées, compte Acuity, URLs des pages, formulaire
styles/                        CSS repris tel quel de l'ancien site
assets/                        photos et logos
public/_redirects              redirections Cloudflare (anciennes URL)
```

## À configurer

| Élément | Où | Valeur actuelle |
|---|---|---|
| Compte Acuity | `lib/acuity.ts` — `ACUITY_OWNER` | `19154889` |
| Ateliers liés depuis les cartes | `lib/acuity.ts` — `APPOINTMENT_TYPES` | IDs Acuity des anciens liens `rusc.as.me` |
| Liens vers un atelier précis | `/reserver/?workshop=<slug>` (slugs de `APPOINTMENT_TYPES`), `?view=catalog` ou `?view=gifts` | voir `lib/routes.ts` |
| Formulaire de contact | `lib/site.ts` — `FORM_ENDPOINT` | vide → repli `mailto:` |
| Coordonnées | `lib/site.ts` | info@studio-rusc.com · +33 7 82 40 60 16 |
| Domaine canonique | `lib/site.ts` — `SITE_URL` | `https://studio-rusc.com` |

## Déploiement — Cloudflare Pages

Le site publié est le dossier `out/` produit par `npm run build` (il n'y a plus de HTML à la racine du dépôt).

**Option A — wrangler (comme avant)**
```bash
npm run build
CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy out --project-name=rselavy
```

**Option B — intégration Git de Cloudflare Pages**
Build command `npm run build`, output directory `out`, variable `NODE_VERSION=22` (Next.js 16 demande Node 20.9 ou plus).

**Vercel (aperçu)** — chaque push sur `main` redéploie automatiquement https://rusc-preview.vercel.app (build Next.js imposé par `vercel.json`).

## Bascule finale

1. Valider le site sur `rselavy.com`.
2. Dans Cloudflare : ajouter `studio-rusc.com` comme custom domain du projet Pages.
3. Mettre à jour le DNS du domaine (Squarespace Domains reste le registrar).
4. Annuler le site Squarespace, en gardant l'abonnement Acuity. Les anciennes URL (`/rserver`, `/about`, `/contact`…) sont redirigées par `public/_redirects`.
