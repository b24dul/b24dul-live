# Milestone 2 — Source-backed Feature Parity Audit

**Audit date:** 2026-11-17 UTC
**Scope:** current `main` source at `6ca8cf9342e4ea3b8c695daea4452ec81e0cc2b0`, existing legacy implementation at repository root versus isolated `frontend/` React candidate. Inspected the React route implementations, service adapters, project architecture, legacy preservation audit and current GitHub Actions outcomes.

**Verdict: FAIL — production cutover blocked.** The existing React release candidate passes tests for what it implements, but it is not equivalent to legacy functionality. This is primarily a **source and CI-evidence parity audit**, not a full manual production-browser or real-Firebase end-to-end exercise. Do not interpret missing React parity as a claim that legacy production is currently malfunctioning.

## Feature-by-feature gate

| Feature | Legacy behaviour to preserve | Current React implementation evidence | Parity outcome | Acceptance test before cutover |
| --- | --- | --- | --- | --- |
| Responsive navigation and 11 routes | Original production navigation/mobile support | `frontend/src/app/App.tsx`, `AppShell.tsx`, `navigation.ts`; route/navigation/browser QA | **Shell implemented**; new route mapping intentionally differs | Verify navigation, deep hash links, back/refresh, mobile/tablet/landscape and keyboard on compiled preview and physical devices |
| Visual system and local settings | Working legacy layout, accessible controls | Glassmorphism UI; versioned local preferences, unit/browser QA | **New UI implemented**; not a legacy visual duplicate | Manual screen reader/WCAG, mobile overlap and viewport regression review |
| YouTube video archive | YouTube archive, periodic `videos.json` update | `videoArchive.ts` imports repo JSON at build time and shows read-only links | **Partial** — valid metadata but build-time snapshot | Ensure updated `videos.json` propagates to release and valid links/fallbacks; choose freshness strategy |
| Livestream monitoring | Worker cron and `settings/liveDetection` live/offline/stale semantics | `liveStatus.ts` and `PublishedStreamStatus` call public read-only API | **Partial** — status adapter only | Test fresh LIVE/OFFLINE/STALE and network failure on real configured Worker without writes |
| Livestream player | Original embedded player/manual fallback choice and YouTube access | Watch `StreamPresentation` preview plus external link; no functional embedded playback | **Missing** | Restore safe YouTube embed and user choice; test live/offline/video-ID transitions, mobile and iframe failure |
| Anonymous/Google authentication | Existing Firebase session, anon UID, Google administrator login | `authSession.ts` pure planner only; SDK and Auth provider absent | **Missing** — policy groundwork is not sign-in | Restore persisted anon UID, Google sign-in/linking and collision recovery without overwriting data; inspect active rules and providers |
| Visitor identity/profile | Nickname, viewer records, account continuity and privacy boundary | Guest-only profile placeholder | **Missing** | Preserve `viewers/$uid`, `names/$uid`, existing UIDs and guest experience; test no forced real-name browsing |
| Chat | Public messages, safe send, flood controls, chat toggle | Community placeholder; no live messages or send flow | **Missing** | Read/send/edit authorization, rule enforcement, cooldown, banned/timeout state, reconnect |
| Presence | `.info/connected`, `status/$uid`, onDisconnect cleanup | No RTDB adapter/listeners | **Missing** | Connect/reconnect, tab close/offline/onDisconnect cleanup, own vs other UID |
| Moderation | Ban, timeout, rename, message edit/delete and pin | Admin placeholder only | **Missing** | Authenticated administrator-only actions denied to guests/non-admins by backend rules; no client-only authorization |
| Sudoku | Puzzles, timers, notes, hints, stats and scores | Games directory links back to published site | **Missing** | Game parity with keyboard/touch/pause, local and Firebase saved state, continuity of existing player data |
| 2048 | Tile merge/swipe/keyboard, local saves, score, stats | Games directory links back to published site | **Missing** | Movement/merge/game-over tests, swipe/mobile, scores and state continuity |
| Leaderboards | `leaderboard/$board/$uid` entries | Competition placeholders | **Missing** | Read existing boards without modifying values, test owner restrictions; mitigate client-submitted-score forgery before trusted competitions |
| Privacy/account operations | Privacy-request queue, private viewer deletion scope, admin history | No account/privacy backend | **Missing** | Preserve `privacyRequests` history, verify deletion scope, never claim full erasure when limited to viewer record |
| Visitor analytics | `viewers/$uid` visits/activity/watch seconds; third-party analytics | No account analytics connection in React | **Missing** | Validate events and privacy notices without changing historical records; avoid duplicates |
| Worker/YouTube automations | Existing separate scheduled Worker and video-sync workflow | Legacy automations remain in repository; no migration required yet | **Preserved as separate infrastructure, runtime not reverified here** | Confirm deployments/schedules and no new competing writers after cutover |
| New Tools/Competitions | Mostly new roadmap sections | Clearly labelled planned placeholders | **Future scope; not legacy parity** | Separate milestone acceptance, never portray placeholders as functional |

