import { DailyTotalsTracker } from '../features/stats/DailyTotalsTracker';
import { countPath, countVisit } from '../services/visitorCounts';
import { StreamNotice } from '../features/stream/StreamNotice';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, UserRound, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { usePreferences } from '../contexts/PreferencesContext';
import { useLiveStatus } from '../contexts/LiveStatusContext';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { mainRoutes, moreRoutes, routes } from './navigation';

const titleFor = (pathname: string, label?: string) =>
  label ?? (pathname === '/privacy' ? 'Privacy' : 'Not found');

export function AppShell({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const live = useLiveStatus().state === 'live';
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = preferences.motion === 'reduce' || systemReducedMotion;
  const current = routes.find((route) => route.path === location.pathname);

  useEffect(() => {
    document.title = (current?.label ?? 'Page not found') + ' | B24DUL Live';
    const heading = document.querySelector<HTMLElement>('#route-content h1');
    heading?.focus({ preventScroll: true });
    countVisit({
      path: countPath(location.pathname),
      title: titleFor(location.pathname, current?.label),
    });
    setMenuOpen(false);
  }, [location.pathname, current?.label]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        document.getElementById('site-menu-button')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div
      className="app-layout"
      data-density={preferences.density}
      data-motion={reducedMotion ? 'reduce' : 'system'}
    >
      <a
        href="#route-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('route-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="wordmark" aria-label="B24DUL Live home">
            B24DUL
          </Link>
          <nav aria-label="Main navigation" className="topbar-nav">
            {mainRoutes.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  'topbar-link' + (isActive ? ' topbar-link--active' : '')
                }
              >
                {label}
                {path === '/watch' && live && (
                  <span className="topbar-live">
                    <span className="live-dot live-dot--small" aria-hidden="true" />
                    LIVE
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                'topbar-account' + (isActive ? ' topbar-account--active' : '')
              }
              aria-label="Your account"
            >
              <span className="topbar-avatar" aria-hidden="true">
                <UserRound size={18} />
              </span>
              <span>Account</span>
            </NavLink>
            <button
              id="site-menu-button"
              type="button"
              className="ui-button ui-button--secondary ui-icon-button topbar-menu-button"
              aria-label={menuOpen ? 'Close menu' : 'Menu'}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="site-menu" aria-label="Site menu" className="topbar-menu glass-panel">
            {[...mainRoutes, null, ...moreRoutes].map((route) =>
              route === null ? (
                <hr key="divider" />
              ) : (
                <NavLink key={route.path} to={route.path} end={route.path === '/'}>
                  <route.icon size={19} aria-hidden="true" />
                  {route.label}
                  {route.path === '/watch' && live && (
                    <span className="topbar-live">
                      <span className="live-dot live-dot--small" aria-hidden="true" />
                      LIVE
                    </span>
                  )}
                </NavLink>
              ),
            )}
          </nav>
        )}
      </header>
      <StreamNotice />
      <DailyTotalsTracker />
      <motion.div
        key={location.pathname}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        className="app-page-transition"
      >
        <main id="route-content" tabIndex={-1} className="app-page-container">
          {children}
          <footer className="app-page-footer">
            <span className="wordmark" aria-hidden="true">
              B24DUL
            </span>
            <nav aria-label="More pages">
              {moreRoutes
                .filter((route) => route.path !== '/profile')
                .map((route) => (
                  <Link key={route.path} to={route.path}>
                    {route.label}
                  </Link>
                ))}
              <Link to="/privacy">Privacy notice</Link>
            </nav>
          </footer>
        </main>
      </motion.div>
    </div>
  );
}
