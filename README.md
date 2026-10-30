# PixelOffice

**A pixel-art workspace for real teams.** PixelOffice helps campus organizations, student clubs, committees, and small teams track work programs, tasks, meetings, ownership, deadlines, and progress through a shared workspace with an animated pixel-art office.

> PixelOffice is a productivity and coordination tool, not a game. Pixel characters visualize real team activity and workflow states; they do not replace the underlying task data.

## The problem

Organization work is often scattered across chat groups, spreadsheets, meeting notes, and individual reminders. Members may not know:
- which work programs are planned, active, blocked, or completed;
- who owns the next action;
- what decisions were made in a meeting;
- which deadlines are at risk;
- how far a department's work program has progressed.

PixelOffice brings these pieces into one transparent workspace.

## Product principles

1. **Data first, pixel art second.** All status indicators and character activity must reflect actual saved data.
2. **One source of truth.** Work programs, tasks, meetings, decisions, and progress are linked.
3. **Clear ownership.** Every task has an accountable owner or an explicit unassigned state.
4. **Safe by default.** Workspaces are private by default; access is enforced on the server/database, not only in the UI.
5. **Accessible and responsive.** Pixel art enhances the experience but never blocks keyboard, screen-reader, reduced-motion, or mobile users.
6. **Open source, deployable by others.** No secret keys, private demo data, or proprietary assets are committed.

## Core workflow

`Create workspace → Invite members → Create department → Add work program → Break it into tasks → Assign owners and deadlines → Update progress → Review in meetings → Record decisions and follow-ups → Complete and report`

## Planned stack

- React + TypeScript + Vite
- Tailwind CSS for layout and tokens
- A small pixel-art renderer using CSS sprites or a tile/sprite canvas where appropriate
- Supabase Auth + Postgres + Row Level Security (RLS) for authentication and multi-tenant data
- Vitest + React Testing Library; Playwright for critical end-to-end flows
- Vercel or another static hosting provider for the frontend; Supabase for backend services

Pin exact versions in `package.json` and lockfiles during implementation. Avoid adding a 3D engine; this is a 2D pixel-art workspace.

## Documentation map

- [Product requirements](docs/PRD.md)
- [Visual reference and art direction](docs/REFERENCE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [User flows](docs/USER_FLOWS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Security](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Implementation notes](docs/IMPLEMENTATION_NOTES.md)
- [Contributing](CONTRIBUTING.md)

## Local setup (planned)

1. Install a supported Node.js LTS version.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and apply migrations from `supabase/migrations/`.
4. Configure Supabase Auth redirect URLs for local development and the deployed site.
5. Install dependencies with the package manager indicated by the lockfile.
6. Run the development server.

Do not commit `.env.local`, service-role keys, real organization data, or real user information.

## Project status

This repository now contains a **working demo implementation** of the specification, verified by 54 automated tests (Vitest + React Testing Library). See [docs/IMPLEMENTATION_NOTES.md](docs/IMPLEMENTATION_NOTES.md) for the precise boundary between what is real and what is not.

Implemented and tested:
- Responsive app shell (Indonesian UI) with dashboard, work programs, tasks, meetings, members, and settings.
- Pixel-art office scene rendered procedurally from **original** assets — character positions and activities are derived from saved task/meeting data, with an accessible roster alternative, legend, and reduced-motion support.
- Work programs with documented progress calculation, tasks with statuses/assignees/due dates, meetings with agenda/notes/decisions, decision → follow-up task conversion, CSV export.
- A typed data-access layer (`DataClient`) with a local persistence adapter that re-checks the role/permission matrix and re-validates all input on every mutation, mirroring the planned Supabase RLS policy set.

Not implemented yet (honestly out of scope for this pass):
- Real Supabase Auth + Postgres + RLS backend (the demo adapter enforces the same rules locally but is **not** a security boundary), member invitations/role management, notifications, realtime, and file attachments. The sign-in screen is an explicitly-labeled demo profile picker.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + RTL (54 tests)
npm run lint       # ESLint
npm run typecheck  # strict TypeScript
npm run build      # production build
```

Pick a demo profile on the sign-in screen (e.g. Ratna — owner, Fajar — lead, Andi — member, Hana — second workspace for isolation testing). Demo data is fictional and stored in your browser's localStorage; reset it from Settings.

## License

MIT is a reasonable default for the application code. Before release, add a `LICENSE` file and separately verify the licenses of every font, sprite, sound, and third-party asset. See [REFERENCE.md](docs/REFERENCE.md).
