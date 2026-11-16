# Privacy request history — deployment notes

The website now has administrator-only **Privacy request history** in **Viewers**. It records a visitor account ID and one of: pending, processing or completed. Requests received via email must be entered by the administrator manually. The history does not receive emails automatically, and recording a request does not delete data.

## Required Firebase rules publication (separate from GitHub Pages)

1. Open Firebase Console > Build > Realtime Database > Rules for `b24duls-anonymous-chat`.
2. **Back up the currently published full rules.** Do not replace your current rules with an older GitHub copy; your live leaderboard hardening would otherwise be lost.
3. Open `firebase/privacy-requests.rules-fragment.json` from `main`. It contains a single `privacyRequests` property.
4. Add that one property **inside your existing top-level `"rules": { ... }` object**, alongside `viewers`, `messages`, `leaderboard`, etc. Preserve every other path and rule exactly as published. Check comma placement and the complete JSON in the Firebase editor.
5. Publish in Firebase Console. Refresh the site and sign in to the verified administrator account.
6. Open Viewers > Privacy request history. Log a **synthetic test UID** (e.g. `testVisitor123`) and advance pending > processing > completed. No actual user data should be deleted.
7. If unexpected permissions or site issues occur, restore the backup rules.

## Permissions and record shape

Only the designated verified administrator can read or write `privacyRequests`. Each record contains `uid`, `status`, `createdAt`, `updatedAt`. Timestamps come from Firebase server time; records cannot be deleted by clients. The rules reject unknown fields, prevent changing the UID or original creation timestamp and require a valid status.

No visitor names, email message bodies or reasons for deletion are stored in the request history. It remains available after a private visitor profile is removed. The existing **Delete private visitor record** action remains separate. **Changing status to completed does not perform deletion**; use it only after you have manually verified the requested action was handled.

The email deletion-request process is unchanged. No billing services or Cloud Functions are required.

## Verification and limitations

- Source and scope checks passed for the committed website changes.
- This feature was not browser-tested against the new Firebase rules.
- The GitHub Pages deployment does **not** deploy Realtime Database rules.
- If the rules are not published, the history panel shows an access warning; the rest of the site should continue functioning.
- A historic request may be entered manually; this is not automatic ingestion of Gmail.
- Records will accumulate until an administrator establishes an appropriate retention and secure deletion process. The rule fragment intentionally does not permit casual client-side deletion.

## Rollback

If the frontend misbehaves, revert website commit `ca4145b` (or roll back to the previous working GitHub Pages deployment). If Firebase rules misbehave, restore the *Firebase Console* backup; a GitHub revert will not revert database rules.
