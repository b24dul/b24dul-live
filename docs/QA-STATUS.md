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

## Phase 5B implementation note (2026-11-17)

**Source verification after the large-layout pass:** `index.html` retains 112 unique original IDs. The only new JS binds two hero buttons through existing `navigateVisitor()` (destinations `watch` and `chat`). Existing `ytFrame`, Firebase monitor subscription, other feature IDs and four SVG asset references remain. Added `hud-feed-heading`, `hud-hero-actions`, `hud-chat-signal`, `hud-chat-channel` are present in both HTML/CSS. The CSS brace/comment structure is balanced; responsive rules for 1180, 900, 760 and 390 px and admin isolation selectors are present. This is static evidence, **not** rendered/browser testing.

**New visual acceptance points (UNVERIFIED):** Desktop 2-column framed command deck with main broadcast display and right-hand chat rail; radar art visibility and hero button legibility; joined 3-card destination strip; mobile one-column layout with chat tab/section hiding; game-only two-card layout; admin dashboard unaffected by visitor-only layout; Watch stream player unobstructed and YouTube frame interactive; hero WATCH STREAM/OPEN COMMUNITY CHAT buttons navigate correctly.

**Implementation commits:** [`61a7b81a`](https://github.com/b24dul/b24dul-live/commit/61a7b81a5a878161df20860289909268c7ee5bd2), [`84d3f166`](https://github.com/b24dul/b24dul-live/commit/84d3f1662747373872ee5b400f64a9eb0a1201c4). Roadmap updated.


## Owner acceptance feedback — 2026-11-17

After the Phase 5B redesign, the owner reported: **"It works I tested it."** This is a positive live-site user report for the new layout and operation, but it lacks individual device/workflow test details. Do **not** convert any of the specific UNVERIFIED test rows into PASS without a matching observation. Next planned work: Phase 6 site-wide polish, starting with the Watch Stream view. See `docs/PROJECT-ROADMAP.md` section 10.10.

## Phase 6A — Watch Stream acceptance cases (2026-11-17)

**Implementation:** [`a29bdbe8`](https://github.com/b24dul/b24dul-live/commit/a29bdbe8b53b071d9dce58078c1e657a9933e84b) and [`4db99a60`](https://github.com/b24dul/b24dul-live/commit/4db99a6080a1709cf051030d9f33c05c5c2b1cf0).

**Static PASS:** All 112 original IDs preserved/unique; original `ytFrame` remains; Watch-specific display and CSS rules exist; watch signal label derives from existing verified `streamLive`/`liveDetectionReady`; Watch Chat action reuses `navigateVisitor()`; CSS brace/comment structure balanced. No backend modifications.

**Browser UNVERIFIED:** YouTube iframe loads when Watch is opened offline, when detection is pending, and when live is confirmed; live label properly changes; fullscreen and player controls respond; desktop player and chat remain side-by-side; Watch→Chat works on mobile; switching back to Watch keeps the player usable; external YouTube link opens; admin workspace, games, videos and visitor gate remain unaffected; 320/375/768/1280px layouts have no overflow or clipped buttons.

The owner's earlier "It works I tested it" confirmation applied to Phase 5B, **before** the Phase 6A changes.

## Owner-reported Phase 6A regression and rollback — 2026-11-17

**FAIL — owner report:** Phase 6A Watch mobile UI had overlapping components and the video disappeared when trying to keep it on screen. **Owner rejected Phase 6A and requested full reversal.** Prior Phase 6A acceptance rows are historical only; the feature is cancelled, not pending approval.

**Rollback source PASS:** HTML reverted via `d677470c` to Phase 5B and CSS via `03e58860` to Phase 5B; Phase 6A-specific markup/status/CSS removed. Exact pre-6A file equivalence was confirmed before applying Phase 6B. Browser Watch/mobile playback **requires user re-test**; absence of 6A code alone does not prove root cause resolved.

**Phase 6B source PASS:** Games-only arcade heading and scoped Sudoku/2048 layout styles added via `1cd4ad82` and `46e67c0c`. Current HTML differs from approved Phase 5B only by the new 6B arcade heading. Current CSS differs from Phase 5B only by appended 6B arcade rules. Inline JS byte-identical, original 112 IDs unchanged/unique, CSS brace/comment balance passes. No player modifications.

**Phase 6B browser UNVERIFIED:** Desktop and mobile Games selection, both game openings and Back actions, Sudoku difficulty/pad/touch/keyboard, 2048 swipe/keys and leaderboard, narrow-screen overflow/overlap, and Watch mobile playback after rollback. Seek actual browser/user feedback before recording PASS.
