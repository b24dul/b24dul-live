import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYouTubePage, checkAndPublish } from "../src/index.js";

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
