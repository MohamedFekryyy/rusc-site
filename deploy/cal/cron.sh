#!/bin/sh
# Calls Cal.diy's background-task endpoints on the schedule Cal.com runs them
# on Vercel (apps/web/vercel.json in calcom/cal.diy). Runs in the "cron"
# service; CRON_API_KEY and CRON_SECRET come from .env.
set -u
BASE="http://cal:3000/api"

hit() {
	wget -q -O /dev/null -T 55 \
		--header "authorization: Bearer ${CRON_SECRET}" \
		"${BASE}$1?apiKey=${CRON_API_KEY}" || echo "$(date -Iseconds) $1 failed"
}

while :; do
	m=$(date +%M | sed 's/^0//')
	h=$(date +%H | sed 's/^0//')

	hit /tasks/cron
	if [ $((m % 5)) -eq 0 ]; then
		hit /cron/calendar-subscriptions
		hit /cron/selected-calendars
		hit /cron/credentials
	fi
	if [ "$m" -eq 0 ]; then
		[ "$h" -eq 0 ] && hit /tasks/cleanup
		[ "$h" -eq 3 ] && hit /cron/calendar-subscriptions-cleanup
		[ $((h % 12)) -eq 0 ] && hit /cron/queuedFormResponseCleanup
	fi

	# Wake up at the start of the next minute.
	sleep $((60 - $(date +%S | sed 's/^0//')))
done
