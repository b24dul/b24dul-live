import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPublishedLiveStatus,
  parsePublishedLiveStatus,
  PUBLISHED_STATUS_URL,
} from './liveStatus';

const NOW = 1_800_000_000_000;
const good = { live: true, videoId: '1yVlKouJnag', checkedAt: NOW - 5_000, stale: false };

afterEach(() => vi.unstubAllGlobals());

describe('read-only live status adapter', () => {
  it('only reports LIVE for a fresh verified status with a safe YouTube video ID', () => {
    expect(parsePublishedLiveStatus(good, NOW)).toEqual({
      state: 'live',
      videoId: '1yVlKouJnag',
      checkedAt: NOW - 5_000,
    });
    expect(parsePublishedLiveStatus({ ...good, videoId: 'bad?id=1' }, NOW)).toEqual({
      state: 'unavailable',
      reason: 'invalid',
    });
  });

  it('reports offline only for an actual fresh offline confirmation', () => {
    expect(parsePublishedLiveStatus({ ...good, live: false, videoId: '' }, NOW)).toEqual({
      state: 'offline',
      checkedAt: NOW - 5_000,
    });
  });

  it('never treats stale, absent or future status as current', () => {
    expect(parsePublishedLiveStatus({ ...good, stale: true }, NOW)).toEqual({
      state: 'unavailable',
      reason: 'stale',
    });
    expect(parsePublishedLiveStatus({ ...good, checkedAt: NOW - 181_000 }, NOW).state).toBe(
      'unavailable',
    );
    expect(parsePublishedLiveStatus({ ...good, checkedAt: NOW + 120_000 }, NOW).state).toBe(
      'unavailable',
    );
    expect(parsePublishedLiveStatus(null, NOW).state).toBe('unavailable');
    expect(parsePublishedLiveStatus({ ...good, checkedAt: 'today' }, NOW).state).toBe(
      'unavailable',
    );
  });

  it('uses only the existing public GET endpoint and parses its output', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => good,
    }));
    vi.stubGlobal('fetch', request);
    expect(await fetchPublishedLiveStatus(undefined, NOW)).toMatchObject({
      state: 'live',
    });
    expect(request).toHaveBeenCalledWith(PUBLISHED_STATUS_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: undefined,
      headers: { accept: 'application/json' },
    });
  });

  it('treats request failures and rejected responses as unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await fetchPublishedLiveStatus(undefined, NOW)).toEqual({
      state: 'unavailable',
      reason: 'network',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false })),
    );
    expect(await fetchPublishedLiveStatus(undefined, NOW).then((v) => v.state)).toBe('unavailable');
  });
});
