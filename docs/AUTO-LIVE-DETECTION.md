# Automatic YouTube live detection

The stream-status automation lives at .github/workflows/auto-live.yml.
It checks the public B24DUL YouTube channel's /live endpoint every five
minutes (GitHub schedule execution can be delayed). It uses yt-dlp to
distinguish a real live broadcast from an upcoming or finished stream.

On a transition to a new live broadcast, it writes true to the *existing*
Firebase Realtime Database location settings/live. When that broadcast
ends and YouTube confirms it, it writes false. The site already listens to
this setting, so its Live tab, stream player and start notifications work
without changes to public Firebase rules or frontend credentials.

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

The script never overwrites Firebase on an unchanged YouTube state.
That lets an admin turn off the website's Live switch manually for the
remainder of a particular broadcast. On the next distinct live event,
it automatically enables the website again. An admin can still switch
it on manually.

The workflow writes *only* settings/live in Firebase, through
firebase-admin. No other database records are changed. It stores a
non-secret live-monitor-state.json file in the repository only after
a successful transition; that distinguishes a new broadcast from
repeated checks of the same broadcast.

Limits: GitHub scheduled runs are best-effort, can be delayed or skipped,
and are not real-time. The typical detection interval is around five
minutes, plus Actions startup. YouTube may block automated extraction;
an inconclusive query fails without changing the last published status.
This is not direct YouTube/PS5 webhook integration, and the stream
can be late to appear or to disappear. Review Actions logs if it
does not update. The script never assumes "offline" from a network error.

To disable automation, disable the workflow under GitHub Actions. Keep
or delete the Firebase secret according to your security needs.
