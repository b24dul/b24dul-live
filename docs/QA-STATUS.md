# B24DUL Live — Phase 5 QA Register

**Opened:** 2026-11-17  
**Repository/branch:** `b24dul/b24dul-live` / `main`  
**Status:** Static source checks passed; live/browser acceptance **not yet established**.

## Verified from current GitHub source

- `index.html` references `styles.css`, and the stylesheet exists in the repo.
- Four SVG assets are referenced in page markup and exist in `assets/`: `b24dul-live-logo.svg`, `hud-sudoku.svg`, `hud-2048.svg`, `hud-videos.svg`.
- All **112 HTML IDs** are unique; Home, Watch, Games, Videos and Chat button destinations are present.
- Anton, Barlow Condensed, Bebas Neue and Cutive Mono are requested from Google Fonts in the current HTML.
- Existing JavaScript still contains Firebase anonymous authentication and Google administrator authentication, chat submission, Sudoku/2048 elements, privacy UI and `settings/liveDetection` subscriptions.
- The livestream module still checks detection freshness via `LIVE_FRESH_MS`; opening Watch remains permitted independently of a confirmed live signal.
- The current stylesheet includes offline/live state selectors, visible-focus/reduced-motion styles and explicit `[hidden]` treatment for the stream-start notice.
- **Important:** These are static source inspections, not executed browser tests.

## External accessibility blocker

Attempts to fetch the published GitHub Pages HTML, external `styles.css`, SVG logo and the owner-supplied `b24dul.live` domain through the available web preview failed with access-disabled/inaccessible responses. An independent command-line attempt could not resolve those hostnames in this environment. **Do not interpret these access limitations as an actual site outage or a successful deployment.** No published page/browser screenshot was obtained.

A local Chromium binary exists, but a proper in-browser integration run still requires a complete, runnable copy of the published or repository application and reachable Firebase/YouTube services.

## Acceptance cases still to execute

| Test | Target | Status |
|---|---|---|
| Page load | GitHub Pages / b24dul.live, stylesheet, image assets and fonts | UNVERIFIED |
| Responsive | 320, 375, 768, 1280 px; orientation changes | UNVERIFIED |
| Visitor navigation | Home, Watch, Games, Videos, Chat; desktop/mobile | UNVERIFIED |
| Livestream | confirmed live, offline, stale/failed detector, manual Watch fallback | UNVERIFIED |
| Chat | anonymous visitor gate, send/receive, moderation, chat disabled | UNVERIFIED |
| Games | Sudoku mouse/touch/keyboard and 2048 controls + leaderboards | UNVERIFIED |
| Videos | data load, thumbnails, play/pause/navigation fallback | UNVERIFIED |
| Administration | admin login, DOM relocation, controls, stats, moderation | UNVERIFIED |
| Privacy | deletion request dialog and administration queue | UNVERIFIED |
| Accessibility | focus/keyboard, contrast, zoom, reduced motion, hidden states | UNVERIFIED |

## Priority follow-ups

1. Establish a browser-accessible site or local working-copy smoke-test environment.
2. Confirm new CSS/asset loading and compare against the two owner-uploaded reference sheets.
3. Fix actual visual/functional regressions in focused commits; update this file with reproducible PASS/FAIL evidence.
4. Consolidate remaining duplicated CSS declarations (there are many historical hard-coded colours) once acceptance tests run. Do not rewrite app logic to simplify styling.

**No fake counters or donation/star/hype data:** Sample component CSS exists, but these metrics remain intentionally unrendered until there is a real data source.
