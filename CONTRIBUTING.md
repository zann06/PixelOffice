# Contributing to PixelOffice

Thanks for your interest in contributing.

## Before starting
- Read `README.md`, `docs/REFERENCE.md`, `docs/DESIGN_SYSTEM.md`, `docs/USER_FLOWS.md`, and `docs/SECURITY.md`.
- Check existing issues and discuss large changes before opening a pull request.
- Keep changes focused and explain the user problem they solve.

## Contribution rules
- Do not commit secrets, `.env` files, real user data, meeting links, or database dumps.
- Do not add unlicensed sprites, fonts, icons, sounds, or screenshots.
- Add every non-original asset to `ASSET_LICENSES.md` with source, creator, license, attribution, and modifications.
- Do not implement permissions only in the frontend; add or update RLS policies and tests.
- Add tests for bug fixes and security-sensitive behavior.
- Keep pixel scene logic separate from business/data logic.
- Preserve keyboard access, readable labels, responsive layouts, and reduced-motion support.
- Avoid adding dependencies without a clear need.

## Pull request checklist
- [ ] Describes the problem and solution.
- [ ] Matches product and design docs, or updates them.
- [ ] Includes tests where appropriate.
- [ ] Passes lint, typecheck, tests, and production build.
- [ ] Includes loading, empty, error, and permission states.
- [ ] Does not expose private data or secrets.
- [ ] Has no unlicensed assets.
- [ ] Documents any migration or environment variable changes.

## Reporting a security issue
Please do not publish exploitable vulnerabilities with private data or live credentials in a public issue. Use the repository owner's private security reporting channel once configured. Until then, avoid sharing secrets and provide a minimal, non-sensitive reproduction.
