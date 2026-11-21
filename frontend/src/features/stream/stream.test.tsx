import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LiveStatusProvider } from '../../contexts/LiveStatusContext';
import type { PublishedLiveStatus } from '../../services/liveStatus';
import { StreamNotice } from './StreamNotice';
import { SUBSCRIBE_URL, WatchStream } from './WatchStream';

const live = (videoId = '1yVlKouJnag'): PublishedLiveStatus => ({
  state: 'live',
  checkedAt: 1,
  videoId,
});
const offline: PublishedLiveStatus = { state: 'offline', checkedAt: 1 };
const unknown: PublishedLiveStatus = { state: 'unavailable', reason: 'network' };

/** A monitor whose answer the test changes, polled every 20 ms. */
function monitor(first: PublishedLiveStatus) {
  let current = first;
  return {
    set: (next: PublishedLiveStatus) => (current = next),
    fetchStatus: async () => current,
  };
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(path: string, source: ReturnType<typeof monitor>, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LiveStatusProvider fetchStatus={source.fetchStatus} refreshMs={20}>
        {ui}
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </LiveStatusProvider>
    </MemoryRouter>,
  );
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe('StreamNotice', () => {
  it('appears when the stream starts while the page is open, and Watch goes to the Watch page', async () => {
    const source = monitor(offline);
    renderAt('/games', source, <StreamNotice />);
    await wait(30);
    expect(screen.queryByText('B24DUL has started streaming!')).not.toBeInTheDocument();
    source.set(live());
    expect(await screen.findByText('B24DUL has started streaming!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Watch stream' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/watch');
    expect(screen.queryByText('B24DUL has started streaming!')).not.toBeInTheDocument();
  });

  it('does not interrupt someone who opens the site while already live', async () => {
    renderAt('/', monitor(live()), <StreamNotice />);
    await wait(80);
    expect(screen.queryByText('B24DUL has started streaming!')).not.toBeInTheDocument();
  });

  it('stays dismissed for that broadcast, but shows again for a new one', async () => {
    const source = monitor(offline);
    renderAt('/', source, <StreamNotice />);
    await wait(30);
    source.set(live('aaaaaaaaaaa'));
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    source.set(offline);
    await wait(40);
    source.set(live('aaaaaaaaaaa'));
    await wait(60);
    expect(screen.queryByText('B24DUL has started streaming!')).not.toBeInTheDocument();
    source.set(live('bbbbbbbbbbb'));
    expect(await screen.findByText('B24DUL has started streaming!')).toBeInTheDocument();
  });

  it('is never shown on the Watch page', async () => {
    const source = monitor(offline);
    renderAt('/watch', source, <StreamNotice />);
    await wait(30);
    source.set(live());
    await wait(60);
    expect(screen.queryByText('B24DUL has started streaming!')).not.toBeInTheDocument();
  });
});

describe('WatchStream', () => {
  it('when live, shows the stream with chat beside it, Subscribe and a YouTube link', async () => {
    renderAt('/watch', monitor(live()), <WatchStream chat={<p>Chat here</p>} />);
    expect(await screen.findByRole('heading', { name: 'B24DUL is live now' })).toBeInTheDocument();
    expect(screen.getByTitle('B24DUL live stream')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/1yVlKouJnag?autoplay=1&mute=1&rel=0',
    );
    expect(screen.getByText('Chat here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', SUBSCRIBE_URL);
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=1yVlKouJnag',
    );
  });

  it('when offline, says so clearly, shows the latest videos and no player', async () => {
    renderAt('/watch', monitor(offline), <WatchStream chat={<p>Chat here</p>} />);
    expect(
      await screen.findByRole('heading', { name: 'B24DUL is offline right now' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest videos' })).toBeInTheDocument();
    expect(screen.queryByTitle('B24DUL live stream')).not.toBeInTheDocument();
    expect(screen.queryByText('Chat here')).not.toBeInTheDocument();
  });

  it('when the check fails, says so and offers the player anyway', async () => {
    renderAt('/watch', monitor(unknown), <WatchStream />);
    expect(
      await screen.findByRole('heading', { name: 'We couldn’t check whether B24DUL is live' }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle('B24DUL live stream')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open the player anyway' }));
    expect(screen.getByTitle('B24DUL live stream')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/live_stream?channel=UCnXAfqk5I7QE3frLhHHyImQ&autoplay=1&mute=1',
    );
  });
});
