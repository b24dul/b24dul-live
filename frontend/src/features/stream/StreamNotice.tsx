import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { useLiveStatus, type LiveStatus } from '../../contexts/LiveStatusContext';

const DISMISSED_KEY = 'b24dul-v2-live-notice';

function dismissedId() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * "Stream just started" banner, as on the old site: it appears when the stream goes live while
 * the page is open (not on first load), never on the Watch page, and once per broadcast per visit.
 */
export function StreamNotice() {
  const status = useLiveStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const previous = useRef<LiveStatus | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (status.state === 'checking') return;
    const before = previous.current;
    previous.current = status;
    if (status.state !== 'live') {
      if (status.state === 'offline') setVideoId(null);
      return;
    }
    if (before === null) return; // the site was opened while live: don't interrupt
    if (before.state === 'live' && before.videoId === status.videoId) return;
    if (dismissedId() === status.videoId) return;
    setVideoId(status.videoId);
  }, [status]);

  function dismiss() {
    try {
      if (videoId) window.sessionStorage.setItem(DISMISSED_KEY, videoId);
    } catch {
      // Storage can be unavailable; the banner still closes.
    }
    setVideoId(null);
  }

  if (!videoId || location.pathname === '/watch') return null;
  return (
    <div className="stream-notice" role="status" aria-live="polite">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="stream-notice-live">● LIVE NOW</span>
        <strong>B24DUL has started streaming!</strong>
        <span className="text-sm text-slate-300">
          Jump into the broadcast, or carry on where you are.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton
          onClick={() => {
            dismiss();
            navigate('/watch');
          }}
        >
          Watch stream
        </PrimaryButton>
        <SecondaryButton onClick={dismiss}>Not now</SecondaryButton>
      </div>
    </div>
  );
}
