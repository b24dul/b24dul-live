import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchiveTile } from '../../components/SectionBlocks';
import type { ArchivedVideo } from '../../services/videoArchive';
import { EMBED_ORIGIN, VideoPlayerProvider, embedErrorCode } from './VideoPlayer';

const video: ArchivedVideo = {
  id: 'abcdefghijk',
  title: 'Big stream highlights',
  published: '2026-11-17T12:00:00Z',
  watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
};

function renderTile() {
  render(
    <VideoPlayerProvider>
      <ArchiveTile video={video} />
    </VideoPlayerProvider>,
  );
  return screen.getByRole('button', { name: 'Play video: Big stream highlights' });
}

describe('video player', () => {
  it('plays the video on the site in privacy-enhanced mode, with a small YouTube link', () => {
    fireEvent.click(renderTile());
    const dialog = screen.getByRole('dialog', { name: 'Big stream highlights' });
    expect(dialog).toBeInTheDocument();
    const src = screen.getByTitle('Video: Big stream highlights').getAttribute('src')!;
    expect(src.startsWith(`${EMBED_ORIGIN}/embed/abcdefghijk?autoplay=1&rel=0&enablejsapi=1`)).toBe(
      true,
    );
    const link = screen.getByRole('link', { name: 'Open on YouTube: Big stream highlights' });
    expect(link).toHaveAttribute('href', video.watchUrl);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: 'Close video' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes with Esc and puts focus back on the Play button', async () => {
    const play = renderTile();
    play.focus();
    fireEvent.click(play);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(play).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('closes with the ✕ button or a tap outside the player', () => {
    fireEvent.click(renderTile());
    fireEvent.click(screen.getByRole('button', { name: 'Close video' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps Tab inside the player while it is open', () => {
    fireEvent.click(renderTile());
    const close = screen.getByRole('button', { name: 'Close video' });
    const youtube = screen.getByRole('link', { name: /Open on YouTube/ });
    youtube.focus();
    fireEvent.keyDown(youtube, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(youtube).toHaveFocus();
  });

  it('falls back to YouTube when the video cannot be embedded', () => {
    fireEvent.click(renderTile());
    const frame = screen.getByTitle('Video: Big stream highlights') as HTMLIFrameElement;
    // A message from anywhere else is ignored.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: '{"event":"onError","info":150}',
          origin: 'https://example.invalid',
          source: frame.contentWindow,
        }),
      );
    });
    expect(screen.getByTitle('Video: Big stream highlights')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: '{"event":"onError","info":150}',
          origin: EMBED_ORIGIN,
          source: frame.contentWindow,
        }),
      );
    });
    expect(screen.getByText('This video can’t be played on this site.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Watch on YouTube/ })).toHaveAttribute(
      'href',
      video.watchUrl,
    );
  });

  it('only treats real embed errors as errors', () => {
    expect(embedErrorCode('{"event":"onError","info":101}')).toBe(101);
    expect(embedErrorCode({ event: 'onError', info: 153 })).toBe(153);
    expect(embedErrorCode('{"event":"onError","info":5}')).toBeNull();
    expect(embedErrorCode('{"event":"infoDelivery"}')).toBeNull();
    expect(embedErrorCode('not json')).toBeNull();
  });

  it('without the player (e.g. a standalone tile), links to YouTube instead', () => {
    render(<ArchiveTile video={video} />);
    expect(
      screen.getByRole('link', { name: 'Watch on YouTube: Big stream highlights' }),
    ).toHaveAttribute('href', video.watchUrl);
  });
});
