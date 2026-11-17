import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard, GlassPanel, SectionHeader, StatusIndicator } from './ui';
import type { ArchivedVideo } from '../services/videoArchive';
import { videoDate } from '../services/videoArchive';

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
        {note && <span className="mt-2 block text-xs text-brand-cyan">{note}</span>}
      </span>
      <ArrowRight className="shrink-0 text-brand-cyan" size={18} aria-hidden="true" />
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
            className="text-sm font-semibold text-brand-cyan underline underline-offset-4"
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

export function StreamPresentation({ compact = false }: { compact?: boolean }) {
  return (
    <GlassPanel className="stream-presentation p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusIndicator status="neutral">
          {compact
            ? 'Live status unavailable in this preview'
            : 'Verified playback available when live'}
        </StatusIndicator>
        <span className="text-xs font-semibold tracking-widest text-slate-300 uppercase">
          Stream placeholder
        </span>
      </div>
      <div className={compact ? 'stream-display stream-display--compact' : 'stream-display'}>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
          <span className="stream-display-orbit" aria-hidden="true">
            B
          </span>
          <h3 className="text-xl font-bold sm:text-2xl">Your next broadcast starts here</h3>
          <p className="text-sm text-slate-300">
            {compact
              ? 'A preview of the future player. No video is playing and no live/offline result has been fetched.'
              : 'The verified stream monitor below can launch an embedded player when a current live broadcast is confirmed.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a className="ui-button ui-button--secondary" href="https://b24dul.github.io/b24dul-live/">
          Open the current stream site <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
    </GlassPanel>
  );
}

export function ArchiveTile({ video }: { video: ArchivedVideo }) {
  return (
    <GlassCard className="flex min-w-0 flex-col gap-3 p-4">
      <div className="archive-poster" aria-hidden="true">
        <span className="text-4xl font-black tracking-tight">B24DUL</span>
        <span className="text-xs tracking-widest text-slate-200 uppercase">YouTube archive</span>
      </div>
      <h3 className="line-clamp-2 text-base font-semibold">{video.title}</h3>
      <p className="text-xs text-slate-300">Published {videoDate(video.published)}</p>
      <a
        className="ui-button ui-button--secondary mt-auto"
        href={video.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={'Watch on YouTube: ' + video.title}
      >
        Watch on YouTube <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </GlassCard>
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
