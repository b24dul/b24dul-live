# B24DUL Live — Project Record & Redesign Roadmap

**Project:** B24DUL Live  
**Repository:** https://github.com/b24dul/b24dul-live  
**Public website:** https://b24dul.github.io/b24dul-live/  
**Branch:** `main`  
**Last reviewed:** 2026-11-17  
**Document role:** Living source of truth for project status, decisions, architecture, future plans, and handoffs between chats.

> **WORKING RULE FOR FUTURE ASSISTANTS:** Read this document and inspect current repository code before making changes. Update this document in the **same task/commit sequence** whenever an architectural or design decision is accepted, work is completed, a defect is discovered, or priorities change. Distinguish plans from implemented features. Never mark a feature complete without verification.

## 1. Project purpose

B24DUL Live is an independent gaming/creator livestream website. It provides an embedded YouTube live experience, visitor/community chat, past videos, interactive games (including a 2048 game), and site navigation. The goal is to develop a distinctive high-quality site without losing the working features or creating unnecessary paid infrastructure.

## 2. Existing architecture (verified from repo and live-test reports)

- **Frontend:** GitHub Pages static site; the main application is in root `index.html`, with supporting `videos.json` and other files. The site currently uses vanilla HTML, CSS and JavaScript. **Do not assume React/Tailwind or migrate frameworks without approval.**
- **YouTube:** Channel ID `UCnXAfqk5I7QE3frLhHHyImQ`. Visitors must be able to try the stream player regardless of whether live detection is delayed or unavailable.
- **Firebase:** Realtime Database for livestream state and site features. Database host: `b24duls-anonymous-chat-default-rtdb.europe-west1.firebasedatabase.app`. Client Firebase integrations, chat and any current privacy/admin features must be preserved.
- **Automatic livestream monitoring:** Independent Cloudflare Worker `b24dul-live-monitor` in `stream-worker/`, configured for a one-minute Cron Trigger. Health: https://b24dul-live-monitor.b24dul.workers.dev/api/health . Read-only status: https://b24dul-live-monitor.b24dul.workers.dev/api/status . Read-only YouTube diagnosis: https://b24dul-live-monitor.b24dul.workers.dev/api/probe .
- **Status schema:** `settings/liveDetection = { live, videoId, checkedAt }`; legacy boolean `settings/live` is also synchronised by the Worker. Avoid displaying an old live state as a current fact when its timestamp is stale.
- **Worker deployment:** `.github/workflows/deploy-stream-worker.yml`, using GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `FIREBASE_SERVICE_ACCOUNT_JSON`. Never expose secret values or check them into source control.
- **Previous GitHub YouTube polling:** `.github/workflows/auto-live.yml` is **manual fallback only**; its automatic schedule and push triggers were removed on 2026-11-17, commit `70a8ba64697861c6832056638a8cb36f73e86d1a`. The old helper script was not removed.
- **Other separate project:** `b24dul/Fluke-CableTest` / Worker `fluke-cabletest` is independent. **Do not modify it** while redesigning B24DUL Live.

## 3. Verified achievements

- Cloudflare Worker successfully deployed and scheduled to run at one-minute intervals.
- Actual livestream **start** detected on YouTube, with video ID `1yVlKouJnag`; Firebase status API reported `live:true`, matching ID, `stale:false`.
- Actual livestream **end** detected after a safe offline confirmation process; Firebase status API reported `live:false`, empty video ID, `stale:false`.
- YouTube consent redirects handled; diagnostics helped resolve unusual YouTube page responses.
- Existing video player intentionally remains accessible when the detection signal is stale or unavailable.
- Old GitHub polling schedule retired after verifying Cloudflare online and offline transitions; manual fallback retained.
- **Not yet verified in this handoff:** complete device/browser QA, notification delivery under all conditions, any real-time follower/viewer numbers, new visual redesign, or detailed accessibility audit.

## 4. Approved redesign direction (design specification, NOT yet implemented)

**Brand concept:** Original high-contrast neo-noir creator/gaming UI, with a gritty open-world action aesthetic, sunset-neon personality, tactical game-menu framing, and broadcast HUD components. Make it recognisably **B24DUL Live**, not a replica of a commercial game.

**Legal and asset constraints:** No copyrighted game logos, official artwork, licensed game fonts/assets, or direct duplication of proprietary interface artwork. Prefer original CSS, self-created SVGs and properly licensed Google Fonts; audit any new imagery/asset licences before use.

**Theme tokens (initial design target; adjust after prototype/accessibility check):**
- Dark backgrounds: `#0B0C10`, `#12141C`.
- Surfaces: `rgba(20,24,34,.88)`; thin neutral borders; optional moderate backdrop blur.
- Primary active/action: `#2ECC71` and `#4ADE80`.
- LIVE/urgent: `#FF1E1E` — use only for confirmed current live/urgent states.
- Secondary character accents: magenta `#FF2A85`, orange `#FF6B35`, cyan `#00F0FF`. Use sparingly.
- Headers `#FFF`; secondary text `#A0A8B8`; accessible contrast required.

