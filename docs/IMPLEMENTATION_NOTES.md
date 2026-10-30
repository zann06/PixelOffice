# Implementation Notes

This file records what is actually implemented versus what remains planned. It exists so the repository never overstates its own readiness (docs/AGENTS.md: "Do not claim features, security, or production readiness that have not been implemented and tested").

## What is implemented (verified by tests)

- **App shell & routing** — sidebar/topbar/bottom-nav, hash router, Indonesian UI, responsive desktop/mobile layouts.
- **Pixel office scene** — original procedural pixel-art office (canvas + pixel matrices, no third-party assets), room layout matching the reference composition, real room labels, click/keyboard character selection, live roster alternative, legend, `prefers-reduced-motion` + in-app motion toggle, offscreen loop pausing.
- **Data layer** (`src/lib/data/`) — typed `DataClient` interface with a local persistence adapter (localStorage). The adapter re-checks membership/role permissions and re-validates every input on every mutation, mirroring the intended RLS policy set.
- **Entities** — profiles, workspaces, memberships, departments, programs, tasks, meetings, attendees, decisions, activity events (docs/DATA_MODEL.md shapes; task gained a nullable `decisionId` for meeting follow-ups).
- **Features** — dashboard metrics; programs with derived progress; tasks with filters/status updates/creation/deletion; meetings with agenda, notes, decisions, https-only URLs; decision → follow-up task conversion (single-use, linked); members & departments overview; CSV export (owner/admin/lead); demo data reset with confirmation.
- **Permission matrix** (`src/lib/permissions.ts`) — enforced in the UI for presentation AND re-enforced in the data adapter. Covered by unit tests including cross-workspace IDOR attempts.
- **Validation** (`src/lib/validation.ts`) — title/description length limits, https-only meeting URLs (rejects `javascript:`, `data:`, embedded credentials), date-range checks. Used by forms and re-checked by the adapter.
- **Tests** — 54 Vitest + React Testing Library tests (progress rule, permission matrix, validation, scene view model, adapter authorization, page integrations) **plus 4 Playwright end-to-end tests that pass** (dashboard + roster, task status persistence after reload, meeting decision → task, keyboard access without the canvas). Run with `npx playwright install chromium && npm run e2e`; enabled in CI.
- **Added 2026-10-30 (round 2)**: task comments (PRD P0 #7 discussion), dashboard trend chart from `completedAt`, due-soon reminder banner, command palette (Ctrl/⌘K), print stylesheet for program reports, and scene additions: corridor display showing the real meeting schedule, per-member hair variants, hover name chips, real-clock dusk mode, parked scooters, and activity-derived announcement pins.

- **Added 2026-11-29 (round 3)**: sprite upgrade 18×28 chunky, 3× render scale with whole-logical-pixel snap, 3/4-depth wall + furniture with north-face visibility, richer room decor (rugs, plants, stage lights, posters, pantry shelf, whiteboard, mugs, papers, pendant lamps), new scene toolbar (clock / phase / presence / view / expand / motion controls), live-meeting banner restructured as single text node for accessible `findByText`, dust puffs / blinking / idle bob / animated cat / steam as decoration-only, removed north-wall wall-clutter (windows → [3,10.1,20.1,28.8]) to reduce label overlap.

- **Added 2026-12-03 (round 4)**: ambient "lively" enhancements — subtle floating dust motes in office air (decoration-only, rare spawn), night-time window glow variations for malam phase making windows appear softly lit from inside, improved floor texture variation in static render, enhanced baseboard detail on interior walls, and refined 3/4 wall siding vertical strips for stronger depth perception. Character blink window and idle bob timing finely tuned for natural feel without being distractive.

## Documented calculation rules

- **Scene rendering** — the canvas renders at a 3× internal scale (1024×640 → actually 1152×720 device pixels for the 512×320 logical grid at 3×, each art pixel a crisp 3×3 block; previously 2×) so each art pixel is a crisp block matching the reference's pixel density; characters are 18×28-cell chunky sprites with dark outlines (~1.75 tiles tall), upgraded from 16×24 per 2026-11-29 user feedback. The renderer adds 16-bit depth cues: textured floors (staggered wood planks, two-tone tiles, ceramic joints), soft shadows cast by walls onto floors, outlined furniture with shading and highlights (now with visible north wall face for 3/4 depth), lawn flowers, and per-character ground shadows. Ambient animation is honest and motion-gated: coffee-machine steam is pure decoration (disabled without motion), the animated monitor glow appears only on desks with monitors in front of members whose saved tasks are actually `in_progress`, and dust puffs / blinking / idle bob / animated cat / steam run as decorative enhancement. Per user feedback (2026-11-29) the scene palette uses the reference's bright, warm tones and the app chrome uses the light theme documented in docs/DESIGN_SYSTEM.md §2 — light-only by explicit user decision (a temporary dark toggle was removed). Whole-logical-pixel snap ensures crisp edges at 3× scale.

- **Program progress** (docs/PRD.md §8): `done tasks ÷ (all tasks − cancelled tasks)`; a program with no non-cancelled tasks has **no** percentage (UI shows "Belum ada tugas"). Implemented in `src/lib/progress.ts`.
- **Character activity** (`src/features/pixel-office/sceneViewModel.ts`):
  - `blocked` → any assigned task with status `blocked` (highest precedence);
  - `working` → any `in_progress`;
  - `in_review` → any `in_review`;
  - `idle` → otherwise; never a fake animation.
  - `meeting` → attendee of a meeting whose saved window contains "now"; the character sits in Ruang Meeting for exactly that window.
- **Scene seats & rooms** (updated 2026-11-29 per user feedback — org-specific layout, top-down 3/4 view, chunky 18×28 characters on 16px tiles):
  - Rooms: Ruang Meeting, Ruang Ketua & Sekretariat (arsip surat), Pantry, Gudang Perlengkapan (top band) · Workspace, Keuangan (kas & laporan), koridor, Humas & Media (middle) · Project Board, entrance hall, Aula & Panggung Event + papan pengumuman (bottom). Server Room, Focus Room, Ruang Santai, Lounge, and Mushola were removed or replaced as not applicable to a campus organization.
  - Seat pools by department: Teknologi/Desain (and unknown divisions) → Workspace desks; BPH & Sekretariat → Ruang Ketua; Keuangan → ruang Keuangan; Humas & Media → ruang Humas; Acara and members without a department → Aula audience chairs. Owner/admin are treated as BPH when such a department exists; viewers have no department. One seat counter per room pool prevents collisions when two departments share a room.
  - Only live-meeting attendees move to the Ruang Meeting, for exactly the saved meeting window. The Gudang Perlengkapan is storage — no characters are ever placed there.
  - **3/4-depth wall + furniture (2026-11-29)**: the north wall face is now visible with a roof cap + wall surface tilt; furniture uses chunky block3d (top face + front face) with wall shadows so the whole office reads as a tilted box; windows along the north wall are placed in gaps between room-label plates at logical coordinates [3, 10.1, 20.1, 28.8] (previously [3, 6, 13, 26]) to reduce label overlap; rugs have woven-texture rows and corner tassels for visual richness without breaking the pixel-grid; stage and TV/decor use 3/4 block depth cues; wall labels remain dark navy pixel plates on walls.
  - **Smooth walking (2026-11-29)**: when a member's data-derived seat changes (e.g. a meeting starts or ends), the character interpolates along a BFS path over floor tiles — through doorways, never through walls (guaranteed by unit tests over every seat pair). Reduced motion snaps instantly instead. An office cat by reception flicks its tail, and view/page transitions fade.
  - **Real-clock day cycle + office hours (2026-11-29)**: the scene renders four ambience phases (pagi/siang/sore/malam) from the real clock — dusk and night tint the outdoors and switch interior lamps on. Presence follows working hours (Sen–Jum 08.00–18.00): outside them the office is honestly EMPTY with an explanatory note, and at 08.00 characters walk in through the entrance (staggered). A scene-header select can preview a phase's lighting, but presence never fakes it. Scene furniture (Project Board, corridor TV, announcement board) is clickable and navigates to the related page, mirroring the accessible lists.
  - **New scene toolbar (2026-11-29)**: dashboard header includes clock/phase/presence/view/expand/motion controls; phase preview selector; expand/compress scene view; live-meeting banner with single contiguous text node "Rapat berlangsung: <title> — peserta terlihat di Ruang Meeting"; motion toggle enables/disables decorative animation (blink, idle bob, dust puffs, cat wander, steam).
- **Project Board stickies** mirror live program statuses (max 8, capped for legibility).

## Demo mode vs production (important)

This repository currently ships **without a real backend**. The sign-in screen is a demo profile picker; sessions persist in `localStorage`. The local adapter enforces the same rules production will enforce via Supabase Auth + RLS, but **it is not a security boundary** — everything runs in the browser. To go to production:

1. Create a Supabase project; apply SQL migrations implementing docs/DATA_MODEL.md with RLS policies per docs/SECURITY.md.
2. Implement a `SupabaseDataClient` behind the existing `DataClient` interface (`src/lib/data/index.ts` is the single factory to change).
3. Replace `DemoSignIn` with Supabase Auth (email/magic link/OAuth), keeping redirect URLs explicit.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public configuration only — never a service-role key).
5. Port the adapter tests to database/RLS tests (e.g. pgTAP) and keep the cross-workspace cases.

## Deliberate scope choices in this pass

- Member/department administration (invites, role changes) is intentionally **not implemented** — it needs database functions and RLS that cannot be demoed honestly in the browser. The UI states this explicitly on the Members and Settings pages.
- No realtime subscriptions; data refreshes after each successful mutation ("Terakhir diperbarui" reflects fetch time).
- Presence is never simulated; characters never appear "online" based on a browser tab.
