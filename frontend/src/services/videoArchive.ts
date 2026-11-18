import rawArchive from '../../../videos.json';

export type ArchivedVideo = Readonly<{
  id: string;
  title: string;
  published: string;
  watchUrl: string;
}>;

export function parseVideoArchive(source: unknown): ArchivedVideo[] {
  if (!Array.isArray(source)) return [];
  const seen = new Set<string>();
  const results: ArchivedVideo[] = [];
  for (const entry of source) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      !/^[A-Za-z0-9_-]{11}$/.test(item.id) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      typeof item.published !== 'string' ||
      !Number.isFinite(Date.parse(item.published)) ||
      seen.has(item.id)
    )
      continue;
    seen.add(item.id);
    results.push({
      id: item.id,
      title: item.title.trim(),
      published: item.published,
      watchUrl: 'https://www.youtube.com/watch?v=' + encodeURIComponent(item.id),
    });
  }
  return results.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

// A read-only build-time snapshot used until the separate published-archive request succeeds.
export const archivedVideos = parseVideoArchive(rawArchive);

export function videoDate(published: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(published));
}

/** Public, read-only archive published by the existing site. */
export const PUBLISHED_ARCHIVE_URL = 'https://b24dul.github.io/b24dul-live/videos.json';
const MAX_ARCHIVE_CHARACTERS = 1_000_000;

export async function fetchPublishedArchive(
  signal: AbortSignal,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<ArchivedVideo[]> {
  if (typeof fetcher !== 'function') throw new Error('Archive fetch unavailable');
  const response = await fetcher(PUBLISHED_ARCHIVE_URL, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal,
  });
  if (!response.ok) throw new Error('Archive request failed');
  const body = await response.text();
  if (body.length > MAX_ARCHIVE_CHARACTERS) throw new Error('Archive response too large');
  const raw: unknown = JSON.parse(body);
  if (!Array.isArray(raw)) throw new Error('Invalid archive response');
  const videos = parseVideoArchive(raw);
  if (!videos.length) throw new Error('Archive response contained no valid videos');
  return videos;
}
