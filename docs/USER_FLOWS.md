# User Flows — PixelOffice

## Flow A: Create a workspace

1. Visitor opens landing page.
2. Selects “Create workspace” and signs in.
3. Enters workspace name, purpose, and timezone.
4. System creates workspace and owner membership transactionally.
5. Owner lands on setup checklist.
6. Owner creates departments and invites members.
7. Owner can skip optional setup and return later.

**Rules:** workspace is private by default. Do not create a public workspace unless the owner explicitly chooses it and understands what becomes public.

## Flow B: Invite a member

1. Admin enters email and selects role.
2. Backend verifies admin permission.
3. Backend creates a random, single-use, expiring invitation token.
4. Store only a hash of the token when feasible; send the raw token only through the invitation link.
5. Recipient signs in and accepts.
6. Backend verifies expiry, email binding (if used), single-use status, and workspace state.
7. Membership is created; invitation is marked accepted atomically.

**Failure states:** expired, already used, wrong account, revoked, insufficient permission. Do not reveal whether arbitrary email addresses already have accounts.

## Flow C: Create a work program

1. Lead selects department and “New work program.”
2. Enters title, objective, owner, dates, and optional description.
3. Adds milestones/tasks.
4. Validation checks dates, workspace ownership, and permissions.
5. Save program and tasks.
6. Dashboard and pixel office update from persisted records.
7. Activity log records meaningful changes without storing secrets.

## Flow D: Update a task

1. Member opens a task they can access.
2. Changes status, progress fields, due date, or blocker details.
3. Server/database validates membership and update permission.
4. Save change and record `updated_at`.
5. UI displays confirmed saved state.
6. Dashboard, program progress, and scene read the same saved data.
7. If save fails, show error and preserve the user's unsaved input.

Do not show a success animation before persistence succeeds.

## Flow E: Meeting to follow-up tasks

1. Lead creates a meeting with date/time, attendees, agenda, and optional external meeting URL.
2. During/after meeting, record notes and decisions.
3. Each decision can include an action item, owner, and due date.
4. User confirms “Create task.”
5. Task is created with a reference to the decision and meeting.
6. Meeting detail shows task status; task detail links back to the decision.
7. Restrict notes and attendees to workspace members with permission.

Do not embed meeting credentials or private access tokens in URLs or logs. Validate URL schemes and allow only `https:` URLs except local development.

## Flow F: Dashboard and pixel office

1. User selects workspace/department.
2. App fetches only records the user is authorized to view.
3. Metrics are computed from authorized data.
4. Pixel scene receives a minimal view model (member display label, room/desk, safe status).
5. Selecting a character opens the same accessible member/task panel as the roster.
6. User can switch to list mode or disable animation.
7. If data is stale, show last updated time.

The scene must not fetch arbitrary member details or bypass authorization.

## Flow G: Archive and handover

1. Admin chooses a completed program or management period.
2. App previews what will be archived and who can still access it.
3. Admin confirms.
4. Backend checks permission and archives without hard-deleting linked records.
5. New leads receive access only after an authorized role change.
6. Export is permission-checked and logged if audit logging is enabled.

## Global interaction rules

- Confirm destructive actions.
- Use optimistic updates only when rollback is implemented; otherwise wait for server confirmation.
- Provide loading, empty, error, success, and permission-denied states.
- Preserve unsaved form data after recoverable errors.
- Never rely on a hidden UI control as a security boundary.
