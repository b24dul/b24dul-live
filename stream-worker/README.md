# B24DUL Live Cloudflare monitor

This is a NEW separate Cloudflare Worker, following b24dul/Fluke-CableTest's
Wrangler deployment pattern. It does not modify the Fluke-CableTest app,
its Stripe payment logic, routes or static assets.

## Behaviour

- Cron Trigger runs every minute.
- Checks the public YouTube channel's /live entry point.
- A live video redirect publishes a live video ID; confirmed offline
  channel pages publish offline. HTTP throttling, timeouts and unknown
  responses never silently turn the channel offline.
- Writes the EXISTING Firebase fields settings/liveDetection (live, videoId,
  checkedAt) and settings/live (compatibility). Visitors receive the change
  in real time through the existing Firebase listener.
- Read-only /api/health and /api/status endpoints aid troubleshooting.
- The public API cannot write to Firebase.

## GitHub Actions deployment

The existing GitHub repository secret FIREBASE_SERVICE_ACCOUNT_JSON is reused;
do not send this JSON in chat or commit it to Git.

Go to b24dul/b24dul-live -> Settings -> Secrets and variables -> Actions.
Add two secrets:

1. CLOUDFLARE_ACCOUNT_ID: Cloudflare account ID from the same account hosting
   your cable tester.
2. CLOUDFLARE_API_TOKEN: a new SCOPED API token created from Cloudflare
   Profile -> API Tokens; grant permission to deploy/edit Workers and triggers
   in that account. Never use a global API key.

Keep the existing FIREBASE_SERVICE_ACCOUNT_JSON repository secret.
Next go to GitHub Actions -> Deploy B24DUL Live monitor to Cloudflare ->
Run workflow (main). This runs the tests, deploys the new b24dul-live-monitor
Worker, and securely installs the existing Firebase JSON as a Worker secret.
The visitor website stays on GitHub Pages, and Cable Tester is unaffected.

## Verification and cutover

1. Check the new Worker URL /api/health (returns ok:true).
2. Check /api/status (public Firebase detection state and staleness).
3. Check Cron Triggers and logs in the new Cloudflare Worker dashboard.
4. Start and stop a real YouTube livestream while observing the site in a
   second browser; confirm settings/liveDetection changes automatically.
5. ONLY AFTER THIS WORKS, disable the schedule in the old GitHub workflow
   .github/workflows/auto-live.yml. Do not let both monitors write forever.

Cron Triggers are scheduled every minute but can be delayed. YouTube may
block Cloudflare fetches or change its HTML/redirect structure. Inconclusive
results are explicitly logged and never treated as confirmed offline.
Playback can always be opened from the visitor site while detection catches up.

## Optional local development

From the stream-worker directory:
    npm install
    npm test
    npx wrangler login
    npx wrangler dev --test-scheduled

For manual deployment, run npx wrangler deploy from this directory and add
FIREBASE_SERVICE_ACCOUNT_JSON under Cloudflare Worker -> Settings ->
Variables and Secrets. Never commit the private key.

This project intentionally does not require changing DNS, Firebase rules,
the existing Cable Tester Worker or payment secrets.
