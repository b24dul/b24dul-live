import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYouTubePage, inspectVideoRenderers, detectYouTube, checkAndPublish } from "../src/index.js";

const url = "https://www.youtube.com/channel/UCnXAfqk5I7QE3frLhHHyImQ/live";
test("channel/live redirect detects broadcast", () => {
  assert.deepEqual(parseYouTubePage(url, 302, "", "https://www.youtube.com/watch?v=oYJneqAyj04"),
    { state: "live", videoId: "oYJneqAyj04", method: "channel-live-redirect" });
});
test("generic channel metadata is inconclusive, not offline", () => {
  assert.equal(parseYouTubePage(url, 200, '{"pageType":"WEB_PAGE_TYPE_CHANNEL"}').state, "unknown");
});
test("explicit YouTube offline message is authoritative", () => {
  assert.equal(parseYouTubePage(url, 200, "The channel is not currently live").state, "offline");
});
test("live watch page metadata with correct video ID is live", () => {
  const html = '<meta itemprop="videoId" content="oYJneqAyj04"> {"isLiveNow":true}';
  assert.equal(parseYouTubePage(url, 200, html).state, "live");
});
test("upcoming event does not trigger live", () => {
  const html = '{"videoId":"oYJneqAyj04","isLiveNow":false,"isUpcoming":true}';
  assert.notEqual(parseYouTubePage(url, 200, html).state, "live");
});
test("unknown and blocked pages never report offline", () => {
  assert.equal(parseYouTubePage(url, 429).state, "unknown");
  assert.equal(parseYouTubePage(url, 200, "<html>bot challenge</html>").state, "unknown");
});
test("inconclusive checks do not require Firebase or change a setting", async () => {
  const result = await checkAndPublish({}, async () => ({ state: "unknown", reason: "blocked" }));
  assert.deepEqual(result, { checked: false, reason: "blocked" });
});

test("consent redirect retries public YouTube channel once with privacy cookie", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, cookie: opts.headers.cookie });
    if (calls.length === 1) return { status: 302, headers: new Headers({ location: "https://consent.youtube.com/m?continue=example" }) };
    return { status: 302, headers: new Headers({ location: "https://www.youtube.com/watch?v=oYJneqAyj04" }) };
  };
  const result = await detectYouTube(fakeFetch);
  assert.equal(result.state, "live");
  assert.equal(result.videoId, "oYJneqAyj04");
  assert.equal(result.consentRetry, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, url + "?ucbcb=1");
  assert.equal(calls[0].cookie, "SOCS=CAI");
});
test("repeated consent redirects do not claim live or offline", async () => {
  let calls = 0;
  const result = await detectYouTube(async () => {
    calls++;
    return { status: 302, headers: new Headers({ location: "https://consent.youtube.com/m?continue=x" }) };
  });
  assert.equal(calls, 2);
  assert.equal(result.state, "unknown");
  assert.equal(result.redirectHost, "consent.youtube.com");
  assert.equal(result.consentRetry, true);
});

test("renderer diagnostics associate live badges with their own video and owner", () => {
  const entry = { videoId: "oYJneqAyj04",
    ownerText: { runs: [{ navigationEndpoint: { browseEndpoint: { browseId: "UCnXAfqk5I7QE3frLhHHyImQ" } } }] },
    badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_LIVE_NOW", label: "LIVE" } }] };
  const result = inspectVideoRenderers('{"videoRenderer":' + JSON.stringify(entry) + '}');
  assert.equal(result.rendererCount, 1);
  assert.equal(result.liveCandidates[0].videoId, "oYJneqAyj04");
  assert.equal(result.liveCandidates[0].ownerMatchesChannel, true);
});
test("unrelated live badge does not contaminate renderer candidate", () => {
  const html = '"LIVE NOW" {"videoRenderer":{"videoId":"oYJneqAyj04","badges":[]}}';
  assert.deepEqual(inspectVideoRenderers(html).liveCandidates, []);
});

test("verified channel homepage without live player is only an offline candidate", () => {
  const html = '<title>B24DUL - YouTube</title>{"channelMetadataRenderer":{"externalId":"UCnXAfqk5I7QE3frLhHHyImQ"}}';
  assert.deepEqual(parseYouTubePage(url, 200, html), { state: "offline-candidate", method: "channel-homepage" });
});
test("unrelated channel, live badge or a video player cannot imply offline", () => {
  const base = '<title>B24DUL - YouTube</title>{"channelMetadataRenderer":{"externalId":"UCnXAfqk5I7QE3frLhHHyImQ"}}';
  assert.equal(parseYouTubePage(url, 200, base.replace("UCnXAfqk5I7QE3frLhHHyImQ", "UCanother")).state, "unknown");
  assert.equal(parseYouTubePage(url, 200, base + "BADGE_STYLE_TYPE_LIVE_NOW").state, "unknown");
  assert.equal(parseYouTubePage(url, 200, base + '"videoDetails":{}').state, "unknown");
});
