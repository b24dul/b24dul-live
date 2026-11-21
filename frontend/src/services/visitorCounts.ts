/**
 * Cookieless visitor counts through GoatCounter, the same account the old site used
 * (https://b24dul.goatcounter.com). Sends the same small request GoatCounter's own count.js sends,
 * without loading any third-party script. Nothing identifies the visitor: no account ID, no
 * cookies, nothing stored on the device.
 */
import { addToTotals, metricForEvent, type Metric, type TotalsTarget } from './dailyTotals';
import { firebaseConfig } from './firebaseConfig';

export const COUNT_ENDPOINT = 'https://b24dul.goatcounter.com/count';
export const SITE_HOST = 'b24dul.github.io';
export const SITE_BASE = '/b24dul-live/';

export type CountEnv = {
  host: string;
  webdriver: boolean;
  skip: boolean;
  send: (url: string) => void;
  referrer: string;
  screenWidth: number;
};

export function browserEnv(): CountEnv {
  let skip = false;
  try {
    // GoatCounter's own convention for excluding your own visits: localStorage.skipgc = 't'.
    skip = window.localStorage.getItem('skipgc') === 't';
  } catch {
    // Storage blocked: count normally.
  }
  return {
    host: window.location.host,
    webdriver: Boolean(navigator.webdriver),
    skip,
    send: (url) => {
      const image = new Image();
      image.referrerPolicy = 'no-referrer-when-downgrade';
      image.src = url;
    },
    referrer: document.referrer,
    screenWidth: window.screen?.width ?? 0,
  };
}

let firstPageView = true;

/** The page path as GoatCounter sees it; the home page keeps the old site's path. */
export function countPath(route: string) {
  return route === '/' ? SITE_BASE : SITE_BASE + route.replace(/^\/+/, '');
}

/** Only on the published site, never in tests or automated browsers, and not with skipgc. */
export function countingAllowed(env: CountEnv) {
  return env.host === SITE_HOST && !env.webdriver && !env.skip;
}

const productionTotals = (): TotalsTarget => ({
  databaseURL: firebaseConfig.databaseURL,
  fetch: (...args) => window.fetch(...args),
});

const onAdminPage = () => window.location.hash.startsWith('#/admin');

/** Adds to the daily totals (admin-only to read), under the same conditions as GoatCounter. */
export function countTotals(metrics: readonly Metric[], env: CountEnv = browserEnv()) {
  if (!metrics.length || !countingAllowed(env) || onAdminPage()) return;
  void addToTotals(metrics, productionTotals());
}

/**
 * Counts a page view or an event. Only on the published site, never in tests or automated
 * browsers, never on the admin page, and not when the owner has set skipgc.
 */
export function countVisit(
  hit: { path: string; title: string; event?: boolean },
  env: CountEnv = browserEnv(),
): string | null {
  if (!countingAllowed(env) || hit.path.startsWith(SITE_BASE + 'admin')) return null;
  const params = new URLSearchParams({
    p: hit.path,
    t: hit.title,
    e: hit.event ? 'true' : 'false',
    s: String(env.screenWidth),
    rnd: Math.random().toString(36).slice(2),
  });
  // Where the visitor came from is sent once, with the first page view only.
  if (!hit.event && firstPageView) {
    if (env.referrer) params.set('r', env.referrer);
    firstPageView = false;
  }
  const url = `${COUNT_ENDPOINT}?${params}`;
  try {
    env.send(url);
  } catch {
    // Blocked by the browser or an extension: counting is best effort.
  }
  return url;
}

/** Counts a click or choice, using the old site's event names so the history carries on. */
export function countEvent(path: string, title: string) {
  const metric = metricForEvent(path);
  if (metric) countTotals([metric]);
  return countVisit({ path, title, event: true });
}

export function resetCountsForTests() {
  firstPageView = true;
}
