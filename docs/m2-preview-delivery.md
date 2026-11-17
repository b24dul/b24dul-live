# M2 — Safe React Preview Delivery

## Current status
The React frontend has completed its design/navigation/test release-candidate stages, but it **does not have legacy feature parity**. Firebase Auth, chat, presence, admin, embedded player, games, leaderboards and privacy flows remain unconnected. **Do not replace the legacy root homepage.**

## Isolated preview build
The dedicated read-only workflow `.github/workflows/frontend-preview-package.yml` builds React with a separate Vite base of `/b24dul-live/preview/`, runs lint, TypeScript, Vitest and formatting, verifies compiled JS/CSS paths and uploads the `b24dul-react-preview-subpath` artifact. It deliberately has **no deployment permission, no Firebase credentials, no write-enabled workflow, no published preview URL and no `deploy-pages` call**.

## Hosting decision
A hosted test preview is independent of a production cutover. One safe option, **subject to verifying the current Pages publishing source and approving staging publication**, is a dedicated `/b24dul-live/preview/` folder on the existing Pages host. The new build's `preview/` folder must contain its own `index.html` and `assets/`, and the existing `/b24dul-live/index.html`, `styles.css`, `videos.json`, Firebase and Worker code must not be replaced. Another option is a dedicated staging hostname with a matching Vite base. A build artifact alone is **not** a deployed website.

Before publishing, confirm the selected hosting mechanism actually serves that path, that no GitHub Pages workflow auto-overwrites the staging files, that assets resolve, that the preview is labelled as such, and that its URLs do not become a production canonical replacement. The preview should not automatically connect to production Firebase or perform writes.

## Two independent acceptance gates
- **Preview gate:** compiled build + tests pass, staging URL loads, eleven routes, refresh, responsive navigation, local settings, live-status read-only error fallback, accessibility smoke test. This is enough to let the owner review the UI in a browser; disconnected areas must remain labelled.
- **Production cutover gate:** full M2 legacy feature parity + emulator security tests + real auth/identity continuity + chat/stream/games/admin/privacy tests + rollback plan + explicit owner approval. Passing the preview gate never satisfies this gate.

## Remaining implementation sequence
1. Confirm full owner-supplied deployed RTDB rules match the live version, then use nonproduction emulators to test role and UID boundaries.
2. Connect modular Firebase Auth for **Anonymous and Google only**, without replacing persisted anonymous UIDs.
3. Migrate minimally scoped RTDB reads, chat and presence lifecycle with security-rule tests, then moderation.
4. Reconnect the embedded player, Sudoku/2048, saves and scores and privacy/admin flows.
5. Run both desktop and physical-device parity tests and seek separate production cutover approval.

**No schedule or hosted preview URL is claimed until the preview build and hosting step have actually succeeded.**
