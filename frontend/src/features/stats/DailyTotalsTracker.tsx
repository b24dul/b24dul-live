import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveStatus } from '../../contexts/LiveStatusContext';
import { deviceMetric, sourceMetric, statsDay, type Metric } from '../../services/dailyTotals';
import { countTotals } from '../../services/visitorCounts';

const VISIT_KEY = 'b24dul-v2-visit-day';
export const MINUTE_MS = 60_000;

/** First visit of the day in this tab: visits, device type and where the visitor came from. */
export function visitMetrics(): Metric[] {
  try {
    if (window.sessionStorage.getItem(VISIT_KEY) === statsDay()) return [];
    window.sessionStorage.setItem(VISIT_KEY, statsDay());
  } catch {
    // Storage blocked: count the visit anyway.
  }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const shortest = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return [
    'visits',
    deviceMetric(coarse, shortest),
    sourceMetric(document.referrer, window.location.host),
  ];
}

/**
 * Adds this visit to the daily totals, then one minute on the site for each full minute the page
 * is visible, and one minute of live watching while on the Watch page during a stream.
 */
export function DailyTotalsTracker({ minuteMs = MINUTE_MS }: { minuteMs?: number }) {
  const status = useLiveStatus();
  const { pathname } = useLocation();
  const now = useRef({ live: false, pathname });
  now.current = { live: status.state === 'live', pathname };

  useEffect(() => {
    countTotals(visitMetrics());
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const { live, pathname: path } = now.current;
      countTotals(live && path === '/watch' ? ['siteMinutes', 'liveMinutes'] : ['siteMinutes']);
    }, minuteMs);
    return () => window.clearInterval(timer);
  }, [minuteMs]);

  return null;
}
