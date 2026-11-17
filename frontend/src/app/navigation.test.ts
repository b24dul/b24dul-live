import { describe, expect, it } from 'vitest';
import { findDestination, mobileRoutes, routes } from './navigation';

describe('navigation registry', () => {
  it('declares all eleven unique planned routes', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/explore',
      '/watch',
      '/videos',
      '/games',
      '/community',
      '/tools',
      '/competitions',
      '/profile',
      '/settings',
      '/admin',
    ]);
    expect(new Set(routes.map((route) => route.path)).size).toBe(11);
  });

  it('prioritises the five agreed mobile destinations', () => {
    expect(mobileRoutes.map((route) => route.label)).toEqual([
      'Home',
      'Watch',
      'Games',
      'Community',
      'Explore',
    ]);
  });

  it('only resolves known sections and trims user input', () => {
    expect(findDestination(' GAMES ')?.path).toBe('/games');
    expect(findDestination('game centre')?.path).toBe('/games');
    expect(findDestination('not a real feature')).toBeUndefined();
  });
});
