import { describe, expect, it, vi } from 'vitest';
import {
  addToTotals,
  deviceMetric,
  metricForEvent,
  sourceMetric,
  statsDay,
  type TotalsTarget,
} from './dailyTotals';

function target(ok = true) {
  const fetch = vi.fn(async () => new Response('{}', { status: ok ? 200 : 401 }));
  return { databaseURL: 'https://db.example', fetch } as unknown as TotalsTarget & {
    fetch: typeof fetch;
  };
}

describe('daily totals', () => {
  it('uses UTC dates', () => {
    expect(statsDay(new Date('2026-11-18T23:30:00-05:00'))).toBe('2026-11-19');
  });

  it('adds exactly 1 to each counter in one request, and nothing else', async () => {
    const t = target();
    expect(await addToTotals(['visits', 'devicePhone'], t, '2026-11-18')).toBe(true);
    const [url, init] = t.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://db.example/v2/stats/days/2026-11-18.json');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      visits: { '.sv': { increment: 1 } },
      devicePhone: { '.sv': { increment: 1 } },
    });
  });

  it('never throws, and sends nothing when there is nothing to add', async () => {
    const failing = {
      databaseURL: 'https://db.example',
      fetch: async () => {
        throw new Error('offline');
      },
    } as unknown as TotalsTarget;
    expect(await addToTotals(['visits'], failing)).toBe(false);
    expect(await addToTotals(['visits'], target(false))).toBe(false);
    const t = target();
    await addToTotals([], t);
    expect(t.fetch).not.toHaveBeenCalled();
  });

  it('sorts devices and where visitors came from', () => {
    expect(deviceMetric(false, 1080)).toBe('deviceDesktop');
    expect(deviceMetric(true, 390)).toBe('devicePhone');
    expect(deviceMetric(true, 820)).toBe('deviceTablet');
    const own = 'b24dul.github.io';
    expect(sourceMetric('', own)).toBe('sourceDirect');
    expect(sourceMetric('https://b24dul.github.io/b24dul-live/', own)).toBe('sourceDirect');
    expect(sourceMetric('https://www.youtube.com/', own)).toBe('sourceYoutube');
    expect(sourceMetric('https://m.youtube.com/watch?v=x', own)).toBe('sourceYoutube');
    expect(sourceMetric('https://youtu.be/abc', own)).toBe('sourceYoutube');
    expect(sourceMetric('https://www.google.co.uk/', own)).toBe('sourceSearch');
    expect(sourceMetric('https://duckduckgo.com/', own)).toBe('sourceSearch');
    expect(sourceMetric('https://reddit.com/r/x', own)).toBe('sourceOther');
    expect(sourceMetric('not a url', own)).toBe('sourceOther');
  });

  it('maps the old site’s event names to totals', () => {
    expect(metricForEvent('click/subscribe')).toBe('subscribeClicks');
    expect(metricForEvent('video/abcdefghijk')).toBe('videoPlays');
    expect(metricForEvent('pick/sudoku')).toBe('sudokuStarts');
    expect(metricForEvent('pick/2048')).toBe('g2048Starts');
    expect(metricForEvent('2048/won')).toBeNull();
  });
});
