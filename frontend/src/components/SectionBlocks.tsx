import { ArrowRight, Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GlassPanel, SectionHeader, StatusIndicator } from './ui';
import type { ArchivedVideo } from '../services/videoArchive';
import { videoDate } from '../services/videoArchive';
import { usePlayVideo } from '../features/videos/VideoPlayer';

export function FeatureTile({
  title,
  description,
  to,
  icon,
  note,
}: {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  note?: string;
}) {
  return (
    <Link className="feature-tile" to={to}>
      <span className="feature-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-300">{description}</span>
        {note && <span className="mt-2 block text-xs text-brand-tangerine">{note}</span>}
      </span>
      <ArrowRight className="shrink-0 text-brand-tangerine" size={18} aria-hidden="true" />
    </Link>
  );
}

export function EditorialSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: { label: string; to: string };
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader title={title} description={description} />
        {action && (
          <Link
            className="text-sm font-semibold text-brand-tangerine underline underline-offset-4"
            to={action.to}
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const thumb = (id: string, size: 'mqdefault' | 'hqdefault') =>
  `https://i.ytimg.com/vi/${id}/${size}.jpg`;

/**
 * Video card: 16:9 thumbnail (from YouTube's image server), compact dark info panel. Plays in the
 * site's player; without the player (e.g. a standalone render) it links to YouTube instead.
 * If the thumbnail can't load, a branded placeholder is shown instead of a broken image.
 */
export function ArchiveTile({ video }: { video: ArchivedVideo }) {
  const play = usePlayVideo();
  const [thumbFailed, setThumbFailed] = useState(false);
  const media = (
    <>
      {thumbFailed ? (
        <span className="video-card-fallback" aria-hidden="true">
          <span className="wordmark">B24DUL</span>
        </span>
      ) : (
        <img
          className="video-card-thumb"
          src={thumb(video.id, 'mqdefault')}
          srcSet={`${thumb(video.id, 'mqdefault')} 320w, ${thumb(video.id, 'hqdefault')} 480w`}
          sizes="(min-width: 1280px) 330px, (min-width: 640px) 46vw, 92vw"
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setThumbFailed(true)}
        />
      )}
      <span className="video-card-play" aria-hidden="true">
        <Play size={22} fill="currentColor" />
      </span>
    </>
  );
  return (
    <article className="video-card">
      {play ? (
        <button
          className="video-card-media"
          onClick={() => play(video)}
          type="button"
          data-play-video={video.id}
          aria-label={'Play video: ' + video.title}
        >
          {media}
        </button>
      ) : (
        <a
          className="video-card-media"
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={'Watch on YouTube: ' + video.title}
        >
          {media}
        </a>
      )}
      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>
        <p className="video-card-meta">{videoDate(video.published)}</p>
      </div>
    </article>
  );
}

export function PlannedPanel({ title, description }: { title: string; description: string }) {
  return (
    <GlassPanel className="p-6 sm:p-8">
      <StatusIndicator status="neutral">Planned — not connected</StatusIndicator>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>
    </GlassPanel>
  );
}
