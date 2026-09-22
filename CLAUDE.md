@AGENTS.md

## Notes for Claude

- Pushing to `main` deploys production on Vercel (https://rusc-preview.vercel.app). Run `npm run build` and `npm run lint` first, then confirm the deploy with `gh api repos/MohamedFekryyy/rusc-site/commits/<sha>/status` and the public URL.
- The owner works in GitHub Desktop on this same checkout and may commit, push or switch branches mid-task. Re-check `git branch --show-current` (and `git reflog`) before each commit. Commit each finished step right away, with a real message.
- Record every step in the migration log in `AGENTS.md`: what changed, why, and the commit.
- Keep `vercel.json`: it pins the Next.js build on Vercel.