**Fonts (Google Fonts):** `Anton` for display branding; `Yellowtail` for selective “Live” script accent; `Barlow Condensed` for HUD/navigation/buttons and `Inter` for accessible content/chat. Load only needed weights and give sensible fallback fonts. Retain easy-to-read normal-case labels where appropriate.

**Visual language:**
- Header with original B24DUL/Live wordmark and compact state-aware ON AIR/OFFLINE indicator.
- Segmented uppercase navigation using **actual existing routes/sections**; do not add empty Store/Schedule tabs simply because a mockup lists them.
- Sharp-corner video monitor, restrained CSS viewfinder brackets, genuine status and activity ticker (no fake breaking-news messages).
- Original sunset/teal comic-panel treatment for non-live states and video thumbnails, where real/licensed imagery exists.
- Mission-briefing-style VOD/content/social cards: thin outlines, short motion and coloured left accents.
- Accessible square buttons, 150–200ms hover transitions, subtle noise overlay and controlled glow.
- Optional five-segment HUD bars for **actual** measurable milestones; no decorative fake stats.
- Notifications may borrow the style of in-game mission banners while keeping clear real-world wording.
- No invented viewer counts, follower totals, donation totals or synthetic activity. No permanent ON AIR indicator when offline.
- Respect `prefers-reduced-motion`, keyboard focus, text contrast, touch targets and low-end mobile performance.

**Responsive priority:** Mobile-first layout, with compact navigation and readable live player/chat. Do not force full desktop HUD into narrow screen widths.

## 5. Non-negotiable functional safeguards

1. Keep the current GitHub Pages URL working; no framework migration or unrelated backend rewrite.
2. Preserve and test YouTube embeds, direct player access even if detection is stale, video/VOD controls, chat, game(s), Firebase integration, navigation, privacy/admin UX, notification handling and existing working links.
3. Keep the separate Cloudflare scheduled Worker and Firebase status integration in place; any changes to those components require an explicit functional reason.
4. No fabricated live status or statistics; status must use fresh verified data.
5. Do not delete existing DOM IDs, event handlers, CSS classes relied upon by JS, or database paths without checking references.
6. Review changes on desktop and mobile, check console errors and all critical user journeys.
7. Make smaller testable commits, and update this roadmap as work progresses.
8. Do not modify Cable Tester or any other unrelated project.

## 6. Implementation roadmap

### Phase 0 — Inventory / baseline (IN PROGRESS)
- [x] Inspect `index.html` structure, key DOM IDs, navigation, Firebase/live detection listeners, embeds, video fallback, games, chat, privacy/admin and notifications (static source audit, not browser QA).
- [x] Produce a baseline list of visible sections and their interactions; note unverified behaviour below.
- [x] Retain actual Home / Watch stream / Games / Videos / Chat tabs and preserve mobile horizontal tab scrolling with 44px touch targets; assess on devices before final sign-off.
- [ ] Record baseline screenshots or equivalent visual reference **if useful and possible**.
- [x] Document initial accessibility and performance constraints (focus-visible, reduced motion, font loading, existing responsive CSS).

### Phase 1 — Core design system and brand (IN PROGRESS)
- [x] Add initial visitor-scoped HUD CSS tokens, Google Fonts and focus/hover conventions on review branch (not yet deployed).
- [x] Initial original wordmark, header/status and segmented nav restyling on review branch; existing link, button, and status IDs preserved. **Browser acceptance testing pending.**
- [ ] Adapted layout and touch sizing in CSS; still test narrow-screen layout, auth/nav and live/offline visual states in a browser.

### Phase 2 — Livestream experience
- [ ] Restyle real YouTube player into tactical video-frame layout.
- [ ] Keep direct stream view accessible when monitoring is stale.
- [ ] Redesign chat frame and stream-status UI while preserving Firebase event listeners.
- [ ] Confirm Cloudflare live/offline updates still reflect correctly in the redesigned interface.

### Phase 3 — Content and interactive sections
- [ ] Restyle existing VODs/past videos, social/community links and any other actual sections.
- [ ] Apply coherent styling to existing game(s), including 2048.
- [ ] Implement card/empty-state/offline layouts; do not create blank placeholder pages or fake stats.

### Phase 4 — Micro-interactions, QA and launch
- [ ] Refine hover, status, alert banners, subtle effects and reduced-motion behavior.
- [ ] Test desktop, mobile, keyboard accessibility, player, chat, game, navigation, authentication/privacy and notification behaviour.
- [ ] Test actual live-to-offline and offline-to-live UI transitions.
- [ ] Confirm successful GitHub Pages deployment; document fixes and final decisions.

## 7. Decision log

