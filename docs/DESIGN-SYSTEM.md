# B24DUL Live — Tactical HUD Design System

**Version:** 3.0 — 17 November 2026  
**Status:** Implemented on `main`; browser and deployment acceptance tests still required.  
**Primary visual references:** The owner's two uploaded B24DUL Live concept sheets showing original logo treatment, ON AIR badge, outlined and cash-green buttons, alert banner, live-chat switch, HUD cards and menu controls. Use these references whenever making future visual changes.

## Creative direction

High-contrast, gritty, original neo-noir open-world action / livestream broadcast interface. The design borrows general tactical game-menu principles but **does not** embed, trace, or reproduce commercial game logos, imagery, typefaces or proprietary layouts. Do not put the reference sheets themselves into the public site: rebuild individual concepts with licensed Google Fonts, CSS and original SVG/icons.

**Use the reference designs for:** heavy condensed white B24DUL block lettering, cyan-script Live accent, red confirmed ON AIR status, charcoal HUD backgrounds, white-bordered rectangular buttons, green inverted selected/hover controls, bold mono information, crisp separators, green chat labels, streamlined stream notifications, dark game and video cards.

**Do not invent:** live status, viewer counts, cash, hype levels, donation totals, ratings, wanted levels, store/clip/schedule pages, or user profiles not present in the application.

## Canonical colour tokens

The tokens live at the start of `styles.css`:

| Role | Token | Value |
|---|---|---|
| Obsidian | `--hud-black` | `#0B0C10` |
| Translucent card base | direct surface | `rgba(20,24,34,.88)` |
| Panel | `--hud-panel` | `#141822` |
| Elevated surface | `--hud-raised` | `#1E242F` |
| Text | `--hud-white` | `#F7F7F7` |
| Secondary text | `--hud-muted` | `#C8CDD7` |
| Interactive cash green | `--hud-green` | `#2ECC71` |
| Active/hover green | `--hud-green-hover` | `#55E99B` |
| Confirmed live / danger red | `--hud-red` | `#FF1E1E` |
| Very selective magenta | `--hud-pink` | `#FF2A85` |
| Script / focus cyan | `--hud-cyan` | `#00E8EE` |

**Hierarchy:** Black/charcoal and white dominate. Green is the single normal interaction accent. Red is reserved for live/danger. Cyan is mainly logo/focus. Magenta is optional, not a mandatory accent for every section. Legacy `--color-*`, `--plate`, `--panel` and similar variables are compatibility aliases for existing controls.

## Typography

- **Bebas Neue**: brand block text, navigation, section headings, CTA/buttons.
- **Cutive Mono**: real status/data labels; no invented counters.
- **Inter**: body/chat, input help and readable content.
- **Yellowtail**: the `Live` script wordmark, with its open-source Google Fonts license; deliberate exception to the requested three functional fonts.
- Use fallbacks, `display=swap`, and no downloaded proprietary fonts.

## Structural and technical choices

- `index.html` remains the single-page vanilla HTML/JavaScript application.
- Styles were **extracted from its inline style block into `styles.css`**. The historical Phase 1–3 cosmetic override blocks were removed, leaving the original functional component CSS and this new coherent tactical HUD layer.
- The reference-sheet treatment is applied to the header, status indicator, existing five nav destinations, stream player frame, offline community hero, video/game destinations, community chat, notifications and selected admin typography.
- No actual donation/store/map/schedule systems were built.
- Existing JavaScript module and 112 element IDs were preserved without modification in this first release.
- Stream detection still uses Firebase/Cloudflare freshness checks; visitors can still open the stream player when detection is stale/offline.
- Admin, privacy tools, chat, video browsing, Sudoku and 2048 remain existing functional subsystems; they require live regression QA before marking this redesign complete.

## Commits / progress

- [`b3a77263`](https://github.com/b24dul/b24dul-live/commit/b3a772638b03841a3b3989d74c7c5439227d1cf2): extracted stylesheet, replaced legacy palette with new HUD variables and core component design.
- [`a51e8856`](https://github.com/b24dul/b24dul-live/commit/a51e8856c017453b8feca32bbd9e0bc8a1294bb5): switched the live HTML to `styles.css`, replaced font loading and favicon, changed community hero copy; existing JavaScript/IDs preserved.
- [`8c10960f`](https://github.com/b24dul/b24dul-live/commit/8c10960fe52e78ef7e282f168e65a43e194b11bf): corrected offline hero positioning for decorative HUD labels.

## Acceptance plan — not yet completed

1. Confirm GitHub Pages serves `styles.css` with no 404/cache issue.
2. Check visual fit and horizontal scrolling at 320px, 375px, 768px, 1280px and wide desktop sizes.
3. Test Home, Watch, Games, Videos, Chat, stream notification, live/offline transition and detection-stale fallback.
4. Test anonymous visitor gate, message posting/listening, chat on/off, moderation and administrator controls.
5. Test Sudoku/2048 keyboard/touch, leaderboard view, privacy request flows, video playback and accessibility focus.
6. Check contrast, reduced-motion preferences, focus rings and console errors. Record pass/fail evidence in the roadmap.

## Historical decisions

The earlier `Coastal After Dark` plum/coral palette was implemented but superseded when the owner provided two explicit tactical HUD reference sheets. The former decisions and commits remain documented in `docs/PROJECT-ROADMAP.md`.
