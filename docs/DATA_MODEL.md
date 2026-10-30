# Data Model — PixelOffice

This is a starting schema specification. Implement it through reviewed SQL migrations and generate TypeScript database types from the actual schema.

## Core tables

### `profiles`
- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `avatar_path text null`
- `created_at`, `updated_at timestamptz`

Keep profile fields minimal. Do not expose email or other personal data through a public profile query.

### `workspaces`
- `id uuid primary key`
- `name text not null`
- `slug text not null`
- `timezone text not null`
- `created_by uuid not null references auth.users(id)`
- `visibility text not null default 'private'`
- timestamps
- unique slug according to the chosen global/workspace naming model

### `workspace_members`
- `workspace_id uuid references workspaces(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `role text not null` (`owner`, `admin`, `lead`, `member`, `viewer`)
- `joined_at timestamptz`
- primary key (`workspace_id`, `user_id`)

Use constrained enums or `CHECK` constraints. Prevent removing/demoting the final owner without a safe ownership-transfer flow.

### `departments`
- `id uuid primary key`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `name text not null`
- `description text null`
- `lead_user_id uuid null`
- timestamps
- unique (`workspace_id`, normalized name) where appropriate

### `programs`
- `id uuid primary key`
- `workspace_id uuid not null`
- `department_id uuid not null`
- `title text not null`
- `objective text null`
- `description text null`
- `status text not null`
- `owner_user_id uuid null`
- `start_date date null`
- `due_date date null`
- `archived_at timestamptz null`
- timestamps

Use composite foreign keys or triggers/constraints where necessary to ensure linked department belongs to the same workspace. Validate date ranges.

### `tasks`
- `id uuid primary key`
- `workspace_id uuid not null`
- `program_id uuid null`
- `department_id uuid null`
- `title text not null`
- `description text null`
- `status text not null`
- `priority text not null default 'normal'`
- `assignee_user_id uuid null`
- `created_by uuid not null`
- `due_at timestamptz null`
- `blocked_reason text null`
- timestamps
- `completed_at timestamptz null`

Ensure linked program/department belongs to the same workspace. Avoid trusting `workspace_id` supplied by the browser without verifying relationships.

### `meetings`
- `id uuid primary key`
- `workspace_id uuid not null`
- `department_id uuid null`
- `title text not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz null`
- `meeting_url text null`
- `agenda text null`
- `notes text null`
- `created_by uuid not null`
- timestamps

Validate `ends_at > starts_at`. Restrict meeting URLs to valid HTTPS URLs in application validation and, where practical, database validation.

### `meeting_attendees`
- `meeting_id uuid references meetings(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `attendance_status text`
- primary key (`meeting_id`, `user_id`)

### `decisions`
- `id uuid primary key`
- `meeting_id uuid not null references meetings(id) on delete cascade`
- `workspace_id uuid not null`
- `summary text not null`
- `created_by uuid not null`
- timestamps

### `activity_events`
- `id uuid primary key`
- `workspace_id uuid not null`
- `actor_user_id uuid null`
- `entity_type text not null`
- `entity_id uuid not null`
- `action text not null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Use an allowlist for metadata fields; never store tokens, passwords, full private notes, or arbitrary request bodies. Prefer append-only access for ordinary users.

### `invitations`
- `id uuid primary key`
- `workspace_id uuid not null`
- `email_normalized text null`
- `token_hash text not null unique`
- `role text not null`
- `expires_at timestamptz not null`
- `accepted_at timestamptz null`
- `revoked_at timestamptz null`
- `created_by uuid not null`
- timestamps

Only store token hashes; make acceptance single-use and atomic. Limit invite creation and avoid email enumeration.

## Relationship overview

```text
auth.users ── profiles
     └────── workspace_members ── workspaces
                                  ├── departments
                                  ├── programs ── tasks
                                  ├── tasks
                                  ├── meetings ── meeting_attendees
                                  │             └── decisions ── follow-up task (optional relation)
                                  └── activity_events
```

## Integrity and indexes

- Add indexes to all foreign keys used for joins and policy checks.
- Add indexes for workspace-scoped lists, statuses, due dates, and common filters.
- Add constraints for valid status/role values.
- Use transactions for operations that create linked records.
- Use `ON DELETE CASCADE` only when data loss is intended; prefer archive/soft-delete for organization history.
- Use UTC timestamps; render using workspace timezone.
- Decide whether progress is derived or manually managed. Document the rule and avoid conflicting sources of truth.
