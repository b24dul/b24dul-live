# Disposable Firebase Auth emulator tests

These tests use only the fixed demo project `demo-b24dul-auth`, localhost Auth emulator port 9099, synthetic Google credentials and in-memory identity state. They do not configure or contact the production Firebase project. Never add production credentials, rules, account data or real tokens here.

From `frontend`, using Node 22 and Firebase CLI 15.36.0:

```sh
npx --yes firebase-tools@15.36.0 emulators:exec --project demo-b24dul-auth --config scripts/auth-emulator/firebase.json --only auth 'node --experimental-strip-types --test scripts/auth-emulator/identity.emulator.test.ts'
```

The helper is for emulator tests only; it is not a production adapter. The browser cases below exercise synthetic persistence and multi-tab continuity. Matching deployed database rules and production identity migration remain unverified. A linked credential collision is surfaced to the caller, and this fixture never switches identities or migrates data to resolve it.

Browser continuity tests run a loopback-only Vite fixture with the exact legacy Firebase SDK 10.12.2 and the newer SDK. They use the same synthetic demo API key and app name, never production configuration. Install Playwright Chromium, Firefox and WebKit, then run the emulator command above with the command in quotes replaced by `node node_modules/@playwright/test/cli.js test --config scripts/auth-emulator/playwright.config.ts`. The pinned legacy SDK is a test-only dependency and must not be shipped to the production application.

These tests verify synthetic emulator sessions in Chromium, Firefox and WebKit when those engines can run. They do not prove that existing production browser sessions or real Google accounts will migrate, and do not authorize a release.

`reactFixture.html` is a localhost-only page that uses the production sign-in code (`src/services/firebaseIdentity.ts` and the identity coordinator) against the emulator, with the same app name as the live site (`b24dul-v2`) and synthetic Google tokens in place of the popup. Its scenarios cover the fresh start (a legacy session on the same origin is ignored and left intact), guest-to-Google linking that keeps the UID, a cancelled sign-in, sign-out, and choosing a Google account that already exists (the browser signs in to that account; nothing is merged).

The emulator does not return the OAuth token that `GoogleAuthProvider.credentialFromError` reads from a collision error, so the fixture re-creates its synthetic credential for that step. The production popup path for that case is checked manually in a real browser.

The raw-SDK cases using `browserFixture.html` (including the pinned legacy SDK 10.12.2) describe Firebase SDK behaviour only. The new site deliberately does not reuse legacy sessions.
