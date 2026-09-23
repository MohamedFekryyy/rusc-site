# rūsc — site (Next.js)

Site bilingue FR/EN de l'atelier rūsc (Chamonix) : Next.js 16 (App Router), hébergé sur Vercel. Les réservations passent par Cal.com, intégré dans le site (aucun lien ne sort vers cal.com).

Notes détaillées pour les agents et l'historique de la migration : [AGENTS.md](AGENTS.md).

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
app/(fr)/page.tsx              accueil FR (/) — avec la liste des réservations
app/(fr)/reserver/page.tsx     réservation Cal.com intégrée (/reserver/)
app/(fr)/conditions/page.tsx   conditions générales (/conditions/)
app/(en)/en/page.tsx           accueil EN (/en/)
app/(en)/en/booking/page.tsx   réservation Cal.com EN (/en/booking/)
app/(en)/en/terms/page.tsx     terms (/en/terms/)
components/                    en-tête, pied de page, réservation Cal.com, formulaire…
lib/                           coordonnées, config Cal.com, URLs des pages, formulaire
styles/                        CSS repris tel quel de l'ancien site
assets/                        photos et logos
next.config.ts                 redirections (anciennes URL)
```

## À configurer

| Élément | Où | Valeur actuelle |
|---|---|---|
| Serveur Cal.com | `lib/cal.ts` — `CAL_ORIGIN` (variable Vercel `NEXT_PUBLIC_CAL_ORIGIN`) | `https://app.cal.com` ; l'URL de l'instance Cal.diy une fois auto-hébergée |
| Compte Cal.com | `lib/cal.ts` — `CAL_USERNAME` (`NEXT_PUBLIC_CAL_USERNAME`) | `rusc-studio` |
| Ateliers (types d'événement) | `lib/cal.ts` — `SERVICES` | une paire `-fr` / `-en` par atelier ; ces slugs doivent exister dans Cal.com |
| Liens vers un atelier précis | `/reserver/?workshop=<clé>` (clés de `SERVICES`), `?view=catalog` ou `?view=gifts` | voir `lib/routes.ts` |
| Formulaire de contact | `lib/site.ts` — `FORM_ENDPOINT` | vide → repli `mailto:` |
| Coordonnées | `lib/site.ts` | info@studio-rusc.com · +33 7 82 40 60 16 |
| Domaine canonique | `lib/site.ts` — `SITE_URL` | `https://studio-rusc.com` |

## Déploiement — Vercel

Le dépôt GitHub est relié au projet Vercel `rusc-preview`. Chaque push sur `main` est mis en ligne automatiquement sur https://rusc-preview.vercel.app ; les autres branches ont des aperçus (connexion Vercel requise). `vercel.json` impose le build Next.js : ne pas le supprimer.

## Bascule finale

1. Valider le site sur https://rusc-preview.vercel.app.
2. Dans Vercel → projet `rusc-preview` → Settings → Domains : ajouter `studio-rusc.com` (et `www.studio-rusc.com`).
3. Chez Squarespace Domains (registrar), créer les enregistrements DNS indiqués par Vercel.
4. Annuler le site Squarespace (et Acuity une fois les réservations passées sur Cal.com). Les anciennes URL (`/rserver`, `/about`, `/contact`…) sont redirigées par `next.config.ts`.
