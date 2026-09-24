# Patches on top of Cal.diy

`.github/workflows/cal-image.yml` applies every `*.patch` here (with `git apply`, in name order) to the pinned `calcom/cal.diy` commit before building the image. The image tag includes a hash of these files, so changing a patch builds and deploys a new image.

| Patch | Why |
|---|---|
| `parallel-classes.patch` | rūsc's classes run side by side under one host (Mondays at 16:00: wheel throwing, hand-building and raw-glaze decoration), each with its own seats. Stock Cal.diy counts a booking of any event type as busy time for the host, so one class would block the others. With the patch, only bookings of the same event type count; seats still fill a class up. File: `packages/features/busyTimes/services/getBusyTimes.ts`. |

When updating `CAL_DIY_REF`, check that each patch still applies (the build fails if not) and still makes sense.
