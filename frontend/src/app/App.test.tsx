import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

function renderRoute(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
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
    expect(screen.getByRole('link', { name: /visit current site/i })).toHaveAttribute(
      'href',
      'https://b24dul.github.io/b24dul-live/legacy/',
    );
  });

  it('provides complete section shells and no simulated sign-in', () => {
    renderRoute('/profile');
    expect(screen.getByRole('heading', { name: 'Guest profile' })).toBeInTheDocument();
    expect(screen.getByText(/No account has been created or authenticated/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
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
