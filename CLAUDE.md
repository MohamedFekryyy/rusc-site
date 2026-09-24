@AGENTS.md

## Notes for Claude

- Pushing to `main` deploys production on Vercel (https://rusc-preview.vercel.app). Run `npm run build` and `npm run lint` first, then confirm the deploy with `gh api repos/MohamedFekryyy/rusc-site/commits/<sha>/status` and the public URL.
- Make a failed build stop you: `set -o pipefail`, or check the exit status. Piping `npm run build` through `grep`/`head` once hid a failure, and a broken commit was pushed (step 32).
- The owner works in GitHub Desktop on this same checkout and may commit, push or switch branches mid-task. Re-check `git branch --show-current` (and `git reflog`) before each commit. Commit each finished step right away, with a real message.
- Record every step in the migration log in `AGENTS.md`: what changed, why, and the commit.
- Start from "Where things stand" at the top of `AGENTS.md`, and keep it current when something goes live, waits on someone, or gets decided.
- The two Fly services deploy on their own: `deploy/admin/` (`fly deploy`; check page changes first with `node deploy/admin/preview.mjs`) and `deploy/cal/` (`sh deploy.sh`). Their READMEs have the details.
- For admin or site UI, follow the owner's design skill `match-fekry-design` (utility mode for the admin). Add icons only where they carry meaning.
- Keep `vercel.json`: it pins the Next.js build on Vercel.
