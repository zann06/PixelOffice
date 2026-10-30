# Architecture — PixelOffice

## 1. Recommended shape

Use a modular monolith for v1. Avoid microservices until there is a demonstrated need.

```text
Browser (React + TypeScript + Vite)
  ├── App shell / accessible UI
  ├── Feature modules
  │   ├── workspaces & members
  │   ├── departments & programs
  │   ├── tasks & activity
  │   ├── meetings & decisions
  │   └── pixel office visualization
  ├── Typed data-access layer
  └── Supabase client (publishable/anon key only)
           |
           v
Supabase
  ├── Auth
  ├── Postgres + Row Level Security
  ├── Storage (private buckets, only if needed)
  └── Edge Functions for privileged workflows/integrations
```

## 2. Frontend module boundaries

Suggested modules:
- `src/app/` — router, providers, app shell.
- `src/components/ui/` — generic accessible UI components.
- `src/features/auth/`
- `src/features/workspaces/`
- `src/features/departments/`
- `src/features/programs/`
- `src/features/tasks/`
- `src/features/meetings/`
- `src/features/pixel-office/`
- `src/lib/supabase/` — client and typed database helpers.
- `src/lib/validation/` — shared input schemas.
- `src/types/` — generated database types; avoid duplicating generated schema by hand.
- `supabase/migrations/` — versioned SQL migrations.
- `supabase/tests/` — database/RLS tests where supported.
- `tests/e2e/` — critical Playwright scenarios.

Keep business rules out of sprite animation components. PixelOfficeScene should consume a view model, not own task/workspace data access.

## 3. Data flow

1. UI submits a validated command.
2. Data-access layer sends the request.
3. Supabase Auth identifies the user.
4. RLS and database constraints enforce access and data integrity.
5. The database persists the change.
6. UI refetches or applies a verified response.
7. Derived dashboard metrics and pixel scene update from the same source.

Do not calculate authorization only in React. Do not expose service-role credentials to the browser.

## 4. Backend decisions

Supabase is suitable for the MVP because it provides Postgres, Auth, RLS, and optional storage. The application should still be portable:
- keep SQL migrations in version control;
- use standard Postgres constraints and transactions;
- isolate provider-specific calls in `src/lib/supabase/`;
- document environment variables;
- avoid depending on client-side secrets.

## 5. Meetings

For v1, store meeting metadata, agenda, notes, decisions, and a user-supplied HTTPS meeting URL. Integrate with an external meeting provider later using OAuth and minimal scopes. Do not build a video-conferencing backend in the first release.

## 6. Realtime

Start with normal queries and refresh/invalidation after writes. Add Supabase Realtime only where it materially helps, such as active task updates. Realtime subscriptions must be constrained by RLS and unsubscribed on component unmount. Never broadcast private task details to public channels.

## 7. Deployments

- Frontend: static hosting with HTTPS.
- Backend: managed Supabase or documented self-hosted deployment.
- Configure exact allowed origins and Auth redirect URLs.
- Separate development, preview, and production environments.
- Run migrations and security tests before production deployment.
- Do not use production data in preview deployments.

## 8. Observability

Capture errors without tokens, passwords, meeting secrets, private notes, or unnecessary personal data. Add request IDs where useful. Document retention and access for any error-monitoring provider.
