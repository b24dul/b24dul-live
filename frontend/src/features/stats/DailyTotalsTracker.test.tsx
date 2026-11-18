import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStatusProvider } from '../../contexts/LiveStatusContext';
import type { PublishedLiveStatus } from '../../services/liveStatus';

const countTotals = vi.fn();
vi.mock('../../services/visitorCounts', () => ({ countTotals: (m: unknown) => countTotals(m) }));
const { DailyTotalsTracker, visitMetrics } = await import('./DailyTotalsTracker');

function renderAt(path: string, status: PublishedLiveStatus) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LiveStatusProvider fetchStatus={async () => status} refreshMs={100000}>
        <DailyTotalsTracker minuteMs={50} />
      </LiveStatusProvider>
    </MemoryRouter>,
  );
}
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

beforeEach(() => {
  countTotals.mockClear();
  window.sessionStorage.clear();
});
afterEach(() => window.sessionStorage.clear());

describe('DailyTotalsTracker', () => {
  it('counts the visit once per tab per day, with device and source', () => {
    expect(visitMetrics()).toEqual(['visits', 'deviceDesktop', 'sourceDirect']);
    expect(visitMetrics()).toEqual([]);
  });

  it('adds site minutes while the page is visible', async () => {
    renderAt('/games', { state: 'offline', checkedAt: 1 });
    expect(countTotals).toHaveBeenCalledWith(['visits', 'deviceDesktop', 'sourceDirect']);
    await wait(80);
    expect(countTotals).toHaveBeenCalledWith(['siteMinutes']);
    expect(countTotals).not.toHaveBeenCalledWith(['siteMinutes', 'liveMinutes']);
  });

  it('adds live-watching minutes only on the Watch page during a stream', async () => {
    renderAt('/watch', { state: 'live', checkedAt: 1, videoId: '1yVlKouJnag' });
    // The live status arrives a little after the first render; give it a few ticks.
    await vi.waitFor(() =>
      expect(countTotals).toHaveBeenCalledWith(['siteMinutes', 'liveMinutes']),
    );
  });

  it('counts nothing while the page is hidden', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    renderAt('/watch', { state: 'live', checkedAt: 1, videoId: '1yVlKouJnag' });
    countTotals.mockClear();
    await wait(80);
    expect(countTotals).not.toHaveBeenCalled();
    hidden.mockRestore();
  });
});
