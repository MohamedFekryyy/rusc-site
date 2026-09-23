# rūsc booking server: Cal.diy on Hetzner

The site (on Vercel) embeds the booking system from **https://booking.studio-rusc.com**, a self-hosted [Cal.diy](https://github.com/calcom/cal.diy), the MIT community fork of Cal.com. Visitors only ever see it inside the site's booking pages.

| Service in `docker-compose.yml` | What it does |
|---|---|
| `cal` | Cal.diy. The image is built by `.github/workflows/cal-image.yml` from the commit in `CAL_DIY_REF`; it applies database migrations when it starts |
| `db` | PostgreSQL 16 |
| `caddy` | HTTPS with automatic certificates; keeps public sign-up closed |
| `cron` | Calls Cal.diy's background tasks (email queue, calendar sync, cleanups) |
| `backup` | Nightly database dump into `backups/`, kept 14 days |

Secrets only exist in `.env` on the server, which `setup.sh` creates. They are never in the repo or in chat.

> Written before the server existed. The first setup is also the first real test.

## First setup

1. **Build the image.** In GitHub, open Actions → **Cal.diy image** → Run workflow. It also runs by itself whenever `CAL_DIY_REF` changes, and takes 30–60 minutes. Then make the package public so the server can download it without a login: your GitHub profile → Packages → `rusc-cal` → Package settings → Change visibility → Public. The image contains no secrets.
2. **Create the server** in the Hetzner Cloud Console:
   - Ubuntu 24.04, 2 vCPUs and 4 GB RAM, in Germany or Finland;
   - your SSH key;
   - **Backups** turned on.
3. **DNS.** In Squarespace Domains, go to studio-rusc.com → DNS and add an `A` record for `booking`, pointing at the server's IPv4 address.
4. **Brevo.**
   - Create an SMTP key (SMTP & API → SMTP).
   - Authenticate the domain studio-rusc.com (Senders & domains). Brevo gives a few DNS records to add at Squarespace; without them, booking emails land in spam.
5. **On the server** (`ssh root@<server IP>`):
   ```bash
   git clone https://github.com/MohamedFekryyy/rusc-site /opt/rusc-site
   cd /opt/rusc-site/deploy/cal
   sh setup.sh   # installs Docker, creates .env with fresh secrets, stops
   nano .env     # fill in ACME_EMAIL, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD
   sh setup.sh   # starts everything
   ```
6. **Right away**, open https://booking.studio-rusc.com/auth/setup and create the studio's admin account. Cal.diy only allows this while no account exists.
7. **In Cal.diy:**
   - choose the username and French as the language;
   - create the event types with the exact slugs in `lib/cal.ts` (`…-fr` and `…-en`);
   - under Apps, connect Stripe.
8. **Point the site at it.** In Vercel → `rusc-preview` → Settings → Environment Variables:
   - set `NEXT_PUBLIC_CAL_ORIGIN=https://booking.studio-rusc.com`;
   - set `NEXT_PUBLIC_CAL_USERNAME` to the username chosen in step 7;
   - redeploy.

## Updating Cal.diy

1. Put a newer `calcom/cal.diy` commit in `CAL_DIY_REF` and push. The workflow builds the new image.
2. Once the build is green, on the server run:
   ```bash
   cd /opt/rusc-site/deploy/cal && sh update.sh
   ```

## Logs

```bash
cd /opt/rusc-site/deploy/cal
docker compose ps
docker compose logs -f cal     # or caddy, cron, backup, db
```

## Restoring a backup

Dumps are in `backups/`, one per night. Hetzner's server backups cover the whole machine.

```bash
cd /opt/rusc-site/deploy/cal
docker compose stop cal cron
docker compose exec -T db dropdb -U cal cal
docker compose exec -T db createdb -U cal cal
gunzip -c backups/cal-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U cal -d cal
docker compose start cal cron
```
