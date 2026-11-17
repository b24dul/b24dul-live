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

## M2 Step 2 — uploaded production RTDB rules: static security review (2026-11-17)

**Source/provenance:** Owner supplied a complete JSON object with a top-level `rules` key for Firebase project `b24duls-anonymous-chat`. JSON parsed successfully. This is an **owner-provided console export**, not an independent Firebase API retrieval or evidence of the exact currently deployed rules version. The full supplied rules are retained in the conversation, not copied into this public repository. Auth provider configuration remains to be confirmed separately via Firebase Console. No production rules/data/auth were modified.

**Inventory:** `messages`, `lastPost`, `banned`, `timeouts`, `names`, `viewers`, `status`, `settings`, `leaderboard`, `privacyRequests`. No explicit root `.read` or `.write` grant in the supplied rules; do not infer unrestricted root access.

| Area | Rule-level observation | Risk / migration gate |
| --- | --- | --- |
| Messages | `messages/.read: true`; authenticated message creation checks UID, `viewers/$uid/realName` or verified admin, chat toggle, ban/timeout, atomic `lastPost` and five-second cooldown. Content/name validation and admin deletion/edit restrictions exist. | Public transcripts are intentionally readable. React no-real-name design cannot simply adopt legacy posting rules without a separately approved policy/rule migration. Test multi-location atomic posting with emulator. |
| Admin | Checks `auth.token.email` against one fixed verified email for moderation, all-viewers reads and privacy history. | Rules provide backend checks, but email-based administrator identity is brittle; review provider settings, token verification, role transitions and least-privilege migration. Do not treat client `isAdmin` as authorisation. |
| Profiles | `viewers/.read` admin only; `viewers/$uid/.read` owner; `viewers/$uid/.write` owner or admin. Child field validators constrain counters, names and known fields. | Parent-level write allows owners to request whole-profile deletion; RTDB `.validate` does not run for deletes. Confirm expected privacy/delete behavior and test malformed whole-node replacement. Never reset live records. |
| Presence | `status/.read` admin-only, `status/$uid/.write` owner, numeric validation. | Preserve existing `onDisconnect().remove()` lifecycle; rule-validation bypass on deletes is expected but needs emulator tests. |
| Public reads | `names/.read: true`, `settings/.read: true`, `leaderboard/.read: true`. | Inspect live data for sensitive contents before deciding read adapters; avoid importing entire settings into React when only specific public fields are needed. |
| Scores | `leaderboard/$board/$uid` permits owners to submit improved integer scores within ranges; `viewers/$uid/g2048/$k` permits arbitrary nonnegative numbers. | **High-priority integrity risk:** game completion and submitted scores are not trusted-server-verified. Never use for prizes/XP or strong competition claims until validated server-side. |
| Privacy | `privacyRequests` is admin-only with fields/status constraints and no deletion through its child write; supplied fragment matches this section. | Preserve status/history and privacy workflow. Admin-only database access does not by itself establish regulatory compliance. |
| Stream | `settings/.read: true`; `settings/live` writable by admin, no client `.write` shown for `liveDetection`. | Worker Admin SDK/privileged writer may bypass rules. Verify actual worker auth path without changing its cron, and never add client stream-status writes. |

**Severity and validation limits:** Findings are from static inspection, not executed security-rule unit tests or a Firebase Console rules-version comparison. RTDB rules are inherited for read/write and validators differ for deletion: specifically test parent writes, child validation, unauthenticated/public reads, own-vs-other UID, banned/timeout posting, admin message edit/delete and leaderboard forgery in an isolated emulator with mock accounts. No production attack tests.

**Next gate:** Owner to confirm exact current deployed rules match the uploaded export and share enabled Firebase Authentication sign-in providers (provider names/status only; no keys, tokens or secret credentials). Then add **offline, nonproduction RTDB rules emulator tests** using a local test copy of the rules (never auto-deploy), settle no-real-name chat identity policy, and plan a minimal React Auth integration that preserves existing anonymous UIDs. **No write integration or production rule changes before these gates.**

