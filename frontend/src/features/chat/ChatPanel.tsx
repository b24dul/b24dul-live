import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pin, Shield } from 'lucide-react';
import { GlassPanel, PrimaryButton, StatusIndicator } from '../../components/ui';
import { useAccount } from '../../contexts/AccountContext';
import type {
  ChatMessage,
  ChatService,
  ChatSettings,
  OwnModeration,
} from '../../services/chatService';
import {
  ADMIN_CHAT_NAME,
  chatNameFor,
  MAX_MESSAGE_LENGTH,
  prepareMessage,
  SLOW_MODE_MS,
} from './chatPolicy';

export type LoadChatService = () => Promise<ChatService>;
const loadFirebaseChat: LoadChatService = () =>
  import('../../services/chatRuntime').then((module) => module.startChatRuntime());

function Composer({
  onSend,
  disabledReason,
}: {
  onSend: (text: string) => Promise<void>;
  disabledReason: string | null;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = window.setInterval(() => tick((count) => count + 1), 500);
    return () => window.clearInterval(timer);
  }, [waitUntil]);
  const waitSeconds = Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prepared = prepareMessage(text);
    if (!prepared.ok) return setError(prepared.reason);
    setSending(true);
    try {
      await onSend(prepared.text);
      setText('');
      setError('');
      setWaitUntil(Date.now() + SLOW_MODE_MS);
    } catch {
      setError('Message not sent. Slow mode allows one message every 5 seconds — try again.');
      setWaitUntil(Date.now() + SLOW_MODE_MS);
    } finally {
      setSending(false);
    }
  }

  if (disabledReason) return <p className="text-sm text-slate-300">{disabledReason}</p>;
  return (
    <form className="flex flex-col gap-2" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor="chat-input">
        Message
      </label>
      <div className="flex gap-2">
        <input
          id="chat-input"
          aria-describedby="chat-input-error"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-slate-500 bg-slate-950 px-3 py-2 text-white"
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Say something nice"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
        />
        <PrimaryButton type="submit" disabled={sending || waitSeconds > 0}>
          {waitSeconds > 0 ? `Wait ${waitSeconds}s` : 'Send'}
        </PrimaryButton>
      </div>
      <p className="flex justify-between gap-3 text-xs text-slate-300">
        <span className="text-red-200" id="chat-input-error" role="alert">
          {error}
        </span>
        <span aria-hidden="true">
          {text.length}/{MAX_MESSAGE_LENGTH}
        </span>
      </p>
    </form>
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function ChatPanel({
  loadService = loadFirebaseChat,
  renderActions,
  renderName,
}: {
  loadService?: LoadChatService;
  /** Admin workspace only: moderation controls shown under each message. */
  renderActions?: (message: ChatMessage, name: string) => React.ReactNode;
  /** Admin workspace only: shows the generated name as a link to that person's details. */
  renderName?: (message: ChatMessage, name: string) => React.ReactNode;
}) {
  const account = useAccount();
  const { start } = account;
  const [service, setService] = useState<ChatService | null>(null);
  const [failed, setFailed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [settings, setSettings] = useState<ChatSettings>({ enabled: true, pinned: null });
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [moderation, setModeration] = useState<OwnModeration>({ banned: false, mutedUntil: null });

  const identity = account.session.status === 'ready' ? account.session.identity : null;
  const uid = identity && 'uid' in identity ? identity.uid : null;

  useEffect(() => start(), [start]);

  useEffect(() => {
    let cancelled = false;
    loadService().then(
      (loaded) => !cancelled && setService(loaded),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [loadService]);

  useEffect(() => {
    if (!service) return;
    const stops = [
      service.watchMessages(setMessages, () => setFailed(true)),
      service.watchSettings(setSettings),
      service.watchAdmins(setAdmins),
    ];
    return () => stops.forEach((stop) => stop());
  }, [service]);

  useEffect(() => {
    setModeration({ banned: false, mutedUntil: null });
    if (!service || !uid) return;
    const stops = [service.watchOwnModeration(uid, setModeration), service.startPresence(uid)];
    return () => stops.forEach((stop) => stop());
  }, [service, uid]);

  const nameFor = (who: string) => (admins.has(who) ? ADMIN_CHAT_NAME : chatNameFor(who));
  const canTalk = identity?.kind === 'google';

  const log = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  let composer: React.ReactNode;
  if (!service) composer = null;
  else if (!identity) composer = <p className="text-sm text-slate-300">Checking sign-in…</p>;
  else if (!canTalk)
    composer = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-300">
          Anyone can read the chat. To talk, sign in with Google — other people only see a name made
          up for you, never your Google name or email.
        </p>
        <div>
          <PrimaryButton disabled={account.pending} onClick={account.signInWithGoogle}>
            Sign in with Google to chat
          </PrimaryButton>
        </div>
      </div>
    );
  else if (moderation.banned)
    composer = <p className="text-sm text-slate-300">You can’t post in this chat.</p>;
  else {
    const muted = moderation.mutedUntil !== null && moderation.mutedUntil > Date.now();
    composer = (
      <div className="flex flex-col gap-2">
        <Composer
          onSend={async (text) => {
            await service.send(uid!, text);
          }}
          disabledReason={
            !settings.enabled
              ? 'Chat is switched off right now.'
              : muted
                ? `You’re muted until ${timeFormat.format(moderation.mutedUntil!)}.`
                : null
          }
        />
        <p className="text-xs text-slate-300">
          You appear as <strong>{nameFor(uid!)}</strong>. Names are made up automatically so nobody
          can be identified.
        </p>
      </div>
    );
  }

  return (
    <GlassPanel
      as="section"
      className="flex flex-col gap-4 p-5 sm:p-6"
      aria-labelledby="chat-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chat-title" className="text-xl font-semibold">
          Live chat
        </h2>
        {failed ? (
          <StatusIndicator status="danger">Chat is unavailable right now</StatusIndicator>
        ) : !settings.enabled ? (
          <StatusIndicator status="warning">Chat is off</StatusIndicator>
        ) : (
          <StatusIndicator status="neutral">Anonymous names · slow mode 5s</StatusIndicator>
        )}
      </div>
      {settings.pinned && (
        <p className="chat-pinned" role="note">
          <Pin size={16} aria-hidden="true" />
          <span className="sr-only">Pinned: </span>
          {settings.pinned.text}
        </p>
      )}
      <ol ref={log} className="chat-log" role="log" aria-live="polite" aria-label="Chat messages">
        {messages === null && !failed && <li className="text-slate-300">Loading chat…</li>}
        {messages?.length === 0 && <li className="text-slate-300">No messages yet.</li>}
        {messages?.map((message) => {
          const isAdmin = admins.has(message.uid);
          return (
            <li key={message.id} className="chat-message">
              <span className="chat-author">
                {isAdmin && (
                  <span className="chat-admin-badge">
                    <Shield size={12} aria-hidden="true" /> Admin
                  </span>
                )}
                {renderName ? renderName(message, nameFor(message.uid)) : nameFor(message.uid)}
              </span>{' '}
              <span className="chat-text">{message.text}</span>
              {message.edited && <span className="text-xs text-slate-400"> (edited)</span>}{' '}
              <time
                className="text-xs text-slate-400"
                dateTime={new Date(message.ts).toISOString()}
              >
                {timeFormat.format(message.ts)}
              </time>
              {renderActions?.(message, nameFor(message.uid))}
            </li>
          );
        })}
      </ol>
      {composer}
      <p className="text-xs text-slate-400">
        Messages are public and kept until removed. No links, swearing or personal details.{' '}
        <Link className="underline underline-offset-4" to="/privacy">
          Privacy notice
        </Link>
      </p>
    </GlassPanel>
  );
}
