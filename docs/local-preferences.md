# B24DUL M1 Phase 5 — Local preferences

**Scope:** isolated React/Vite preview only. Does not read or write production Firebase, cloud account settings, authentication tokens, game saves or the legacy site.

## Versioned storage contract

Key: `b24dul.preferences.v1`.

A valid stored object must contain:

| Field | Allowed values | Default |
| --- | --- | --- |
| `version` | `1` | `1` |
| `accent` | `violet`, `cyan` | `violet` |
| `density` | `comfortable`, `compact` | `comfortable` |
| `motion` | `system`, `reduce` | `system` |
| `homeLayout` | `standard`, `games-first` | `standard` |
| `sidebarCollapsed` | `true`, `false` | `false` |

The schema is validated on read. Malformed JSON, missing/wrong fields or unknown schema versions recover to safe defaults. A corrupted new-schema value is cleared when possible; it is never overridden by a stale legacy preference. When the new key is absent, `b24dul.sidebar.collapsed.v1` is migrated if it contains the exact string `true` or `false`; the old key is deleted after successful migration. If browser storage is unavailable, controls still work for the current session and no success claim about persistence is made.

## Working interface

- The Settings route contains keyboard-accessible native radio groups with explicit option descriptions.
- Accent changes CSS variables and button hover colours within the app shell.
- Density adjusts page and tile spacing, retaining touch target accessibility.
- Motion uses native device `prefers-reduced-motion` as baseline; selecting Reduce motion always suppresses shell animation, CSS transitions and loading shimmer. No forced animation option overrides operating-system preferences.
- Homepage layout changes visual order only between the Discover and Featured Games editorial groups; no sections are removed or hidden.
- Sidebar expanded/collapsed preference is reflected immediately in both sidebar and Settings, and persists across refresh.
- Reset restores defaults and presents a manually dismissible status toast.
- The accessible dark theme is the only fully delivered theme. No misleading light-mode control.

## Test boundaries

Unit tests cover valid and invalid schema, corrupted JSON, legacy migration, precedence, state updates/reset and simulated blocked storage. Browser tests cover live UI changes, reload persistence, keyboard controls, reset, corrupted storage recovery, 320px–768px layout and homepage order.

Phase 6 still owns the comprehensive accessibility and performance review; Phase 7 still requires explicit approval before replacing production Pages HTML.
