import { ArrowUpRight, Gamepad2, Play, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassCard, StatusIndicator } from './ui';

type CardBase = { title: string; description: string; action?: ReactNode };

export function GameCard({ title, description, action }: CardBase) {
  return (
    <GlassCard className="flex h-full flex-col gap-4 p-5">
      <div className="ui-preview-art" aria-hidden="true">
        <Gamepad2 size={36} />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </GlassCard>
  );
}

export function VideoCard({
  title,
  description,
  action,
}: CardBase) {
  return (
    <GlassCard className="flex h-full flex-col gap-4 p-5">
      <div className="ui-preview-art" aria-hidden="true">
        <Play size={36} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
      <StatusIndicator status="neutral">Preview content — no video loaded</StatusIndicator>
      {action && <div>{action}</div>}
    </GlassCard>
  );
}

export function FeatureCard({
  title,
  description,
  action,
}: CardBase) {
  return (
    <GlassCard className="flex h-full flex-col gap-4 p-5">
      <Sparkles aria-hidden="true" className="text-brand-cyan" size={28} />
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="flex-1 text-sm text-slate-300">{description}</p>
      {action && <div>{action}</div>}
    </GlassCard>
  );
}