## Current build and test evidence

Latest passing React implementation revision: `b1af534c8466d20e2216ef40c3208e2fc8efca83` (documentation-only commits followed). GitHub Actions confirmed:
- [Foundation run 44103971832](https://github.com/b24dul/b24dul-live/actions/runs/44103971832) **SUCCESS**: 33 unit tests; lint, strict TS, build, formatting, Chromium smoke tests.
- [Release candidate run 44103971788](https://github.com/b24dul/b24dul-live/actions/runs/44103971788) **SUCCESS**: compiled-build and release checks. Artifacts are not a live React deployment.
- [Cross-browser run 44103972002](https://github.com/b24dul/b24dul-live/actions/runs/44103972002) **SUCCESS**: Firefox/WebKit tests.
- [Phase 6 quality run 44103971783](https://github.com/b24dul/b24dul-live/actions/runs/44103971783) **SUCCESS**.
- [Pages run 44104191616](https://github.com/b24dul/b24dul-live/actions/runs/44104191616) **SUCCESS** at audit source HEAD. Pages workflow success does not itself prove all legacy runtime behaviour.

**No dedicated real-data feature parity E2E test suite has passed.** Current React tests primarily prove safe placeholders, local navigation/preferences and the read-only status adapter. Real browser/Firebase account testing, administrator rules, data preservation, native devices and actual player/game flows remain unverified.

## Required work order / cutover gates

1. **Security baseline first:** confirm owner-supplied deployed RTDB rules are current, build isolated emulator authorization tests, preserve current Anonymous + Google providers and existing UIDs. No live rules or records mutation.
2. **Identity and read-only RTDB:** modular Auth observer and restored UID, privileged backend rule checks, minimally scoped read adapters; test anonymous/Google sign-in and recovery before writes.
3. **Chat/presence/moderation:** implement rule-compatible flows and `onDisconnect` with integration tests and explicit admin/guest access checks.
4. **Watch:** restore embedded YouTube player, verified status transitions, stale/offline fallback and manual choice.
5. **Games and saved data:** migrate Sudoku/2048 with behavioural parity and existing player-state/leaderboard continuity; do not trust client scores for future competitions.
6. **Privacy/admin/analytics:** preserve deletion and history semantics, private data access, moderation, visitor counters and data protections.
7. **End-to-end verification:** automated and manual feature matrix against same accounts and representative anonymised fixtures, 375/430/768/1366/1920 and landscape, Chromium/Firefox/WebKit plus real mobile testing. No uncontrolled production test writes.
8. **Explicit owner cutover approval only after full functionality acceptance**, current Pages/Worker/Firebase backup and rollback evidence. Never overwrite root `index.html` before approval.

**Conclusion:** This audit closes only the *inventory/verification* step; **feature parity itself is not achieved**. 

## Follow-on progress: gated livestream playback (2026-11-17)

A new read-only `PublishedStreamStatus` player option loads `youtube-nocookie.com/embed/{videoId}` **only after** a currently verified LIVE monitor response and an explicit viewer click. It uses the validated 11-character video ID already supplied by `liveStatus.ts`, preserves the direct channel/broadcast links, avoids loading third-party iframe content before consent, and removes the iframe when an offline, stale or unavailable state is confirmed. Watch copy now reflects this conditional capability; the Home hero remains a disconnected preview.

Dedicated Playwright cases assert live playback is initially absent, clicking enables the exact verified embed, and offline/stale states never expose a player. This is **partial playback migration, not full stream parity**: archived stream fallback, user preferences, full player choice, accessibility/real-hosted YouTube tests and existing live controls still need comparison with the legacy website. The `streamPlayback` production gate remains **false** until comprehensive acceptance passes. No Firebase reads or writes were added.
