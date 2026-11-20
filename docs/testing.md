# B24DUL M1 Phase 6 — Quality verification and testing

**Scope:** isolated `frontend/` React/Vite production build. The published GitHub Pages entrypoint remains the existing legacy site, and no production Firebase backend was connected. Results do not apply to the public legacy site.

## Automated verification

- Existing `.github/workflows/frontend-foundation.yml`: reproducible `npm ci`, ESLint, strict TypeScript, Vitest unit/component tests, Vite build, Prettier and Chromium Playwright.
- `frontend/e2e/quality.spec.ts`: all eleven routes checked for uncaught JS exceptions, invalid assets and broken internal hash links; keyboard skip link keeps HashRouter destination and focuses main content; reduced-motion and settings keyboard handling; explicitly unavailable chat/stream/admin/video states when external network is blocked; 320/375/430/768/812-landscape/1366/1920 viewport coverage for homepage, Settings, Videos and Games.
- Existing suites continue to check navigation, refresh, page content, 404 handling, preferences/invalid storage, modal focus, demo-state honesty and video data parsing.
- `.github/workflows/frontend-quality.yml`: creates a **production build locally in CI**, serves it at `http://127.0.0.1:4174/b24dul-live/`, runs mobile and desktop Lighthouse and uploads JSON evidence. Only `frontend/` and workflow changes trigger the job. This job **does not deploy anything**.
- The Lighthouse report script records Performance, Accessibility, Best Practices, SEO, CLS, LCP, total blocking time and estimated transfer; enforces the master targets 90+/95+/95+/90+ and CLS below 0.1, subject to run-to-run measurement variability.
- `frontend/scripts/js-budget.mjs` checks total gzipped JavaScript from built assets against an initial 250,000-byte budget. Lighthouse's transfer-byte metric is distinct from compressed JS.

## Actual initial measurements and fixes

Initial baseline [run 44079791908](https://github.com/b24dul/b24dul-live/actions/runs/44079791908): Mobile Performance 92 / Accessibility 98 / Best Practices 96 / SEO 90; Desktop 100 / 98 / 96 / 90; CLS 0 / 0. Approximate Lighthouse total transfer 144,285 bytes. Stored as the `phase6-lighthouse-reports` artifact in that run.

The initial audit identified and confirmed four issues:

1. Missing `main` landmark in the React app shell.
2. Video link accessible name did not start with its visible label.
3. No meta description in the new preview HTML.
4. Browser-requested `favicon.ico` returned HTTP 404 (logged to browser console).

Corrections committed in `28ff9607da62b718e2b179df1a97b83f80dc8456`: the route content is a focusable `main` landmark; YouTube links contain the visible label in their accessible name; the HTML has a description; a custom SVG favicon is referenced using Vite's base URL.

Lighthouse on this corrected revision [run 44080262038](https://github.com/b24dul/b24dul-live/actions/runs/44080262038): **Mobile 92 / 100 / 100 / 100**, **Desktop 100 / 100 / 100 / 100** for Performance / Accessibility / Best Practices / SEO; CLS 0 both, total measured transfer 144,878 bytes, mobile LCP ~2694ms and desktop LCP ~373ms. These results are from one CI Lighthouse execution on a locally served production build, _not a real-user field measurement or formal WCAG audit_.

## Known limitations and review boundary

- The master WCAG 2.2 AA goal is a target; automated Lighthouse/Playwright checks cannot certify every criterion. Manual screen-reader testing and a visual keyboard audit on real devices remain recommended before Phase 7.
- Chromium, Firefox and WebKit browser engines all passed the existing Playwright suites in [run 44081098413](https://github.com/b24dul/b24dul-live/actions/runs/44081098413) (38/38 cross-browser tests). This still does not certify real iOS Safari or physical-device assistive technology.
- Lighthouse locally served preview may differ in hosting latency and compression from the GitHub Pages target after release. Run a post-deployment audit only after explicit production cutover approval.
- Historical legacy game, stream, Firebase, chat, moderation and privacy features are **untouched, not migrated**. They require separate integration validation.
- No credentials, Firebase data mutations, production route overrides or deployment steps are part of these tests.

## Next

All automated Phase 6 checks passed on source commit `5e1256ee043159ad0c14f0eff4f18f4b995ab120`: [22 Vitest / 19 Chromium](https://github.com/b24dul/b24dul-live/actions/runs/44081098328), [38 Firefox/WebKit](https://github.com/b24dul/b24dul-live/actions/runs/44081098413) and [Lighthouse/budget](https://github.com/b24dul/b24dul-live/actions/runs/44081098445). Phase 7 is a separate preview/release-candidate stage. Do not overwrite the live Pages root or make Firebase changes without explicit permission.

## Final measured gate — Phase 6

| Criterion                 |         Mobile |          Desktop | Target              | Result   |
| ------------------------- | -------------: | ---------------: | ------------------- | -------- |
| Lighthouse Performance    |             91 |              100 | 90+                 | Pass     |
| Lighthouse Accessibility  |            100 |              100 | 95+                 | Pass     |
| Lighthouse Best Practices |            100 |              100 | 95+                 | Pass     |
| Lighthouse SEO            |            100 |              100 | 90+                 | Pass     |
| Lighthouse CLS            |              0 |                0 | below 0.1           | Pass     |
| Lighthouse total transfer | ~144,894 bytes |   ~144,894 bytes | informative         | Measured |
| Production JS gzip        |  136,057 bytes | same built asset | below 250,000 bytes | Pass     |

Artifacts and logs: [Lighthouse 44081098445](https://github.com/b24dul/b24dul-live/actions/runs/44081098445), [foundation 44081098328](https://github.com/b24dul/b24dul-live/actions/runs/44081098328), [cross-browser 44081098413](https://github.com/b24dul/b24dul-live/actions/runs/44081098413). Lighthouse metrics are one-run CI lab values; expect fluctuations and repeat measurements around the release candidate. No public deployment was performed by these workflows.

## Which checks run when (from 18 November 2026)

| Check                                                                                                                               | When                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build, typecheck, lint, formatting, unit tests, JS budget, artifact safety scan, Chromium browser tests (dev server and built site) | Every PR (`frontend-foundation.yml`)                                                                                                                                       |
| Firebase rules and emulator tests (`/v2/` rules merged with synthetic legacy rules, Auth emulator)                                  | PRs that change `firebase/**`, Firebase services, chat policy, leaderboard boards, the emulator tests or dependencies (`rtdb-synthetic-emulator.yml`, `auth-emulator.yml`) |
| Firefox and WebKit browser tests                                                                                                    | Daily, after each merge to `release/react-preview`, and by hand before big releases (`frontend-crossbrowser.yml`)                                                          |
| Lighthouse (mobile and desktop, median of 3, target 90)                                                                             | Daily, after each merge to `release/react-preview`, and by hand (`frontend-quality.yml`)                                                                                   |

**Rules deploys:** before any Firebase rules deploy, run the full rules tests first, regardless of
path filters: fetch the live rules and confirm they're unchanged, merge `/v2/` with
`scripts/merge-v2-rules.mjs`, run the private legacy rules tests and the full `/v2/` emulator suite
against the merged file, then deploy, read back and compare byte for byte.

Daily schedules run from the default branch's copy of each workflow file, so they only start once
these workflow files are on `main` (or `release/react-preview` becomes the default branch).
