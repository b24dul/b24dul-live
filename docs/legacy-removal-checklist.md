# Legacy removal checklist

`/legacy/` (the old site, served unchanged from `main`) is removed only when **every item below
works on the new site and the owner confirms**. Scope decision (2026-11-18): the new site starts
fresh. Old accounts, UIDs, scores and saves are **not** carried over; people sign in again. All new
data lives under `/v2/` in the same Firebase project; legacy data is not read, changed or deleted by
the new site (cleanup is a separate, later task).

## Owner decisions (2026-11-18)

- **Public data is anonymous.** Chat, presence, leaderboards and anything other visitors can see
  show only UID-derived data. A Google display name, email or photo is never
  stored in the database or shown to others; the Account page shows them only to the signed-in
  person, from the local sign-in session. The `/v2/` rules enforce this.
- **Chat names are generated, never chosen** (owner, 2026-11-18): each name (e.g. SwiftOtter42)
  is derived from the account ID and nothing is stored; admins show as B24DUL. Admin "rename" is
  therefore not needed.
- **Guests can read the chat; only Google-signed-in users can post** (rules check
  `sign_in_provider == 'google.com'`). Chat reads are limited by the rules to the last 100
  messages. No public online count for now.
- **Google sign-in always shows the account chooser** (`prompt: select_account`).
- **Order of work:** (a) privacy notice; (b) chat, chat protections, pinned message, presence and
  generated names with the `/v2/` rules; (c) admin and moderation tools; (d) leaderboards with
  rules-enforced score checks; (e) finish stream, offline hub, Sudoku, 2048; (f) visitor
  statistics.

Status: ✅ works on the new site · 🟡 partly · ⬜ not started · ➖ decided not to carry over

Verified from the legacy source at `main` `ae07503` (`index.html`).

## Visitors

| #   | Feature (plain English)                                                                                                                                                                                                                | Status | Notes                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 1   | **Watch the stream** — embedded YouTube player; LIVE / offline / "checking" badge from automatic detection; falls back safely if detection is stale; "open the player anyway" button                                                   | 🟡     | Built: player loads automatically when live, chat beside it; awaits owner test stream |
| 2   | **"Stream just started" notice** — banner with Watch / Dismiss when the stream goes live                                                                                                                                               | 🟡     | Built: banner when the stream starts while the page is open; once per broadcast       |
| 3   | **Subscribe button** linking to the YouTube channel                                                                                                                                                                                    | 🟡     | Built: Subscribe on Watch and Home (YouTube sub_confirmation link)                    |
| 4   | **Video archive** — list of past videos, opening on YouTube                                                                                                                                                                            | ✅     | Reads `videos.json`; refreshed by `videos.yml`                                        |
| 5   | **"What do you want to do?" hub** while offline — Sudoku, 2048, old videos                                                                                                                                                             | 🟡     | New home/explore pages cover this                                                     |
| 6   | **Sudoku** — easy / medium / hard; notes mode; erase; undo; hints; mistake count; timer; keyboard and touch; help and tutorial; progress saved                                                                                         | 🟡     | Practice game exists; check feature-by-feature                                        |
| 7   | **Sudoku leaderboards** — fastest time per difficulty                                                                                                                                                                                  | 🟡     | Built (step d): fastest hint-free time per level; awaits rules deploy                 |
| 8   | **2048** — keyboard and swipe; score; personal best; game over / play again; new game; progress saved                                                                                                                                  | 🟡     | Practice game exists; best score is local only                                        |
| 9   | **2048 leaderboard** — highest score                                                                                                                                                                                                   | 🟡     | Built (step d): highest score; awaits rules deploy                                    |
| 10  | **Sign in** — anonymous visitor identity; Google sign-in                                                                                                                                                                               | ✅     | Owner-tested 2026-11-18: guest, Google, linking, chooser                              |
| 11  | **Live chat** — random anonymous name (e.g. SwiftOtter42); last 100 messages; 200-character limit                                                                                                                                      | ✅     | Owner-tested 2026-11-18 (generated names, Google-only posting)                        |
| 12  | **Chat protection** — 5-second slow mode enforced by the database; swear-word filter (shown as \*\*\*); personal-information filter (blocks asking for or sharing names, ages, locations, socials, phone numbers, emails); chat on/off | ✅     | Owner-tested; rules enforce slow mode, filters, chat on/off                           |
| 13  | **Pinned announcement** above the chat                                                                                                                                                                                                 | ✅     | Owner-tested: pin/unpin from Chat controls and under Moderate                         |
| 14  | **Online presence** (who is online; shown to the admin)                                                                                                                                                                                | ✅     | Owner-tested: admin-only People list with online count                                |
| 15  | **Entry gate asking for a real name** (only the admin sees it)                                                                                                                                                                         | ➖     | Owner confirmed 2026-11-18: not carried over                                          |
| 16  | **Privacy request** — prepare an email asking for your visitor record to be deleted                                                                                                                                                    | 🟡     | Email draft takes the new-site account ID (shown on Account page)                     |
| 17  | **Privacy notice** — what is recorded and why                                                                                                                                                                                          | ✅     | `#/privacy`, linked from every page; update before each new data feature              |
| 18  | **Visitor statistics** — visits, watch time, device type, where people came from, which game/videos they picked, Subscribe clicks; plus GoatCounter page counts                                                                        | ⬜     | Decide what to keep for v2                                                            |

