import { useState, type FormEvent } from 'react';
import { GlassPanel, PrimaryButton, SecondaryButton } from '../../components/ui';
import type { AdminRuntime } from '../../services/adminRuntime';
import type { Moderation } from '../../services/adminService';
import type { ChatMessage, ChatSettings } from '../../services/chatService';
import { cleanMessage, MAX_MESSAGE_LENGTH, MUTE_MINUTES } from '../chat/chatPolicy';

/** Runs an admin action, reports "done" or "failed", and resolves to whether it worked. */
export type Run = (label: string, action: () => Promise<unknown>) => Promise<boolean>;

export const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
export const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** A destructive action needs a second, explicit click. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  small = false,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  small?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const size = small ? 'admin-small-button' : '';
  if (!asking)
    return (
      <SecondaryButton className={size} onClick={() => setAsking(true)}>
        {label}
      </SecondaryButton>
    );
  return (
    <span className="inline-flex flex-wrap gap-2">
      <PrimaryButton
        className={`admin-danger ${size}`}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </PrimaryButton>
      <SecondaryButton className={size} onClick={() => setAsking(false)}>
        Cancel
      </SecondaryButton>
    </span>
  );
}

export function PersonActions({
  uid,
  name,
  moderation,
  runtime,
  run,
  compact = false,
}: {
  uid: string;
  name: string;
  moderation: Moderation;
  runtime: AdminRuntime;
  run: Run;
  /** Quick actions only (timeout and ban), for the "Online now" column. */
  compact?: boolean;
}) {
  const [minutes, setMinutes] = useState<number>(MUTE_MINUTES[1]);
  const mutedUntil = moderation.mutes[uid];
  const muted = mutedUntil !== undefined && mutedUntil > Date.now();
  const banned = moderation.bans[uid] !== undefined;
  const { admin } = runtime;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {muted ? (
        <SecondaryButton
          className="admin-small-button"
          onClick={() => void run(`lifted ${name}’s timeout`, () => admin.unmute(uid))}
        >
          Lift timeout (until {time.format(mutedUntil)})
        </SecondaryButton>
      ) : (
        <span className="inline-flex gap-2">
          <label className="sr-only" htmlFor={`mute-${uid}`}>
            Timeout length for {name}
          </label>
          <select
            id={`mute-${uid}`}
            className="admin-select"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          >
            {MUTE_MINUTES.map((option) => (
              <option key={option} value={option}>
                {option} min
              </option>
            ))}
          </select>
          <SecondaryButton
            className="admin-small-button"
            onClick={() =>
              void run(`timed out ${name} for ${minutes} min`, () => admin.mute(uid, minutes))
            }
          >
            Timeout
          </SecondaryButton>
        </span>
      )}
      {banned ? (
        <SecondaryButton
          className="admin-small-button"
          onClick={() => void run(`unbanned ${name}`, () => admin.unban(uid))}
        >
          Unban
        </SecondaryButton>
      ) : (
        <ConfirmButton
          small
          label="Ban"
          confirmLabel={`Ban ${name}`}
          onConfirm={() => void run(`banned ${name}`, () => admin.ban(uid))}
        />
      )}
      {!compact && (
        <ConfirmButton
          small
          label="Delete all their messages"
          confirmLabel={`Delete all from ${name}`}
          onConfirm={() =>
            void run(`deleted ${name}’s messages`, async () => {
              const count = await admin.deleteAllMessagesFrom(uid);
              return count;
            })
          }
        />
      )}
    </div>
  );
}

