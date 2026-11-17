# Legacy production audit — Phase 0

Audit date: 2026-11-17 UTC. Repository: `b24dul/b24dul-live`. Read-only source inspection via connected GitHub API at **`18410c536caee8085b4edc23b960cc30677a5997`** (production branch `main`). This is a **code/configuration audit**, not a browser, Firebase Console or Cloudflare runtime test. Preserve all paths and data until explicitly authorised and regression-tested.

## Inventory and preservation matrix

| Feature | Current location and integration | Preserve / migration notes |
| --- | --- | --- |
| Entry & public/guest identity | `index.html`: `#gate`, `#gateForm`, anonymous nickname `b24dul_anon` in localStorage, Firebase anonymous sign-in | Existing gate collects real name and stores `viewers/{uid}/realName`; conflicts with future open browsing/no-real-name rule. **Do not remove yet**. Plan consent/privacy-safe public browsing without breaking existing identity lifecycle. |
| Firebase Auth & admin | `index.html` inline ES module imports Firebase JS 10.12.2 from gstatic; anonymous auth, Google popup sign-in, onAuthStateChanged; `?admin` presentation; verified-email identity check | Preserve Firebase project `b24duls-anonymous-chat`, existing anonymous UIDs, admin continuity. Client `isAdmin` and `?admin` are presentation only; authorisation must be verified against published RTDB rules. |
| Realtime Database | `index.html` Firebase RTDB client; `stream-worker/src/index.js` uses existing RTDB REST endpoint for monitor | Do not rename/reset paths, credentials, timestamps, listeners or records. Full deployed rules **not present in repository**; only fragment available. |
| Chat & presence | `index.html` `#messages`, `#sendForm`; `messages`, `names`, `status/{uid}`, `.info/connected`, onDisconnect; `settings/chatEnabled` | Preserve message schema, listeners, slow mode, pseudonymous names, presence lifecycle, chat toggle and cross-session cleanup. |
| Moderation | `index.html` admin workspace, `banned/{uid}`, `timeouts/{uid}`, `names/{uid}`, message edit/delete, pinning at `settings/pinned` | Preserve administrator controls, safe state resets on auth change and server-enforced database rules. |
| Privacy requests & deletion | `index.html` privacy dialog, manual email request flow, admin `privacyRequests` history, private profile deletion; `firebase/privacy-requests.rules-fragment.json`; `docs/PRIVACY-REQUEST-HISTORY.md` | Fragment is **not** the deployed full rules. Request history statuses: pending/processing/completed. Private deletion affects `viewers/{uid}` only; it intentionally does **not** delete public chat, scores, bans or Firebase identities. Do not imply whole-account erasure. |
| Visitor analytics | `index.html`: `viewers/{uid}` with visits, watchSeconds, activity, device/source, subscribeClicks; external GoatCounter `b24dul` | Preserve live fields and privacy obligations. External analytics availability and notices unverified. |
| Stream player & status | `index.html` `#liveBadge`, `#playerFrame`, `#ytFrame`, offline choice UI, subscription link; listens `settings/liveDetection` and freshness timeout | Preserve real live/offline/stale handling, YouTube player, manual player choice and notifications. Do not fabricate viewer counts. |
| Live-status worker | `stream-worker/src/index.js`, `wrangler.jsonc` (cron each minute), `stream-worker/test/detection.test.mjs`, README; Cloudflare `b24dul-live-monitor` | Worker scheduled handler detects YouTube; writes `settings/liveDetection` and `settings/live`, API is read-only. Service-account secret only in Worker/GitHub secrets, never client. Preserve separate deployment and monitoring. |
| Detector fallback | `.github/workflows/auto-live.yml`, `.github/scripts/check_live.py`, `live-monitor-state.json` | GitHub workflow is **manual fallback** (`workflow_dispatch`), not the active scheduler. Documentation in `docs/AUTO-LIVE-DETECTION.md` includes older scheduled-run instructions: reconcile before relying on it. |
| YouTube video archive | `videos.json` entries `{id,title,published}`; `.github/scripts/fetch_videos.py`; `.github/workflows/videos.yml` | Workflow every 3 hours and on manual dispatch; can update `videos.json` on `main`. Preserve metadata schema, feed, URLs, thumbs, archive UI; later implement typed adapter. |
| Sudoku | `index.html` `sd*` controls, generated puzzles, notes, timer, hints, saved local state and `viewers/{uid}/sudoku` | Preserve keyboard/touch inputs, saved progress and leaderboards; migrate only with verification. |
| 2048 | `index.html` `g2*` controls, swipe/keyboard, local saved state, `viewers/{uid}/g2048` | Preserve score and best state, gameplay and leaderboard. |
| Leaderboards | `index.html` `leaderboard/{board}/{uid}`; board examples Sudoku levels and `g2048` | Current client submits values; actual published anti-cheat rules and write validation unknown. Future competitions require trusted validation; do not silently re-use untrusted scores for XP. |
| Admin dashboard | `index.html` `#adminWorkspace`, viewer/stats/moderation/privacy panels, CSS `body.admin` | Preserve all admin flows and ensure no merely client-side security claims. |
| Current visual assets | `styles.css` (~69 KB), `index.html` (~110 KB), `assets/*.svg`, `og.png`; `docs/DESIGN-SYSTEM.md` | Existing tactical HUD / neon design from recent commits is a **legacy state**, not the binding new glassmorphism direction. Keep accessible until approved cutover. |
| Existing internal docs | `docs/PROJECT-ROADMAP.md`, `docs/DESIGN-SYSTEM.md`, `docs/AUTO-LIVE-DETECTION.md`, `docs/PRIVACY-REQUEST-HISTORY.md` | Retain as historical implementation records. New master prompt controls future milestones; record and resolve deviations, do not erase history. |

