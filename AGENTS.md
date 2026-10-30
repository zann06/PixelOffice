# AGENTS.md — PixelOffice implementation rules

Before implementing any feature, read:
1. `README.md`
2. `docs/PRD.md`
3. `docs/REFERENCE.md`
4. `docs/DESIGN_SYSTEM.md`
5. `docs/USER_FLOWS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DATA_MODEL.md`
8. `docs/SECURITY.md`
9. `docs/IMPLEMENTATION_NOTES.md` — what is actually implemented today

## Non-negotiable rules
- This is a productivity web app, not a game.
- The pixel office visualizes real persisted data; it must not invent presence, task progress, or success.
- Keep one consistent design system. Do not create one-off colors, spacing, status labels, or interaction patterns without updating the docs.
- Follow the defined user flow. Every mutation must validate, persist, handle errors, and update the UI only after success (or implement rollback for optimistic updates).
- Supabase RLS and database constraints are mandatory. Frontend checks are UX only, never authorization.
- Never expose service-role keys or privileged secrets to the browser.
- Every exposed table needs explicit RLS policies and tests for cross-workspace access.
- Use TypeScript strictly. Avoid `any`; if unavoidable, document why.
- Use semantic HTML, keyboard access, visible focus, accessible labels, reduced-motion support, and a list alternative to the pixel scene.
- Do not use copyrighted game assets. Track external assets in `docs/ASSET_LICENSES.md`.
- Do not claim features, security, or production readiness that have not been implemented and tested.

## Required workflow
1. Inspect the existing code before editing.
2. Identify which docs and modules the change affects.
3. Propose a short implementation plan for multi-file or security-sensitive changes.
4. Implement the smallest coherent change.
5. Add/update tests and migrations.
6. Run lint, typecheck, tests, and build; report commands and actual results.
7. Update docs when behavior, schema, env vars, or flows change.

## UI acceptance checklist
- Responsive desktop/mobile layouts.
- Loading, empty, error, success, and permission-denied states.
- Status labels are understandable without color.
- Reduced-motion mode works.
- Pixel scene has a semantic accessible alternative.
- All displayed progress is derived from saved data and has a documented calculation.

## Security acceptance checklist
- RLS enabled and policies tested.
- No client-side privileged secret.
- Workspace boundaries enforced at database layer.
- Input lengths and URL schemes validated.
- Destructive actions confirmed.
- Logs exclude tokens and sensitive content.
