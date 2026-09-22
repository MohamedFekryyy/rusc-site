# rūsc — nouveau site (banc d'essai rselavy.com → studio-rusc.com)

Site statique bilingue FR/EN, prêt à déployer sur Cloudflare Pages.

## Structure

```
sites/rusc-new/
├── index.html        FR (racine)
├── en/index.html     EN (/en/)
├── robots.txt
├── sitemap.xml
└── assets/           (vide — visuels à fournir)
```

## À configurer avant mise en ligne

| Élément | Où | Valeur actuelle |
|---|---|---|
| Réservation (Acuity) | `assets/acuity-embed.js` — `OWNER` | `19154889` (compte Acuity existant) |
| Formulaire de contact | `FORM_ENDPOINT` (en bas de chaque page) | vide → repli `mailto:` |
| Images | objet `IMAGES` (en bas de chaque page) | vide → cadres masqués |
| Domaine canonique | `<link rel="canonical">` | `https://studio-rusc.com` |

## Déploiement — Cloudflare Pages

Le dossier entier `sites/rusc-new/` est la racine du site (pas de build).

**Option A — wrangler (comme en juin)**
```bash
cd sites/rusc-new
CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy . --project-name=rselavy
```

**Option B — tableau de bord Cloudflare**
Pages → projet `rselavy` → Create new deployment → glisser le dossier `rusc-new`.

## Bascule finale

1. Valider le site sur `rselavy.com`.
2. Dans Cloudflare : ajouter `studio-rusc.com` comme custom domain du projet Pages.
3. Mettre à jour le CNAME du domaine (via Squarespace Domain Connect ou manuellement).
4. Annuler Squarespace.