## Admin

| #   | Feature (plain English)                                                                                                                                                 | Status | Notes                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| 19  | **Admin sign-in** — Google account with the owner's verified email (button shown with `?admin`)                                                                         | ✅     | Owner-tested: UID list /v2/admins; #/admin closed to others         |
| 20  | **Admin workspace** — one screen with stream preview, chat and controls                                                                                                 | ✅     | Owner-tested: #/admin with stream status, chat and controls         |
| 21  | **Chat moderation** — edit or delete any message; clear the whole chat; turn chat on/off; pin / unpin an announcement                                                   | ✅     | Owner-tested: edit/delete, clear, on/off, pin/unpin                 |
| 22  | **Per-person moderation** — rename their chat name (➖ names are now generated); timeout for 1/5/10/30/60 minutes; lift timeout; ban / unban; delete all their messages | ✅     | Owner-tested: timeouts, lift, ban/unban, delete all; rename ➖      |
| 23  | **Viewer management** — search by name / nickname / ID; filters (recent, banned, …); pages of viewers; open a viewer's details                                          | ✅     | Owner-tested: People list, search, filters, pages                   |
| 24  | **Privacy request log** — record requests by visitor ID; statuses pending / processing / completed; completing deletes the private profile                              | 🟡     | /v2/privacyRequests log: pending → processing → completed           |
| 25  | **Delete a visitor's private profile**                                                                                                                                  | 🟡     | Complete = erase all /v2/ data for the ID; Auth account via console |

## Behind the scenes (not part of `/legacy/`, kept as they are)

- Live detection: Cloudflare worker `b24dul-live-monitor` (sole automatic writer of live status).
- Video list refresh: `videos.yml` every 3 hours, which now redeploys the site.
- `auto-live.yml`: manual fallback detector.
- Social preview image `og.png`.

## Owner plan (2026-11-18)

1. Remove every link and text pointing to the old site; hide unbuilt games (done: PR "Remove old-site links").
2. Stream: embedded player, "stream just started" notice, Subscribe; chat beside the stream.
3. Finish 2048 and Sudoku (win screens, How to play, autosave, no "practice" labels).
4. Visitor statistics including GoatCounter page counts.
5. Stop publishing `/legacy/`, redirect it to the new home page (owner confirmed once 1–4 are live).
6. Offline hub.
7. New games one at a time (Snake, Memory Match, Minesweeper, Connect Four), each with a
   leaderboard rules summary for approval.

## Before removing `/legacy/`

1. Every row above is ✅ or ➖ (with the owner's agreement).
2. Owner confirms in writing.
3. Remove the `/legacy/` copy from the deploy workflow and repoint the "current site" links.
4. Legacy Firebase data and rules cleanup is a separate task.
