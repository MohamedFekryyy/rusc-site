#!/bin/sh
# Starts Cal.diy on the Fly machine: the same steps as the image's own
# scripts/start.sh (calcom/cal.diy), except that the last one runs Next.js
# directly. Cal.diy's `yarn start` goes through yarn, turbo and yarn again
# before reaching `next start`, and those launchers alone used about 330 MB
# of the machine's 1 GB. Compare with scripts/start.sh when updating Cal.diy.
set -x
cd /calcom

# Point the build at this server's address (NEXT_PUBLIC_WEBAPP_URL).
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL"

scripts/wait-for-it.sh ${DATABASE_HOST} -- echo "database is up"
npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
npx ts-node --transpile-only /calcom/scripts/seed-app-store.ts

# apps/web's "start" script is `next start`.
cd apps/web
exec node /calcom/node_modules/next/dist/bin/next start
