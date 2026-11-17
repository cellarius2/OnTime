# Architecture

## Runtime flow
`React/Vite UI -> Axios API client -> ASP.NET Core controllers -> services -> EF Core/Npgsql -> PostgreSQL/Supabase`

The API selects the Jonas provider through `JonasAi:Provider`: `N8n` preserves the original chat/reminder webhooks, while `Ollama` calls the configured DeepSeek-compatible model. Scheduled n8n workflows read `/api/schedule`, request a fresh protected notification message, and forward it to user-provided Discord or Google Chat webhooks.

## Components
- `OnTime-frontend/src`: SPA, local settings, API calls and offline fallback.
- `OnTime.API/Controllers`: HTTP endpoints for schedules, conversations and chat.
- `OnTime.API/Services`: n8n and application integration logic.
- `OnTime.API/Data`: EF Core context and migrations.
- `render.yaml`: Docker deployment of the API with `/health` checks.

## Deployment
- Frontend: Vercel.
- API: Render, built from `OnTime.API/Dockerfile`.
- Database: Supabase-hosted PostgreSQL with SSL required.
- Automation: external n8n instance.

## Boundaries and caveats
- Existing migrations contain SQLite-era types. Automatic startup migration remains disabled until PostgreSQL-specific migrations are generated and reviewed.
- API resources are shared and unauthenticated; they must not be treated as tenant-isolated.
- The root `Dockerfile` and Railway manifests are historical artifacts. They remain for recoverability and are not the canonical deployment path.
