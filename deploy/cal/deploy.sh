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
