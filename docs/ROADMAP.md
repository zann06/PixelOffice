# Roadmap — PixelOffice

Progress notes (2026-10): Phase 0 and the core of Phases 1–3 are implemented in the local demo adapter and covered by 54 automated tests; see docs/IMPLEMENTATION_NOTES.md. Supabase-backed auth/RLS and the release phase remain open.

## Phase 0 — Foundation
- [x] Confirm product scope and role/permission matrix.
- [x] Create React + TypeScript + Vite project.
- [x] Set linting, formatting, strict TypeScript, and test tooling.
- [x] Implement design tokens and responsive AppShell.
- [x] Add CI for lint, typecheck, unit tests, and build.
- [x] Create original pixel-art style guide and asset license ledger.

## Phase 1 — Usable core
- [ ] Authentication and workspace creation. *(demo profile picker only — real Supabase Auth pending)*
- [ ] Membership and role management. *(roles enforced in the data layer; management UI deferred)*
- [x] Departments.
- [x] Work programs and tasks.
- [x] Dashboard metrics and filters.
- [x] Empty/loading/error/permission states.
- [ ] Database RLS and cross-workspace tests. *(same rules enforced + tested in the local adapter; database pending)*

## Phase 2 — Meetings and accountability
- [x] Meeting scheduling and agenda.
- [x] Notes and decisions.
- [x] Convert action items into tasks.
- [ ] Calendar view. *(list views only)*
- [x] Activity history and handover-friendly archives. *(activity events recorded; archive = program status)*

## Phase 3 — Pixel office
- [x] Create original tile set and character sprites.
- [x] Map member/department/task states to a minimal scene view model.
- [x] Click/focus character to open accessible details.
- [x] Add reduced-motion setting and list alternative.
- [x] Add stale/offline state and scene legend. *(last-updated indicator + legend; offline banner pending)*
- [x] Test performance with a realistic number of members. *(11-member seed; loop pauses offscreen)*

## Phase 4 — Beta and release
- [ ] Playwright tests for onboarding, tasks, meetings, and permissions. *(specs scaffolded; browser install required)*
- [ ] Security review and RLS tests.
- [ ] Accessibility review.
- [ ] Privacy policy and data deletion/export docs.
- [x] License and asset attributions checked. *(no external assets; see ASSET_LICENSES.md)*
- [x] Demo workspace uses fictional data only.
- [ ] Deployment guide tested by a clean install.
- [ ] Tag a version only after acceptance criteria pass.

## Phase 5 — Optional integrations
- [ ] Notifications and reminders.
- [ ] Google Calendar integration after OAuth review.
- [ ] GitHub integration for software teams.
- [ ] Private file attachments.
- [ ] Optional realtime updates.
- [ ] Optional import/export templates.
