import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Clapperboard,
  Gamepad2,
  MessageCircle,
  Sparkles,
  Trophy,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ArchiveTile,
  EditorialSection,
  FeatureTile,
  PlannedPanel,
  StreamPresentation,
} from '../components/SectionBlocks';
import { GlassPanel, PageHeader, StatusIndicator } from '../components/ui';
import { useVideoArchive } from '../contexts/videoArchiveState';
import { usePreferences } from '../contexts/PreferencesContext';

const features = [
  {
    title: 'Game Centre',
    description: 'Puzzles, arcade and future releases.',
    to: '/games',
    icon: <Gamepad2 size={25} />,
  },
  {
    title: 'Videos',
    description: 'Watch the existing YouTube archive.',
    to: '/videos',
    icon: <Clapperboard size={25} />,
  },
  {
    title: 'Community',
    description: 'Connect and discover community spaces.',
    to: '/community',
    icon: <MessageCircle size={25} />,
  },
  {
    title: 'Competitions',
    description: 'Challenges, events and rankings.',
    to: '/competitions',
    icon: <Trophy size={25} />,
  },
  {
    title: 'Tools',
    description: 'Practical utilities in one destination.',
    to: '/tools',
    icon: <Wrench size={25} />,
  },
  {
    title: 'Daily Challenges',
    description: 'Upcoming challenge formats and ideas.',
    to: '/competitions',
    icon: <CalendarClock size={25} />,
  },
];

export function HomePage() {
  const { videos, source } = useVideoArchive();
  const { preferences } = usePreferences();
  return (
    <div className="flex min-w-0 flex-col gap-10">
      <GlassPanel className="home-hero p-6 sm:p-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="eyebrow">Isolated development preview</span>
          <StatusIndicator status="neutral">Public-facing design concept</StatusIndicator>
        </div>
        <div className="relative z-10 max-w-3xl">
          <PageHeader
            title="B24DUL"
            description="Your place to watch, play, connect and explore. A whole universe of entertainment, built around one community."
          />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
            This is the new interface in development, not the published site. Live community and
            account features remain disconnected.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/watch" className="ui-button ui-button--primary">
              Watch live section <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/games" className="ui-button ui-button--secondary">
              Explore games <Gamepad2 size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="home-hero-decoration" aria-hidden="true">
          <span>B</span>
        </div>
      </GlassPanel>

      <EditorialSection
        title="Streaming"
        description="A dedicated place for live broadcasts, with a clearly labelled disconnected preview."
        action={{ label: 'Visit Watch', to: '/watch' }}
      >
        <StreamPresentation compact />
      </EditorialSection>

      <div className="home-feature-order" data-layout={preferences.homeLayout}>
        <div className="home-feature-discover">
          <EditorialSection
            title="Discover B24DUL"
            description="Everything in one place. Explore the sections, games and community spaces."
            action={{ label: 'Explore all', to: '/explore' }}
          >
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {features.map((item) => (
                <FeatureTile key={item.title} {...item} />
              ))}
            </div>
          </EditorialSection>
        </div>
        <div className="home-feature-games">
          <EditorialSection
            title="Featured games"
            description="Sudoku and 2048 exist on the current site; additional games are planned."
            action={{ label: 'Game Centre', to: '/games' }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureTile
                title="Sudoku"
                description="Number puzzles on the current website."
                to="/games"
                icon={<Gamepad2 size={25} />}
                note="Available on current site"
              />
              <FeatureTile
                title="2048"
                description="Classic tile-merging on the current website."
                to="/games"
                icon={<Gamepad2 size={25} />}
                note="Available on current site"
              />
              <FeatureTile
                title="More games"
                description="Arcade, strategy and casual games are planned."
                to="/games"
                icon={<Sparkles size={25} />}
                note="Coming soon"
              />
            </div>
          </EditorialSection>
        </div>
      </div>
      <EditorialSection
        title="Community"
        description="Announcements, chat and activity — presented without fictional online members."
        action={{ label: 'Community', to: '/community' }}
      >
        <PlannedPanel
          title="A place to connect"
          description="Live chat and announcements remain on the current production site. This preview shows their future home without inventing messages, notifications or people online."
        />
      </EditorialSection>

      <EditorialSection
        title="Latest videos"
        description={
          source === 'published'
            ? 'Read-only metadata from the published archive.'
            : 'Showing the build-time archive snapshot.'
        }
        action={{ label: 'All videos', to: '/videos' }}
      >
        {videos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.slice(0, 3).map((video) => (
              <ArchiveTile key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <PlannedPanel
            title="No video metadata available"
            description="The source archive was empty or invalid at build time. This is not a claim about the live channel."
          />
        )}
      </EditorialSection>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <EditorialSection
          title="Useful tools"
          description="Tools planned for the platform."
          action={{ label: 'Browse tools', to: '/tools' }}
        >
          <PlannedPanel
            title="Everyday and developer utilities"
            description="Calculators, timers, QR codes, unit converters and developer helpers are planned; no nonfunctional controls are presented as working."
          />
        </EditorialSection>
        <EditorialSection
          title="Upcoming events"
          description="Future streams and tournaments will appear when verified data is connected."
          action={{ label: 'Competitions', to: '/competitions' }}
        >
          <PlannedPanel
            title="No schedule connected"
            description="There are no verified event dates in this preview. We will not invent a live stream timetable or tournament."
          />
        </EditorialSection>
      </div>

      <footer className="app-content-footer">
        <p className="font-semibold">
          B24DUL{' '}
          <span className="font-normal text-slate-300">— entertainment, community and more.</span>
        </p>
        <nav aria-label="Footer links" className="flex flex-wrap gap-4 text-sm">
          <Link to="/explore">About the platform</Link>
          <Link to="/profile">Guest and privacy information</Link>
          <Link to="/settings">Settings</Link>
          <a href="https://b24dul.github.io/b24dul-live/">
            Current website <ArrowUpRight size={14} className="inline" aria-hidden="true" />
          </a>
        </nav>
        <p className="text-xs text-slate-400">
          Privacy policy, terms and contact links are not shown until their destinations can be
          verified.
        </p>
      </footer>
    </div>
  );
}