## M2 Step 2 — Authentication provider confirmation (owner report, 2026-11-17)

Owner corrected the provider list: Firebase Authentication enables **Anonymous and Google only**; **Email/Password is NOT enabled**. This is a user-reported configuration, not an independent Firebase Admin API check. Preserve these two enabled providers during initial migration; changing providers or signing out/recreating accounts could break UID continuity.

**Safe React Auth integration contract:**
1. Initialise one modular Firebase app/Auth client with existing public client configuration (never a service account); subscribe with `onAuthStateChanged` before deciding whether to offer anonymous sign-in.
2. Reuse an existing persisted Firebase session and UID; never call `signInAnonymously` if a valid session already exists. Public page browsing must work without requiring an account.
3. Google sign-in must be an explicit user action; do not silently replace an anonymous account. Offer clear choice about preserving anonymous-linked data. For an intended account upgrade, use Firebase provider linking when possible, and design recovery for `credential-already-in-use` without deleting either account.
4. Treat client-side administrator badge/route as display only; trust RTDB rules and verified claims for privileged writes.
5. Do not store Firebase tokens manually in preferences/localStorage; never reset `viewers/{uid}`, `status/{uid}`, saved games, scores, names or presence on session change.
6. Tests before production: restoring an anonymous UID across refreshes; no automatic re-creation; safe Google sign-in flows with mocked providers; failed/redirected sign-in; credential collision; switching identities without data leakage; public anonymous-free browsing; account persistence on browser restart where supported.
7. Before introducing database writes, run isolated Firebase Emulator RTDB permission regression tests against owner-supplied rule snapshot and confirm its deployed version still matches. Do not deploy/change Firebase rules or live data.

**Status:** Owner correction supersedes the earlier three-provider statement; Email/Password is out of scope unless separately authorised. Provider-information gate satisfied; **offline rule tests and safe React integration implementation not yet completed**.

## M2 Step 3 — React identity-policy foundation (2026-11-17)

Added pure, non-networked `frontend/src/services/authSession.ts` with `normaliseAuthIdentity`, `planAnonymousEntry`, `planGoogleEntry`, and unit tests. The code only plans actions: it cannot sign in, link, read/write Firebase or alter the live site's state. It distinguishes auth-observer loading from confirmed signed-out state, keeps an existing anonymous UID, refuses silent identity replacement, and requires an explicit Google-linking step when transitioning an anonymous account. The configured providers remain **Anonymous and Google only**; Email/Password stays disabled.

**Tests added:** six Vitest test cases covering auth-observer timing/error, UID preservation, signed-out entry, explicit Google linking, and identity normalisation. Running GitHub Actions is the verification gate; a committed test is not automatically a passed test. **Remaining:** confirm the supplied RTDB export matches deployed rules, add nonproduction emulator rule tests without publishing or deploying rules, add Firebase SDK and a safe Auth context with provider mocking, test session persistence and collision recovery. No DB writes or production cutover.

## M2 Step 3 — non-networked authentication observer bridge (2026-11-17)

Added `frontend/src/services/authObserver.ts` and `authObserver.test.ts`. The observer adapter is dependency-injected, emits a checking state before its first callback, normalises confirmed signed-out / anonymous / non-anonymous sessions, preserves UID across repeat notifications, reports observer failures without attempting replacement sign-in, and unsubscribes idempotently while ignoring stale callbacks. Tests cover these seven cases.

**Scope boundary:** These modules are not yet connected to a Firebase SDK or the React app, and do not perform authentication, Google linking, cloud reads or writes. Their implementation is a prerequisite for a safe Firebase Auth integration, not evidence that real authentication works. Next gates remain: rule-emulator testing against the owner-supplied snapshot, verified production rules alignment, modular SDK dependency and dependency lockfile, SDK-backed provider mounting, and identity persistence/browser tests. Auth provider scope: Anonymous + Google, not Email/Password. Never auto-create anonymous accounts before the first observer result or silently replace an existing UID.
