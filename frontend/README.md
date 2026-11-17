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
