# B24DUL architecture — initial Phase 0 draft

**Status:** proposed target architecture, NOT implemented. **Production remains:** one `index.html` inline Firebase/YouTube/game app, `styles.css`, static assets and `videos.json`, plus separate Cloudflare stream worker and GitHub workflow scripts. See [legacy-audit.md](legacy-audit.md).

## Binding future frontend
- React + TypeScript (strict), Vite base `/b24dul-live/`, Tailwind + semantic CSS tokens, shadcn/ui primitives where appropriate, Motion for React, Lucide React.
- React Router **HashRouter** on GitHub Pages. Eleven routes: `/`, `/explore`, `/watch`, `/videos`, `/games`, `/community`, `/tools`, `/competitions`, `/profile`, `/settings`, `/admin`.
- Future separations: `src/app` router/providers; `src/components` accessible reusable components; `src/features` per pillar; `src/services` Firebase, stream/video adapters; `src/hooks`, `contexts`, `types`, `data`, `utils`, `styles`.
- Visual foundation: deep navy/near-black and selective violet/cyan glassmorphism; desktop sidebar/header and mobile bottom navigation; reduced-motion and WCAG 2.2 AA targets; no fictional live/auth state.
- Foundation before backend migration: stub clearly labelled demo states in M1 and keep **production Firebase disconnected from the new prototype** until M2. Parse existing `videos.json` with a typed adapter without mutating it.
- Tests: Vitest, React Testing Library and Playwright; lint, typecheck, build, browser, responsive, keyboard and accessibility gates. No claims of test success before execution.
- Local settings use versioned key `b24dul.preferences.v1`; never store auth tokens in localStorage.
- Cost/free tier: GitHub Pages retained; Firebase Auth and Realtime Database retained; Cloudflare Workers only for trusted optional API work as already applicable. No paid provider migration.

## Data and trust boundaries
- Firebase Authentication identities and existing Realtime Database paths are immutable during M1. Existing data paths identified in [legacy-audit.md](legacy-audit.md). Full **deployed** rules unknown; verify/backup through Firebase Console before any M2 changes.
- Admin access requires real rules/server enforcement; client email checks or hidden UI alone are insufficient. Do not expose service credentials. Preserve anonymous users and audit safe future linking.
- Worker is isolated scheduled YouTube detector with read-only public API. Only trusted scheduled logic may write live status. Keep existing video feed automation and site archive independent.
- Competitive scores and XP must be trusted/validated in future milestones; never assume existing client-submitted leaderboard values are authoritative.
- Public browsing must not require real names or registration in the new experience; existing production gate is a documented migration concern, not a Phase 0 modification.

## Release boundary
Document and test the legacy production SHA before any migration. Work on non-destructive coherent increments. User specifically approved Phase 0 docs directly on `main`; that is not permission to deploy a new UI. Because GitHub Pages may publish changes on main automatically, **future implementation requires staging/previews or separate approval** before modifying published frontend files.

## Next
Phase 1 only after Phase 0 review: choose safe Vite scaffolding layout without deleting existing HTML/assets, establish preview strategy, install pinned dependencies, and run gates. Do not connect new UI to Firebase in Phase 1.
