import { describe, expect, it, vi } from 'vitest';
import { fetchPublishedArchive, PUBLISHED_ARCHIVE_URL } from './videoArchive';

const valid = [{ id: 'abcdefghijk', title: ' New upload ', published: '2026-11-17T12:00:00Z' }];

describe('published video archive fetch', () => {
  it('performs a credential-free request and validates the result', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(valid), { status: 200 }));
    const controller = new AbortController();
    const result = await fetchPublishedArchive(controller.signal, fetcher);
    expect(result).toEqual([
      {
        id: 'abcdefghijk',
        title: 'New upload',
        published: valid[0]!.published,
        watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      PUBLISHED_ARCHIVE_URL,
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      }),
    );
  });
  it('rejects failures, malformed, oversized and empty archives for fallback', async () => {
    for (const response of [
      new Response('error', { status: 503 }),
      new Response('{', { status: 200 }),
      new Response('{}', { status: 200 }),
      new Response('[]', { status: 200 }),
      new Response('x'.repeat(1_000_001), { status: 200 }),
    ]) {
      await expect(
        fetchPublishedArchive(new AbortController().signal, vi.fn().mockResolvedValue(response)),
      ).rejects.toThrow();
    }
  });
});