## Deployment and repository evidence

- `main` is unprotected per branch metadata at audit time. Other existing branches: `design/neo-noir-phase-1`, `reliability/firebase-auth-presence-lifecycle`, `security/leaderboard-verification-design`, `security/verified-admin-authorization`.
- No root `package.json`, `package-lock.json`, `vite.config.*`, application test harness or checked-in Pages deployment workflow at baseline. Existing Pages uses GitHub's `pages build and deployment` workflow; successful run **44041794411** targets the starting SHA. This supports publication of the commit but does not independently verify live functionality.
- `.github/workflows/deploy-stream-worker.yml` deploys Worker only on matching `main` paths or manual trigger, tests `stream-worker` first, checks Cloudflare/Firebase secrets.
- `.github/workflows/videos.yml` can independently commit archive refreshes to `main`. Audit head can move between reads/writes; check HEAD before all subsequent work.
- `stream-worker/package.json` uses `node --test` and Wrangler `^4.0.0`; no committed lockfile observed.
- Production URL: https://b24dul.github.io/b24dul-live/ . Public deployment source/configuration was not readable from the supported API's Pages settings endpoint; verify in GitHub Settings during release planning.
- No credentials were inspected or copied. Firebase client configuration is public configuration; actual production rules, roles and access protections cannot be validated from GitHub alone.

## Priority risks and unknowns

1. **Policy conflict:** existing real-name entry gate versus master requirement that public browsing not require sign-up or real names; decide migration of visitor privacy/data notices during later Firebase integration.
2. **Security:** only privacy rule fragment checked in. Published RTDB rules and existing leaderboard hardening must be backed up and audited before M2. No rule deployment in M1.
3. **Live:** scheduled Worker and legacy fallback must never race as automatic writers; verify deployed Worker and Firebase monitoring in a separate, authorised operational test.
4. **Tests:** legacy visitor flows have no observed browser regression suite. Require live/offline, anonymous reentry, gate, chat, moderation, privacy, Sudoku, 2048, responsive, archive and admin manual/automated tests before cutover.
5. **Visual direction:** existing HUD decisions in `docs/PROJECT-ROADMAP.md` conflict with new binding violet/cyan glassmorphism. New PDF takes precedence **for future work**; no redesign in Phase 0.
6. **Direct-main workflow:** user explicitly superseded the PDF's branch instruction and authorised documentation commits on `main`. All future UI work must still be gated and should not replace the live site without separate deployment/cutover approval. A Markdown log is not a Git rollback mechanism; commits and a verified baseline SHA are.
7. `docs/AUTO-LIVE-DETECTION.md` stale narrative versus current manual fallback; preserve and reconcile in dedicated maintenance work.
8. Actual accessibility, Pages refresh behaviour, functional authentication, external CDN dependencies, runtime Firebase access and live Worker operation remain untested.

## Phase 0 acceptance and rollback

Scope: documentation-only. Do not modify `index.html`, `styles.css`, `videos.json`, assets, game code, workflows, worker, rules or remote data. Code-level smoke checks and live behaviour are **not executed** by this audit. The exact pre-Phase-0 source rollback point is `18410c536caee8085b4edc23b960cc30677a5997`; use GitHub history/revert for code rollback, not the status Markdown itself. Confirm page and automation changes separately before Phase 1.
