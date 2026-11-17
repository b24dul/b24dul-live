import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { EmptyState, GlassPanel, PageHeader, StatusIndicator } from '../components/ui';
import { routes } from './navigation';

const content: Record<
  string,
  { title: string; summary: string; details: string; related: string[] }
> = {
  '/watch': {
    title: 'Watch',
    summary: 'Your destination for the B24DUL livestream.',
    details:
      'Stream status and playback will be restored from the existing integration in a later milestone. This preview does not report a live or offline state.',
    related: ['/videos', '/community'],
  },
  '/videos': {
    title: 'Videos',
    summary: 'Find streams, uploads and highlights.',
    details:
      'The production archive is preserved. An adapter for the existing videos.json is planned for Phase 4; no sample thumbnails are presented as real uploads.',
    related: ['/watch', '/explore'],
  },
  '/games': {
    title: 'Game Centre',
    summary: 'Discover games and challenges.',
    details:
      'Sudoku and 2048 remain available on the existing live website. The new frontend has not migrated their local saves, scoreboards or controls.',
    related: ['/competitions', '/explore'],
  },
  '/community': {
    title: 'Community',
    summary: 'A future home for chat and community spaces.',
    details:
      'Live messages, online users, moderation and presence are not connected here. The working legacy community features remain on the current website.',
    related: ['/watch', '/profile'],
  },
  '/tools': {
    title: 'Tools',
    summary: 'Useful utilities in one place.',
    details:
      'The utility directory and individual working tools will be built in later milestones. This shell does not present unavailable tools as active.',
    related: ['/explore', '/settings'],
  },
  '/competitions': {
    title: 'Competitions',
    summary: 'Challenges, rankings and future events.',
    details:
      'No live competition, player score or leaderboard is being displayed. Server-verified scoring is part of later platform work.',
    related: ['/games', '/community'],
  },
  '/profile': {
    title: 'Guest profile',
    summary: 'You are browsing the disconnected frontend as a visitor.',
    details:
      'No account has been created or authenticated. Existing Firebase accounts and identities are untouched.',
    related: ['/settings', '/community'],
  },
  '/settings': {
    title: 'Settings',
    summary: 'Manage your experience as the frontend develops.',
    details:
      'The desktop sidebar can already be collapsed and its preference is saved locally. More appearance and accessibility settings will arrive in Phase 5.',
    related: ['/explore', '/profile'],
  },
  '/admin': {
    title: 'Admin',
    summary: 'Restricted administration is not available in this preview.',
    details:
      'The existing production admin controls are preserved. This screen does not grant privileges or validate administrator access.',
    related: ['/explore', '/profile'],
  },
};

function RouteLinks({ paths }: { paths: string[] }) {
  return (
    <nav aria-label="Related destinations" className="mt-6 flex flex-wrap gap-3">
      {paths.map((path) => {
        const route = routes.find((item) => item.path === path);
        return route ? (
          <Link className="ui-button ui-button--secondary" key={path} to={route.path}>
            {route.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null;
      })}
    </nav>
  );
}

export function ExplorePage() {
  return (
    <section className="flex flex-col gap-7">
      <PageHeader
        title="Explore"
        description="Browse every destination in the new B24DUL experience. This is route navigation, not a live content index."
      />
      <GlassPanel className="p-5 sm:p-7">
        <StatusIndicator status="neutral">All destinations are preview shells</StatusIndicator>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {routes
            .filter((route) => route.path !== '/explore')
            .map(({ path, label, description, icon: Icon }) => (
              <Link to={path} key={path} className="explore-destination">
                <Icon size={22} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-slate-300">{description}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" className="ml-auto shrink-0" />
              </Link>
            ))}
        </div>
      </GlassPanel>
    </section>
  );
}

export function DestinationPage({ path }: { path: string }) {
  const page = content[path];
  if (!page) return <NotFoundPage />;
  return (
    <section className="flex flex-col gap-7">
      <PageHeader title={page.title} description={page.summary} />
      <GlassPanel className="p-6 sm:p-8">
        <StatusIndicator status="neutral">Not connected — development preview</StatusIndicator>
        <p className="mt-5 max-w-2xl leading-relaxed text-slate-200">{page.details}</p>
        <RouteLinks paths={page.related} />
      </GlassPanel>
      {path === '/games' && (
        <GlassPanel className="p-6">
          <h2 className="text-xl font-bold">Play on the current website</h2>
          <p className="mt-2 text-slate-300">
            Continue using the existing game implementations until their preservation and migration
            are tested.
          </p>
          <a
            className="ui-button ui-button--primary mt-4"
            href="https://b24dul.github.io/b24dul-live/"
          >
            Visit current site <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </GlassPanel>
      )}
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Page not found" description="That preview destination does not exist." />
      <EmptyState
        title="Nothing at this address"
        description="The URL may be mistyped. You can safely return home or explore the available sections."
        action={
          <Link className="ui-button ui-button--primary" to="/">
            Return home
          </Link>
        }
      />
      <RouteLinks paths={['/explore']} />
    </section>
  );
}
