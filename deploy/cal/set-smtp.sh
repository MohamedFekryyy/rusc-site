#!/bin/sh
# Saves Resend's API key in the booking server (Fly app rusc-cal), so Cal
# sends its booking e-mails (confirmations, cancellations, review requests)
# from rrose@studio-rusc.com (fly.toml). Run it yourself:
#   sh deploy/cal/set-smtp.sh
#
# Resend → API Keys. Create an API key (re_...). It doubles as the SMTP
# password; the SMTP username is fixed ("resend") and the host/port are
# already in fly.toml (smtp.resend.com:465). The key is typed hidden and
# goes straight to Fly; it is never printed or written to disk. Cal restarts
# once after you save it.
set -eu

printf 'Resend API key (re_..., hidden): '
stty -echo
read -r key
stty echo
echo

if [ "${#key}" -lt 16 ]; then
  echo "That key is too short. Nothing saved."
  exit 1
fi
case "$key" in
  re_*) ;;
  *) echo "Note: Resend API keys start with re_ (an SMTP username won't work here)." ;;
esac

printf 'EMAIL_SERVER_PASSWORD=%s\n' "$key" | fly secrets import -a rusc-cal >/dev/null
key=""
echo "Saved in rusc-cal. Cal restarts within a couple of minutes, then sends booking e-mails."
echo "For them not to land in spam, authenticate studio-rusc.com in Resend (Domains)"
echo "and add the DNS records it gives (SPF/DKIM/DMARC) at Squarespace."
