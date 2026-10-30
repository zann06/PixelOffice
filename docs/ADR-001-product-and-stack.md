# ADR-001: Product and technical direction

- **Status:** Proposed
- **Date:** 2026-10-29

## Context
Campus organizations and small teams need one place to track work programs, tasks, owners, deadlines, meetings, and decisions. Existing data often lives across chat and spreadsheets. The project should be open source, web-first, and visually distinctive without becoming a game.

## Decision
- Product: PixelOffice, a multi-workspace productivity app with pixel-art activity visualization.
- Frontend: React + TypeScript + Vite.
- Styling: Tailwind CSS with shared CSS design tokens.
- Backend: Supabase Auth + Postgres + RLS.
- Meetings in v1: schedule, agenda, notes, decisions, external meeting link; no native video infrastructure.
- Pixel art: original sprites/tilemap; visual layer is driven by authorized persisted data.
- Architecture: modular monolith.

## Consequences
Positive:
- Familiar web stack and relatively low operating cost.
- SQL/RLS support multi-tenant organization data.
- Visual identity differentiates the app while keeping conventional list views usable.

Trade-offs:
- RLS policies and tests require careful engineering.
- Pixel scene requires accessibility alternatives and performance testing.
- Provider-specific integrations must be isolated to preserve portability.
- Real-time presence and native video are deferred.

## Revisit when
- The app needs true native audio/video.
- Realtime load or user scale exceeds the current approach.
- Users require integrations beyond the initial scope.
