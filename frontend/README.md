# B24DUL Phase 1 frontend foundation

This directory is an **isolated, unpublished** React/TypeScript/Vite proof of foundation.
The existing repository-root `index.html`, `styles.css`, assets, Firebase integrations,
games, video sync and stream worker remain the production site. Nothing here changes the
GitHub Pages entrypoint.

## Planned development commands

Requires Node.js 22+ and a verified npm registry connection.

1. `npm install` to resolve dependencies and **generate package-lock.json**.
2. Review and commit that lockfile before calling the foundation reproducible.
3. `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run build`, `npx playwright install chromium`, `npm run test:e2e`.
4. `npm run dev` for local development; use the URL Vite prints under
   `/b24dul-live/` to preview. Do not deploy `frontend/dist` to the root Pages URL.

**Verification status:** Scaffolding committed, commands not run/verified in the
authoring environment because its npm registry is unreachable. This phase is NOT complete.
Do not assert that dependency versions, builds, tests or browser checks pass until
a real successful run is recorded. In particular, the package lock is still missing.

Phase 2 design tokens and components, Phase 3 the full 11 routes, and
Phase 7 production cutover remain separate approved gates.
No Firebase SDK is installed here; no credentials, mock auth or live stream data exist.

## Phase 2 showcase

The isolated preview now demonstrates the reusable glassmorphism design system and its keyboard-accessible UI components. See `../docs/design-system.md` for semantic tokens, component APIs and accessibility guidance. This is still not a production UI or Firebase integration. The GitHub verification workflow tests the responsive showcase; no new frontend is deployed to the existing Pages root.

## Phase 4 — Page layouts and archive

The isolated React prototype now includes the full homepage and distinct page layouts for all
eleven routes. Read-only video metadata is imported from the original repository-root
`videos.json`, parsed and validated in `src/services/videoArchive.ts`. This is a
**build-time snapshot**, not a live channel feed; video links open directly on YouTube.

Existing Sudoku/2048, authentication, chat, moderation, stream status, leaderboards and
production Firebase data have **not** been migrated. Planned features clearly state
their unavailable status. There is no deployment of this prototype over the root
GitHub Pages production entrypoint.

Phase 4 tests include video adapter edge cases, page content and video link validation,
and responsive/browser checks for all routes.
