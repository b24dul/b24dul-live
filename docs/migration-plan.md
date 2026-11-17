# Preservation and migration plan — Phase 0

**No migration performed.** At audit: production branch `main`, baseline `18410c536caee8085b4edc23b960cc30677a5997`. This document defines the guards for the master specification's phases.

## Protected inventory
Keep original `index.html`, `styles.css`, `assets/`, `og.png`, `videos.json`, `firebase/`, `stream-worker/`, `.github/scripts/`, `.github/workflows/`, `live-monitor-state.json` and historical `docs/` intact. Preserve all records and schemas under Firebase RTDB, anonymous identities, verified admin, private visitor data, chat, presence, moderation, privacy requests, games and leaderboards. Never copy service-account secrets to frontend or repo.

## Ordered milestones and safe gates
1. **Phase 0:** capture immutable starting SHA, audit dependencies/data paths and workflows; commit docs + root `PROJECT_STATUS.md`; no source edits.
2. **Phase 1:** set up React/TypeScript/Vite as a separate, non-destructive frontend foundation while the legacy GitHub Pages root remains live. Choose a path and test strategy that does **not** replace `index.html` on `main` before approval. No Firebase connection.
3. **Phases 2–5:** implement glass design tokens/components, responsive shell/all eleven hash routes, content with honest demo vs real states and persistent local preferences. Consume existing `videos.json` through a typed adapter. Do not silently migrate game or backend state.
4. **Phase 6:** unit/component/E2E tests, browser/accessibility/performance checks; record actual outcomes and deficiencies.
5. **Phase 7:** review existing Pages deployment semantics; create safe preview and validated release candidate. Require explicit user cutover approval before replacing production homepage.
6. **M2 only after M1 acceptance:** reconnect existing Firebase Auth/RTDB and verify schema, rules, identity transitions, guest/registered experience, chat/presence, moderation, streams, admin and privacy. Backup production rules first and do not mutate published data or rules in M1.
7. **M3–M8:** implement accounts, community, games/competition, streaming, utilities and admin/security progressively; acceptance per milestone before advancing.

## Compatibility / verification checklist
- Anonymous auth persists, reentry/gate change respects privacy, old public links and chat UIDs remain stable.
- Read-only migration of archived video metadata and live/offline/stale stream status; retain player fallback.
- Back up and verify existing RTDB rules before any later change. Do not assume privacy fragment is the complete rules document.
- Do not change leaderboard `leaderboard/{board}/{uid}` or per-user Sudoku/2048 records without tested adapters. Require server verification for future competitive scores.
- Maintain separate Worker cron/CI and GitHub video-sync scheduled writer. No simultaneous automated fallback writers.
- Protect mod/admin edit/delete, ban/timeout, pinned messages, privacy requests, viewer profile deletion, auth change cleanup, and `status/{uid}` onDisconnect behaviour.
- Test 375x812, 430x932, 768x1024, 1366x768, 1920x1080 and relevant landscape; manual smoke tests and Playwright before cutover.
- Do not fabricate stream state, counts, events, auth, reports, successful privacy deletion or successful deployments.

## Direct-to-main exception and rollback
Owner authorised work on `main` instead of creating `rebuild/milestone-1-foundation`. **Only Phase 0 documentation edits are authorised now**. This branch decision is an explicit exception to the PDF branch requirement, not a wholesale abandonment of preservation. GitHub Pages may automatically build from `main`; never commit replacement `index.html` to `main` as an unreviewed preview. Commit SHA/git history is the rollback mechanism; `PROJECT_STATUS.md` records checkpoints and instructions but **cannot** itself revert files or Firebase data. Starting checkpoint: `18410c536caee8085b4edc23b960cc30677a5997`. Later restoration requires an explicit Git revert/restore and deployment verification.

## Open questions (defer until relevant)
Exact published Firebase rules and backup procedure, production Pages source settings, browser runtime results, verified admin role model beyond client email checks, future visitors' real-name consent/data migration, alternative preview hosting and whether older HUD design records need archival. None blocks documentation-only Phase 0.
