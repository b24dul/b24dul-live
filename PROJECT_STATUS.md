# B24DUL Project Status

> **Mandatory session handoff:** Read this file, `docs/legacy-audit.md`, `docs/architecture.md`, `docs/migration-plan.md` and the B24DUL Master Development Prompt before touching source. Update this file in every meaningful commit. **Do not assume documentation constitutes tested runtime behaviour.**

## Project identity
- Repository: https://github.com/b24dul/b24dul-live
- Production URL: https://b24dul.github.io/b24dul-live/
- Product: B24DUL digital community and entertainment platform
- Agreed stack: React, TypeScript, Vite, Tailwind, Motion, Lucide, Firebase retained
- Hosting: GitHub Pages
- Cost policy: free services/free tier preferred
- Binding specification: uploaded **B24DUL Master Development Prompt** PDF (13 pages). Keep a copy available to subsequent sessions; repository status is the progress record, not a replacement for the master prompt.

## Current state
- Current milestone: M1 — frontend foundation and visual application shell
- Current phase: **Phase 0 — repository reconnaissance and protection**
- Overall status: **Phase 0 documentation complete at source-audit level; awaiting review/authorisation for Phase 1. Runtime/production functional verification pending.**
- Last updated (UTC): 2026-11-17
- Active branch: `main` (**owner-authorised exception to PDF development-branch requirement**)
- Production branch: `main`
- Production baseline commit SHA: **`18410c536caee8085b4edc23b960cc30677a5997`**
- Latest development commit SHA: **see the live `main` HEAD / `git log -1 --format=%H`**. The Phase 0 audit documentation checkpoint before this status-file commit is `413d08fc88b171e7d2b5def7d6eab59fd3698ac2`. The final status-file commit SHA is not knowable from within its own contents without generating a subsequent commit; GitHub commit history is authoritative.
- Starting production Pages run: **44041794411** (successful, starting SHA, GitHub Actions `pages build and deployment`). No runtime browser verification claimed.
- No frontend rebuild started. No production Firebase records/rules, stream monitor, game scripts, live source or site styles changed by Phase 0.

## Decisions that must not change without approval
- Public browsing; registered users gain additional features; no mandatory real name for ordinary browsing in rebuilt UI
- Futuristic glassmorphism design with navy, violet and cyan; earlier tactical HUD styling is existing legacy, not the new master design
- React + TypeScript, Vite, Tailwind semantic tokens, shadcn/ui where appropriate, Motion, Lucide; HashRouter with `/b24dul-live/` base
- Foundation first; visual shell before Firebase backend migration; no fake live data or authentication
- Preserve existing Firebase Auth and Realtime Database initially; no Supabase migration
- Preserve existing repository and production URL
- Free-tier-first; no unauthorised subscriptions
- Incremental commits and phase gates; only completed tested features marked complete
- **2026-11-17 owner decision:** commit Phase 0 directly to `main`; do **not** create a development branch. This explicitly supersedes Sections 8/11 branch instructions but does **not** grant permission to overwrite the existing live site. A Markdown file is *not* a rollback mechanism; use Git commits, revert and tested restoration.

## Phase tracker

| Phase | Status | Commit SHA | Tests | Notes |
|---|---|---|---|---|
| 0 Repository audit | Documentation complete; live QA pending | `c8cee97dc283ad7bd1e5cb270fe22d3cd5efc168`, `000a10950a98eaa9b4921272cc764a0aee4c2446`, `413d08fc88b171e7d2b5def7d6eab59fd3698ac2`; final status-file commit: inspect HEAD | GitHub source/tree/workflow inspections completed; runtime, build, browser and Firebase/Worker checks **not run** | Documentation-only; exact source baseline recorded; no new branch per owner |
| 1 Frontend foundation | Not started | | Not run | Safe non-destructive Vite scaffolding; do not touch production homepage without a preview plan |
| 2 Design system | Not started | | Not run | Glass tokens/components |
| 3 App shell and routes | Not started | | Not run | Eleven HashRouter routes |
| 4 Homepage and page shells | Not started | | Not run | Real/demo states labelled |
| 5 Local settings | Not started | | Not run | Versioned local preferences |
| 6 QA/accessibility/performance | Not started | | Not run | Validate all responsive/browser gates |
| 7 Deployment candidate | Not started | | Not run | Explicit approval before production cutover |

## Completed work
- Date: 2026-11-17 UTC
- Phase: 0 — documentation/preservation baseline
- Summary: Connected GitHub read/write verified; identified all `main` repository entries, current production SHA, existing branches and recent commits; audited current single-page UI, Firebase client and data paths, guest entry, admin/moderation, chat/presence, privacy, analytics, video feed, two games, leaderboards, Cloudflare Worker and three workflows. Identified conflicting master-vs-existing gate/design practices and unknown deployed rules.
- Files created: `docs/legacy-audit.md`; `docs/architecture.md`; `docs/migration-plan.md`; root `PROJECT_STATUS.md`.
- Files modified/moved/deleted: **none** of the preexisting files.
- Commit checkpoint SHAs: `c8cee97dc283ad7bd1e5cb270fe22d3cd5efc168` (legacy audit), `000a10950a98eaa9b4921272cc764a0aee4c2446` (architecture), `413d08fc88b171e7d2b5def7d6eab59fd3698ac2` (migration plan); status creation commit is current HEAD at creation time.
- Tests and results: GitHub API access and source review: **passed**. GitHub Actions Pages run for original baseline: **success**. No local Node/browser/Firebase/Cloudflare test executed; do not represent these as passing.

