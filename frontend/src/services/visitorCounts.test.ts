import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COUNT_ENDPOINT, countPath, countVisit, resetCountsForTests } from './visitorCounts';

function env(overrides: Partial<Parameters<typeof countVisit>[1]> = {}) {
  return {
    host: 'b24dul.github.io',
    webdriver: false,
    skip: false,
    send: vi.fn(),
    referrer: 'https://www.youtube.com/',
    screenWidth: 1280,
    ...overrides,
  };
}

const params = (url: string | null) => new URL(url!).searchParams;

beforeEach(() => resetCountsForTests());

describe('visitor counts (GoatCounter)', () => {
  it('keeps the old home page path and gives each page its own path', () => {
    expect(countPath('/')).toBe('/b24dul-live/');
    expect(countPath('/games')).toBe('/b24dul-live/games');
  });

  it('sends a page view to the same GoatCounter account the old site used', () => {
    const e = env();
    const url = countVisit({ path: '/b24dul-live/', title: 'Home' }, e);
    expect(url!.startsWith(COUNT_ENDPOINT + '?')).toBe(true);
    expect(COUNT_ENDPOINT).toBe('https://b24dul.goatcounter.com/count');
    expect(e.send).toHaveBeenCalledWith(url);
    const p = params(url);
    expect(p.get('p')).toBe('/b24dul-live/');
    expect(p.get('t')).toBe('Home');
    expect(p.get('e')).toBe('false');
    expect(p.get('s')).toBe('1280');
    expect(p.get('r')).toBe('https://www.youtube.com/');
  });

  it('sends where the visitor came from only once per visit, and never with events', () => {
    const e = env();
    countVisit({ path: '/b24dul-live/', title: 'Home' }, e);
    expect(params(countVisit({ path: '/b24dul-live/games', title: 'Games' }, e)).has('r')).toBe(
      false,
    );
    resetCountsForTests();
    const event = countVisit(
      { path: 'click/subscribe', title: 'Clicked Subscribe', event: true },
      e,
    );
    expect(params(event).get('e')).toBe('true');
    expect(params(event).has('r')).toBe(false);
  });

  it('sends nothing that identifies the visitor', () => {
    const url = countVisit({ path: '/b24dul-live/chat', title: 'Chat' }, env());
    expect([...params(url).keys()].sort()).toEqual(['e', 'p', 'r', 's', 't', 'rnd'].sort());
  });

  it('never counts off the published site, in automated browsers, on admin pages or with skipgc', () => {
    for (const e of [
      env({ host: '127.0.0.1:4173' }),
      env({ host: 'localhost:5173' }),
      env({ webdriver: true }),
      env({ skip: true }),
    ]) {
      expect(countVisit({ path: '/b24dul-live/', title: 'Home' }, e)).toBeNull();
      expect(e.send).not.toHaveBeenCalled();
    }
    const e = env();
    expect(countVisit({ path: '/b24dul-live/admin', title: 'Admin' }, e)).toBeNull();
    expect(e.send).not.toHaveBeenCalled();
  });

  it('a blocked request never breaks the page', () => {
    const e = env({
      send: () => {
        throw new Error('blocked');
      },
    });
    expect(() => countVisit({ path: '/b24dul-live/', title: 'Home' }, e)).not.toThrow();
  });
});
