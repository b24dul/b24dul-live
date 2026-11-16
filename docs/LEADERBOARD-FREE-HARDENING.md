# Free leaderboard hardening — proposal only

**NOT DEPLOYED.** Adapted from the supplied Firebase Realtime Database rules, preserving all non-leaderboard paths.

## Improvements
- Users write only their own leaderboard record; bans still apply.
- No score deletion or unexpected keys; require valid nickname and server timestamp.
- Only better scores replace existing records (Sudoku lower, 2048 higher).
- Integer score formats: Sudoku 1–86400 seconds; 2048 multiples of four, 4–999996.
- Public leaderboard reads remain enabled.
- Existing frontend submission logic should remain compatible for ordinary games, subject to emulator verification.

## Limitations
A modified browser can still submit forged but plausible scores. Firebase database rules cannot prove human gameplay. This proposal provides data integrity and basic abuse reduction, **not anti-cheat verification**.

## Free emulator testing on the development branch
Requires Node.js and Java, installed locally. From the repository checkout run:

```powershell
npm install --no-save firebase @firebase/rules-unit-testing firebase-tools
npx firebase emulators:exec --config firebase.rules-test.json --project demo-b24dul-leaderboard-rules --only database "node --test tests/leaderboard-rules.test.mjs"
```

These commands use a synthetic `demo-` project and the local emulator only. Do **not** run `firebase deploy`. For troubleshooting see https://firebase.google.com/docs/rules/unit-tests .

## Before any production deployment
1. Pass emulator tests, including ordinary gameplay submission and negative cases.
2. Review any existing leaderboard rows with unusual names, fractional scores or unusually long Sudoku times for compatibility. Do not delete them.
3. Export current deployed rules and record rollback steps.
4. Obtain separate approval to deploy rules. Only change the leaderboard rules; preserve all other Firebase paths.
5. Verify live read/write behaviour and be prepared to restore previous rules.

## Verification status
- JSON parses and unrelated rule sections match supplied source: passed in preparation.
- Local Firebase emulator integration suite: **NOT RUN** in the current environment.
- Production rules, data, billing: **UNCHANGED**.
