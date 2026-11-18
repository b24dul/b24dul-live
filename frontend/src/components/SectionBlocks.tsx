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
