#!/bin/sh
# Update the booking server to main: pull this repo, then the Cal.diy image
# pinned in CAL_DIY_REF (built beforehand by .github/workflows/cal-image.yml).
# Run as root from this folder:  sh update.sh
set -eu
cd "$(dirname "$0")"

git pull --ff-only
sed -i "s|^CAL_IMAGE_TAG=.*|CAL_IMAGE_TAG=$(cut -c1-12 CAL_DIY_REF)|" .env
docker compose pull
docker compose up -d
docker image prune -f
