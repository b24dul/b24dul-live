import { useState } from 'react';
import { ArrowUpRight, Bell, Check, Layers3 } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';
import { FeatureCard, GameCard, VideoCard } from '../components/content-cards';
import {
  EmptyState,
  GlassPanel,
  IconButton,
  LoadingSkeleton,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatusIndicator,
  Toast,
} from '../components/ui';

function FoundationHome() {
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 lg:py-20">
      <GlassPanel className="p-6 sm:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-violet-300/35 px-3 py-1 text-xs font-semibold tracking-widest text-brand-violet uppercase">
            Isolated development preview
          </span>
          <StatusIndicator status="neutral">Demo-only UI</StatusIndicator>
        </div>
        <PageHeader
          title="B24DUL"
          description="Phase 2 design-system preview: accessible glass components, reusable tokens, and responsive layouts. This is not the live site."
        />
        <div className="mt-7 flex flex-wrap gap-3">
          <a className="ui-button ui-button--primary" href="https://b24dul.github.io/b24dul-live/">
            Visit current site <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <SecondaryButton onClick={() => setModalOpen(true)}>Open preview dialog</SecondaryButton>
          <IconButton
            label="Show sample notification"
            icon={<Bell size={18} />}
            onClick={() => setNotice(true)}
          />
        </div>
      </GlassPanel>

      <section aria-label="Sample components" className="flex flex-col gap-6">
        <SectionHeader
          title="Explore the design system"
          description="Cards below contain example copy only; there is no Firebase connection, actual viewer count, or live stream state."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <GameCard
            title="Games"
            description="A placeholder card for the future game library."
            action={<SecondaryButton disabled>Coming in a later phase</SecondaryButton>}
          />
          <VideoCard
            title="Watch"
            description="Video listing presentation only; there is no stream or playback in this preview."
          />
          <FeatureCard
            title="Discover"
            description="Feature cards will support browsing the new B24DUL experience."
            action={<PrimaryButton onClick={() => setNotice(true)}>Try notification</PrimaryButton>}
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Component states">
        <GlassPanel className="p-6">
          <SectionHeader
            title="Status indicators"
            description="Colour and readable text communicate states together."
          />
          <div className="mt-5 flex flex-wrap gap-4">
            <StatusIndicator status="success">Ready (sample)</StatusIndicator>
            <StatusIndicator status="warning">Pending (sample)</StatusIndicator>
            <StatusIndicator status="danger">Unavailable (sample)</StatusIndicator>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton onClick={() => setModalOpen(true)}>
              <Layers3 size={18} aria-hidden="true" /> Modal example
            </PrimaryButton>
            <SecondaryButton disabled>Disabled action</SecondaryButton>
          </div>
        </GlassPanel>
        <GlassPanel className="p-6">
          <SectionHeader
            title="Loading and empty states"
            description="State components avoid false live-data claims."
          />
          <LoadingSkeleton label="Demonstration loading placeholder" className="mt-5 max-w-xs" />
          <div className="mt-6">
            <EmptyState
              title="Nothing connected"
              description="This preview deliberately does not read production accounts, games, or videos."
            />
          </div>
        </GlassPanel>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-sm text-slate-300">
        <span>New frontend is isolated. Existing live website remains unchanged.</span>
        <Link className="underline underline-offset-4" to="/about-preview">
          About this preview
        </Link>
      </footer>
      <Modal open={modalOpen} title="Preview dialog" onClose={() => setModalOpen(false)}>
        <p className="mb-6 text-slate-300">
          This is a keyboard-accessible sample modal. No account or platform settings will change.
        </p>
        <PrimaryButton onClick={() => setModalOpen(false)}>
          <Check size={18} aria-hidden="true" /> Close preview
        </PrimaryButton>
      </Modal>
      {notice && (
        <Toast
          tone="success"
          message="Example notification only"
          onDismiss={() => setNotice(false)}
        />
      )}
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<FoundationHome />} />
      <Route
        path="/about-preview"
        element={
          <main className="mx-auto max-w-2xl px-6 py-20">
            <PageHeader
              title="Frontend design-system preview"
              description="This isolated React frontend is not deployed as the production homepage."
            />
            <Link className="mt-8 inline-block underline underline-offset-4" to="/">
              Back to foundation
            </Link>
          </main>
        }
      />
      <Route path="*" element={<FoundationHome />} />
    </Routes>
  );
}
