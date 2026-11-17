// B24DUL Live: separate Cloudflare Worker, deployed alongside (not inside) Fluke-CableTest.
// The scheduled handler is the ONLY writer. The public API is read-only.
export const CHANNEL_ID = "UCnXAfqk5I7QE3frLhHHyImQ";
export const DATABASE_URL = "https://b24duls-anonymous-chat-default-rtdb.europe-west1.firebasedatabase.app";
const CHANNEL_LIVE_URL = "https://www.youtube.com/channel/" + CHANNEL_ID + "/live";
const ALLOWED_ORIGIN = "https://b24dul.github.io";
const VIDEO_ID = /^[\w-]{11}$/;

const json = (body, status = 200, origin = null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "*",
    "x-content-type-options": "nosniff"
  }
});

// Keep parsing isolated and testable. Never decide "offline" on network errors.
export function parseYouTubePage(url, status, html = "", location = "") {
  if (status === 429 || status >= 500 || status === 401 || status === 403) return { state: "unknown", reason: "youtube-unavailable" };
  if (status >= 300 && status < 400 && location) {
    const next = new URL(location, url);
    // Expose only the redirect host/path for debugging. Query values can
    // contain visitor/session tokens and must never be returned publicly.
    const details = {
      redirectHost: next.hostname,
      redirectPath: next.pathname.slice(0, 180),
      redirectQueryKeys: [...new Set([...next.searchParams.keys()])].slice(0, 10),
    };
    if (!/(^|\.)youtube\.com$/.test(next.hostname)) {
      return { state: "unknown", reason: "foreign-redirect", ...details };
    }
    const id = next.searchParams.get("v") || next.pathname.match(/^\/live\/([\w-]{11})$/)?.[1];
    if (id && VIDEO_ID.test(id)) return { state: "live", videoId: id, method: "channel-live-redirect" };
    // A redirect to a channel page alone cannot prove that it is offline.
    // The destination might represent a URL canonicalization or consent flow.
    return { state: "unknown", reason: "unrecognised-redirect", ...details };
  }
  if (status !== 200) return { state: "unknown", reason: "youtube-http-" + status };
  // Generic channel metadata occurs on LIVE channel pages too.
  // Never use pageType/channelMetadataRenderer as evidence of being offline.
  // Prefer the selected page's own video ID rather than an unrelated video in
  // recommendation/sidebar metadata.
  const pageId = html.match(/<meta[^>]+itemprop=["']videoId["'][^>]+content=["']([\w-]{11})["']/i)?.[1]
    || html.match(/"canonicalBaseUrl":"\/watch\?v=([\w-]{11})"/)?.[1]
    || html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*[?&]v=([\w-]{11})/i)?.[1];
  const streaming = /"isLiveNow":true|"isLiveContent":true|"isLive":true/.test(html);
  if (pageId && streaming) return { state: "live", videoId: pageId, method: "live-page-metadata" };
  // Only the explicit /live "not currently live" response confirms offline.
  if (/the channel is not currently live/i.test(html)) return { state: "offline", method: "youtube-explicit-offline" };
  // YouTube currently serves the channel homepage at /live after a broadcast ends.
  // This is only a *candidate* for offline: require the channel's own identity
  // and absent live-player signals, then confirm on a later scheduled poll.
  const channelIdentity = html.includes(CHANNEL_ID)
    && /channelMetadataRenderer|WEB_PAGE_TYPE_CHANNEL/.test(html)
    && /<title[^>]*>B24DUL - YouTube<\/title>/i.test(html);
  const liveSignals = /"isLiveNow":true|"isLiveContent":true|BADGE_STYLE_TYPE_LIVE_NOW|THUMBNAIL_OVERLAY_TIME_STATUS_STYLE_LIVE/.test(html);
  const hasWatchPlayer = /"videoDetails"\s*:\s*\{/.test(html);
  const blocked = /consent\.youtube\.com|before you continue to youtube|unusual traffic|verify you are human/i.test(html);
  if (channelIdentity && !liveSignals && !hasWatchPlayer && !blocked) {
    return { state: "offline-candidate", method: "channel-homepage" };
  }
  return { state: "unknown", reason: "unrecognised-youtube-response" };
}

// Read only bounded, structured video renderers from YouTube page JSON.
// A generic LIVE badge somewhere on the page is NOT evidence for this channel.
export function inspectVideoRenderers(html) {
  const candidates = [];
  const token = '"videoRenderer":{';
  let cursor = 0;
  for (let count = 0; count < 100; count++) {
    const at = html.indexOf(token, cursor);
    if (at < 0) break;
    const start = at + token.length - 1;
    let depth = 0, quoted = false, escaped = false, end = -1;
    for (let i = start; i < Math.min(html.length, start + 120000); i++) {
      const ch = html[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) { end = i + 1; break; }
    }
    cursor = end > 0 ? end : start + 1;
    if (end < 0) continue;
    try {
      const entry = JSON.parse(html.slice(start, end));
      const id = entry.videoId;
      if (!VIDEO_ID.test(id || "")) continue;
      const badgeData = JSON.stringify({ badges: entry.badges,
        overlays: entry.thumbnailOverlays, upcoming: entry.upcomingEventData,
        views: entry.viewCountText });
      const liveBadge = /BADGE_STYLE_TYPE_LIVE_NOW|LIVE NOW|THUMBNAIL_OVERLAY_TIME_STATUS_STYLE_LIVE|\\"label\\":\\"LIVE\\"/.test(badgeData);
      const upcoming = Boolean(entry.upcomingEventData) || /UPCOMING|PREMIERE/.test(badgeData);
      const ownerId = entry.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
        || entry.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";
      candidates.push({ videoId: id, ownerMatchesChannel: ownerId === CHANNEL_ID,
        ownerIdentified: Boolean(ownerId), liveBadge, upcoming });
    } catch { /* Non-JSON fragments are never affirmative detection. */ }
  }
  return { rendererCount: candidates.length,
    liveCandidates: candidates.filter(x => x.liveBadge).slice(0, 8) };
}

// Cloudflare often reaches YouTube without a browser's consent-cookie state.
// Request the public channel with privacy-choice cookie and only retry once
// on a consent redirect. Never POST a consent form or follow an untrusted URL.
export async function detectYouTube(fetchImpl = fetch) {
  async function requestChannel(url) {
    const response = await fetchImpl(url, {
      redirect: "manual",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-GB,en;q=0.9",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "cookie": "SOCS=CAI",
      },
      signal: AbortSignal.timeout(12000)
    });
    const location = response.headers.get("location") || "";
    const html = response.status === 200 ? (await response.text()).slice(0, 5000000) : "";
    // Diagnostic signatures, not page contents. These reveal what sort of
    // page YouTube returned without leaking consent/session query parameters.
    const pageSignals = {
      htmlBytes: html.length,
      reachedSafetyLimit: html.length === 5000000,
      contentType: (response.headers.get("content-type") || "").split(";")[0],
      title: (html.match(/<title[^>]*>([^<]{0,100})<\/title>/i)?.[1] || "").slice(0, 100),
      hasPlayerResponse: /ytInitialPlayerResponse|playerResponse/.test(html),
      hasInitialData: /ytInitialData/.test(html),
      hasVideoId: /"videoId":"[\w-]{11}"/.test(html),
      hasVideoDetails: /"videoDetails"\s*:\s*\{/.test(html),
      hasChannelMetadata: /channelMetadataRenderer|WEB_PAGE_TYPE_CHANNEL/.test(html),
      hasStreamBadge: /BADGE_STYLE_TYPE_LIVE_NOW|LIVE NOW|"label":"LIVE"/.test(html),
      hasWatchCanonical: /<link[^>]+rel=["']canonical["'][^>]+watch\?v=/.test(html),
      hasUnavailableText: /this video is unavailable|video unavailable|something went wrong/i.test(html),
      hasLiveNow: /"isLiveNow":true/.test(html),
      hasIsLiveContent: /"isLiveContent":true/.test(html),
      hasLiveBroadcastDetails: /"liveBroadcastDetails"/.test(html),
      playerResponseOffset: html.indexOf("ytInitialPlayerResponse"),
      firstVideoIdOffset: html.indexOf('"videoId"'),
      firstLiveNowOffset: html.indexOf('"isLiveNow"'),
      hasConsentPage: /consent\.youtube\.com|before you continue to youtube|consent-bump/i.test(html),
      hasBotChallenge: /unusual traffic|verify you are human|automated queries/i.test(html),
      videoRenderers: inspectVideoRenderers(html),
    };
    return { parsed: parseYouTubePage(url, response.status, html, location),
      upstreamStatus: response.status, location, pageSignals,
      pageType: /"pageType":"WEB_PAGE_TYPE_CHANNEL"/.test(html) ? "channel" : "other" };
  }

  let result = await requestChannel(CHANNEL_LIVE_URL);
  let consentRetry = false;
  if (result.parsed.redirectHost === "consent.youtube.com") {
    // Re-request YouTube itself, never the consent endpoint. Query parameter
    // is the public no-cookie banner fallback; failures remain inconclusive.
    consentRetry = true;
    result = await requestChannel(CHANNEL_LIVE_URL + "?ucbcb=1");
  }
  return { ...result.parsed, upstreamStatus: result.upstreamStatus,
    redirected: Boolean(result.location), pageType: result.pageType, consentRetry,
    ...(result.parsed.state === "unknown" ? { pageSignals: result.pageSignals } : {}) };
}

const base64url = (bytes) => {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const jsonB64 = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)));

let cachedToken = null;
async function googleToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value;
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON Worker secret");
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (account.project_id !== "b24duls-anonymous-chat") throw new Error("Wrong Firebase project in service-account secret");
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    sub: account.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    iat: now,
    exp: now + 3600
  };
  const payload = jsonB64({ alg: "RS256", typ: "JWT" }) + "." + jsonB64(claim);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(payload))));
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: payload + "." + signature
    })
  });
  if (!tokenResponse.ok) throw new Error("Google token exchange failed: HTTP " + tokenResponse.status);
  const data = await tokenResponse.json();
  if (typeof data.access_token !== "string") throw new Error("Google did not issue an access token");
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3500) * 1000 };
  return cachedToken.value;
}

