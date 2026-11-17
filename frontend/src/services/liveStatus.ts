// M2, step 1: read-only published stream status. No Firebase auth, database writes,
// service credentials or admin privileges are used by this adapter.
export const PUBLISHED_STATUS_URL = 'https://b24dul-live-monitor.b24dul.workers.dev/api/status';

const FRESHNESS_MS = 3 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 1000;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type PublishedLiveStatus =
  | { state: 'live'; checkedAt: number; videoId: string }
  | { state: 'offline'; checkedAt: number }
  | { state: 'unavailable'; reason: 'invalid' | 'stale' | 'network' };

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

export function parsePublishedLiveStatus(
  input: unknown,
  now: number = Date.now(),
): PublishedLiveStatus {
  if (!isRecord(input) || typeof input.live !== 'boolean') {
    return { state: 'unavailable', reason: 'invalid' };
  }
  if (
    typeof input.checkedAt !== 'number' ||
    !Number.isFinite(input.checkedAt) ||
    input.checkedAt <= 0 ||
    !Number.isFinite(now) ||
    input.checkedAt > now + MAX_FUTURE_SKEW_MS
  ) {
    return { state: 'unavailable', reason: 'invalid' };
  }
  if (input.stale !== false || now - input.checkedAt >= FRESHNESS_MS) {
    return { state: 'unavailable', reason: 'stale' };
  }
  if (!input.live) return { state: 'offline', checkedAt: input.checkedAt };
  if (typeof input.videoId !== 'string' || !VIDEO_ID.test(input.videoId)) {
    return { state: 'unavailable', reason: 'invalid' };
  }
  return { state: 'live', checkedAt: input.checkedAt, videoId: input.videoId };
}

export async function fetchPublishedLiveStatus(
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<PublishedLiveStatus> {
  try {
    const response = await fetch(PUBLISHED_STATUS_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return { state: 'unavailable', reason: 'network' };
    const input: unknown = await response.json();
    return parsePublishedLiveStatus(input, now);
  } catch {
    return { state: 'unavailable', reason: 'network' };
  }
}
