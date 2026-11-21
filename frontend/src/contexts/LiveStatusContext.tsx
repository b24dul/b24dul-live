import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { fetchPublishedLiveStatus, type PublishedLiveStatus } from '../services/liveStatus';

export type LiveStatus = PublishedLiveStatus | { state: 'checking' };
export type FetchLiveStatus = (signal: AbortSignal) => Promise<PublishedLiveStatus>;

const REFRESH_MS = 60_000;
const LiveStatusContext = createContext<LiveStatus>({ state: 'checking' });

/** One shared, read-only poll of the live monitor for the whole site. */
export function LiveStatusProvider({
  children,
  fetchStatus = fetchPublishedLiveStatus,
  refreshMs = REFRESH_MS,
}: PropsWithChildren<{ fetchStatus?: FetchLiveStatus; refreshMs?: number }>) {
  const [status, setStatus] = useState<LiveStatus>({ state: 'checking' });
  useEffect(() => {
    let active = true;
    let pending: AbortController | undefined;
    async function refresh() {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const result = await fetchStatus(controller.signal);
      if (active && !controller.signal.aborted) setStatus(result);
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), refreshMs);
    return () => {
      active = false;
      pending?.abort();
      window.clearInterval(interval);
    };
  }, [fetchStatus, refreshMs]);
  return <LiveStatusContext.Provider value={status}>{children}</LiveStatusContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveStatus() {
  return useContext(LiveStatusContext);
}
