# 2048 replay verification prototype

The current legacy leaderboard accepts client-reported scores; a plausible forged score can satisfy its existing rules. The isolated `replay2048` primitive deterministically reconstructs a game from an externally supplied seed and a bounded sequence of successful moves, calculates the score independently of the claimed value, and reports whether the last move reached a legacy submission checkpoint. It does not read or write any leaderboard and is not wired to the preview UI or production services.

## Required trust boundary

A replay calculation in a browser is **not** an authoritative result. Before using this primitive for trusted scores, a separately reviewed server must:

1. Verify the player's Firebase ID token itself and bind the challenge to that verified UID; never accept the UID or seed as authoritative from a client request.
2. Generate a server-controlled, unpredictable challenge ID and seed, record their version and expiration in trusted storage, and limit request size, move count and request rate.
3. Consume a challenge at most once using an atomic transaction and perform the verified score update with an appropriate atomic/idempotent design. Handle failures without allowing a replay or losing valid records.
4. Reject invalid, incomplete or mismatched replays, calculate scores only on the server, and prevent direct client writes to any new trusted leaderboard using reviewed server-side rules.
5. Test authorization, concurrent submissions, replay attempts, expiration, reconnects, resource limits, migration, backup and rollback against isolated services before any deployment.

The seeded pseudo-random generator provides reproducibility, not cryptographic secrecy or proof of human play. A player can automate valid moves, and knowing a challenge seed can help plan moves. This is not anti-bot, anti-cheat or fairness certification and must not be used for prizes or security decisions as-is.

Legacy games use client-side randomness and do not contain the required server-issued replay history. Existing saved games, user data and legacy leaderboard entries must remain untouched. A future trusted mode would require a separately designed, explicit migration or a distinct board; no historical score is verified by this prototype.
