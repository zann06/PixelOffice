# Product Requirements Document — PixelOffice

## 1. Summary

PixelOffice is a web-based workspace for campus organizations and general teams. It makes work programs, tasks, deadlines, meetings, decisions, and progress visible in one place. An animated pixel-art office acts as a visual overview of actual team activity.

## 2. Target users

- Campus organizations, student associations, and clubs
- Event committees and volunteer teams
- Small community groups and project teams
- Team leads who need an overview without chasing updates in chat

Initial release should focus on one organization workspace and its departments, while the data model supports multiple independent workspaces.

## 3. User problems

- Progress is fragmented across messaging apps, spreadsheets, and documents.
- Responsibilities and deadlines are unclear.
- Meeting decisions do not reliably become assigned follow-up tasks.
- Leaders cannot easily see blocked or overdue work.
- Handover between management periods loses context.

## 4. Goals and non-goals

### Goals
- Make work program progress understandable in under a minute.
- Connect meetings and decisions to follow-up tasks.
- Make ownership, status, deadline, and blockers explicit.
- Give each role an appropriate view of the same source of truth.
- Keep the application affordable to self-host and easy to contribute to.

### Non-goals for the first release
- Rebuilding Google Meet or hosting video calls.
- A game economy, XP, loot, competitive leaderboards, or gameplay loops.
- AI agents that independently make organizational decisions.
- Complex enterprise HR, payroll, or accounting.
- Publicly exposing private organization activity by default.

Meeting support in v1 means scheduling, agenda, notes, decisions, attendee list, and a trusted external meeting URL (for example, a user-provided video meeting link). Native video can be evaluated separately.

## 5. Roles and permissions

- **Workspace owner:** manages workspace settings, ownership, and deletion.
- **Admin:** manages members, departments, and workspace configuration.
- **Lead:** manages their department's programs, tasks, meetings, and assignments.
- **Member:** views permitted workspace data and updates assigned work.
- **Viewer (optional for v1):** read-only access to explicitly shared workspace information.

Permissions must be checked by database policies/server-side logic. Hiding a button in the frontend is not authorization.

## 6. MVP features

### P0 — required
1. Authentication and sign-out.
2. Workspace creation and membership.
3. Invite/join flow with safe, expiring invitations.
4. Departments and members.
5. Work programs with owner, department, start/end dates, status, and progress.
6. Tasks linked to a program, with assignee, priority, due date, status, and description.
7. Task comments or activity log (avoid sensitive content in notifications).
8. Meeting records: title, date/time, agenda, notes, attendees, meeting URL, decisions.
9. Convert a decision/action item into a task.
10. Overview dashboard: progress, overdue tasks, blocked tasks, upcoming deadlines.
11. Pixel office visualization with accessible list/table alternative.
12. Search, filters, empty states, loading states, and error states.
13. Export basic workspace reports to CSV, subject to role permissions.
14. Secure database schema and automated tests for access boundaries.

### P1 — after MVP is stable
- Notifications and reminders
- Calendar view
- Recurring tasks
- Attachments using private storage buckets and access policies
- Work program templates
- Audit log for sensitive administrative actions
- Archive and management-period handover
- Optional GitHub/Google Calendar integrations via secure OAuth flows

### Explicitly deferred
- Native audio/video calls
- Public marketplace of workspaces
- AI meeting transcription
- Cross-workspace global search
- Mobile native applications

## 7. Main entities

Workspace, membership, department, work program, task, meeting, attendee, decision/action item, comment/activity event, invitation, and notification.

See [DATA_MODEL.md](DATA_MODEL.md).

## 8. Core status model

### Work program
- `planned`
- `active`
- `blocked`
- `completed`
- `archived`

### Task
- `todo`
- `in_progress`
- `blocked`
- `in_review`
- `done`
- `cancelled`

Do not infer completion from animation. Progress should be derived from linked tasks using a documented rule. Recommended default: percentage of non-cancelled tasks marked `done`, with a clear empty-task state. If a manual progress override is added, display that it is manually set.

## 9. Key user journeys

1. Create workspace → invite members → create departments.
2. Create work program → add milestones/tasks → assign owners and due dates.
3. Hold meeting → capture decisions → convert action items to tasks.
4. Member updates a task → dashboard and pixel office reflect the saved status.
5. Lead reviews overdue/blocked tasks → reassign or change plan.
6. End a management period → archive relevant records and prepare handover.

Detailed flows: [USER_FLOWS.md](USER_FLOWS.md).

## 10. Pixel office behavior rules

The office scene is a visualization, not the database:
- A character's department/desk comes from their membership and profile.
- A character may show a working animation only if they have an active assigned task and the user has allowed that visibility.
- A blocked task may show a neutral blocked indicator; never expose private task text in the scene.
- Characters must not imply real-time presence unless presence is actually implemented and consented to.
- If data is stale or loading fails, show a visible “last updated”/offline state.
- Users can switch to a standard list view and disable motion.
- Avoid showing private details on shared/public screens.

## 11. Success metrics

- Percentage of active work programs with an owner and at least one task.
- Percentage of tasks with assignee and due date.
- Number of meeting decisions converted to tasks.
- Weekly active teams and members (opt-in analytics only).
- Time needed for a lead to identify blocked/overdue work.
- Accessibility and authorization tests pass in CI.

Do not collect analytics by default without documenting the data, consent, retention, and opt-out behavior.

## 12. Acceptance criteria

- A member cannot read or modify another workspace's private records by changing request IDs.
- A task update persists and is reflected consistently in list, dashboard, and pixel office.
- A meeting decision can create a linked task without duplicating the decision.
- Overdue and blocked work can be filtered without relying on color alone.
- Keyboard users can access all essential features without using the pixel scene.
- Reduced-motion preference is respected.
- No privileged backend secret is included in client bundles.
- Critical permission tests run in CI before release.
