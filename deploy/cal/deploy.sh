#!/bin/sh
# Deploys Cal.diy to Fly with the image built for the commit in CAL_DIY_REF
# plus the patches in patches/. The "Cal.diy image" workflow must have
# finished for them first. Run from this folder:  sh deploy.sh
set -eu
cd "$(dirname "$0")"

# Same tag as .github/workflows/cal-image.yml.
patches=$(cat patches/*.patch | shasum -a 256 | cut -c1-8)
tag="$(cut -c1-12 CAL_DIY_REF)-$patches"
fly deploy -c fly.toml --image "ghcr.io/mohamedfekryyy/rusc-cal:$tag" --ha=false --yes --wait-timeout 15m

# The first booker Cal renders after a restart takes about 20 seconds, and the
# site shows an empty frame meanwhile (it looked like "no availability" on
# 2026-10-02). Open each class's booker once, in both languages, before
# visitors do. The slugs are the session offers of lib/cal.ts, then the
# classes made in rūsc admin (its /api/classes).
echo "Warming up the bookers…"
made=$(curl -s --max-time 20 https://rusc-admin.fly.dev/api/classes | python3 -c 'import sys, json; print(" ".join(c["key"] for c in json.load(sys.stdin)["classes"] if c["active"]))' 2>/dev/null || true)
for slug in atelier-ceramique-2h atelier-modelage-2h decor-a-cru-1h modelage-enfant atelier-libre-1h atelier-ceramique-1j atelier-ceramique-2j porcelaine pot-and-wine $made; do
	for lang in fr en; do
		curl -s -o /dev/null --max-time 90 "https://booking.studio-rusc.com/raquel/$slug/embed?lang=$lang&embed=warmup&layout=month_view&theme=light&embedType=inline" || echo "warm-up: $slug ($lang) failed"
	done
done
