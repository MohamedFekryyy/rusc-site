#!/bin/sh
# First setup of rūsc admin on Fly (README.md). Run from this folder,
# logged in to Fly:  sh setup.sh
# Safe to run again. The database password is generated here and piped
# straight into Postgres and into Fly's secrets; it is never printed.
set -eu
cd "$(dirname "$0")"
ORG=personal

has_app() { fly apps list --json | grep -q "\"Name\": \"$1\""; }
has_secret() { fly secrets list -a "$1" --json | grep -q "\"$2\""; }

has_app rusc-admin || fly apps create rusc-admin --org "$ORG"

# Its own database role, which can only read Cal's booking tables.
if ! has_secret rusc-admin DATABASE_URL; then
	umask 077
	password=$(openssl rand -hex 24)
	sql=$(mktemp)
	cat > "$sql" <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rusc_codes') THEN CREATE ROLE rusc_codes LOGIN; END IF;
END \$\$;
ALTER ROLE rusc_codes PASSWORD '$password';
SQL
	sh ../cal/db-run.sh "$sql" >/dev/null
	rm -f "$sql"
	printf 'DATABASE_URL=postgresql://rusc_codes:%s@rusc-cal-db.internal:5432/cal\n' "$password" |
		fly secrets import --stage -a rusc-admin
	unset password
fi

sh ../cal/db-run.sh schema.sql
fly deploy --ha=false --yes

has_secret rusc-admin CODES_ADMIN_PASSWORD ||
	echo "Last step, for the studio: choose the admin password with
  fly secrets set -a rusc-admin CODES_ADMIN_PASSWORD='…'
then sign in at https://rusc-admin.fly.dev/login."
