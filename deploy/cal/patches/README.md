# Patches on top of Cal.diy

`.github/workflows/cal-image.yml` applies every `*.patch` here (with `git apply`, in name order) to the pinned `calcom/cal.diy` commit before building the image. The image tag includes a hash of these files, so changing a patch builds and deploys a new image.

| Patch | Why |
|---|---|
| `late-booking.patch` | People can book a class until 30 minutes after it starts (owner's request, 2026-09-24). Stock Cal.diy refuses any time before now, and its minimum booking notice (default 2 hours) can't go below 0. With the patch, a **negative** notice is a grace period: the classes have `minimumBookingNotice = -30`. Slots already start from "now + notice", so only the in-the-past guard needed the grace. File: `packages/lib/isOutOfBounds.tsx`. |
| `parallel-classes.patch` | rūsc's classes run side by side under one host (Mondays at 16:00: wheel throwing, hand-building and raw-glaze decoration), each with its own seats. Stock Cal.diy counts a booking of any event type as busy time for the host, so one class would block the others. With the patch, only bookings of the same event type count; seats still fill a class up. File: `packages/features/busyTimes/services/getBusyTimes.ts`. |
| `rusc-wording.patch` | The confirmation screen said "This meeting is scheduled" and "calendar invitation" (Cal.diy's default). rūsc is a studio with classes, not meetings: the patch changes the EN and FR strings to "Your class is booked / Votre cours est réservé" and drops the calendar-invitation wording. File: `packages/i18n/locales/{en,fr}/common.json`. |

When updating `CAL_DIY_REF`, check that each patch still applies (the build fails if not) and still makes sense.
