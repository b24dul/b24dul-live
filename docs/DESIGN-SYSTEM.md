# B24DUL Live — Coastal After Dark Design System

**Version:** 2.0 (2026-11-17)  
**Status:** Implemented as a CSS colour-system refactor on `main`; visual/browser acceptance QA pending.  
**Inspiration:** Original reinterpretation of the sun-drenched coastal atmosphere of GTA VI and the pink sunset/nightlife aesthetic of GTA: Vice City. Do not copy or use Rockstar artwork, logos, typefaces, named locations, fictional brands, or identifiable proprietary layouts.

## Core palette (source of truth)

| Role | Variable | Value | Usage |
|---|---|---|---|
| Midnight plum | `--color-night` | `#17131E` | Background / dark foreground on coral buttons |
| Main surface | `--color-panel` | `#211B2A` | App panels |
| Raised surface | `--color-raised` | `#282032` | Cards and controls |
| Divider | `--color-stroke` | `#493E51` | Subtle borders, separators |
| Main text | `--color-text` | `#FFF4EA` | Primary body and headings |
| Muted text | `--color-muted` | `#C7B9C9` | Secondary content |
| Brand coral | `--color-coral` | `#F28B74` | Active navigation, buttons, card accents |
| Coral hover | `--color-coral-hover` | `#FFC0A0` | Hover and subtle bright headings |
| Neon rose | `--color-rose` | `#FF78A8` | 'Live' script wordmark, occasional sunset art only |
| Ocean teal | `--color-teal` | `#64BBC0` | Focus indicators / restrained monitor guides |
| Status live | `--color-live` | `#FF4A55` | Confirmed broadcast outline, urgent iconography |
| Live button fill | `--color-live-fill` | `#AE293F` | Urgent controls with legible light text |
| Status success | `--color-success` | `#66C7A0` | Actual verified success/connection only |

The old `--bg`, `--panel`, `--panel-2`, `--line`, `--text`, `--muted`, `--plate`, `--plate-text`, `--live`, `--ok` variables remain as compatibility aliases. Legacy `--hud-*` names also remain mapped to this palette to protect existing selectors while we continue CSS consolidation.

## Hierarchy and composition

1. **Neutrals dominate:** Midnight plum base, raised violet panels, warm ivory type, muted lavender-gray supporting copy.
2. **One brand accent per component:** Coral is the normal active/CTA colour; do not assign different competing accents to Sudoku, 2048, and videos.
3. **Rose is atmospheric, not a second button colour:** Reserve it for the scripted Live wordmark and selective sunset decoration.
4. **Teal is technical:** Keyboard focus rings and restrained frame bracket guides, not large blocks of electric cyan.
5. **Semantic colours are literal:** Red only for fresh confirmed LIVE and destructive actions; mint only for success and verified connected/active statuses. Uncertain/old livestream state must not be red.
6. **Artwork is original:** The hero continues using CSS sun/horizon/grid illustration, but its scenery uses a limited plum → dusty mauve → coral/peach range. No downloaded proprietary game visuals or font files.
7. **Typography remains:** Anton (display), Yellowtail (script), Barlow Condensed (UI), Inter (content); preserve accessible fallbacks.
8. **Preserve actual functionality:** YouTube playback/direct player fallback, Firebase chat/auth, admin workspace, games and keyboard/touch, videos and privacy flows.

## CSS maintenance instructions

- The canonical colour tokens are defined near the top of `index.html` inside the first `:root` block.
- Prefer new component styling referencing `--color-*` variables rather than adding more near-duplicate raw hex shades.
- Refactor old compatibility aliases only after reviewing selectors and maintaining runtime QA.
- Background gradients may use related tonal stops; avoid gradients containing unrelated neon accent colours.
- For new components: default card = raised surface, stroke border, ivory text and **at most one coral accent**.
- Keep focus visible using teal and do not obstruct iframe pointer input.
- Check contrast and render in real browsers at 320, 375, 768 and 1280 px before considering this release fully verified.

## Implementation record

- [`959e6ae9`](https://github.com/b24dul/b24dul-live/commit/959e6ae9d19c59e8c36bb9a7c7125d13bad8f34b): CSS palette consolidation and replacement of prior saturated blues, greens, yellow, magenta and bright cyan across visitor/admin styling, hero, cards and game UI.
- [`164ce439`](https://github.com/b24dul/b24dul-live/commit/164ce439fa9fd197e108de9ad686bc25be23d03d): CTA border and live alert fill refinement.
- **Static checks:** Full inline application module preserved unchanged; same 112 HTML IDs in the same order. Visual/functional browser checks **not performed**.
- **Known limitation:** The single-file CSS includes existing historical overrides. Token migration reduces colour conflict, but future dedicated CSS cleanup is desirable after browser QA.

## Next acceptance tasks

- Check offline hero/background and text readability in Safari/Chrome/Firefox/mobile; confirm no unexpected CSS fallbacks.
- Confirm Home, Watch, Games, Videos, Chat; verify live/offline, stale player fallback, anonymous chat + gate, moderator controls, Sudoku/2048 touch and keyboard, and privacy requests.
- Check administrator sign-in and dashboard separately: global tokens also update admin colours.
- Record issues and fixes in `docs/PROJECT-ROADMAP.md`.
