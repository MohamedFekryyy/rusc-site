#!/bin/sh
# Saves Brevo's SMTP login in the booking server (Fly app rusc-cal), so Cal
# sends its booking e-mails (confirmations, cancellations) from
# reservation@studio-rusc.com (fly.toml). Run it yourself:  sh deploy/cal/set-smtp.sh
#
# In Brevo: SMTP & API → SMTP. The login looks like 9a1b2c001@smtp-brevo.com;
# create an SMTP key there (xsmtpsib-…). The key is typed hidden and goes
# straight to Fly; it is never printed or written to disk. Cal restarts once.
set -eu

printf 'Brevo SMTP login (…@smtp-brevo.com): '
read -r login
printf 'Brevo SMTP key (hidden): '
stty -echo
read -r key
stty echo
echo

case "$login" in
  *@*) ;;
  *) echo "That doesn't look like the SMTP login (it contains an @). Nothing saved."; exit 1 ;;
esac
if [ "${#key}" -lt 16 ]; then
  echo "That key is too short. Nothing saved."
  exit 1
fi
case "$key" in
  xsmtpsib-*) ;;
  *) echo "Note: Brevo SMTP keys usually start with xsmtpsib- (an API key won't work here)." ;;
esac

printf 'EMAIL_SERVER_USER=%s\nEMAIL_SERVER_PASSWORD=%s\n' "$login" "$key" | fly secrets import -a rusc-cal >/dev/null
key=""
echo "Saved in rusc-cal. Cal restarts within a couple of minutes, then sends booking e-mails."
echo "For them not to land in spam, authenticate studio-rusc.com in Brevo (Senders & domains)"
echo "and add the DNS records it gives at Squarespace."
