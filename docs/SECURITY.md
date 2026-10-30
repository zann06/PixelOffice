# Security Baseline — PixelOffice

This file is a release gate, not a claim that the application is already secure. Security must be implemented and tested.

## 1. Threat model

Protect:
- private organization plans, tasks, meeting notes, and membership;
- user accounts and invitations;
- role changes and workspace ownership;
- uploaded files, if enabled;
- third-party integration tokens;
- integrity of progress and audit data.

Assume an attacker may change IDs in requests, call Supabase directly, modify browser state, replay requests, or attempt to access another workspace.

## 2. Authentication

- Use a maintained authentication provider (Supabase Auth for the planned stack).
- Require authentication for private workspace data.
- Configure redirect URLs and allowed origins explicitly.
- Use secure recovery flows and rate limits offered by the provider.
- Never build custom password storage.
- Do not log access tokens, refresh tokens, passwords, invitation tokens, or OAuth codes.
- Provide sign-out and document session revocation behavior.

## 3. Authorization and multi-tenancy

**Row Level Security (RLS) is mandatory on every exposed table.**

- Enable RLS for all tables accessible through the Supabase API.
- Create explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; do not assume one policy covers all operations.
- Scope access through active workspace membership and role.
- For updates, validate both existing-row access and the resulting row (`USING` and `WITH CHECK` semantics).
- Prevent a user from moving a row into another workspace by editing `workspace_id`.
- Ensure nested records inherit access only through a verified parent in the same workspace.
- Test cross-workspace IDOR attempts for every table.
- Do not rely on frontend route guards, hidden buttons, or `PermissionGate` for security.
- Keep the Supabase service-role key server-side only. It must never be prefixed with `VITE_` or bundled into the browser.

A publishable/anon key is expected in a browser Supabase app, but it is not a security boundary. RLS and correct policies are the boundary.

## 4. Role checks

Define a permission matrix before coding. Example starting policy:
- Owner: all workspace administration, with safe ownership transfer.
- Admin: manage members/departments and all workspace work, but cannot silently transfer ownership or delete the owner.
- Lead: manage programs/tasks/meetings in assigned or permitted departments.
- Member: read allowed workspace records and update permitted assigned tasks; create records only where policy allows.
- Viewer: read-only.

Implement the matrix in database policies and tests. Keep role changes restricted to trusted database functions or carefully scoped admin operations.

## 5. Input validation

- Validate all forms on client and server/database boundaries.
- Enforce length limits for titles, notes, descriptions, and comments.
- Treat user content as untrusted; render text, not raw HTML.
- Avoid `dangerouslySetInnerHTML`. If rich text is added, use a maintained sanitizer with a restrictive allowlist.
- Validate URL protocols and reject `javascript:`, `data:`, and unexpected schemes.
- Use parameterized queries; do not concatenate user input into SQL.
- Handle errors without exposing database internals or secrets.

## 6. Secrets and configuration

- Commit `.env.example` with placeholder values only.
- Ignore `.env`, `.env.local`, private key files, dumps, and local credentials.
- Browser variables such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public configuration, not secrets.
- Any service-role key, database password, OAuth client secret, or signing secret belongs only in trusted server/Edge Function secret storage.
- If a secret is accidentally committed, revoke/rotate it immediately; deleting the commit alone is not enough.

## 7. Invitations and account abuse

- Use cryptographically random, single-use invitation tokens.
- Store token hashes; set expiry and revocation.
- Bind invitations to an email where appropriate.
- Make acceptance atomic and validate the recipient's identity.
- Rate-limit invite creation and authentication-sensitive operations.
- Avoid revealing whether an email address has an account.
- Prevent self-assignment of elevated roles.

## 8. Files and meeting URLs

If file uploads are added:
- use private buckets by default;
- apply Storage policies tied to workspace membership;
- restrict file size and content types;
- use randomized object names;
- do not trust the client-provided MIME type alone;
- use short-lived signed URLs where appropriate;
- define deletion and retention policies.

For meeting links:
- allow HTTPS URLs only in production;
- do not store meeting passwords separately in logs or analytics;
- treat links as potentially sensitive and display them only to authorized members.

## 9. XSS, CSRF, and browser safety

- React escaping helps for ordinary text but does not make raw HTML safe.
- Avoid unsafe HTML insertion and untrusted script execution.
- Review auth/session patterns and cookie settings if a custom server is introduced.
- Set a restrictive Content Security Policy where deployment allows.
- Configure security headers at the hosting layer.
- Use HTTPS everywhere outside local development.
- Avoid broad CORS allowlists if server endpoints are introduced.

## 10. Privacy and auditability

- Collect only data required for collaboration.
- Do not expose private member email addresses in public queries.
- Explain who can see meeting notes and activity.
- Document data export, deletion, retention, and workspace deletion behavior.
- Add audit events for role changes, invitations, exports, and destructive actions.
- Do not treat activity logs as immutable unless the backend enforces that property.

## 11. Security testing and release gate

Before public deployment:
- [ ] RLS enabled for every exposed table.
- [ ] Anonymous user cannot read private workspace data.
- [ ] Member of workspace A cannot read/write workspace B data.
- [ ] Member cannot elevate their role.
- [ ] User cannot assign tasks to unauthorized users or cross workspace boundaries.
- [ ] Invitation is single-use, expires, and cannot be accepted by the wrong identity.
- [ ] Private storage objects are not publicly readable.
- [ ] Forms enforce validation and limits.
- [ ] No secrets in git history, source maps, browser bundles, or logs.
- [ ] Dependency and secret scanning enabled.
- [ ] Critical flows have automated tests.
- [ ] Backup/export and account/workspace deletion behavior documented.

Do not advertise “secure” or “production-ready” solely because this checklist exists. Verify the implementation and tests.
