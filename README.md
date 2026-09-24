# rūsc — site (Next.js)

Site bilingue FR/EN de l'atelier rūsc (Chamonix) : Next.js 16 (App Router), hébergé sur Vercel.
- **Réservations :** un Cal.diy auto-hébergé sur Fly.io, intégré dans le site. Aucun lien ne sort vers Cal ou Acuity.
- **Paiements :** un panier payé par Stripe, intégré lui aussi.
- **Gestion :** l'atelier gère cours, codes et commandes dans **rūsc admin**.

Notes détaillées pour les agents, état actuel et historique : [AGENTS.md](AGENTS.md).

## Développement

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de production (.next/)
npm run start   # sert ce build en local
npm run lint
```

## Structure

```
app/(fr)/page.tsx              accueil FR (/)
app/(fr)/reserver/page.tsx     réservation intégrée (/reserver/)
app/(fr)/panier/page.tsx       panier et paiement Stripe (/panier/)
app/(fr)/connexion/page.tsx    connexion membres (/connexion/), en attente d'un service d'authentification
app/(fr)/conditions/page.tsx   conditions générales (/conditions/)
app/(fr)/…                     pages de contenu (cours, stages, membres, us, contact…)
app/(en)/en/…                  les mêmes en anglais (/en/, /en/booking/, /en/cart/, /en/login/, /en/terms/…)
app/api/checkout/route.ts      crée la session Stripe (prix recalculés côté serveur)
components/                    en-tête, pied de page, réservation (BookingEmbed), panier (CartView)…
lib/                           config Cal et offres (cal.ts), panier, codes, URLs des pages, coordonnées
styles/                        CSS repris tel quel de l'ancien site
assets/                        photos et logos
next.config.ts                 redirections (anciennes URL)
deploy/cal/                    serveur de réservation Cal.diy sur Fly.io (voir son README)
deploy/admin/                  rūsc admin, l'espace de l'atelier sur Fly.io (voir son README)
scripts/continuity/            reprise des codes et réservations d'Acuity (voir son README)
```

## Configuration

| Élément | Où | Valeur actuelle |
|---|---|---|
| Serveur de réservation | `lib/cal.ts` — `CAL_ORIGIN` (variable Vercel `NEXT_PUBLIC_CAL_ORIGIN`) | `https://rusc-cal.fly.dev` ; plus tard `https://booking.studio-rusc.com` |
| Compte Cal | `lib/cal.ts` — `CAL_USERNAME` (`NEXT_PUBLIC_CAL_USERNAME`) | `raquel` |
| Offres et prix | `lib/cal.ts` — `OFFERS` | un type d'événement Cal par cours (slug = clé) ; cartes, adhésion et bons cadeaux vont au panier |
| Liens vers un atelier précis | `/reserver/?workshop=<clé>`, `?view=catalog` ou `?view=gifts` | voir `lib/routes.ts` |
| Paiement en ligne | variables Vercel `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | en place depuis le 24/09/2026 (compte Stripe « Studio-rusc », mode live) |
| Codes (carnets, bons) | `lib/codes.ts` — `CODES_ORIGIN` (`NEXT_PUBLIC_CODES_ORIGIN`) | `https://rusc-admin.fly.dev` |
| Connexion membres | `lib/auth.ts` — `NEXT_PUBLIC_AUTH_ENDPOINT` | vide → page en mode aperçu |
| Formulaire de contact | `lib/site.ts` — `FORM_ENDPOINT` | vide → repli `mailto:` |
| Coordonnées | `lib/site.ts` | info@studio-rusc.com · +33 7 82 40 60 16 |
| Domaine canonique | `lib/site.ts` — `SITE_URL` | `https://studio-rusc.com` |

Les clés ne passent jamais dans le dépôt, qui est public : variables Vercel, secrets Fly, ou `.secrets/` (ignoré par git).

## Déploiement — Vercel

Le dépôt GitHub est relié au projet Vercel `rusc-preview`. Chaque push sur `main` est mis en ligne automatiquement sur https://rusc-preview.vercel.app ; les autres branches ont des aperçus (connexion Vercel requise). `vercel.json` impose le build Next.js : ne pas le supprimer.

Les deux services sur Fly.io se déploient à part : `deploy/cal/` (`sh deploy.sh`) et `deploy/admin/` (`fly deploy`).

## Bascule finale

1. Valider le site sur https://rusc-preview.vercel.app, dont un vrai petit achat au panier (puis le rembourser dans Stripe).
2. E-mails de réservation : configurer Brevo pour Cal (`deploy/cal/README.md`, étape 4).
3. Reprendre une dernière fois les codes et réservations d'Acuity (`scripts/continuity/README.md`).
4. Dans Vercel → projet `rusc-preview` → Settings → Domains : ajouter `studio-rusc.com` (et `www.studio-rusc.com`). Chez Squarespace Domains (registrar), créer les enregistrements DNS indiqués par Vercel.
5. Facultatif : `booking.studio-rusc.com` pour Cal et `admin.studio-rusc.com` pour rūsc admin (certificats Fly et DNS).
6. Annuler le site Squarespace, puis Acuity. Réinitialiser la clé API d'Acuity et la retirer de Vercel. Les anciennes URL (`/rserver`, `/about`, `/contact`…) sont redirigées par `next.config.ts`.
