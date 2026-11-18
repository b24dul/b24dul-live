import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VideoArchiveProvider } from './VideoArchiveContext';
import { useVideoArchive } from './videoArchiveState';

function View() {
  const { videos, source } = useVideoArchive();
  return (
    <div>
      <span>{source}</span>
      <span>{videos[0]?.title}</span>
    </div>
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('video archive provider', () => {
  it('updates the shared archive after a valid published response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify([
              { id: 'abcdefghijk', title: 'Fresh test upload', published: '2026-11-17T12:00:00Z' },
            ]),
          ),
        ),
    );
    render(
      <VideoArchiveProvider>
        <View />
      </VideoArchiveProvider>,
    );
    await waitFor(() => expect(screen.getByText('published')).toBeInTheDocument());
    expect(screen.getByText('Fresh test upload')).toBeInTheDocument();
  });
  it('retains the build snapshot on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(
      <VideoArchiveProvider>
        <View />
      </VideoArchiveProvider>,
    );
    await waitFor(() => expect(screen.getByText('snapshot')).toBeInTheDocument());
  });
  it('falls back to the snapshot if the request times out', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );
    render(
      <VideoArchiveProvider>
        <View />
      </VideoArchiveProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(screen.getByText('snapshot')).toBeInTheDocument();
  });

  it('aborts the request when the provider unmounts', () => {
    const fetcher = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('fetch', fetcher);
    const { unmount } = render(
      <VideoArchiveProvider>
        <View />
      </VideoArchiveProvider>,
    );
    const signal = fetcher.mock.calls[0]![1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
