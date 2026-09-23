#!/bin/sh
# One-time setup of the rūsc booking server (Hetzner, Ubuntu 24.04).
# Run as root from this folder:  sh setup.sh
# Safe to run again: an existing .env is never overwritten.
set -eu
cd "$(dirname "$0")"

# Docker (Ubuntu's packages) and a firewall that only lets SSH and the web in.
apt-get update
apt-get install -y docker.io docker-compose-v2 ufw openssl
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443
ufw --force enable

# Settings: .env is created once from example.env, with fresh secrets.
if [ ! -f .env ]; then
	cp example.env .env
	chmod 600 .env
	for key in NEXTAUTH_SECRET CRON_API_KEY CRON_SECRET POSTGRES_PASSWORD; do
		sed -i "s|^$key=.*|$key=$(openssl rand -hex 32)|" .env
	done
	# 32 characters, as Cal.diy's AES-256 key requires.
	sed -i "s|^CALENDSO_ENCRYPTION_KEY=.*|CALENDSO_ENCRYPTION_KEY=$(openssl rand -base64 24)|" .env
fi
sed -i "s|^CAL_IMAGE_TAG=.*|CAL_IMAGE_TAG=$(cut -c1-12 CAL_DIY_REF)|" .env
mkdir -p backups

# The certificate email and the Brevo login are filled in by hand.
missing=""
for key in ACME_EMAIL EMAIL_SERVER_USER EMAIL_SERVER_PASSWORD; do
	grep -q "^$key=." .env || missing="$missing $key"
done
if [ -n "$missing" ]; then
	echo "Fill in these lines in $(pwd)/.env, then run sh setup.sh again:$missing"
	exit 1
fi

docker compose pull
docker compose up -d
domain=$(grep '^CAL_DOMAIN=' .env | cut -d= -f2)
echo "Started. Create the studio's admin account at https://$domain/auth/setup"
