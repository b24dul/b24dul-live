import { countEvent } from '../../services/visitorCounts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PropsWithChildren,
} from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import type { ArchivedVideo } from '../../services/videoArchive';

export const EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
const PlayVideoContext = createContext<((video: ArchivedVideo) => void) | null>(null);

/** YouTube's "can't be played here" error codes (removed, private, or embedding disabled). */
const EMBED_ERRORS = new Set([100, 101, 150, 152, 153]);

export function embedUrl(id: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${EMBED_ORIGIN}/embed/${id}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
}

/** Reads the player's error message; anything that isn't one is ignored. */
export function embedErrorCode(data: unknown): number | null {
  try {
    const message: unknown = typeof data === 'string' ? JSON.parse(data) : data;
    if (typeof message !== 'object' || message === null) return null;
    const { event, info } = message as Record<string, unknown>;
    return event === 'onError' && typeof info === 'number' && EMBED_ERRORS.has(info) ? info : null;
  } catch {
    return null;
  }
}

function focusable(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), iframe, [tabindex="0"]'),
  );
}

function PlayerOverlay({ video, onClose }: { video: ArchivedVideo; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // If YouTube says the video can't be embedded, offer it on YouTube instead.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== EMBED_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (embedErrorCode(event.data) !== null) setBlocked(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function listen() {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'b24dul-video', channel: 'widget' }),
      EMBED_ORIGIN,
    );
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const items = focusable(panel.current);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="video-overlay"
      onKeyDown={handleKey}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="video-overlay-title"
        aria-modal="true"
        className="video-overlay-panel"
        ref={panel}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-base font-semibold sm:text-lg" id="video-overlay-title">
            {video.title}
          </h2>
          <button
            aria-label="Close video"
            className="video-overlay-close"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {blocked ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-black p-6 text-center">
            <p>This video can’t be played on this site.</p>
            <a
              className="ui-button ui-button--primary"
              href={video.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on YouTube <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
              onLoad={listen}
              ref={frame}
              referrerPolicy="strict-origin-when-cross-origin"
              src={embedUrl(video.id)}
              title={'Video: ' + video.title}
            />
          </div>
        )}
        <a
          className="video-overlay-youtube"
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={'Open on YouTube: ' + video.title}
        >
          Open on YouTube <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

/** One video player for the whole site, shown over the page and closable by Esc, ✕ or a tap outside. */
export function VideoPlayerProvider({ children }: PropsWithChildren) {
  const [video, setVideo] = useState<ArchivedVideo | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const play = useCallback((next: ArchivedVideo) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setVideo(next);
    countEvent(`video/${next.id}`, `Played: ${next.title}`);
  }, []);
  const close = useCallback(() => {
    // The list may have re-rendered while the video played; then find the same video's Play button.
    // Video IDs are validated as [A-Za-z0-9_-]{11}, so they're safe in a selector.
    const target = opener.current?.isConnected
      ? opener.current
      : video && document.querySelector<HTMLElement>(`[data-play-video="${video.id}"]`);
    setVideo(null);
    window.setTimeout(() => target?.focus(), 0);
  }, [video]);
  return (
    <PlayVideoContext.Provider value={play}>
      {children}
      {video && <PlayerOverlay key={video.id} video={video} onClose={close} />}
    </PlayVideoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayVideo() {
  return useContext(PlayVideoContext);
}
