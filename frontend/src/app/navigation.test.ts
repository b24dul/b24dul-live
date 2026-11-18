import { describe, expect, it } from 'vitest';
import { findDestination, mainRoutes, moreRoutes, routes } from './navigation';

describe('navigation registry', () => {
  it('declares the eight routes', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/watch',
      '/videos',
      '/games',
      '/community',
      '/profile',
      '/settings',
      '/admin',
    ]);
    expect(new Set(routes.map((route) => route.path)).size).toBe(8);
  });

  it('puts the five agreed links in the top bar and every other page in the menu', () => {
    expect(mainRoutes.map((route) => route.label)).toEqual([
      'Home',
      'Watch',
      'Videos',
      'Games',
      'Community',
    ]);
    expect([...mainRoutes, ...moreRoutes].map((route) => route.path).sort()).toEqual(
      routes.map((route) => route.path).sort(),
    );
  });

  it('only resolves known sections and trims user input', () => {
    expect(findDestination(' GAMES ')?.path).toBe('/games');
    expect(findDestination('game centre')?.path).toBe('/games');
    expect(findDestination('not a real feature')).toBeUndefined();
  });
});
