# B24DUL Project Status

Last updated 20 November 2026. The plan of record is **B24DUL Master Plan v2** (owner's outputs
folder, `B24DUL-MASTER-PLAN-V2.md`). This file is the short, current summary. The older detailed log
is kept in [`docs/status-history.md`](docs/status-history.md).

## Current state (verified 2026-11-19)

| Item                   | State                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live site              | https://b24dul.github.io/b24dul-live/, built from `release/react-preview` by `deploy-pages-preview.yml` (Pages source: GitHub Actions)                                                                                                 |
| Latest feature release | PR #48 (admin control centre), merge commit `bbce8c5`, deploy run 44445083571 succeeded. PR #50 (stream checklist) was reverted by PR #52, see Parked                                                                                  |
| `main`                 | Old site's files (backup) plus `videos.yml` (every 3 hours) and `auto-live.yml` (manual). Both run `gh workflow run deploy-pages-preview.yml --ref release/react-preview` after committing data                                        |
| Legacy backup tag      | `legacy-pre-react-2026-11-18`, points to commit `71b26e6`                                                                                                                                                                              |
| `/legacy/`             | No longer published. The page there sends visitors to the home page straight away                                                                                                                                                      |
| Removed pages          | Explore, Tools and Competitions have no route, link or text in the source or the live JavaScript. Unknown addresses show the "not found" page                                                                                          |
| Moderation history     | Timeouts (`timeout`, with end time), lifted timeouts (`untimeout`), bans, unbans and "delete all" are written to `/v2/moderationLog` in the same update as the action. Covered by `frontend/scripts/rtdb-emulator/v2.emulator.test.ts` |
| Lighthouse (median)    | Mobile 94, desktop 97, accessibility 100 (run 44427622853, 2026-11-19)                                                                                                                                                                 |
| Backend                | Firebase Auth and Realtime Database, free Spark plan. New data lives under `/v2/`; legacy rules kept unchanged                                                                                                                         |

### Live on the site

Sign-in (guest and Google, account chooser), privacy notice, chat on Watch and Community, Watch page
with live player and chat, on-site video player, 2048 and Sudoku with saves, leaderboards with the
dev-tools flag, visitor statistics (GoatCounter plus daily totals), the admin control centre
(PR #48) and the sunset restyle (PR #47).

## Decisions that stand

These come from the Master Plan v2, section 3. Do not change them without the owner's approval.

1. Fresh start: old users, scores and saves are not carried over (`identityContinuity` not applicable).
2. The new site never links to the old site.
3. Users are anonymous to each other, with generated names. Google name, email and photo are never stored or shown. The owner shows as "B24DUL" with an Admin badge.
4. Guests can read and browse. Only Google sign-ins can chat or save scores.
5. Google sign-in always shows the account chooser. No real-name entry gate.
6. Videos play on the site, with an "Open on YouTube" link.
7. Explore, Tools and Competitions stay removed until they have real content. Unbuilt games stay hidden.
8. Games are built in-house.
9. Basic anti-cheat only: rules reject impossible values, one best score per board, rate limit, admin delete, private dev-tools flag. No replay checks or Cloud Functions for now.
10. Design: Miami sunset at twilight; cyan only for LIVE; Lighthouse mobile must stay at 90 or above.
11. Admin is checked by account ID in `/v2/admins`, enforced by the rules.
12. Analytics: daily totals for visitors; per-user data only for Google-signed-in users. No IP addresses, fingerprints or consent cookies.
13. Free tier only.
14. Any Firebase rules change: plain-English summary first, owner approval, then fetch, merge, test, deploy, read back, back up privately and probe live. Legacy rules stay unchanged until they are deliberately removed.
15. CI thresholds are never lowered and tests are never deleted. Visual changes get desktop and phone screenshots before merging.
16. Never reset, force-push, `push --all`, `--mirror`, `npm audit fix --force`, push `local-private/*`, or commit secrets or the private rules backups.

## Release gates

From `frontend/production-gates.json` (checked 2026-11-19; it matches the plan):

- **Passed:** anonymousGoogleAuth, chatPresence, moderation, streamPlayback.
- **Not applicable:** identityContinuity (fresh start).
- **Open, needs evidence:** firebaseRules, gamesAndSaves, leaderboards, privacyAndAdmin, visitorAnalytics, crossBrowser, rollbackReady, stagingSmokeTests.

## Parked

Work that is finished or started but deliberately off the site. Nothing here is deleted.

- **Stream progress checklist** (parked by the owner on 20 Nov 2026 to focus on polishing 2048 and
  Sudoku). Branch `feature/stream-checklist`, PR #50 (merged 2026-11-20, then reverted by PR #52).
  An admin "Up next" card, list import, guide prompt helper and viewer progress panel. Its rules
  paths `/v2/checklists`, `/v2/checklistsPrivate` and `/v2/checklistPrompt` are still deployed and
  still in `firebase/v2.rules.json` with their emulator tests, but nothing on the site uses them (empty,
  unused). "Show upcoming" off hides upcoming item titles only in the viewer panel, not
  in the public data. To bring it back, revert PR #52's revert commit.

## Open items

1. **Owner tests not done yet:** control centre with real data; leaderboards; privacy request end to end; 2048 and Sudoku win and game-over screens.
2. **Offline hub:** on hold. It may be folded into the Phase B stream schedule (a "not live right now" panel on Watch).
3. **Old site data** in Firebase under the legacy paths: delete with a written plan, a private backup and owner approval, then remove the legacy rules.
4. **Open PRs:** #7 (early identity coordinator, superseded) and #25 (draft record of the first preview deploy, marked "do not merge"). Waiting for the owner's decision. PRs #8 to #24 were closed on 2026-11-19 because their changes are already in `release/react-preview`.
5. **GitHub Support:** an old request about the PR #2 rules file is still open, according to the plan (not checked here; owner to follow up).

## Roadmap

- **Phase A, housekeeping (now):** the open items above; owner tests, then record evidence and update gates.
- **Phase B, streaming extras:** stream schedule, chat polls, Q&A, floating mini-player, highlights.
- **Phase C, new games one at a time:** Snake, Memory Match, Minesweeper, Connect Four, each with a leaderboard rules summary for approval.
- **Phase D, community:** report button and queue, moderator role, notifications, rooms if needed.
- **Phase E, accounts:** "Delete my account", preset avatars, favourites.
- **Phase F, competing:** daily challenges, XP, tournaments (decide on score trust first).
- **Phase G:** Tools page only if wanted, SEO, installable app.