export function MessageActions({
  message,
  name,
  isAdminAuthor,
  moderation,
  pinnedText,
  runtime,
  run,
}: {
  message: ChatMessage;
  name: string;
  isAdminAuthor: boolean;
  moderation: Moderation;
  pinnedText: string | null;
  runtime: AdminRuntime;
  run: Run;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = cleanMessage(text);
    if (!cleaned || cleaned.length > MAX_MESSAGE_LENGTH) return;
    setEditing(false);
    void run('message edited', () => runtime.admin.editMessage(message.id, cleaned));
  }
  return (
    <details className="admin-message-actions">
      <summary>Moderate</summary>
      <div className="mt-2 flex flex-col gap-2">
        {editing ? (
          <form className="flex flex-wrap gap-2" onSubmit={save}>
            <label className="sr-only" htmlFor={`edit-${message.id}`}>
              Edit message
            </label>
            <input
              id={`edit-${message.id}`}
              className="admin-input min-w-0 flex-1"
              maxLength={MAX_MESSAGE_LENGTH}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <PrimaryButton className="admin-small-button" type="submit">
              Save
            </PrimaryButton>
            <SecondaryButton className="admin-small-button" onClick={() => setEditing(false)}>
              Cancel
            </SecondaryButton>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton className="admin-small-button" onClick={() => setEditing(true)}>
              Edit
            </SecondaryButton>
            {pinnedText === message.text ? (
              <SecondaryButton
                className="admin-small-button"
                onClick={() => void run('unpinned', () => runtime.admin.unpin())}
              >
                Unpin
              </SecondaryButton>
            ) : (
              <SecondaryButton
                className="admin-small-button"
                onClick={() => void run('message pinned', () => runtime.admin.pin(message.text))}
              >
                Pin
              </SecondaryButton>
            )}
            <ConfirmButton
              small
              label="Delete"
              confirmLabel="Delete message"
              onConfirm={() =>
                void run('message deleted', () => runtime.admin.deleteMessage(message.id))
              }
            />
          </div>
        )}
        {!isAdminAuthor && (
          <PersonActions
            uid={message.uid}
            name={name}
            moderation={moderation}
            runtime={runtime}
            run={run}
          />
        )}
      </div>
    </details>
  );
}

export function ChatControls({
  runtime,
  settings,
  messageCount,
  run,
}: {
  runtime: AdminRuntime;
  settings: ChatSettings;
  messageCount: number;
  run: Run;
}) {
  const [pinText, setPinText] = useState('');
  const [pinError, setPinError] = useState('');
  const { admin } = runtime;
  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="chat-controls">
      <h2 id="chat-controls" className="text-lg font-semibold">
        Chat controls
      </h2>
      <p className="text-sm text-slate-300">
        Chat is {settings.enabled ? 'on' : 'off'} — switch it in the status strip above.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = pinText.trim();
          if (!text) return setPinError('Type the announcement in the box first.');
          setPinError('');
          void run('message pinned', () => admin.pin(text)).then((ok) => ok && setPinText(''));
        }}
      >
        <label className="text-sm font-semibold" htmlFor="pin-text">
          Pinned message
        </label>
        {settings.pinned && (
          <p className="text-sm text-slate-300">Currently pinned: “{settings.pinned.text}”</p>
        )}
        <input
          id="pin-text"
          className="admin-input"
          maxLength={MAX_MESSAGE_LENGTH}
          aria-describedby="pin-help pin-error"
          value={pinText}
          onChange={(event) => {
            setPinText(event.target.value);
            setPinError('');
          }}
        />
        <p id="pin-help" className="text-xs text-slate-300">
          Type an announcement, or use “Pin” under Moderate on any chat message.
        </p>
        <p id="pin-error" role="alert" className="text-sm text-red-200">
          {pinError}
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit">Pin announcement</PrimaryButton>
          {settings.pinned && (
            <SecondaryButton onClick={() => void run('unpinned', () => admin.unpin())}>
              Unpin
            </SecondaryButton>
          )}
        </div>
      </form>
      <div>
        <ConfirmButton
          label="Clear chat"
          confirmLabel={`Delete every message (${messageCount} shown)`}
          onConfirm={() => void run('chat cleared', () => admin.clearChat())}
        />
      </div>
    </GlassPanel>
  );
}

/** Opens a person's details in the Users tab. */
export type OpenUser = (uid: string) => void;

/** A generated name that opens that person's details (admin only). */
export function UserLink({ uid, name, onOpen }: { uid: string; name: string; onOpen: OpenUser }) {
  return (
    <button
      type="button"
      className="admin-user-open"
      aria-label={`Open details for ${name}`}
      onClick={() => onOpen(uid)}
    >
      {name}
    </button>
  );
}

/** Copies a value to the clipboard and says so. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <span className="inline-flex items-center gap-2">
      <SecondaryButton
        className="admin-small-button"
        aria-label={`Copy ${label}`}
        onClick={() =>
          navigator.clipboard
            ?.writeText(value)
            .then(() => setState('copied'))
            .catch(() => setState('failed')) ?? setState('failed')
        }
      >
        Copy
      </SecondaryButton>
      <span role="status" className="text-xs text-slate-300">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </span>
  );
}
