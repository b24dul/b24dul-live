import { describe, expect, it } from 'vitest';
import { looksLikeDockedDevtools, watchDevtools, type WindowSize } from './devtoolsHint';

const normal: WindowSize = {
  outerWidth: 1600,
  outerHeight: 1000,
  innerWidth: 1600,
  innerHeight: 880,
};

describe('looksLikeDockedDevtools', () => {
  it('is quiet for normal windows, bookmarks bars, maximised and small windows', () => {
    expect(looksLikeDockedDevtools(normal)).toBe(false);
    expect(looksLikeDockedDevtools({ ...normal, innerHeight: 840 })).toBe(false);
    expect(looksLikeDockedDevtools({ ...normal, outerWidth: 1616 })).toBe(false); // window borders
    expect(
      looksLikeDockedDevtools({
        outerWidth: 800,
        outerHeight: 600,
        innerWidth: 800,
        innerHeight: 500,
      }),
    ).toBe(false);
  });

  it('is quiet when the page is zoomed (both gaps grow)', () => {
    // 125% zoom: page sizes shrink by 1/1.25 in both directions.
    expect(looksLikeDockedDevtools({ ...normal, innerWidth: 1280, innerHeight: 704 })).toBe(false);
    expect(looksLikeDockedDevtools({ ...normal, innerWidth: 800, innerHeight: 440 })).toBe(false);
  });

  it('notices dev tools docked at the side or the bottom', () => {
    expect(looksLikeDockedDevtools({ ...normal, innerWidth: 1100 })).toBe(true);
    expect(looksLikeDockedDevtools({ ...normal, innerHeight: 500 })).toBe(true);
  });

  it('ignores missing sizes', () => {
    expect(
      looksLikeDockedDevtools({ outerWidth: 0, outerHeight: 0, innerWidth: 0, innerHeight: 0 }),
    ).toBe(false);
  });
});

describe('watchDevtools', () => {
  function fake(sizes: WindowSize[], desktop = true) {
    let tick = () => {};
    let index = 0;
    const environment = {
      size: () => sizes[Math.min(index++, sizes.length - 1)]!,
      desktop: () => desktop,
      every: (_ms: number, check: () => void) => {
        tick = check;
        return () => {};
      },
    };
    return { environment, tick: () => tick() };
  }
  const open = { ...normal, innerWidth: 1100 };

  it('needs the sign on two checks in a row', () => {
    const single = fake([open, normal, open, normal]);
    const watch = watchDevtools(single.environment);
    single.tick();
    single.tick();
    single.tick();
    expect(watch.flagged()).toBe(false);
    const twice = fake([normal, open, open]);
    const second = watchDevtools(twice.environment);
    twice.tick();
    twice.tick();
    expect(second.flagged()).toBe(true);
  });

  it('stays flagged for the rest of the session once seen', () => {
    const session = fake([open, open, normal, normal]);
    const watch = watchDevtools(session.environment);
    session.tick();
    session.tick();
    session.tick();
    expect(watch.flagged()).toBe(true);
  });

  it('never flags phones and tablets', () => {
    const phone = fake([open, open, open], false);
    const watch = watchDevtools(phone.environment);
    phone.tick();
    phone.tick();
    expect(watch.flagged()).toBe(false);
  });
});
