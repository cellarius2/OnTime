# Onboarding

## Prerequisites
- Git
- Node.js `^20.19.0` or `>=22.12.0` (Node 21 is not supported; Node 24 is supported)
- npm
- .NET SDK 8
- Local PostgreSQL or a disposable Supabase project
- Optional test n8n, Discord and Google Chat webhooks

## Backend
Set development-only environment variables as shown in `README.md` and `OnTime.API/appsettings.example.json`. Never paste real credentials into tracked files.

```powershell
rtk dotnet restore .\OnTime.API\OnTime.API.csproj
rtk dotnet run --project .\OnTime.API\OnTime.API.csproj
```

Keep `Database__MigrateOnStartup=false` unless PostgreSQL migrations have been explicitly reviewed.

## Frontend
Copy `OnTime-frontend/.env.example` to `.env.local`, set `VITE_API_URL`, then run:

```powershell
rtk npm --prefix .\OnTime-frontend ci
rtk npm --prefix .\OnTime-frontend run dev
```

Before a change, run the canonical checks in `AGENTS.md`, use only test webhooks and inspect the diff for secrets.
