# Owner browser tests — 18 November 2026

Run by the site owner on the live preview (https://b24dul.github.io/b24dul-live/), reported in the
working session. Recorded here as repository-local evidence for `production-gates.json`.

## Sign-in (deployed commit `b110e79`, then `d329c6a` with the account chooser)

Reported: "all cases passed and it behaves as described."

1. Continue as guest; refresh keeps the guest session.
2. Guest → Sign in with Google keeps the same account; refresh keeps it.
3. Sign out.
4. New guest → Google account that already exists: signed in to that account, guest not merged.
5. Closing the popup: "Sign-in was cancelled", nothing changes.
6. `/legacy/` unaffected.
7. Phone.

## Chat (deployed commit `1ff9797`, `/v2/` rules deployed, admin UID added)

Reported: "Chat tests: all passed."

1. Signed out: chat readable, "Sign in with Google to chat".
2. Guest: no message box; asked to sign in with Google.
3. Guest → Google: account chooser shown; message box under a generated name, never the Google name.
4. Slow mode countdown; swear words masked; links, emails, phone numbers and personal questions blocked.
5. Second browser/phone: messages appear live under the same generated names.
6. `/legacy/` chat, sign-in and admin unchanged.
7. Admin messages show B24DUL with the Admin badge.

Not covered yet: admin presence view and moderation tools (step c).

## Admin workspace (deployed commits `f363c44`, then `22e53f2` with the pin fix)

Reported: pin tests "all passed"; "chat on/off, edit, delete, timeout, ban, delete all, people list,
clear chat: all passed". First report found a bug (Pin did nothing with an empty box), fixed in
PR #36 and re-tested.

1. Only the admin account sees the tools; other accounts see "Admin only".
2. Chat on/off, pin/unpin (Chat controls and under Moderate), edit, delete.
3. Timeout and lift timeout; ban and unban; delete all of a person's messages.
4. People list: visitor shown online, search and filters.
5. Clear chat with confirmation.

Not yet tested by the owner: privacy request log and erase.