async function databaseRequest(token, path, method = "GET", data) {
  const response = await fetch(DATABASE_URL + "/" + path + ".json", {
    method,
    headers: {
      authorization: "Bearer " + token,
      ...(method === "GET" ? {} : { "content-type": "application/json" })
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(data) })
  });
  if (!response.ok) throw new Error("Firebase " + method + " " + path + ": HTTP " + response.status);
  return response.json();
}

export async function checkAndPublish(env, detector = detectYouTube) {
  const result = await detector();
  if (result.state === "unknown") {
    console.warn("YouTube status inconclusive:", result.reason);
    // No write: never label an inaccessible or throttled YouTube page as offline.
    return { checked: false, reason: result.reason };
  }
  // A channel homepage without live markers can be a temporary YouTube
  // response. Require two polls, at least 45s apart, before publishing offline.
  if (result.state === "offline-candidate") {
    const token = await googleToken(env);
    const now = Date.now();
    const previous = await databaseRequest(token, "settings/liveOfflineCandidate");
    if (Number(previous?.firstSeen) > now - 10 * 60 * 1000
        && Number(previous?.firstSeen) <= now - 45 * 1000) {
      result.state = "offline";
      result.method = "channel-homepage-confirmed-twice";
      await databaseRequest(token, "settings/liveOfflineCandidate", "PUT", null);
    } else {
      if (!previous?.firstSeen || Number(previous.firstSeen) < now - 10 * 60 * 1000) {
        await databaseRequest(token, "settings/liveOfflineCandidate", "PUT", { firstSeen: now });
      }
      console.log("Offline candidate: waiting for second scheduled confirmation");
      return { checked: false, reason: "offline-awaiting-confirmation" };
    }
  } else if (result.state === "live") {
    // Any confirmed LIVE observation clears an earlier offline candidate.
    const token = await googleToken(env);
    await databaseRequest(token, "settings/liveOfflineCandidate", "PUT", null);
  }
  const live = result.state === "live";
  const videoId = live ? result.videoId : "";
  if (live && !VIDEO_ID.test(videoId)) throw new Error("Invalid detected video ID");
  const token = await googleToken(env);
  const now = Date.now();
  // The existing frontend receives this update immediately through Firebase.
  const detection = { live, videoId, checkedAt: now };
  await databaseRequest(token, "settings/liveDetection", "PUT", detection);
  const previous = await databaseRequest(token, "settings/live");
  if (previous !== live) await databaseRequest(token, "settings/live", "PUT", live);
  console.log("YouTube detection:", live ? "LIVE" : "offline", videoId, result.method);
  return { checked: true, ...detection };
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(checkAndPublish(env));
  },
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (url.pathname === "/api/health") return json({ ok: true, service: "b24dul-live-monitor", source: "youtube-channel-live" }, 200, request.headers.get("origin"));
    if (url.pathname === "/api/probe") {
      // Diagnostic only: check YouTube NOW, never write Firebase. The answer
      // is distinct from /api/status, which shows last *published* Firebase state.
      try {
        const detected = await detectYouTube();
        return json({ ...detected, checkedAt: Date.now(), writes: false }, 200, request.headers.get("origin"));
      } catch (error) {
        return json({ state: "unknown", reason: "youtube-fetch-failed",
          message: String(error).slice(0, 180), checkedAt: Date.now(), writes: false },
          200, request.headers.get("origin"));
      }
    }
    if (url.pathname === "/api/status") {
      // Read-only public status. Data is already public at Firebase settings/liveDetection.
      try {
        const response = await fetch(DATABASE_URL + "/settings/liveDetection.json", { headers: { accept: "application/json" }, cf: { cacheTtl: 0 } });
        if (!response.ok) return json({ error: "Status unavailable" }, 503, request.headers.get("origin"));
        const status = await response.json();
        return json({
          live: status?.live === true,
          videoId: typeof status?.videoId === "string" ? status.videoId : "",
          checkedAt: Number(status?.checkedAt) || 0,
          stale: !(Number(status?.checkedAt) > Date.now() - 180000)
        }, 200, request.headers.get("origin"));
      } catch {
        return json({ error: "Status unavailable" }, 503, request.headers.get("origin"));
      }
    }
    return json({ error: "Not found" }, 404);
  }
};
