#!/bin/sh
# Calls Cal.diy's background-task endpoints on the schedule Cal.com runs them
# (apps/web/vercel.json and .github/workflows/cron-bookingReminder.yml in
# calcom/cal.diy; two endpoints listed there don't exist at the pinned
# commit and are left out). Runs in the background
# of the Cal.diy machine (the "app" command in fly.toml), next to the server;
# CRON_API_KEY and CRON_SECRET are Fly secrets.
set -u
BASE="http://localhost:3000/api"

# The /tasks endpoints only accept the cron secret; the /cron calendar
# endpoints accept it too.
hit() {
	wget -q -O /dev/null -T 55 \
		--header "authorization: Bearer ${CRON_SECRET}" \
		"${BASE}$1" || echo "cron: $1 failed"
}

# Reminds the studio of bookings still waiting for confirmation (48 h, 24 h
# and 3 h after they were made). This one takes the API key, by POST.
remind() {
	wget -q -O /dev/null -T 55 --post-data "" \
		--header "authorization: ${CRON_API_KEY}" \
		"${BASE}/cron/bookingReminder" || echo "cron: /cron/bookingReminder failed"
}

# The server needs a few minutes to start (migrations on first boot).
sleep 180

while :; do
	m=$(date +%M | sed 's/^0//')
	h=$(date +%H | sed 's/^0//')

	hit /tasks/cron
	if [ $((m % 5)) -eq 0 ]; then
		hit /cron/calendar-subscriptions
		hit /cron/selected-calendars
	fi
	[ $((m % 15)) -eq 0 ] && remind
	if [ "$m" -eq 0 ]; then
		[ "$h" -eq 0 ] && hit /tasks/cleanup
		[ "$h" -eq 3 ] && hit /cron/calendar-subscriptions-cleanup
	fi

	# Wake up at the start of the next minute.
	sleep $((60 - $(date +%S | sed 's/^0//')))
done
