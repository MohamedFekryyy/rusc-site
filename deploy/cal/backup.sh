#!/bin/sh
# Nightly PostgreSQL dump at 02:30 (server time) into /backups (./backups on
# the server), kept 14 days. Runs in the "backup" service. These copies live
# on the same machine: also turn on Hetzner's server backups (README.md).
set -u
export PGPASSWORD="$POSTGRES_PASSWORD"

while :; do
	if [ "$(date +%H%M)" = "0230" ]; then
		file="/backups/cal-$(date +%F).sql.gz"
		if pg_dump -h db -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$file.tmp"; then
			mv "$file.tmp" "$file" && echo "$(date -Iseconds) backup ok: $file"
		else
			rm -f "$file.tmp" && echo "$(date -Iseconds) backup FAILED"
		fi
		find /backups -name 'cal-*.sql.gz' -mtime +14 -delete
		sleep 60
	fi
	sleep 30
done
