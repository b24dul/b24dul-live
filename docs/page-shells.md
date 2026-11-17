# B24DUL — Phase 4 page shells and archive adapter

**Status:** M1 Phase 4 isolated React prototype, tested in CI. Not deployed as the public root website. Source of truth for full project progress is `PROJECT_STATUS.md`.

## Pages
- Home: welcome hero and navigation, unconnected streaming illustration, entertainment cards, existing Sudoku/2048 links, future games, community shell, real build-time videos, tools, upcoming-events fallback and footer. No made-up live/online/schedule status.
- Explore: all ten other route destinations and discovery cards.
- Watch: explicitly unavailable stream state and schedule/poll placeholders, current-site link.
- Videos: repository `videos.json` metadata, validated at build time and linked to YouTube.
- Games: preserved legacy Sudoku and 2048 on the current site; later games labelled Coming Soon.
- Community: chat/announcements/activity are marked disconnected, with existing-site link.
- Tools: category-grouped *planned* utilities; not clickable pseudo-tools.
- Competitions: daily challenges, boards, tournaments and XP, all labelled planned/unconnected; no fabricated rankings.
- Profile: not-authenticated guest concept and future registered profile presentation only.
- Settings: working Phase 3 sidebar preference explanation; full settings in Phase 5.
- Admin: restricted/placeholder presentation; no client-only claim of privileged access.

## Archive boundary
The source file is `/videos.json` at repository root (legacy production). The isolated Vite bundle imports it using `frontend/src/services/videoArchive.ts` and `resolveJsonModule`, parses `id/title/published`, rejects duplicate or invalid IDs/titles/dates, sorts and generates only safe `youtube.com/watch?v=<id>` links. The original file remains unchanged. **Build-time snapshot** means a scheduled `videos.json` update requires a new frontend build before this prototype reflects it. No runtime Firebase, Youtube API or invented data is used.

## Verification
[GitHub Actions run 44074648860](https://github.com/b24dul/b24dul-live/actions/runs/44074648860): npm ci, lint, strict TS, 16 Vitest tests, production build, Prettier and 10 Chromium browser checks all passed. Browser checks cover all eleven routes at 375, 430, 768, 1366 and 1920px widths, no horizontal overflow, no broken image assets, major homepage sections, archive YouTube link integrity, direct hash navigation, mobile and desktop controls. This is not a manual Safari audit, WCAG certification or production Firebase test.

## Next
Phase 5 versioned, resilient local preferences. No public replacement of GitHub Pages entrypoint or production API connection without explicit permission.
