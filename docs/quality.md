# Quality policy

## Required checks
- Backend restore, Release build, tests and publish.
- Frontend clean install, Oxlint and production build.
- npm production dependency audit at high severity.
- NuGet direct and transitive vulnerability scan.
- Diff review for secrets, unsafe configuration and accidental production changes.

The canonical commands are in `AGENTS.md` and mirrored by `.github/workflows/ci.yml`.

The native `dotnet list package --vulnerable` step is report-only: it does not reliably fail the job merely because an advisory is listed. Review its output on every run until an enforcing NuGet audit gate is adopted.

## Testing status
The backend includes focused unit and in-memory HTTP integration tests for the Jonas/Ollama flow, schedule creation and protected notification generation. They do not replace a disposable PostgreSQL test or a real Ollama/n8n/channel smoke test.

## Security baseline
Use `docs/prompts/security-review.md` for endpoint, database, webhook, credential or deployment changes. Current high-priority gaps are authentication/authorization, tenant isolation, rate limiting and secure webhook storage.

## Harness evaluation
Toolkit adoption is evaluated with a disposable harness fixture and the toolkit's native validator. Results and rerun instructions belong in `docs/setup.md`; fixture defects must never be copied into production code.
