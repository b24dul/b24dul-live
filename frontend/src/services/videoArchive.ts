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
    ) continue;
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

// Uses the real repository videos.json, bundled read-only when this preview is built.
// It is a build-time snapshot, NOT a live-fetch, channel status, or API integration.
export const archivedVideos = parseVideoArchive(rawArchive);

export function videoDate(published: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(published));
}
