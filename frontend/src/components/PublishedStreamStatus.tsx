import { useEffect, useState } from 'react';
import { ArrowUpRight, Radio } from 'lucide-react';
import { GlassPanel, StatusIndicator } from './ui';
import { fetchPublishedLiveStatus, type PublishedLiveStatus } from '../services/liveStatus';

const REFRESH_MS = 60_000;
const DIRECT_CHANNEL_URL = 'https://www.youtube.com/channel/UCnXAfqk5I7QE3frLhHHyImQ/live';

export function PublishedStreamStatus() {
  const [status, setStatus] = useState<PublishedLiveStatus>({
    state: 'unavailable',
    reason: 'network',
  });

  useEffect(() => {
    let active = true;
    let pending: AbortController | undefined;
    async function refresh() {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const result = await fetchPublishedLiveStatus(controller.signal);
      if (active && !controller.signal.aborted) setStatus(result);
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      active = false;
      pending?.abort();
      window.clearInterval(interval);
    };
  }, []);

  const live = status.state === 'live';
  const offline = status.state === 'offline';
  return (
    <GlassPanel className="p-5 sm:p-7" aria-label="Published live detection">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Radio size={22} aria-hidden="true" className="text-brand-cyan" />
          <h2 className="text-lg font-semibold">Published broadcast status</h2>
        </div>
        <div data-testid="published-live-status">
          <StatusIndicator status={live ? 'success' : 'neutral'}>
            {live ? 'LIVE confirmed' : offline ? 'Offline confirmed' : 'Status unavailable'}
          </StatusIndicator>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {live
          ? 'The existing monitor recently confirmed a YouTube broadcast. The new player is not yet connected.'
          : offline
            ? 'The existing monitor recently confirmed the channel was offline. Playback remains accessible.'
            : 'The current broadcast state could not be verified. This does not mean the channel is offline.'}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Read-only public monitor; results may be delayed. No Firebase account or data is accessed
        directly.
      </p>
      <a
        className="ui-button ui-button--secondary mt-4"
        href={DIRECT_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open YouTube live channel <ArrowUpRight size={16} aria-hidden="true" />
      </a>
      {live && (
        <a
          className="ui-button ui-button--secondary mt-3 sm:ml-3"
          href={'https://www.youtube.com/watch?v=' + status.videoId}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open confirmed broadcast <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </GlassPanel>
  );
}
