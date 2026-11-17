# OnTime product

## Product intent
OnTime is a reminder application centered on Jonas, a conversational assistant that helps people create and manage clock-in and clock-out reminders. Notifications can be delivered to Discord or Google Chat through n8n workflows.

## Observed user flows
1. Configure notification webhooks in the frontend.
2. Ask Jonas to interpret a reminder or create one manually.
3. Review, edit, enable, disable or delete reminders.
4. Consult recent conversation history.
5. Let the scheduled n8n workflow fetch active reminders and deliver notifications.

## Current scope
- React SPA and public ASP.NET Core API.
- Shared reminder and conversation data in PostgreSQL/Supabase.
- Render API deployment and Vercel frontend deployment.
- Configurable Jonas provider: Ollama/DeepSeek locally or the existing n8n webhooks.
- n8n integration for recurring notification dispatch.
- Local frontend fallback when the API is temporarily unavailable.

## Known product gaps
- There is no user authentication, authorization or tenant isolation.
- Webhook URLs are user-provided and persisted without a dedicated secret store.
- The local fallback can conceal backend failures from the user.
- Production observability is limited to structured application logs.
- Automated tests cover the Jonas service and the main in-memory HTTP flows, but not a real PostgreSQL, Ollama or notification-channel environment.

The likely audience and workflows above are inferred from the implementation and README; no separate product specification was found.
