# Legacy removal checklist

`/legacy/` (the old site, served unchanged from `main`) is removed only when **every item below
works on the new site and the owner confirms**. Scope decision (2026-11-18): the new site starts
fresh. Old accounts, UIDs, scores and saves are **not** carried over; people sign in again. All new
data lives under `/v2/` in the same Firebase project; legacy data is not read, changed or deleted by
the new site (cleanup is a separate, later task).

## Owner decisions (2026-11-18)

- **Public data is anonymous.** Chat, presence, leaderboards and anything other visitors can see
  show only a chosen nickname and UID-derived data. A Google display name, email or photo is never
  stored in the database or shown to others; the Account page shows them only to the signed-in
  person, from the local sign-in session. The `/v2/` rules enforce this.
- **Nicknames** have length limits, a profanity filter, and block impersonation of the admin /
  B24DUL.
- **Google sign-in always shows the account chooser** (`prompt: select_account`).
- **Order of work:** (a) privacy notice; (b) chat, chat protections, pinned message, presence and
  nicknames with the `/v2/` rules; (c) admin and moderation tools; (d) leaderboards with
  rules-enforced score checks; (e) finish stream, offline hub, Sudoku, 2048; (f) visitor
  statistics.

Status: ✅ works on the new site · 🟡 partly · ⬜ not started · ➖ decided not to carry over

Verified from the legacy source at `main` `ae07503` (`index.html`).

## Visitors

| #   | Feature (plain English)                                                                                                                                                                                                                | Status | Notes                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 1   | **Watch the stream** — embedded YouTube player; LIVE / offline / "checking" badge from automatic detection; falls back safely if detection is stale; "open the player anyway" button                                                   | 🟡     | New site shows verified live status; embedded player still to do         |
| 2   | **"Stream just started" notice** — banner with Watch / Dismiss when the stream goes live                                                                                                                                               | ⬜     |                                                                          |
| 3   | **Subscribe button** linking to the YouTube channel                                                                                                                                                                                    | ⬜     |                                                                          |
| 4   | **Video archive** — list of past videos, opening on YouTube                                                                                                                                                                            | ✅     | Reads `videos.json`; refreshed by `videos.yml`                           |
| 5   | **"What do you want to do?" hub** while offline — Sudoku, 2048, old videos                                                                                                                                                             | 🟡     | New home/explore pages cover this                                        |
| 6   | **Sudoku** — easy / medium / hard; notes mode; erase; undo; hints; mistake count; timer; keyboard and touch; help and tutorial; progress saved                                                                                         | 🟡     | Practice game exists; check feature-by-feature                           |
| 7   | **Sudoku leaderboards** — fastest time per difficulty                                                                                                                                                                                  | ⬜     | Needs `/v2/` rules with score validation                                 |
| 8   | **2048** — keyboard and swipe; score; personal best; game over / play again; new game; progress saved                                                                                                                                  | 🟡     | Practice game exists; best score is local only                           |
| 9   | **2048 leaderboard** — highest score                                                                                                                                                                                                   | ⬜     |                                                                          |
| 10  | **Sign in** — anonymous visitor identity; Google sign-in                                                                                                                                                                               | 🟡     | Slice 3: guest + Google on the new site                                  |
| 11  | **Live chat** — random anonymous nickname (e.g. SwiftOtter42); last 100 messages; 200-character limit                                                                                                                                  | 🟡     | Built (PR #33); live after the /v2/ rules deploy                         |
| 12  | **Chat protection** — 5-second slow mode enforced by the database; swear-word filter (shown as \*\*\*); personal-information filter (blocks asking for or sharing names, ages, locations, socials, phone numbers, emails); chat on/off | 🟡     | Built: rules enforce slow mode, filters, chat on/off                     |
| 13  | **Pinned announcement** above the chat                                                                                                                                                                                                 | 🟡     | Built (admin pins via rules; admin UI in step c)                         |
| 14  | **Online presence** (who is online; shown to the admin)                                                                                                                                                                                | 🟡     | Built: per-connection, visible only to the admin                         |
| 15  | **Entry gate asking for a real name** (only the admin sees it)                                                                                                                                                                         | ➖     | Owner confirmed 2026-11-18: not carried over                             |
| 16  | **Privacy request** — prepare an email asking for your visitor record to be deleted                                                                                                                                                    | 🟡     | Draft flow exists for legacy IDs; needs a `/v2/` equivalent              |
| 17  | **Privacy notice** — what is recorded and why                                                                                                                                                                                          | ✅     | `#/privacy`, linked from every page; update before each new data feature |
| 18  | **Visitor statistics** — visits, watch time, device type, where people came from, which game/videos they picked, Subscribe clicks; plus GoatCounter page counts                                                                        | ⬜     | Decide what to keep for v2                                               |

## Admin

| #   | Feature (plain English)                                                                                                                    | Status | Notes                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------- |
| 19  | **Admin sign-in** — Google account with the owner's verified email (button shown with `?admin`)                                            | ⬜     | Slice 4 (rules use the same check) |
| 20  | **Admin workspace** — one screen with stream preview, chat and controls                                                                    | ⬜     |                                    |
| 21  | **Chat moderation** — edit or delete any message; clear the whole chat; turn chat on/off; pin / unpin an announcement                      | ⬜     | Slice 4                            |
| 22  | **Per-person moderation** — rename their chat name; timeout for 1/5/10/30/60 minutes; lift timeout; ban / unban; delete all their messages | ⬜     | Slice 4                            |
| 23  | **Viewer management** — search by name / nickname / ID; filters (recent, banned, …); pages of viewers; open a viewer's details             | ⬜     |                                    |
| 24  | **Privacy request log** — record requests by visitor ID; statuses pending / processing / completed; completing deletes the private profile | ⬜     |                                    |
| 25  | **Delete a visitor's private profile**                                                                                                     | ⬜     |                                    |

## Behind the scenes (not part of `/legacy/`, kept as they are)

- Live detection: Cloudflare worker `b24dul-live-monitor` (sole automatic writer of live status).
- Video list refresh: `videos.yml` every 3 hours, which now redeploys the site.
- `auto-live.yml`: manual fallback detector.
- Social preview image `og.png`.

## Before removing `/legacy/`

1. Every row above is ✅ or ➖ (with the owner's agreement).
2. Owner confirms in writing.
3. Remove the `/legacy/` copy from the deploy workflow and repoint the "current site" links.
4. Legacy Firebase data and rules cleanup is a separate task.