| Date | Decision | Reason / status |
| --- | --- | --- |
| 2026-11-17 | Cloudflare scheduled Worker is the primary automatic livestream detector. | Actual livestream start/end tests succeeded. |
| 2026-11-17 | Legacy GitHub `auto-live.yml` scheduled polling disabled, manual fallback kept. | Avoid two automatic writers and missed GitHub cron checks. |
| 2026-11-17 | Keep the player accessible even when status cannot be determined. | Avoid blocking viewers because of monitoring delays. |
| 2026-11-17 | Adopt original tactical neo-noir / neon-sunset redesign direction. | **Design brief approved in principle; not implemented.** |
| 2026-11-17 | Preserve static frontend/framework and existing functionality; redesign in stages. | Reduce regression and deployment risk. |
| 2026-11-17 | Use this document as the ongoing project memory, decision log and roadmap. | Reliable continuity across ChatGPT chats. |

## 8. Current priorities / open questions

1. Start with a **code-level audit** and map actual navigation before touching UI.
2. Decide exact active tab labels from existing site content; schedule/clips/store are optional *future* features and must not be represented as existing if absent.
3. Establish desktop and mobile HUD layouts within performance/contrast limits.
4. Viewer, follower and “hype” counters require real data sources or should be omitted.
5. Keep progress updates and known bugs inside this file; place links to relevant commits.

## 9. Handoff instructions

When a new chat begins, the assistant should:
1. Open this file at `docs/PROJECT-ROADMAP.md` from the connected GitHub repo `b24dul/b24dul-live`, then inspect the relevant current source code.
2. Summarize current status and pick the next uncompleted roadmap item.
3. Work directly in the correct repo when authorized, using small commits and reporting commit links.
4. Do not alter unrelated repos, require secrets in chat, invent metrics, or rebuild working features unnecessarily.
5. Update this document after significant changes, documenting `Done / In progress / Next / New decisions / Known issues`.

## 10.1 Phase 0 static audit and Phase 1 review implementation (2026-11-17)

**Baseline source:** `main/index.html` was approximately 151 KB / 2,910 lines; a single inline stylesheet and a single Firebase-backed ES module script. Do not split those before establishing browser coverage.

**Existing visitor tabs:** `home`, `watch`, `games`, `videos`, `chat` all use `data-visitor-view` and `navigateVisitor()`. `watch` permits opening the YouTube channel player whether the detection signal is delayed or offline. `games` is a chooser for Sudoku / 2048, `videos` loads `videos.json` with an uploads playlist fallback, and mobile `chat` switches to a dedicated view while desktop chat remains in a sidebar.

**Must preserve:** `liveBadge`, `visitorNav`, `visitorNavStatus`, `playerFrame`, `ytFrame`, `offline`, `tryLivePlayer`, all `of*` chooser/game containers, `vid*` video elements, Sudoku `sd*`, 2048 `g2*`, `sendForm`, `messages`, `gateForm`, `privacyDialog`, `adminWorkspace` and administration-related IDs. The script relocates management/chat/player DOM into the administrator layout. Firebase paths include `settings/liveDetection`, chat, viewer and moderation/leaderboard data; do not alter them for visual work. Livestream freshness logic uses `LIVE_FRESH_MS = 12 * 60 * 1000`, with periodic rechecks. Both Sudoku and 2048 have keyboard/touch functionality, whose runtime regression tests remain pending.

**Other architecture:** `videos.json`; `stream-worker/` scheduled monitor; `.github/workflows/videos.yml` for video updates; `auto-live.yml` manual fallback; privacy documentation and rules fragment. No changes to monitor, scripts, workflows or Firebase rules in the redesign's first commit.

**Risks/unknowns:** No automated visitor UI browser test suite currently present. Responsive rules are layered and duplicated; must test 320px, 375px, 768px and desktop widths. Admin DOM relocation may interact with shared CSS. Need real anonymous-auth + chat/send/ban, account gate, privacy flow and games smoke tests; live/offline UI transitions require controlled testing. The text of visitor-gate privacy disclosures should be reviewed for consistency with actual collection separately from visual design. Font CDN may be unavailable: local fallbacks are supplied.

**First review commit:** [`1febb384`](https://github.com/b24dul/b24dul-live/commit/1febb3843e9388f993b70b851b03b905d7c2f1fd) on branch `design/neo-noir-phase-1`. Adds original Anton/Yellowtail header wordmark, Inter/Barlow type stack, scoped neo-noir palette, live/offline styles and segmented scrolling responsive navigation. Changes only `index.html`; no script handlers, Firebase paths, embeds or existing IDs removed. This is **a source-level preservation check, not a verified working browser build or deployed change**.

**Done:** roadmap read, code inventory, navigation model, first isolated visitor theme/nav styling commit.  
**In progress:** review-branch testing and refinement, accessibility and mobile checks.  
**Next:** compare CSS at responsive widths, test Firebase/YouTube admin transitions and key keyboard/touch flows in-browser, then submit review PR; merge only after verification.  
**New decisions:** horizontal scrollable mobile nav rather than an unnecessary hamburger menu; preserve five real tabs and visitor-only palette overrides to limit administrator regressions.  
**Known issues:** no confirmed new regression; live runtime/browser testing is outstanding.

## 10. Progress snapshots

**2026-11-17:** Cloudflare livestream start/end detection verified. Old scheduled GitHub detector disabled; manual fallback retained. Major UI overhaul agreed conceptually. **Next step: inspect frontend and begin Phase 0 inventory.**
