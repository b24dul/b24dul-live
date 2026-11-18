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

describe('isolated application shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('identifies the home page as a preview and links to the live site', () => {
    renderRoute();
    expect(screen.getByText('Isolated development preview')).toBeInTheDocument();
    expect(document.querySelector('a[href*="legacy"]')).toBeNull();
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

  it('collapses the sidebar and persists its local preference', () => {
    renderRoute();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem('b24dul.preferences.v1') || '{}').sidebarCollapsed,
    ).toBe(true);
  });

  it('navigates only to named sections using the header search', () => {
    renderRoute();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a section' }), {
      target: { value: 'not-real' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Go to section' }));
    expect(screen.getByText(/No matching section/)).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a section' }), {
      target: { value: 'tools' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Go to section' }));
    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
  });

  it('makes all five mobile destinations available', () => {
    renderRoute();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Watch', 'Games', 'Community', 'Explore']);
  });
});
