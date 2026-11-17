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

## Owner-reported 2048 header-vs-board mismatch — Phase 6B.1 (2026-11-17)

**FAIL — owner observation:** "JOIN THE 2048 CHALLENGE / Merge tiles, beat your best and climb the leaderboard" heading/container is smaller than the 2048 board. Owner described repeated untidy container sizing elsewhere on site. Exact device width and screenshot not provided.

**Source analysis:** 2048 board shell had up-to-520px sizing while heading and content frame were constrained by the main content column next to the chat rail. Multiple prior responsive rules gave inconsistent board/title/container width. Identified as a likely cause, not empirically measured in browser.

**Repair:** Commits `3035d919` and `fbaa3e5b`; CSS establishes shared max-width/min-width rules, an aspect-square board shell, 440px bounded board, flex stacking at <=1350px, constrained controls, text wrapping and mobile rules restricted away from Watch. HTML and all JavaScript are unchanged; all 112 IDs preserved; CSS syntax checks passed.

**Browser status UNVERIFIED after fix:** 2048 header/board fit at 320,375,390,768,1280px; Sudoku board and controls; Home/Games/Videos text containers; narrow phones show no horizontal overflow; Watch still works as in prior owner-approved version. Owner visual confirmation required to mark PASS.

## Mobile screenshot regression — Home / Games / Videos (2026-11-17)

**FAIL — owner-confirmed with screenshots:** Earlier Phase 6B.1 fix did not solve the problem. iPhone screenshots show (1) sticky nav overlaid on headings; (2) outer MAIN DISPLAY border ending while Home hero/Games selection extends below it; (3) Games cards and Videos fallback/list panels with inconsistent nested widths and clipping. Screenshots are the real acceptance reference; do not mark the defect passed based on static CSS.

**Fix commit:** [`3edecd67`](https://github.com/b24dul/b24dul-live/commit/3edecd67b8de564b1ca9eadf7d1ca8e94a8fe644) adds a <=760px non-Watch/mobile content-shell layer, normalises width/box-sizing, allows offline frame to grow with content, aligns headings/card/video edges, scroll-offsets beneath sticky tabs, enforces hidden offline state, and keeps navigation horizontally scrollable. HTML/JS and Watch player unchanged.

**Static PASS:** CSS block balance/closed comments; 112 original HTML IDs unique; existing `ytFrame` present; Phase 6A absent; no new live-player iframe styles.

**Device/browser UNVERIFIED:** On the owner's same iPhone, check Home/Games/Videos headings visible below tabs and outer border encloses full content; cards and thumbnails have consistent insets and no horizontal overspill; board/game controls usable; and Watch still plays. Need user or browser capture before converting FAIL to PASS.

## Phase 6B.3 delivery/visibility investigation — 2026-11-17

**Owner FAIL:** Previous Phase 6B.2 patch yielded no visible improvement. Treat the screenshot issue as OPEN.

**Implementation:** `a789b692` visibly flattens non-Watch mobile content: removes the redundant MAIN DISPLAY bar and its offline border, keeps content height auto. `b9a34e89` changes the stylesheet URL to `styles.css?v=6b3-mobile-frame-20261117` to break mobile browser CSS caching after publishing.

**Source PASS:** 112 unique original IDs, CSS balance passed, JS unchanged, Watch iframe/Phase 6A still untouched.

**Deployment evidence:** One GitHub Pages Actions run for head `613f8d47` completed successfully at 09:03:29Z, but that run predates the new B.3 commit and cannot verify B.3 publishing. Published HTTP content is inaccessible from the current execution environment.

**User-visible test UNVERIFIED:** On iPhone in Home, Games, Videos, the `MAIN DISPLAY` strip must be ABSENT. If it remains, diagnose publication/caching before editing the CSS again. If absent, assess card containment, nav overlap and 2048 board. Do not call fixed without an actual observation.

## Phase 6B.4 — iOS Safari floating navigation (2026-11-17)

**Owner FAIL + screenshot:** On Videos, the horizontal Home / Watch Stream / Games / Videos navigation appears in the middle of the video card list, overlapping content. Previous mobile shell changes did not provide a satisfactory result.

**Applied code:** `f084c125` removes mobile sticky nav via final `position:static!important` selectors and resets scroll offsets. `07dca232` versions the stylesheet link to avoid cached CSS. All 112 IDs intact, original JS unchanged, CSS syntax checked.

**Browser UNVERIFIED:** After Pages publishes latest commit, verify the nav starts in normal flow under header and disappears naturally when scrolling into the Videos list; verify Home/Games and Chat navigation and Watch iframe continue to work. If still floating, capture exact URL served, loaded stylesheet URL, and viewport mechanics rather than layering further guesses.

## Emergency rollback after repeated mobile breakage — 2026-11-17

**OWNER FAIL:** After 6B.4 the owner reports "It's broken again now." The 6B arcade styling and all successive mobile patches (6B.1–6B.4) have not achieved stable user acceptance.

**Rollback source PASS:** `index.html` restored exactly to Phase 5B blob `35e4cae027b06e9939903ff9993562655823144a` via commit `48151782`; `styles.css` restored exactly to Phase 5B blob `d1da438471b90ef7a55336028e25ec7ccecd3268` via commit `26b56830`. Exact content comparison passed; 112 original IDs preserved. No functional script/backend edits.

**Browser UNVERIFIED:** GitHub Pages must publish the rollback. Have owner confirm site returned to previously working Phase 5B, especially mobile navigation and Watch. Do not call mobile defects solved; this is a rollback to a known owner-tested state.

**Process control:** No more blind CSS overrides on `main`; first set up browser viewport checks and make future changes on a reviewable branch/preview with screenshot comparison, then apply only tested fixes.

## Outer section-frame border — owner diagnosis (2026-11-17)

Owner identified the border surrounding the “CATCH UP / PAST VIDEOS & STREAMS” title/description as the apparent source of the layout issue (not the text itself). Current code shows title within `.visitor-content-head` and a mobile `main` border declaration. Commit `d7c501b0` removes that border only, with exact source round-trip equality for all other CSS; commit `1aeceab0` versions the stylesheet request for cache busting. **Device PASS is not claimed**; watch for border removal and any remaining height/overflow issue on owner iPhone. Do not resume broad CSS redesign without measured evidence.

## Owner rejection of 10.18 border change — 2026-11-17

**FAIL (owner confirmation):** After the surgical `main` border removal and versioned stylesheet, the user reports **"It not fixed"**. Do not represent commit `d7c501b0` as a successful solution. GitHub Actions reports a successful Pages deployment for head `f7bb14e2fbb7a38f5679c94b372d664fa5869b0a`; successful deployment does **not** prove a specific pixel rendered correctly.

**Next investigation must use rendered element geometry.** Current markup nests `.visitor-content-head` and `.hud-feed-heading` above `#playerFrame.offline`, with `#offline` and individual sections beneath; `main` has its own border in the desktop rules, and `#playerFrame.offline` also has a border. Removing only the mobile `main` border was inadequate. Need an actual Safari/Chromium DOM-bound measurement or screenshot with element outlines and computed styles to locate the frame/height mismatch before editing again.

**Action:** Live CSS frozen at current baseline pending measurement; no additional speculative styles applied in response to this failure.
