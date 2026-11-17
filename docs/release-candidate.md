# B24DUL Phase 7 — Safe release candidate and deployment review

## Scope and irreversible boundary

Phase 7 in the present session prepares and tests the isolated M1 React frontend as a **static release candidate artifact only**. The approved direct-to-`main` workflow does **not** authorise replacing the public site. Existing public URL: https://b24dul.github.io/b24dul-live/.

The repository currently has the legacy site at root `index.html` and `styles.css`; GitHub's observed `pages build and deployment` workflow builds the existing root on `main`. There is no explicit new React Pages deployment workflow in the existing tree. **Never change Pages source settings, remove/rewrite root assets, or add an automatic `deploy-pages` action as a side effect of CI.**

## Release workflow

`.github/workflows/frontend-release-candidate.yml` is explicitly named **M1 React release candidate - no deployment**. It runs on `frontend/**` changes or manual dispatch and has `contents: read` permissions only:

1. `npm ci` from committed lockfile.
2. ESLint, strict TypeScript, all Vitest unit/component tests, Prettier.
3. Vite production build using the actual `/b24dul-live/` base path.
4. `frontend/scripts/verify-release.mjs` validates React root, compiled JS presence, all HTML-linked assets and their subpath; `js-budget.mjs` checks compressed JavaScript remains under 250 KB.
5. Chromium Playwright tests execute **Vite's compiled dist through `vite preview`**, not the development server. All eleven hash routes, refresh, mobile nav/preferences, base-aware favicon/assets, offline external-service fallback and 404 recovery are verified.
6. Uploads two artifacts: `b24dul-react-release-candidate` (downloadable site files) and official `github-pages` formatted tar artifact. **This workflow does not contain `actions/deploy-pages` and has no `pages:write` permission.**

A GitHub Actions artifact is not a public browser preview URL. For local review, download the `b24dul-react-release-candidate` artifact from the successful run, unzip to a folder, and serve at `/b24dul-live/` using the repository's `frontend` Vite preview commands or any static server with the same base path. Do not open `index.html` directly via `file://` because absolute asset paths require HTTP and that subpath. The artifact expires according to GitHub Actions retention (30 days).

## Release checklist, with separate approval gate

- Verify final successful CI run and artifact SHA; **do not** assume a queued run passed.
- Inspect current `main`, current production Pages source/workflow and active video/worker/Firebase integrations before any later deployment decision.
- Review candidate in a browser: 320/375/430/768/1366/1920px, landscape, desktop and mobile navigation, direct `#/games`, reload, external links, preferences, blocked-network UI, keyboard and screen reader. Automated checks reduce risk but don't replace manual WCAG or real-device testing.
- Inventory and test **feature parity** against the legacy site: Firebase Auth/anonymous users, RTDB identities and data, stream embeddings/status, chat/presence/moderation, privacy and account deletion flows, Sudoku/2048 saves and leaderboards, video-sync and admin roles.
- **Current blocker to replacing production:** the new M1 frontend deliberately shows disconnected/Coming Soon shells for those functional integrations. It is **not feature-parity-ready** for production replacement. A cutover before the M2 integration and a separate feature-preservation acceptance would remove or hide currently working capabilities.
- Before any future approved cutover, capture current production HEAD, deployed Pages run URL, branch/source settings, legacy assets and Firebase rules/schema (read-only backup where authorised). Require the owner to explicitly accept a test preview, functionality equivalence and release cutover.
- Production deployment should use supported GitHub Pages actions in a separately gated workflow only after explicit owner permission. Existing Pages automation must be reviewed; an unguarded `push main` deployment is unsafe.
- Post-release verify page root, assets, direct hash routes, refresh, mobile menu, browsers, auth/chat/games/stream/admin and real-hosted Lighthouse. Monitor errors and prepare immediate rollback.

## Rollback plan — for any later authorised release

1. Record immutable pre-cutover Git commit and Pages deploy run.
2. If release breaks functionality, revert **only** approved release changes on the publish source branch or restore previous verified Pages artifact/source according to actual Pages settings. `PROJECT_STATUS.md` alone cannot roll back.
3. Trigger/supervise deployment, verify published legacy homepage, stream, games, auth/chat and admin screens, and ensure no Firebase data/rules were mutated.
4. If data was changed separately in M2+, stop and use an approved backup/recovery procedure; Git rollback cannot restore RTDB records.

## Evidence

Phase 6 gate before release work: 22 Vitest + 19 Chromium, 38 Firefox/WebKit across both engines, mobile Lighthouse 91/100/100/100, desktop 100/100/100/100, JS gzip 136057 bytes. Phase 7 artifact and compiled-build tests passed on source commit `8890f72152e1920190a5533dc2819a2b75d5c268`: [release CI run 44085481343](https://github.com/b24dul/b24dul-live/actions/runs/44085481343) SUCCESS (22 unit, 4 compiled-site Chromium tests, install/lint/strict TS/format/build/static integrity/JS budget). The separate existing [foundation run 44085481249](https://github.com/b24dul/b24dul-live/actions/runs/44085481249) also SUCCESS (22 unit, 19 Chromium).

Known limits: no externally hosted React preview URL yet, no production data integration, no actual Firebase/Cloudflare interaction testing, no manual WCAG certification or physical iOS Safari check. No secrets, subscriptions, or production config changes made by this phase.

## Verified Phase 7 artifacts and disposition

- **Source revision:** `8890f72152e1920190a5533dc2819a2b75d5c268`.
- **[Release workflow 44085481343](https://github.com/b24dul/b24dul-live/actions/runs/44085481343)** passed every step and produced **`b24dul-react-release-candidate`** (artifact ID `14329895585`, approx 143553 compressed bytes) and **`github-pages`** Pages-format artifact (ID `14328867487`, approx 143306 compressed bytes). Both are uploaded for review; **neither has been deployed**.
- **[Foundation 44085481249](https://github.com/b24dul/b24dul-live/actions/runs/44085481249)** passed all legacy M1 frontend gates including 19 Chromium regressions. The Phase 6 Firefox/WebKit and Lighthouse measurements remain documented in `docs/testing.md`.
- **GitHub Pages public site:** unchanged legacy root; no new public preview URL created. Artifact review is an offline/local preview option, not a staged public deployment.
- **Production CUTOVER BLOCKER:** Existing auth, game, stream, chat, admin and privacy capabilities are not connected in M1 React. Require separately authorised M2 feature integration and parity verification before any production replacement. Release candidate is **technically valid static output**, not a feature-complete replacement.
