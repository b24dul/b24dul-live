# Milestone 2 — Existing Backend Integration: initial preservation audit

**Date:** 2026-11-17. **M2 step 1:** inspect original production integration, then introduce a low-risk, **read-only** live-status adapter in the unpublished React frontend.

## Existing production inventory confirmed from source

| Feature | Legacy source and schema | M2 rule |
| --- | --- | --- |
| Firebase project | Root `index.html` uses Firebase JS 10.12.2, project `b24duls-anonymous-chat`, Europe-west1 Realtime Database | Keep project, database and identity provider unchanged; do not publish service-account JSON |
| Auth | `onAuthStateChanged`, anonymous sign-in fallback, admin Google popup and verified-email check | Existing anonymous UIDs/account continuity must be tested; client-side email check alone is not authorisation |
| Visitor profile and presence | `viewers/{uid}` (realName/visits/watchSeconds), `names`, `status/{uid}`, `.info/connected`, `onDisconnect().remove()` | Preserve lifecycle cleanup and privacy; no new write listeners before deployed rules backup |
| Chat | `messages`, `settings/chatEnabled`; names, bans/timeouts and pinned messages | Never read private/admin data or write publicly without deployed rules review |
| Moderation | `banned/{uid}`, `timeouts/{uid}`, `settings/pinned`, private moderator data | Client UI isn't security; verify backend rules before migration |
| Live status | Worker writes `settings/liveDetection = { live, videoId, checkedAt }` and `settings/live` | Worker remains sole scheduled writer; no direct React writes |
| Stream status public API | `https://b24dul-live-monitor.b24dul.workers.dev/api/status` reads published database state and returns `live`, `videoId`, `checkedAt`, `stale` | Allowed first slice: read-only GET, strict validation, never show LIVE for stale/error result |
| Stream playback | YouTube channel `UCnXAfqk5I7QE3frLhHHyImQ` | Preserve direct channel/live access when status is stale; working embed/player migrations later |
| Games and boards | `viewers/{uid}/sudoku`, `viewers/{uid}/g2048`, `leaderboard/{board}/{uid}` | Do not reset scores/save or trust client-submitted leaderboard records |
| Privacy | `privacyRequests` plus private viewer deletion limited to `viewers/{uid}` | Do not imply total account deletion or delete records on behalf of preview |

**Critical unknown:** the **complete deployed Firebase RTDB rules are not checked in**. Only `firebase/privacy-requests.rules-fragment.json` exists. Obtain authorised read-only backup and review before any React Firebase Auth/RTDB write or admin/moderation workflow. Do not copy any service-account credentials into GitHub or frontend.

## First safe increment

`frontend/src/services/liveStatus.ts` parses and fetches the existing public Worker `/api/status` (GET only, no credentials). To claim a confirmed LIVE state, it requires a valid boolean, non-stale recent timestamp (under 180 seconds old, at most 60 seconds in the future), `stale === false`, and valid 11-character YouTube ID; otherwise display **Status unavailable**. Confirmed OFFLINE must also be fresh. Network errors yield unknown, not offline. `PublishedStreamStatus` is mounted on the React Watch route, refreshes every minute, cancels requests on unmount and provides a direct YouTube channel link for all states. No embedded player is claimed to be migrated.

**Regression tests:** pure adapter unit tests (live/offline/stale/invalid/network), isolated browser tests with mocked API responses for live/offline/stale/network. Do not depend on a real broadcast or mutate the monitor.

## Next M2 work, gated

1. Verify and archive complete **deployed** RTDB rules with explicit authority, plus current auth provider settings; identify allowed anonymous/public read paths. This is a security prerequisite to connecting real users.
2. Introduce modular Firebase SDK and auth context in isolated React only after rules/access review; ensure anonymous sessions retain UID and public browsing isn't blocked by real-name entry. Never save tokens manually in localStorage.
3. Migrate read-only data, then carefully gated presence/chat writes and admin, with strict identity transitions, security-rule tests and privacy controls.
4. Preserve Worker Cron and video sync, separately migrate player/embed, Sudoku/2048 and score continuity. Full parity and cutover require separate acceptance.
