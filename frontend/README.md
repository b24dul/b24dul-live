# B24DUL Phase 1 frontend foundation

This directory is an **isolated, unpublished** React/TypeScript/Vite proof of foundation.
The existing repository-root `index.html`, `styles.css`, assets, Firebase integrations,
games, video sync and stream worker remain the production site. Nothing here changes the
GitHub Pages entrypoint.

## Local development and verification

Requires Node.js 22+ and access to npm. The dependency lockfile is already committed.

1. `npm ci` installs the committed dependencies.
2. `npm run dev` starts the isolated Vite preview using `/b24dul-live/` as the base.
3. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run format:check` are checked in GitHub Actions.
4. `npx playwright install chromium` then `npm run test:e2e` exercises the browser checks.

Phases 1–4 have passed GitHub Actions. Phase 5 introduces local, versioned preferences;
refer to `../docs/local-preferences.md` and `PROJECT_STATUS.md` for current gate status.
No Firebase SDK is installed here, and no production cutover has been authorised.

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

## Phase 5 — Browser-only preferences

The settings page applies a validated `b24dul.preferences.v1` record. It supports violet/cyan
accent, comfortable/compact density, device/reduced-motion setting, homepage editorial
order and expanded/collapsed desktop navigation. Existing `b24dul.sidebar.collapsed.v1`
preference is migrated when appropriate. The verified dark theme is retained;
no untested light-theme toggle, real profile setting or cloud sync is presented.

## Phase 6 — Automated QA and Lighthouse

The read-only `frontend-foundation.yml` and `frontend-quality.yml` workflows validate
the isolated build, browser navigation, errors, keyboard focus, viewport overflow and
mobile/desktop Lighthouse scores, including a compressed JS budget. Full audit evidence
and measured scores are documented in `../docs/testing.md`.

**Important:** local Lighthouse against `vite preview` is not a production website
audit or complete WCAG certification. The existing published website is unchanged.

## Phase 7 — Release candidate (NOT public deployment)

GitHub Actions workflow `frontend-release-candidate.yml` installs locked dependencies,
checks lint/TypeScript/unit tests/formatting, builds the static site, verifies every
referenced asset uses `/b24dul-live/`, tests the **built** app with Chromium and
uploads a downloadable `b24dul-react-release-candidate` artifact. It also produces
a GitHub Pages-formatted artifact **without calling deploy-pages**. Review
`../docs/release-candidate.md` for the safe preview and rollback process.

The React prototype does **not** yet provide production Firebase Auth, community/chat,
stream embeds, real games, live moderation or admin workflows. It must not replace the
legacy production site merely because the isolated pages pass automated tests.
