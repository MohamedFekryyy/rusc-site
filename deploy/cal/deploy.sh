#!/bin/sh
# Deploys Cal.diy to Fly with the image built for the commit in CAL_DIY_REF.
# The "Cal.diy image" workflow must have finished for that commit first.
# Run from this folder:  sh deploy.sh
set -eu
cd "$(dirname "$0")"

tag=$(cut -c1-12 CAL_DIY_REF)
fly deploy -c fly.toml --image "ghcr.io/mohamedfekryyy/rusc-cal:$tag" --ha=false --yes --wait-timeout 15m
