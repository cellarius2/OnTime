# OnTime differential review — 2026-11-12

## Executive summary

| Severity | Open | Fixed in checkout |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 1 | 0 |
| Medium | 0 | 3 |
| Low | 0 | 1 |

**Overall risk:** high for public production exposure; low for the reviewed local migration after the fixes below.  
**Recommendation:** conditional. The local Jonas/Ollama flow is ready for review, but authentication and per-user isolation remain blocking production hardening work.

## Scope

Focused review of the dirty checkout changes affecting frontend API routing, chat, schedule persistence, Ollama calls, notification generation and deployment configuration. Baseline was commit `e4b3f62`. Historical context included commit `753e0f3` (“corrige rotas da API no front-end”). No deployed endpoint, production database or real webhook was accessed.

## Fixed findings

### Medium — API base URL silently fell back to the Vite origin

- **Files:** `OnTime-frontend/src/api/client.ts`, `OnTime-frontend/vite.config.ts`
- **Impact:** missing `VITE_API_URL` produced `POST http://localhost:5173/chat`, so every API feature could hit the frontend server instead of ASP.NET Core.
- **Correction:** development now defaults to `/api` with a Vite proxy to port 5120; production rejects missing configuration with a clear message. A correctly located `.env.local` remains supported.
- **Coverage:** frontend lint/build and compiled-bundle URL verification.

### Medium — notification endpoint failed with HTTP 500 during model validation

- **File:** `OnTime.API/Controllers/ScheduleController.cs`
- **Impact:** every `POST /api/schedule/{id}/notification-message` failed before entering the action.
- **Root cause:** validation metadata targeted the generated record property rather than the positional constructor parameter.
- **Correction:** moved `StringLength` metadata to the constructor parameter.
- **Coverage:** real in-memory HTTP route test, including missing token, valid token and repeated generation.

### Medium — offline schedule fallback looked like a successful remote save

- **Files:** `OnTime-frontend/src/hooks/useSchedules.ts`, `OnTime-frontend/src/components/JonasChatWidget.tsx`
- **Impact:** users could believe n8n would deliver a reminder that existed only in browser storage.
- **Correction:** the Jonas chat now states how many reminders were saved only locally and warns that n8n cannot send them.

### Low — repeated chat output could create duplicate schedules in the panel

- **File:** `OnTime-frontend/src/hooks/useSchedules.ts`
- **Correction:** normalized day/time/task keys prevent duplicate creation within the loaded schedule set and within the same model response.

## Open finding

### High — public shared schedule API exposes and mutates webhook-bearing records

- **Files:** `OnTime.API/Controllers/ScheduleController.cs`, `OnTime.API/Program.cs`
- **Attacker:** unauthenticated internet user able to reach the API.
- **Path:** `GET/POST/PUT/PATCH/DELETE /api/schedule` has no authentication, authorization, ownership or tenant boundary. Schedule responses include Discord/Google Chat webhook URLs.
- **Impact:** disclosure and abuse of notification webhooks, deletion or alteration of reminders, and cross-user data exposure.
- **Status:** pre-existing and not safely correctable without an identity/ownership design and migration. Do not treat the current API as multi-user or expose it broadly before adding authentication, authorization, per-user ownership and response redaction.

## Blast radius

- `JonasAiService.SendChatMessageAsync`: one production controller caller.
- `JonasAiService.GenerateReminderMessageAsync`: create, update and notification-generation routes.
- Frontend Axios client: chat, schedules and conversation history share the same base URL, so the routing correction covers all API calls.

## Validation

- 7 backend tests passed: service-level simulated Ollama tests plus real ASP.NET Core routes with an in-memory database.
- Frontend Oxlint and production build passed in both a clean disposable install and the working checkout.
- npm production audit reported zero vulnerabilities.
- .NET Release build and publish passed; NuGet reported no known vulnerable packages.
- `git diff --check` passed.

## Limitations

- Ollama and Docker were unavailable on the workstation, so model inference was simulated with deterministic HTTP responses.
- No real n8n, Discord, Google Chat, Supabase or Render request was sent.
- PostgreSQL-specific concurrency and schema behavior were not exercised.
- The recurring scheduler lives outside this repository and must be validated in n8n with disposable credentials.
