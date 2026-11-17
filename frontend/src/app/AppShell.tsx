import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowUpRight, Bell, ChevronsLeft, ChevronsRight, Search, UserRound } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Modal, SecondaryButton, StatusIndicator } from '../components/ui';
import { findDestination, mobileRoutes, routes } from './navigation';

const preferenceKey = 'b24dul.sidebar.collapsed.v1';

function readSidebarPreference(): boolean {
  try {
    return window.localStorage.getItem(preferenceKey) === 'true';
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readSidebarPreference);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const current = routes.find((route) => route.path === location.pathname);

  useEffect(() => {
    document.title = (current?.label ?? 'Page not found') + ' | B24DUL Preview';
    const heading = document.querySelector<HTMLElement>('#route-content h1');
    heading?.focus({ preventScroll: true });
  }, [location.pathname, current?.label]);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(preferenceKey, String(next));
      } catch {
        // Storage might be disabled; the control still works for this session.
      }
      return next;
    });
  }

  function goToKnownSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = findDestination(search);
    if (!match) {
      setSearchError('No matching section. Browse Explore for all available destinations.');
      return;
    }
    setSearchError('');
    setSearch('');
    navigate(match.path);
  }

  return (
    <div className="app-layout" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      <a href="#route-content" className="skip-link">
        Skip to content
      </a>
      <aside className="app-sidebar glass-panel" aria-label="Desktop navigation">
        <div className="app-sidebar-brand">
          <Link to="/" aria-label="B24DUL preview home" className="brand-mark">
            B
          </Link>
          {!collapsed && <span className="min-w-0 font-extrabold tracking-widest">B24DUL</span>}
        </div>
        <nav aria-label="Main navigation" className="app-sidebar-nav">
          {routes.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                'app-nav-link' + (isActive ? ' app-nav-link--active' : '')
              }
            >
              <Icon size={19} aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={collapsed ? <ChevronsRight size={19} /> : <ChevronsLeft size={19} />}
            onClick={toggleSidebar}
          />
          {!collapsed && <span className="text-xs text-slate-300">Local display preference</span>}
        </div>
      </aside>
      <div className="app-main-area">
        <header className="app-global-header">
          <div className="app-header-intro">
            <Link to="/" className="mobile-brand" aria-label="B24DUL preview home">
              B24DUL
            </Link>
            <div className="header-section-name" aria-live="polite">
              <span className="text-xs text-slate-300">DEVELOPMENT PREVIEW</span>
              <span className="font-semibold">{current?.label ?? 'Not found'}</span>
            </div>
          </div>
          <form role="search" className="header-search" onSubmit={goToKnownSection}>
            <label className="sr-only" htmlFor="section-search">
              Find a section
            </label>
            <Search aria-hidden="true" size={17} />
            <input
              id="section-search"
              type="search"
              placeholder="Find a section"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (searchError) setSearchError('');
              }}
            />
            <button type="submit" aria-label="Go to section" title="Go to section">
              Go
            </button>
          </form>
          <div className="app-header-actions">
            <IconButton
              label="Notifications"
              icon={<Bell size={18} />}
              onClick={() => setNotificationsOpen(true)}
            />
            <Link to="/profile" className="app-guest-link" aria-label="Guest profile">
              <UserRound size={17} aria-hidden="true" />
              <span>Guest</span>
            </Link>
          </div>
          {searchError && (
            <p role="status" className="header-search-error">
              {searchError}
            </p>
          )}
        </header>
        <div className="app-preview-banner">
          <StatusIndicator status="neutral">
            Prototype only — no authentication, streaming or Firebase connection
          </StatusIndicator>
          <a
            href="https://b24dul.github.io/b24dul-live/"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
          >
            Visit current site <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <motion.div
          key={location.pathname}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="app-page-transition"
        >
          <div id="route-content" className="app-page-container">
            {children}
          </div>
        </motion.div>
      </div>
      <nav className="app-mobile-nav" aria-label="Mobile navigation">
        {mobileRoutes.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              'app-mobile-nav-link' + (isActive ? ' app-mobile-nav-link--active' : '')
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Modal
        open={notificationsOpen}
        title="Notifications"
        onClose={() => setNotificationsOpen(false)}
      >
        <p className="text-slate-300">
          Notifications are not connected in this development preview. Nothing has been fetched from
          your account.
        </p>
        <SecondaryButton className="mt-5" onClick={() => setNotificationsOpen(false)}>
          Close
        </SecondaryButton>
      </Modal>
    </div>
  );
}
