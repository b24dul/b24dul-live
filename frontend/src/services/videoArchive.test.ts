import { describe, expect, it } from 'vitest';
import { archivedVideos, parseVideoArchive, videoDate } from './videoArchive';

describe('typed read-only video archive', () => {
  it('reads the existing repository metadata without fabricated fields', () => {
    expect(archivedVideos.length).toBeGreaterThan(0);
    for (const video of archivedVideos) {
      expect(video.watchUrl).toBe('https://www.youtube.com/watch?v=' + video.id);
      expect(Number.isFinite(Date.parse(video.published))).toBe(true);
    }
  });

  it('rejects malformed, duplicate, unsafe IDs and invalid dates', () => {
    expect(
      parseVideoArchive([
        { id: 'IQLsvE7ll_M', title: 'Sample', published: '2026-11-16T12:00:00Z' },
        { id: 'IQLsvE7ll_M', title: 'Duplicate', published: '2026-11-16T12:00:00Z' },
        { id: 'x?alert(1)', title: 'Bad', published: '2026-11-16T12:00:00Z' },
        { id: 'abcdefghijk', title: '', published: '2026-11-16T12:00:00Z' },
        { id: 'abcdefghijk', title: 'Bad date', published: 'tomorrow' },
      ]),
    ).toHaveLength(1);
  });

  it('sorts newest first and formats dates in UTC', () => {
    const parsed = parseVideoArchive([
      { id: 'abcdefghijk', title: 'Older', published: '2026-01-01T00:00:00Z' },
      { id: '12345678901', title: 'Newer', published: '2026-02-01T00:00:00Z' },
    ]);
    expect(parsed.map((video) => video.title)).toEqual(['Newer', 'Older']);
    expect(videoDate('2026-02-01T00:00:00Z')).toMatch(/1 Feb 2026/);
  });
});
