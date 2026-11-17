# B24DUL glassmorphism design system — M1 Phase 2

Status: **isolated React frontend prototype**. This document describes the new M1 design system, not the live root `index.html`/legacy tactical-HUD styles.

## Semantic tokens

All colours live in `frontend/src/styles/index.css`. Prefer CSS variables and semantic classes over one-off hex values.

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#080d20` | Deep navy page background |
| `--surface` | `#111a35` | Solid dark surface |
| `--glass` | `rgb(24 33 64 / 76%)` | Translucent panel background |
| `--glass-solid` | `#192344` | Opaque fallback when blur unavailable |
| `--border` | `rgb(183 196 255 / 19%)` | Glass edge |
| `--text` | `#f7f8ff` | Primary readable copy |
| `--muted` | `#b9c3db` | Secondary copy |
| `--accent` | `#a493ff` | Violet primary interactive accent |
| `--accent-contrast` | `#080d20` | Text on primary accent |
| `--cyan` | `#79e6ef` | Cyan focus accent |
| `--success` | `#8aefc3` | Success status |
| `--warning` | `#ffda91` | Pending status |
| `--danger` | `#ff9dab` | Error status |
| `--radius` | `1.25rem` | Panel radius |
| `--shadow` | `0 18px 60px rgb(0 0 0 / 25%)` | Glass elevation |
| `--spacing-section` | `clamp(2rem, 5vw, 4rem)` | Responsive section spacing |

Tailwind `@theme` exports `brand-violet`, `brand-cyan`, and `brand-navy` utilities. Adapt to design tokens in future phases rather than copying raw colours. Typography uses a system UI font stack, avoiding proprietary font distribution and external network fonts.

## Components

- `GlassPanel`: general panel, optional `as="section"|"article"`, forwards HTML attributes.
- `GlassCard`: semantic article variant, hover border transition.
- `PrimaryButton`, `SecondaryButton`: native buttons with focus outlines and disabled semantics. Native `type="button"` default prevents accidental form submission.
- `IconButton`: icon plus required accessible `label`.
- `PageHeader`, `SectionHeader`: correct heading levels and optional description.
- `StatusIndicator`: text plus decorative status dot; never rely on colour alone.
- `LoadingSkeleton`: labelled `role="status"` placeholder.
- `EmptyState`: text and optional action.
- `Modal`: labelled `role="dialog"`, focus handoff/restore, Escape, Tab containment, click-outside close, no external portal.
- `Toast`: polite live announcement and manual dismiss; no auto-dismiss timer.
- `GameCard`, `VideoCard`, `FeatureCard`: placeholder content cards with optional caller-supplied action; no fake live metrics.

Components export from `frontend/src/components/ui.tsx` and `frontend/src/components/content-cards.tsx`; import only what is needed. The demo exists at the isolated React preview, not the public GitHub Pages homepage.

## Interaction and accessibility rules

- Visible focus outline is cyan, at least 3px, on `:focus-visible`.
- Interactive targets have minimum 44px height; icon-only controls have mandatory text labels.
- Motion is subtle (180ms), and `prefers-reduced-motion` disables animations.
- Glass panels use solid opaque fallback, with blur only when `backdrop-filter` is supported.
- Alerts pair readable copy with their colour status; use sample labels where appropriate.
- The responsive preview targets narrow 320px and 390px mobile widths, 768px tablet, 1280px desktop; full WCAG 2.2 AA audit remains a later phase gate.
- Do not use client-side UI to imply privileged admin access or verified Firebase authentication.

## Phase boundaries / review gate

No Firebase SDK, game data writes, YouTube stream connection, routing expansion or production cutover in Phase 2. Verify `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check`, `npm run test:e2e` in GitHub Actions and record the actual run result in `PROJECT_STATUS.md`. Phase 3 will build the full responsive navigation and eleven requested routes.
