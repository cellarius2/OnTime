# Vibe Coding Toolkit adoption

## Source and revision
- Toolkit: `https://github.com/soumatheusgomes/vibe-coding-toolkit`
- Adopted revision: `7ef68dd7b00ddfc5cd464458855e4ab66dd2128f`
- Adoption date: 2026-11-08
- Installation mode: project-local files and configuration only

## Capability matrix
| Capability | Status | Integration |
|---|---|---|
| Core workflow principles | active | `AGENTS.md` and project documentation |
| RTK token proxy | reused | already installed; canonical commands use `rtk` |
| Superpowers / Ponytail / Caveman | pending | unavailable in the current client; principles applied manually |
| Context7 | configured | `.codex/config.toml`; live query requires a new Codex session |
| Vercel React/web skills | active | project-local `.agents/skills` |
| Supabase/PostgreSQL guidance | active | project-local skill and migration constraints |
| Differential review | active | project-local skill for security-sensitive diffs |
| Browser capability | reused | existing capability; no duplicate global install |
| Graphify | not selected | scoped search and docs cover this small repository |
| Obsidian | not applicable | no vault destination was provided |
| Next.js/Drizzle/Tailwind/Sentry/shadcn | not applicable | outside this stack or missing account context |
| Harness2 | native evaluation | disposable fixture and toolkit validator; no unofficial CLI |

`skills-lock.json` records exact project-local skill sources and hashes.

## Changes made
- Added the nine-file project documentation harness.
- Added project-local skills and Context7 registration.
- Added CI matching local checks.
- Added a frontend `check` script and upgraded Axios within major version 1 to remove known production advisories.
- Preserved application behavior, production values and database state.

## Harness evidence
The smoke test used `templates/harness-evaluation` from the toolkit in a temporary directory:

- Baseline validator: 5 passed, 2 failed as expected (cross-tenant identity and invalid identity handling).
- Constrained agent repair: changed only the disposable fixture's `access.mjs` and preserved `local-notes.txt`.
- Post-repair validator: 7 passed, 0 failed.
- Clean-room reapply in a fresh fixture: 7 passed, 0 failed.

This validates instruction discovery, boundary-aware repair and preservation of local customization. It does not prove OnTime application correctness. Project-owned unit and in-memory HTTP integration tests were added later; real PostgreSQL, Ollama and notification-channel validation remains pending.

## Pending manual validation
- Restart Codex, confirm Context7 appears, then issue one real documentation lookup.
- Exercise deployed n8n/Discord/Google Chat flows with disposable credentials.
- Add automated unit and integration tests as product logic evolves.
