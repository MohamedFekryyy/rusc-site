#!/bin/sh
# First setup of the rūsc booking server on Fly.io (README.md, "First setup").
# Run from this folder, logged in to Fly (`fly auth login`):  sh setup.sh
#
# Safe to run again: existing apps and secrets are kept. The secrets are
# generated here and piped straight into Fly; they are never printed or saved
# to a file. Never regenerate them once the server has run: the database
# password is fixed when the volume is initialised, and
# CALENDSO_ENCRYPTION_KEY encrypts what Cal.diy stores.
set -eu
cd "$(dirname "$0")"
ORG=personal

has_app() { fly apps list --json | grep -q "\"Name\": \"$1\""; }
has_secret() { fly secrets list -a "$1" --json | grep -q "\"$2\""; }

has_app rusc-cal-db || fly apps create rusc-cal-db --org "$ORG"
has_app rusc-cal || fly apps create rusc-cal --org "$ORG"

if ! has_secret rusc-cal-db POSTGRES_PASSWORD; then
	password=$(openssl rand -hex 32)
	printf 'POSTGRES_PASSWORD=%s\n' "$password" | fly secrets import --stage -a rusc-cal-db
	url="postgresql://cal:$password@rusc-cal-db.internal:5432/cal"
	printf 'DATABASE_URL=%s\nDATABASE_DIRECT_URL=%s\n' "$url" "$url" | fly secrets import --stage -a rusc-cal
	unset password url
fi
if ! has_secret rusc-cal NEXTAUTH_SECRET; then
	{
		printf 'NEXTAUTH_SECRET=%s\n' "$(openssl rand -hex 32)"
		# 32 characters, as Cal.diy's AES-256 key requires.
		printf 'CALENDSO_ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 24)"
		printf 'CRON_API_KEY=%s\n' "$(openssl rand -hex 32)"
		printf 'CRON_SECRET=%s\n' "$(openssl rand -hex 32)"
	} | fly secrets import --stage -a rusc-cal
fi

# The database first (one machine, its volume is created on the way), then
# Cal.diy, whose first start applies every migration (a few minutes).
fly deploy -c fly.db.toml --ha=false --yes
sh deploy.sh

# Close public sign-up with Cal.diy's "disable-signup" flag, as soon as the
# migrations have created it. The studio's admin account is then created at
# /auth/setup, which works only while no account exists.
tries=0
until fly ssh console -a rusc-cal-db \
	-C "psql -U cal -d cal -tAc \"UPDATE \\\"Feature\\\" SET enabled = true WHERE slug = 'disable-signup'\"" \
	2>/dev/null | grep -q 'UPDATE 1'; do
	tries=$((tries + 1))
	if [ "$tries" -gt 30 ]; then
		echo "Could not turn on disable-signup yet: see README.md, then run sh setup.sh again."
		exit 1
	fi
	sleep 20
done
echo "Sign-up is closed. Create the studio's admin account at https://rusc-cal.fly.dev/auth/setup"
