import { ArrowRight, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BannerImage } from '../components/BannerImage';
import { ArchiveTile } from '../components/SectionBlocks';
import { useLiveStatus } from '../contexts/LiveStatusContext';
import { useVideoArchive } from '../contexts/videoArchiveState';
import { usePreferences } from '../contexts/PreferencesContext';
import { SubscribeButton } from '../features/stream/WatchStream';
import { usePlayVideo } from '../features/videos/VideoPlayer';

function Row({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: { label: string; to: string };
  children: ReactNode;
}) {
  return (
    <section className="home-row" aria-labelledby={id}>
      <div className="home-row-head">
        <h2 id={id}>{title}</h2>
        {action && (
          <Link className="home-row-link" to={action.to}>
            {action.label} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function HomeHero() {
  const status = useLiveStatus();
  const { videos } = useVideoArchive();
  const play = usePlayVideo();
  const latest = videos[0];

  let content: ReactNode;
  if (status.state === 'live') {
    const title =
      videos.find((video) => video.id === status.videoId)?.title ?? 'B24DUL is live now';
    content = (
      <>
        <span className="live-pill">
          <span className="live-dot" aria-hidden="true" /> LIVE NOW
        </span>
        <h2 className="hero-title">{title}</h2>
        <div className="hero-actions">
          <Link to="/watch" className="ui-button ui-button--primary hero-cta">
            <Play size={18} fill="currentColor" aria-hidden="true" /> Watch live
          </Link>
          <SubscribeButton secondary />
        </div>
      </>
    );
  } else {
    content = (
      <>
        <span className="offline-pill">
          {status.state === 'checking' ? 'Checking whether B24DUL is live…' : 'Offline right now'}
        </span>
        {latest ? (
          <>
            <p className="hero-kicker">Latest video</p>
            <h2 className="hero-title">{latest.title}</h2>
          </>
        ) : (
          <h2 className="hero-title">Streams, games and community</h2>
        )}
        <div className="hero-actions">
          {latest && play && (
            <button
              type="button"
              className="ui-button ui-button--primary hero-cta"
              data-play-video={latest.id}
              onClick={() => play(latest)}
            >
              <Play size={18} fill="currentColor" aria-hidden="true" /> Play latest video
            </button>
          )}
          <SubscribeButton secondary />
        </div>
      </>
    );
  }

  return (
    <section className="hero" aria-labelledby="home-title">
      <h1 id="home-title" className="sr-only" tabIndex={-1}>
        B24DUL
      </h1>
      <div className="hero-media">
        <BannerImage priority />
      </div>
      <div className="hero-content" aria-live="polite">
        {content}
      </div>
    </section>
  );
}

function GameCard({ title, detail, art }: { title: string; detail: string; art: ReactNode }) {
  return (
    <Link to="/games" className="game-card" aria-label={`Play ${title}`}>
      <span className="game-card-art" aria-hidden="true">
        {art}
      </span>
      <span className="game-card-info">
        <span className="game-card-title">{title}</span>
        <span className="text-sm text-slate-300">{detail}</span>
      </span>
      <span className="game-card-cta" aria-hidden="true">
        Play <ArrowRight size={16} />
      </span>
    </Link>
  );
}

export function HomePage() {
  const { videos } = useVideoArchive();
  const { preferences } = usePreferences();
  const streams = videos.slice(0, 4);
  const more = videos.slice(4, 12);
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-section)]">
      <HomeHero />

      {streams.length > 0 && (
        <Row
          id="row-streams"
          title="Latest streams"
          action={{ label: 'All videos', to: '/videos' }}
        >
          <div className="video-grid video-row">
            {streams.map((video) => (
              <ArchiveTile key={video.id} video={video} />
            ))}
          </div>
        </Row>
      )}

      <div className="home-feature-order" data-layout={preferences.homeLayout}>
        <div className="home-feature-discover">
          {more.length > 0 && (
            <Row id="row-videos" title="Videos" action={{ label: 'All videos', to: '/videos' }}>
              <div className="video-grid video-row">
                {more.map((video) => (
                  <ArchiveTile key={video.id} video={video} />
                ))}
              </div>
            </Row>
          )}
        </div>
        <div className="home-feature-games">
          <Row id="row-games" title="Games" action={{ label: 'Game Centre', to: '/games' }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <GameCard
                title="Sudoku"
                detail="Three levels, notes and hints. Fastest hint-free times on the leaderboard."
                art={<span className="game-art-sudoku">9</span>}
              />
              <GameCard
                title="2048"
                detail="Slide, merge, reach 2048 — and beat your best score."
                art={<span className="game-art-2048">2048</span>}
              />
            </div>
          </Row>
        </div>
      </div>
    </div>
  );
}
