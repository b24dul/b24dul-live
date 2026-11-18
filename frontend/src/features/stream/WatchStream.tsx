import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Radio } from 'lucide-react';
import { GlassPanel, PrimaryButton, StatusIndicator } from '../../components/ui';
import { ArchiveTile } from '../../components/SectionBlocks';
import { useLiveStatus } from '../../contexts/LiveStatusContext';
import { useVideoArchive } from '../../contexts/videoArchiveState';

export const CHANNEL_ID = 'UCnXAfqk5I7QE3frLhHHyImQ';
export const SUBSCRIBE_URL = 'https://www.youtube.com/@B24DUL?sub_confirmation=1';
export const CHANNEL_LIVE_URL = `https://www.youtube.com/channel/${CHANNEL_ID}/live`;
const LATEST_SHOWN = 6;

export function SubscribeButton() {
  return (
    <a
      className="ui-button ui-button--primary"
      href={SUBSCRIBE_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Bell size={16} aria-hidden="true" /> Subscribe
    </a>
  );
}

function Player({ src, title }: { src: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <iframe
        className="h-full w-full"
        title={title}
        src={src}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function LatestVideos() {
  const { videos } = useVideoArchive();
  if (!videos.length) return null;
  return (
    <section aria-labelledby="latest-videos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="latest-videos" className="text-xl font-semibold">
          Latest videos
        </h2>
        <Link className="font-semibold underline underline-offset-4" to="/videos">
          All videos
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.slice(0, LATEST_SHOWN).map((video) => (
          <ArchiveTile key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

/**
 * The Watch page's main view. Live: the stream, with chat beside it on wide screens and below it
 * on phones. Offline: a clear message and the latest videos. Unknown: says so honestly and offers
 * the player anyway.
 */
export function WatchStream({ chat }: { chat?: ReactNode }) {
  const status = useLiveStatus();
  const [tryAnyway, setTryAnyway] = useState(false);

  if (status.state === 'checking')
    return (
      <GlassPanel className="p-6" aria-live="polite">
        <p className="text-slate-300">Checking whether B24DUL is live…</p>
      </GlassPanel>
    );

  if (status.state === 'live')
    return (
      <section aria-labelledby="live-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="live-title" className="flex items-center gap-2 text-xl font-semibold">
            <span className="live-dot" aria-hidden="true" /> B24DUL is live now
          </h2>
          <div className="flex flex-wrap gap-2">
            <SubscribeButton />
            <a
              className="ui-button ui-button--secondary"
              href={'https://www.youtube.com/watch?v=' + status.videoId}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on YouTube <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={chat ? 'watch-live-layout' : undefined}>
          <Player
            title="B24DUL live stream"
            src={`https://www.youtube-nocookie.com/embed/${status.videoId}?autoplay=1&mute=1&rel=0`}
          />
          {chat && <div className="min-w-0">{chat}</div>}
        </div>
      </section>
    );

  const offline = status.state === 'offline';
  return (
    <div className="flex flex-col gap-8">
      <GlassPanel as="section" className="p-6 sm:p-8" aria-labelledby="offline-title">
        <div className="flex flex-wrap items-center gap-3">
          <Radio size={24} className="text-brand-cyan" aria-hidden="true" />
          <h2 id="offline-title" className="text-xl font-semibold">
            {offline ? 'B24DUL is offline right now' : 'We couldn’t check whether B24DUL is live'}
          </h2>
          <StatusIndicator status="neutral">
            {offline ? 'Offline' : 'Status unknown'}
          </StatusIndicator>
        </div>
        <p className="mt-3 max-w-2xl text-slate-300">
          {offline
            ? 'Catch up on the latest videos below, or subscribe on YouTube to hear when the next stream starts.'
            : 'The live check didn’t answer. B24DUL may still be live — open the player to see.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <SubscribeButton />
          {!offline && !tryAnyway && (
            <PrimaryButton onClick={() => setTryAnyway(true)}>Open the player anyway</PrimaryButton>
          )}
          <a
            className="ui-button ui-button--secondary"
            href={CHANNEL_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube channel <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        {!offline && tryAnyway && (
          <div className="mt-5">
            <Player
              title="B24DUL live stream"
              src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${CHANNEL_ID}&autoplay=1&mute=1`}
            />
          </div>
        )}
      </GlassPanel>
      <LatestVideos />
    </div>
  );
}

/** Small live/offline card for the home page. */
export function LiveStatusCard() {
  const status = useLiveStatus();
  const live = status.state === 'live';
  return (
    <GlassPanel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        {live ? (
          <span className="live-dot" aria-hidden="true" />
        ) : (
          <Radio size={22} className="text-brand-cyan" aria-hidden="true" />
        )}
        <p className="font-semibold">
          {live
            ? 'B24DUL is live now'
            : status.state === 'offline'
              ? 'B24DUL is offline right now'
              : status.state === 'checking'
                ? 'Checking whether B24DUL is live…'
                : 'Live status unavailable'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/watch" className="ui-button ui-button--primary">
          {live ? 'Watch now' : 'Watch and latest videos'}
        </Link>
        <SubscribeButton />
      </div>
    </GlassPanel>
  );
}
