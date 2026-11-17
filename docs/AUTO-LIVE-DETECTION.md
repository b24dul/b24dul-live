# Automatic YouTube live detection

The stream-status automation lives at .github/workflows/auto-live.yml.
It checks the public B24DUL YouTube channel's /live endpoint every five
minutes (GitHub schedule execution can be delayed). It uses yt-dlp to
distinguish a real live broadcast from an upcoming or finished stream.

Each successful YouTube check compares the detected status to the *actual*
Firebase Realtime Database setting settings/live. If they differ, it corrects
the Firebase value automatically: true when YouTube confirms a broadcast,
false when the channel is offline. This also repairs any previously stale
LIVE flag. The visitor website already listens to settings/live, so its
Live tab, player and notifications react automatically without adding public
credentials or changing Firebase rules.

**Setup required before auto-detection will run:**

1. In Firebase Console, open the existing b24duls-anonymous-chat project,
   Project settings -> Service accounts -> Firebase Admin SDK.
2. Generate a **new** private key for a service account authorised for
   Realtime Database. Treat the JSON key like a password.
3. In the GitHub repository b24dul/b24dul-live, go to Settings ->
   Secrets and variables -> Actions -> New repository secret.
4. Name it FIREBASE_SERVICE_ACCOUNT_JSON and paste the **entire JSON**
   as the secret value. **Never commit the JSON to the repository,
   send it in chat, or paste it in client-side code.**
5. Open Actions -> Auto-detect YouTube live stream -> Run workflow to
   verify that it can read YouTube and update Firebase. The Actions
   run log shows detection and success or a safe failure.

The website no longer offers an admin LIVE override. YouTube is the sole
source of truth; games, videos and chat remain available regardless of the
broadcast status. Each successful check fixes mismatches in Firebase even
when the stream status has not changed since the previous GitHub run.

The workflow reads and (when needed) writes *only* settings/live in Firebase,
through firebase-admin. No other database records are changed. It retains
non-secret transition history in live-monitor-state.json for diagnostics.
That history no longer determines whether Firebase is up to date.

Limits: GitHub scheduled runs are best-effort, can be delayed or skipped,
and are not real-time. The typical detection interval is around five
minutes, plus Actions startup. YouTube may block automated extraction;
an inconclusive query fails without changing the last published status.
This is not direct YouTube/PS5 webhook integration, and the stream
can be late to appear or to disappear. Review Actions logs if it
does not update. The script never assumes "offline" from a network error.

To disable automation, disable the workflow under GitHub Actions. Keep
or delete the Firebase secret according to your security needs.
