# Synthetic RTDB emulator tests

This test-only fixture uses the fixed `demo-b24dul-rtdb` project and local Auth and Database emulators. Its simple rules are **synthetic**, not copied from or evidence about production. In particular, public status reads here are solely for test observation and must not be treated as an approved production policy. No production configuration, records, credentials or private rules belong in this directory.

From `frontend`, with Node 22, Java 21 and Firebase CLI 15.36.0:

```sh
npx --yes firebase-tools@15.36.0 emulators:exec --project demo-b24dul-rtdb --config scripts/rtdb-emulator/firebase.json --only auth,database 'node --experimental-strip-types --test --test-force-exit scripts/rtdb-emulator/presence.emulator.test.ts'
```

The tests cover synthetic UID isolation, atomic message/timestamp writes, spoof rejection, synthetic moderation bans/timeouts, and disconnect/reconnect. They also reproduce the legacy single-UID presence collision: when one of two connections goes away, the shared status can disappear. A per-connection prototype demonstrates one possible improvement, but it is **not compatible with current legacy readers or established production rules** and is not a production adapter. A migration needs verified deployed rules, reviewed privacy and admin access, legacy compatibility, multi-client testing and a rollback plan. `--test-force-exit` ends Node's test process after its tests and teardown because Firebase's database client can retain background timers; the test explicitly takes its clients offline and the CLI shuts down the emulators.
