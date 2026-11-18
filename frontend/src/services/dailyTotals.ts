/**
 * Daily site totals in /v2/stats/days/{YYYY-MM-DD} (UTC). Totals only: nothing about who did
 * what. The rules let anyone add exactly 1 to a listed counter; only admins can read them.
 * Written with one small request to the database's REST API, so visitors never download the
 * Firebase SDK for this.
 */
export const METRICS = [
  'visits',
  'siteMinutes',
  'liveMinutes',
  'videoPlays',
  'sudokuStarts',
  'g2048Starts',
  'subscribeClicks',
  'devicePhone',
  'deviceTablet',
  'deviceDesktop',
  'sourceYoutube',
  'sourceSearch',
  'sourceDirect',
  'sourceOther',
] as const;
export type Metric = (typeof METRICS)[number];
export type DayTotals = Partial<Record<Metric, number>>;

export function statsDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export type TotalsTarget = {
  databaseURL: string;
  /** Emulator namespace, for tests only. */
  ns?: string;
  fetch: typeof fetch;
};

/** Adds 1 to each listed counter for the day in one request. Never throws. */
export async function addToTotals(
  metrics: readonly Metric[],
  target: TotalsTarget,
  day = statsDay(),
): Promise<boolean> {
  if (!metrics.length) return true;
  const body = Object.fromEntries(metrics.map((metric) => [metric, { '.sv': { increment: 1 } }]));
  const query = target.ns ? `?ns=${encodeURIComponent(target.ns)}` : '';
  try {
    const response = await target.fetch(`${target.databaseURL}/v2/stats/days/${day}.json${query}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function deviceMetric(coarsePointer: boolean, shortestScreenSide: number): Metric {
  if (!coarsePointer) return 'deviceDesktop';
  return shortestScreenSide < 600 ? 'devicePhone' : 'deviceTablet';
}

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|baidu|startpage|qwant)\./;

export function sourceMetric(referrer: string, ownHost: string): Metric {
  if (!referrer) return 'sourceDirect';
  let host: string;
  try {
    host = new URL(referrer).host.toLowerCase();
  } catch {
    return 'sourceOther';
  }
  if (host === ownHost) return 'sourceDirect';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'sourceYoutube';
  if (SEARCH_ENGINES.test(host + '.')) return 'sourceSearch';
  return 'sourceOther';
}

/** Totals kept for each counted event, using the old site's event names. */
export function metricForEvent(path: string): Metric | null {
  if (path === 'click/subscribe') return 'subscribeClicks';
  if (path.startsWith('video/')) return 'videoPlays';
  if (path === 'pick/sudoku') return 'sudokuStarts';
  if (path === 'pick/2048') return 'g2048Starts';
  return null;
}
