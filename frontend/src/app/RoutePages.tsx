import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Gamepad2,
  LockKeyhole,
  MessageCircle,
  Settings2,
  Shield,
  Trophy,
  Wrench,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ArchiveTile,
  EditorialSection,
  FeatureTile,
  PlannedPanel,
  StreamPresentation,
} from '../components/SectionBlocks';
import { EmptyState, GlassPanel, PageHeader, StatusIndicator } from '../components/ui';
import { games, utilities } from '../data/directory';
import { useVideoArchive } from '../contexts/videoArchiveState';
import { PublishedStreamStatus } from '../components/PublishedStreamStatus';
import { PreferenceControls } from '../components/PreferenceControls';
import { PrivacyRequest } from '../features/privacy/PrivacyRequest';
import { AccountPanel } from '../features/account/AccountPanel';
import { routes } from './navigation';

const Practice2048 = lazy(() =>
  import('../features/games/Practice2048').then((module) => ({ default: module.Practice2048 })),
);
const PracticeSudoku = lazy(() =>
  import('../features/games/PracticeSudoku').then((module) => ({ default: module.PracticeSudoku })),
);

const website = 'https://b24dul.github.io/b24dul-live/legacy/';

function RelatedLinks({ paths }: { paths: string[] }) {
  return (
    <nav aria-label="Related destinations" className="flex flex-wrap gap-3">
      {paths.map((path) => {
        const route = routes.find((item) => item.path === path);
        return route ? (
          <Link className="ui-button ui-button--secondary" key={path} to={path}>
            {route.label} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null;
      })}
    </nav>
  );
}

function PageFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-8">
      <PageHeader title={title} description={description} />
      {children}
    </section>
  );
}

export function ExplorePage() {
  return (
    <PageFrame
      title="Explore"
      description="Discover the destinations, entertainment and community spaces B24DUL is building."
    >
      <GlassPanel className="p-5 sm:p-7">
        <StatusIndicator status="neutral">
          Platform directory — not a live content search
        </StatusIndicator>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {routes
            .filter((route) => route.path !== '/explore')
            .map(({ path, label, description, icon: Icon }) => (
              <Link to={path} key={path} className="explore-destination">
                <Icon size={22} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-slate-300">{description}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
              </Link>
            ))}
        </div>
      </GlassPanel>
      <EditorialSection
        title="Find your next experience"
        description="Follow the routes to preview what each part of B24DUL will become."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureTile
            title="Watch and discover"
            description="Streams, archive and entertainment."
            icon={<Compass size={23} />}
            to="/watch"
          />
          <FeatureTile
            title="Play and compete"
            description="Existing games and future community challenges."
            icon={<Trophy size={23} />}
            to="/games"
          />
        </div>
      </EditorialSection>
    </PageFrame>
  );
}

function WatchPage() {
  return (
    <PageFrame
      title="Watch"
      description="The home for broadcasts, highlights and the B24DUL channel."
    >
      <StreamPresentation />
      <PublishedStreamStatus />
      <div className="grid gap-5 md:grid-cols-2">
        <PlannedPanel
          title="Stream schedule"
          description="A calendar will appear when verified schedule data is available. No broadcast time is currently provided."
        />
        <PlannedPanel
          title="Polls and community"
          description="Live audience interaction will be connected in a later milestone. Chat and current stream features remain on the published website."
        />
      </div>
      <RelatedLinks paths={['/videos', '/community']} />
    </PageFrame>
  );
}

