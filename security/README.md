# RTDB security verification — first high-risk migration gate

Source of truth: the owner's complete Firebase Realtime Database rules export, not the partial `firebase/privacy-requests.rules-fragment.json`. The owner-provided snapshot was inspected privately on 2026-11-17; SHA-256 of the exact UTF-8 input: `7a41637df7aa59d16de568da0b7b8614f5cbcb30f0726473f1de28a633a88fef`. **This hash does not establish that the uploaded rules match the currently deployed console version.**

## What exists

- `rtdb-security-audit.mjs`: conservative structural/static contract checker for existing read/write restrictions. It prints risks and fails if expected restrictions are missing.
- `rtdb-security-audit.test.mjs`: synthetic negative regression tests; automatically run by the read-only `rtdb-contract.yml` workflow.
- `rtdb-emulator.test.mjs`: **real Firebase emulator** tests using the supplied (private) rules snapshot, mocked unauthenticated, ordinary and email-verified administrator tokens, and isolated local fixture data. It also tests atomic chat posting/cooldown and demonstrates that a plausible-looking but unverified leaderboard score can satisfy the current rules.
- Additional cases exercise unverified and wrong-email administrator claims and the privacy-history creation, immutability and deletion boundaries. All nine tests passed against the private snapshot in [run 44224697746](https://github.com/b24dul/b24dul-live/actions/runs/44224697746); deployed-rule equivalence and sufficient coverage remain separate open questions.
- `firebase-emulator.json`: local database emulator on port 9000; no production endpoint.
- `rtdb-emulator-private.yml`: manually triggered CI suite requiring a repository secret. This intentionally fails without the private snapshot instead of giving a false green result.

## Run the real security emulator tests (without uploading rules to the repository)

In GitHub repository Settings → Secrets and variables → Actions, create an Actions secret named `B24DUL_RTDB_RULES_B64`, containing a **base64 encoding of the full rules JSON**. On Windows PowerShell, create the value locally with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\path\\to\\rules.json"))
```

Treat the value as private and avoid pasting it into issues, workflows or public commit history. It is an encoding of your rules, not encryption. Then manually run GitHub Actions → **M2 private RTDB emulator security verification** → Run workflow. The job reads the secret into a temporary runner file, checks the static contract, installs Firebase test dependencies, runs the RTDB emulator and unit tests, and removes its file. No command in the job deploys rules or contacts your production database.

For local operation with Node 22+, Java 21 and test packages installed, run `node security/rtdb-security-audit.mjs path/to/rules.json` first. Emulator permission tests require `RTDB_RULES_PATH` and a running local Firebase Database emulator using `security/firebase-emulator.json`. Do not use production Firebase credentials.

## Known security questions that require separate decisions

1. An owner can delete their `viewers/$uid` subtree using the parent write grant; Firebase validators do not constrain null/deletion. That may be intentional for partial privacy deletion; document the intended semantics before changing rules.
2. Leaderboard scores are submitted by the user, so range/monotonic checks alone do not attest actual gameplay. No trusted competitions/prizes until server-side validation is designed.
3. Administrator access uses one email plus `email_verified`, not an immutable custom claim; preserve compatibility for now, but migrate to a tested role strategy separately.
4. Existing chat posting depends on `viewers/$uid/realName` and an atomic `lastPost` timestamp; a no-real-name public browsing policy requires a carefully planned rules + client change.
5. Existing user data and auth identities must not be reset or recreated. All integration tests must use the `demo-` project only.

**Release decision:** `firebaseRules` remains false in `frontend/production-gates.json` until actual emulator permission tests pass *and* the supplied rules are verified to match deployed production rules. A green synthetic static test must never unlock this gate.

The [2048 replay prototype](2048-replay-prototype.md) is an offline calculation only. It is not connected to a leaderboard or a trusted server and does not establish score integrity or prevent automated play.
