# OnTime agent guide

## Purpose
Maintain the OnTime/Jonas reminder application without changing product behavior or production data unless explicitly requested.

## Repository map
- `OnTime-frontend/`: React 19, TypeScript and Vite client.
- `OnTime.API/`: .NET 8 API, Entity Framework Core and Npgsql.
- `render.yaml`: canonical Render service definition.
- `docs/`: architecture, design, onboarding, quality and setup evidence.
- `.agents/skills/`: project-local skills; never install them globally.

## Canonical verification
Run from the repository root. This workstation requires shell commands to be prefixed with `rtk`.

```powershell
rtk dotnet restore .\OnTime.API\OnTime.API.csproj
rtk dotnet build .\OnTime.API\OnTime.API.csproj -c Release --no-restore
rtk dotnet publish .\OnTime.API\OnTime.API.csproj -c Release --no-build -o .\artifacts\publish
rtk dotnet test .\OnTime.API.Tests\OnTime.API.Tests.csproj -c Release
rtk npm --prefix .\OnTime-frontend ci
rtk npm --prefix .\OnTime-frontend run check
rtk npm --prefix .\OnTime-frontend audit --omit=dev --audit-level=high
rtk dotnet list .\OnTime.API\OnTime.API.csproj package --vulnerable --include-transitive
```

If `npm --prefix` behaves differently on the host, enter `OnTime-frontend` and run the same npm commands there.

## Constraints
- Never commit secrets, connection strings or real webhook URLs.
- Keep `Database__MigrateOnStartup=false` until PostgreSQL-specific migrations are reviewed.
- Do not run migrations or mutate production data during routine verification.
- Preserve API routes and frontend fallback behavior unless a product change is requested.
- Keep dependency updates within the current major version unless explicitly approved.
- Treat authentication, tenant isolation, rate limiting and webhook storage as unresolved production risks.
- Use disposable credentials and test channels for n8n, Discord and Google Chat.

## Documentation
Read `PRODUCT.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md` and `docs/setup.md` before broad changes. Use `docs/prompts/security-review.md` for security-sensitive diffs.
