#!/bin/sh
# Runs a SQL file with psql on the rusc-cal-db machine:
#   sh deploy/cal/db-run.sh file.sql
# Goes through Fly's Machines API (fly machine exec) in 4 KB pieces: large
# uploads over `fly ssh` (stdin, sftp, long commands) stalled from this
# network, and the API refuses commands much larger than that.
set -eu
file=$1
app=rusc-cal-db
machine=$(fly machine list -a "$app" --json | python3 -c 'import sys, json; print(json.load(sys.stdin)[0]["id"])')
remote=/tmp/db-run.$$

fly machine exec "$machine" "rm -f $remote.b64" -a "$app" >/dev/null
{ base64 < "$file" | tr -d '\n'; echo; } | fold -w 4000 | while read -r chunk; do
	fly machine exec "$machine" "sh -c 'printf %s $chunk >> $remote.b64'" -a "$app" >/dev/null
done
fly machine exec "$machine" "sh -c 'base64 -d $remote.b64 > $remote.sql && psql -U cal -d cal -v ON_ERROR_STOP=1 -f $remote.sql 2>&1; rm -f $remote.b64 $remote.sql'" -a "$app"
