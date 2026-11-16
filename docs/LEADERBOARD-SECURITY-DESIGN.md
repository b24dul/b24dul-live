# B24DUL Live — leaderboard integrity design (proposal only)

Status: **DESIGN / NOT DEPLOYED**. No live Firebase rules or leaderboard data were changed.

## Confirmed source baseline (main, 16 November 2026)
- `index.html:1065–1111`: public leaderboard listener and direct client write at `leaderboard/<board>/<uid>`.
- `index.html:1333–1344`: Sudoku submits `sd.elapsed` after matching a locally stored `sd.solution`, if `sd.hints === 0`.
- `index.html:1176–1188`: Sudoku puzzle/solution generated locally.
- `index.html:1573–1585`: 2048 submits `g2.score` at win or loss.
- `index.html:1487–1499`: 2048 tiles spawn locally using `Math.random()`.
- Provided Firebase Realtime Database rules: `leaderboard/$board/$uid` allows matching signed-in UID to submit a numeric `value` in `(0,1000000)` with `ts == now`; rules do **not** verify games or prevent a better score being replaced by a worse one. Score ordering protection exists in UI code only.

## Threat and constraints
A browser user can modify JavaScript or call Firebase directly. DOM checks, localStorage, hidden values, client timestamps, checksums and App Check cannot prove a game was played fairly. The public leaderboard may contain historically unverified entries. Do not reset it without consent.

## Proposed architecture (requires approval)
1. Keep static GitHub Pages frontend and Firebase Authentication.
2. Add a **trusted submission service** (candidate: Firebase callable Cloud Functions / Admin SDK, using a separate test Firebase project first).
3. Server accepts only a verified auth UID and validated input, with payload size and rate limits, server-side timestamp, idempotency key and atomic better-score-only update.
4. Make `leaderboard/<board>/<uid>` **client read-only** using tested Realtime Database rules; trusted Admin SDK alone writes competitive results. Preserve public leaderboard reads and moderator permissions as required. **Never deploy the new rules before the new submission service is working**, or submissions will break.
5. Add verified status / separate storage for legacy entries; do not silently rebrand old scores as verified.

### Sudoku verification
- Server creates and persists a challenge ID, difficulty, fixed puzzle (and solution privately), UID, expiry/start time, and usage status.
- Client plays the issued puzzle. Server checks exact completed grid against fixed solution, validates no hint use via server-controlled hint policy, session ownership and minimum server-observed duration before atomically writing a better score.
- **Limitation:** A modified client may solve a challenge using automation. A server-issued challenge alone cannot prove human play or hint-free play. Decide whether leaderboard is 'server-validated solution and time' rather than 'human verified'. For more robust claims, require server-tracked actions/hints and anti-automation mitigations, with their associated cost.

### 2048 verification
- A score alone cannot be verified. Use server-issued game session with controlled initial state and deterministic/persisted random tile sequence, plus authenticated move transcript.
- Trusted service replays each move and spawn, checks board transitions and merge points, validates score, checks game completion/end state, detects replay and enforces limits, and atomically updates only improved scores.
- **Limitation:** A programmable client can generate a valid move sequence without human gameplay; replay validation establishes mathematical consistency, not human participation. Stronger resistance requires authoritative server-mediated turns, throttling, abuse monitoring and possibly more friction/cost.

### Schema sketch (not implemented)
- `gameSessions/{sessionId}`: UID, game, difficulty, createdAt, expiresAt, state/seed (protected), consumedAt, anti-replay metadata.
- `leaderboard/{board}/{uid}`: existing display fields plus trusted metadata such as `verifiedVersion` if migration approved.
- Optionally `leaderboardLegacy` / `leaderboardVerified` instead of mixing old/new scores; decide before implementation.
- Store minimal information, expire sessions and avoid exposing secrets or other visitors' personal details.

## Lower-cost interim option (NOT anti-cheat)
If approved, first tighten RTDB rules in a test project: allow only one's UID, exact schema, board-specific plausible integer ranges, prevent deletes and score worsening, require name match, timestamps, and rate-limiting where expressible. This reduces accidental/malformed abuse **but does not stop fabricated scores**.

## Critical migration and rollback sequencing
1. Create separate Firebase test project/emulator; copy **synthetic** test fixtures, never real visitor records.
2. Implement service and negative tests against emulator. Keep prod rules unchanged.
3. Integrate client in branch; test visitor and admin flows, offline errors, repeat submissions, legitimate solves, game over, and tie behaviour.
4. Review billing and security before any paid-service activation; obtain owner approval.
5. Plan backup, reversible rules and deployment sequence; owner approves production cutover.
6. Switch frontend to service, verify it, then remove direct client leaderboard writes in rules in a coordinated release. Prevent any unintended write window.
7. Rollback: restore prior web commit and rules from recorded versions if owner approves; never delete scores during rollback.

## Acceptance / regression tests required
- Anonymous/authenticated user cannot write another UID's score.
- Direct client attempt to write score is denied after cutover.
- Forged numeric score and altered move transcript rejected by trusted validator.
- Valid Sudoku issued puzzle + exact solution accepted at most once; unsolved and expired puzzle rejected.
- Valid 2048 replay yields deterministic, checked score; invalid moves, spawns, merges and duplicate sessions rejected.
- Worse score cannot replace better, even under concurrent submissions.
- No server endpoint trusts display name or `uid` passed by client.
- Existing leaderboards, archive, chat and admin screens still function.
- Clear error handling when validation service unavailable.
- Cross-browser smoke tests and cost monitoring; no tests claimed as executed yet.

## Cost and decision
Firebase callable functions generally require Blaze pay-as-you-go; published no-cost allowances are available, but billing must be considered, particularly database reads/writes, networking, storage and abuse. Never activate billing without approval. Official references: https://firebase.google.com/docs/database/security , https://firebase.google.com/docs/app-check/cloud-functions , https://firebase.google.com/pricing .

**Approval needed before implementation:** (a) allow paid-enabled Firebase Cloud Functions vs a separately funded backend; (b) legacy score policy; (c) required anti-cheat assurance level (mathematically validated gameplay vs strong server-authoritative play). No production rules, subscriptions or data migration may be changed without separate approval.
