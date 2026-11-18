import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { AccountProvider } from '../contexts/AccountContext';
import type { AccountRuntime } from '../services/accountRuntime';

// Unit tests never load Firebase: the runtime reports a signed-out visitor.
const signedOutRuntime = async (): Promise<AccountRuntime> => ({
  subscribe: (onSession) => {
    onSession({ status: 'ready', identity: { kind: 'signed-out' } }, null);
    return () => {};
  },
  transitions: {
    enterAnonymously: async () => ({ type: 'failed' }),
    enterWithGoogle: async () => ({ type: 'failed' }),
    signOut: async () => ({ type: 'failed' }),
  },
});

function renderRoute(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccountProvider loadRuntime={signedOutRuntime}>
        <App />
      </AccountProvider>
    </MemoryRouter>,
  );
}

describe('application shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the banner hero with the agreed alt text, and never links to the old site', () => {
    renderRoute();
    expect(screen.getByRole('heading', { level: 1, name: 'B24DUL' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'B24DUL Live' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest videos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument();
    expect(document.querySelector('a[href*="legacy"]')).toBeNull();
  });

  it('uses the banner only on the home page and the Watch page', () => {
    for (const path of ['/videos', '/games', '/community', '/profile', '/privacy', '/settings']) {
      const { unmount } = renderRoute(path);
      expect(document.querySelector('img[alt="B24DUL Live"]'), path).toBeNull();
      unmount();
    }
  });

  it('offers real sign-in choices on the account page', async () => {
    renderRoute('/profile');
    expect(screen.getByRole('heading', { name: 'Your account' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Not signed in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeEnabled();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('links every page to a privacy notice that promises names and emails stay private', () => {
    renderRoute('/');
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    renderRoute('/privacy');
    expect(screen.getByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getAllByText(/never shown to other people/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Firebase Authentication/).length).toBeGreaterThan(0);
  });

  it('renders a useful page for unknown paths', () => {
    renderRoute('/not-real');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  });

  it('top bar: wordmark, the five main links and the account link', () => {
    renderRoute();
    expect(screen.getByRole('link', { name: 'B24DUL Live home' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Watch', 'Videos', 'Games', 'Community']);
    expect(screen.getByRole('link', { name: 'Your account' })).toHaveAttribute('href', '/profile');
  });

  it('phone menu: opens with every page, closes with Escape or after choosing a page', () => {
    renderRoute();
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    const menu = screen.getByRole('navigation', { name: 'Site menu' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Watch', 'Videos', 'Games', 'Community', 'Profile', 'Settings']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Site menu' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Site menu' })).getByRole('link', {
        name: 'Settings',
      }),
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Site menu' })).not.toBeInTheDocument();
  });
});