## Current work
- In progress: Phase 0 handoff and review; no application implementation in progress.
- Exact next task: read this document and master PDF, recheck `main` HEAD, verify documentation-only Phase 0 diff and Pages status, then propose a safe **Phase 1 non-destructive frontend scaffold/preview path**, with no Firebase connection.
- Files/areas involved: `PROJECT_STATUS.md`, `docs/legacy-audit.md`, `docs/architecture.md`, `docs/migration-plan.md`; future isolated Vite frontend folder, package/CI/test files **only when authorised**.
- Last verified state: production baseline `18410c536caee8085b4edc23b960cc30677a5997` exists; `main` had old `index.html`, `styles.css`, Firebase inline module, Worker and scheduled videos workflow. Confirm current head before implementation since `videos.yml` commits periodically.

## Known issues and blockers
- Issue: production real-name entry gate conflicts with new no-real-name public browsing. Impact: new UX and privacy design must migrate carefully. Proposed resolution: public-first guest shell and explicit future backend/data migration review. Approval required: yes, before changing existing visitor-data collection.
- Issue: complete published RTDB rules and actual production credentials/settings not available in Git repo. Impact: cannot claim real backend security verified. Proposed resolution: backup/inspect Console rules before M2; do not publish M1 database changes. Approval required: for any later rules/data changes.
- Issue: existing `docs/PROJECT-ROADMAP.md` tactical HUD design and some detector docs do not match new PDF/current workflows. Impact: confusion in future work. Proposed resolution: master PDF governs target, historical docs preserved. Approval required: before any fundamental specification change.
- Issue: `main` auto-deploys GitHub Pages; direct-main work risks unintended live changes. Impact: Phase 1 staging required. Proposed resolution: separate non-published scaffold and preview/test gate, then explicit production cutover. Approval required: **yes** before changing live entrypoint.
- Issue: legacy browser QA, Firebase permissions checks, live Worker status and game interactions unverified. Impact: preservation claims are source-based only. Proposed resolution: dedicated regression smoke/E2E testing without touching production data. Approval required: for any invasive live tests.
- Issue: no committed complete RTDB rules or root application lockfile/test harness. Impact: future migrations require explicit inventory. Proposed resolution: preserve and create new tooling safely in Phase 1.

## Preserved legacy functionality
- Firebase authentication: `index.html` Firebase JS 10.12.2 anonymous/Google provider; unchanged
- Firebase Realtime Database: existing project `b24duls-anonymous-chat` and paths; unchanged; deployed rules **unknown**
- Anonymous access: guest nickname and real-name entry gate, existing behaviour unchanged
- Chat and presence: `messages`, `names`, `status/{uid}`, `.info/connected`, onDisconnect; unchanged
- Moderation: `banned`, `timeouts`, pinned messages, moderator controls; unchanged
- Privacy requests: manual email flow and admin `privacyRequests` history, private subtree deletion, rules fragment; unchanged
- Stream worker: `stream-worker/` isolated Cloudflare scheduled handler and test; unchanged
- YouTube stream/video archive: `settings/liveDetection`, `settings/live`, `videos.json`, scheduled YouTube feed update; unchanged
- Sudoku: inline engine, storage and per-user scores; unchanged
- 2048: inline engine, storage and per-user scores; unchanged
- Leaderboards: `leaderboard/{board}/{uid}`; unchanged, server enforcement not verified
- Analytics: viewer records and external GoatCounter; unchanged
- Admin: `#adminWorkspace` and auth-dependent controls; unchanged

## Deferred scope
All frontend implementation Phases 1–7 deferred until the Phase 0 handoff. Firebase reconnection in M2, accounts M3, community M4, gaming/competition M5, streaming improvements M6, tools M7, admin/security/optimisation M8. No early database migration, fabricated real data, paid services or unapproved public launch.

## Next session instructions
1. **Read this file first**, then the complete master PDF, `docs/legacy-audit.md`, `docs/architecture.md`, `docs/migration-plan.md`. Do not assume previous chat context is available.
2. Fetch latest `main` HEAD, compare with starting SHA `18410c536caee8085b4edc23b960cc30677a5997`, check recent bot-updated `videos.json` and CI. Status file may lag an automatic video refresh; never reset it.
3. Confirm Phase 0 docs and review the preservation plan; Phase 1 is **not yet authorised by this file**. Future frontend implementation must be isolated from GitHub Pages published root until approved.
4. When Phase 1 is authorised: establish non-destructive Vite + React/TypeScript scaffolding, tests and preview strategy. Run relevant test commands only once tooling exists (`npm ci`, lint, typecheck, Vitest, Playwright, `npm run build`), recording actual output. Do **not** edit existing Firebase database rules/records or move production HTML prematurely.
5. On every phase increment update this history, tracker, files changed, actual tests/results, exact next action and commit SHA references, and commit them together. A self-referential latest-commit SHA cannot be embedded reliably in that same commit; rely on Git's HEAD/commit URL for the file's own commit.
