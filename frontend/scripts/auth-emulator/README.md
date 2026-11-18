# Disposable Firebase Auth emulator tests

These tests use only the fixed demo project `demo-b24dul-auth`, localhost Auth emulator port 9099, synthetic Google credentials and in-memory identity state. They do not configure or contact the production Firebase project. Never add production credentials, rules, account data or real tokens here.

From `frontend`, using Node 22 and Firebase CLI 15.36.0:

```sh
npx --yes firebase-tools@15.36.0 emulators:exec --project demo-b24dul-auth --config scripts/auth-emulator/firebase.json --only auth 'node --experimental-strip-types --test scripts/auth-emulator/identity.emulator.test.ts'
```

The helper is for emulator tests only; it is not a production adapter. Browser persistence, multi-tab races, the recovery experience and matching deployed database rules remain unverified. A linked credential collision is surfaced to the caller, and this fixture never switches identities or migrates data to resolve it.

Browser continuity tests run a loopback-only Vite fixture with the exact legacy Firebase SDK 10.12.2 and the newer SDK. They use the same synthetic demo API key and app name, never production configuration. Install Playwright Chromium, Firefox and WebKit, then run the emulator command above with the command in quotes replaced by `node node_modules/@playwright/test/cli.js test --config scripts/auth-emulator/playwright.config.ts`. The pinned legacy SDK is a test-only dependency and must not be shipped to the production application.

These tests verify synthetic emulator sessions in Chromium, Firefox and WebKit when those engines can run. They do not prove that existing production browser sessions or real Google accounts will migrate, and do not authorize a release.