function VideosPage() {
  const { videos, source } = useVideoArchive();
  return (
    <PageFrame
      title="Videos"
      description="Browse actual upload metadata from the repository's existing YouTube archive."
    >
      <GlassPanel className="p-5 sm:p-7">
        <StatusIndicator status="neutral">
          {source === 'published'
            ? 'Read-only published archive'
            : source === 'checking'
              ? 'Read-only archive snapshot — checking for updates'
              : 'Read-only archive snapshot — latest archive unavailable'}
        </StatusIndicator>
        <p className="mt-3 text-sm text-slate-300">
          Titles, IDs and published dates come from the existing videos.json file. If the published
          archive cannot be read, the preview shows its build-time snapshot. Videos open on YouTube.
        </p>
      </GlassPanel>
      <EditorialSection title="Archive" description="Open an item to watch it on YouTube.">
        {videos.length ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <ArchiveTile key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <PlannedPanel
            title="No videos in the snapshot"
            description="The source file is empty or invalid; check the current production archive for updated information."
          />
        )}
      </EditorialSection>
      <RelatedLinks paths={['/watch', '/explore']} />
    </PageFrame>
  );
}

function GamesPage() {
  return (
    <PageFrame
      title="Game Centre"
      description="Play practice games and find favourites on the current site."
    >
      <GlassPanel className="p-5 sm:p-7">
        <StatusIndicator status="neutral">
          Existing games remain on the published site
        </StatusIndicator>
        <p className="mt-3 text-sm text-slate-300">
          Sudoku and 2048 remain available on the published site. Practice games below do not change
          existing saves or leaderboard records.
        </p>
        <a className="ui-button ui-button--primary mt-4" href={website}>
          Play on the current website <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </GlassPanel>
      <Suspense fallback={<p role="status">Loading practice games…</p>}>
        <Practice2048 />
        <PracticeSudoku />
      </Suspense>
      <EditorialSection title="Browse games" description="Availability is labelled for every game.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <GlassPanel className="flex min-w-0 flex-col gap-4 p-5" key={game.name}>
              <div className="flex items-center justify-between gap-3">
                <Gamepad2 className="text-brand-cyan" size={24} aria-hidden="true" />
                <span className="text-xs text-slate-300">{game.category}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{game.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{game.description}</p>
              </div>
              <div className="mt-auto">
                {game.availability === 'existing-site' ? (
                  <a className="ui-button ui-button--secondary" href={website}>
                    Open current site <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                ) : (
                  <StatusIndicator status="neutral">Coming soon</StatusIndicator>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      </EditorialSection>
      <RelatedLinks paths={['/competitions', '/explore']} />
    </PageFrame>
  );
}

function CommunityPage() {
  return (
    <PageFrame
      title="Community"
      description="A home for conversations, announcements and shared experiences."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassPanel className="p-6 lg:col-span-2">
          <StatusIndicator status="neutral">Chat is not connected in this preview</StatusIndicator>
          <div className="community-placeholder">
            <MessageCircle size={38} className="text-brand-cyan" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Your conversations belong here</h2>
            <p className="max-w-md text-sm text-slate-300">
              Existing messages, channels and presence remain on the published site. No sample
              messages or online-user totals are invented.
            </p>
            <a className="ui-button ui-button--secondary" href={website}>
              Visit the current community <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </GlassPanel>
        <div className="flex flex-col gap-5">
          <PlannedPanel
            title="Announcements"
            description="Verified platform updates will appear when the content service is connected."
          />
          <PlannedPanel
            title="Community activity"
            description="Recent activity is hidden until it can be shown from real, permitted data."
          />
        </div>
      </div>
      <RelatedLinks paths={['/profile', '/watch']} />
    </PageFrame>
  );
}

function ToolsPage() {
  return (
    <PageFrame
      title="Tools"
      description="Useful everyday, productivity, creative and developer utilities."
    >
      <GlassPanel className="p-5 sm:p-7">
        <StatusIndicator status="neutral">Directory preview — no tools are enabled</StatusIndicator>
        <p className="mt-3 text-sm text-slate-300">
          These ideas are planned, not clickable apps. Working utilities will be added and tested in
          future milestones.
        </p>
      </GlassPanel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {utilities.map((item) => (
          <GlassPanel key={item.name} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <Wrench className="text-brand-cyan" size={23} aria-hidden="true" />
              <span className="text-xs text-slate-300">{item.category}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{item.name}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.description}</p>
            <div className="mt-5">
              <StatusIndicator status="neutral">Planned</StatusIndicator>
            </div>
          </GlassPanel>
        ))}
      </div>
      <RelatedLinks paths={['/explore', '/settings']} />
    </PageFrame>
  );
}

function CompetitionsPage() {
  return (
    <PageFrame
      title="Competitions"
      description="Challenges, community rankings and tournaments — without invented results."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <PlannedPanel
          title="Daily challenges"
          description="Challenge modes will be introduced after scoring and validation rules are ready. No daily winner or active timer is being claimed."
        />
        <PlannedPanel
          title="Leaderboards"
          description="Scoreboards and rankings will connect to verified backend records in a later milestone, not this preview."
        />
        <PlannedPanel
          title="Tournaments"
          description="There are no confirmed tournament dates or open sign-ups connected to this frontend."
        />
        <PlannedPanel
          title="Achievements and XP"
          description="Personal progression is planned; visitor stats and achievements are not simulated."
        />
      </div>
      <RelatedLinks paths={['/games', '/community']} />
    </PageFrame>
  );
}

function ProfilePage() {
  return (
    <PageFrame
      title="Your account"
      description="Sign in to the new B24DUL site, or keep browsing without an account."
    >
      <AccountPanel />
      <PrivacyRequest />
      <PlannedPanel
        title="Profile details"
        description="Chat names, saved favourites and achievements will appear here as those features move to the new site."
      />
      <RelatedLinks paths={['/settings', '/community']} />
    </PageFrame>
  );
}

function SettingsPage() {
  return (
    <PageFrame
      title="Settings"
      description="Change your local appearance and accessibility preferences."
    >
      <GlassPanel className="p-6 sm:p-8">
        <Settings2 size={28} className="text-brand-cyan" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold">Sidebar preference</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Use the navigation rail or the controls below. Your choices are saved only in this
          browser; no Firebase account or cloud record is changed.
        </p>
        <StatusIndicator status="neutral">Local, device-only preference</StatusIndicator>
      </GlassPanel>
      <PreferenceControls />
      <PlannedPanel
        title="Theme"
        description="The verified dark theme remains active. A light theme is not offered until an accessible alternative is implemented and tested."
      />
      <RelatedLinks paths={['/profile', '/explore']} />
    </PageFrame>
  );
}

function AdminPage() {
  return (
    <PageFrame
      title="Admin"
      description="Administrative tools are restricted and not available in this development preview."
    >
      <GlassPanel className="p-7 sm:p-10">
        <Shield size={36} className="text-brand-violet" aria-hidden="true" />
        <div className="mt-4">
          <StatusIndicator status="warning">Restricted — no backend connection</StatusIndicator>
        </div>
        <h2 className="mt-4 text-xl font-semibold">Admin dashboard unavailable</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          This UI is not an access-control check. Existing live administrator permissions,
          moderation, chat records and privacy requests remain protected by the production
          implementation.
        </p>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
          <LockKeyhole size={17} aria-hidden="true" /> No privileged actions are available here
        </div>
      </GlassPanel>
      <RelatedLinks paths={['/explore', '/profile']} />
    </PageFrame>
  );
}

export function DestinationPage({ path }: { path: string }) {
  switch (path) {
    case '/watch':
      return <WatchPage />;
    case '/videos':
      return <VideosPage />;
    case '/games':
      return <GamesPage />;
    case '/community':
      return <CommunityPage />;
    case '/tools':
      return <ToolsPage />;
    case '/competitions':
      return <CompetitionsPage />;
    case '/profile':
      return <ProfilePage />;
    case '/settings':
      return <SettingsPage />;
    case '/admin':
      return <AdminPage />;
    default:
      return <NotFoundPage />;
  }
}

export function NotFoundPage() {
  return (
    <PageFrame title="Page not found" description="That preview destination does not exist.">
      <EmptyState
        title="Nothing at this address"
        description="The URL may be mistyped. Return home or explore all available destinations."
        action={
          <Link className="ui-button ui-button--primary" to="/">
            Return home
          </Link>
        }
      />
      <RelatedLinks paths={['/explore']} />
    </PageFrame>
  );
}
