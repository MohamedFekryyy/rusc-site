# rūsc — transactional emails

The two customer emails that matter for the booking flow. Source of truth for
their wording; the actual sending is wired in the code noted under each one.

| Email | Trigger | Sender / channel | Where it's wired |
|---|---|---|---|
| `confirmation-booking-payment` | A booking is paid (Stripe) or confirmed (code/voucher) | Cal.diy → Resend | Cal.diy i18n strings (already patched "meeting"→"class" in `deploy/cal/patches/rusc-wording.patch`); SMTP config in `deploy/cal/fly.toml` |
| `welcome-member` | A membership (`adhesion`) is paid | rusc-admin → Resend | `deploy/admin/server.mjs` — `recordOrder`, the `adhesion` branch |

Both are sent from `rrose@studio-rusc.com` ("rūsc") through Resend
(`smtp.resend.com:465`). Nothing actually sends until `studio-rusc.com` is
authenticated in Resend and its DNS records (SPF/DKIM/DMARC) are live at
Squarespace — see `deploy/cal/README.md` § "Emails (Resend)".

## Decision (2026-10-03, Raquel)

One single confirmation email for "payment + booking" — the client never gets
two overlapping messages. The payment line appears only when Stripe really
charged; a booking settled with a code/voucher shows the same email without a
payment line. A separate welcome email goes out when a membership is bought.

## Files

- `confirmation-booking-payment.fr.md` / `.en.md` — the confirmation wording.
- `welcome-member.fr.md` / `.en.md` — the membership welcome wording.

The Cal.diy confirmation is rendered from the i18n strings in the booking app;
the `.md` here is the reference wording those strings must produce. The
welcome email is plain text/HTML emitted directly by rusc-admin.
