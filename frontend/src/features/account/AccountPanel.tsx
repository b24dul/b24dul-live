import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { GlassPanel, PrimaryButton, SecondaryButton, StatusIndicator } from '../../components/ui';
import { useAccount } from '../../contexts/AccountContext';
import type { TransitionResult } from '../../services/identityTransitions';

const resultMessage: Partial<Record<TransitionResult['type'], string>> = {
  switched:
    'That Google account already had an account here, so you are now signed in to it. Your guest session was not merged.',
  cancelled: 'Sign-in was cancelled. Nothing changed.',
  failed: 'Sign-in did not finish. Check your connection and try again.',
  'signed-out': 'You are signed out on this device.',
};

export function AccountPanel() {
  const account = useAccount();
  const { start } = account;
  useEffect(() => start(), [start]);

  const session = account.session;
  const identity = session.status === 'ready' ? session.identity : null;
  const busy = account.pending || session.status !== 'ready';
  const message = account.result ? resultMessage[account.result.type] : undefined;

  let title = 'Checking sign-in…';
  let status = <StatusIndicator status="neutral">Loading</StatusIndicator>;
  if (session.status === 'error') {
    title = 'Sign-in is unavailable right now';
    status = <StatusIndicator status="danger">{session.reason}</StatusIndicator>;
  } else if (identity?.kind === 'signed-out') {
    title = 'Not signed in';
    status = <StatusIndicator status="neutral">Browsing without an account</StatusIndicator>;
  } else if (identity?.kind === 'anonymous') {
    title = 'Signed in as a guest';
    status = <StatusIndicator status="warning">Guest — only on this browser</StatusIndicator>;
  } else if (identity) {
    title = account.profile?.displayName || account.profile?.email || 'Signed in';
    status = <StatusIndicator status="success">Signed in with Google</StatusIndicator>;
  }

  return (
    <GlassPanel as="section" className="p-6 sm:p-8" aria-labelledby="account-title">
      <div className="flex flex-wrap items-center gap-5">
        <span className="guest-avatar">
          <UserRound size={32} aria-hidden="true" />
        </span>
        <div>
          <h2 id="account-title" className="text-xl font-semibold">
            {title}
          </h2>
          {status}
        </div>
      </div>
      <p className="mt-5 max-w-2xl text-slate-300">
        B24DUL started fresh on 18 November 2026: accounts from before then are not carried over —
        just sign in again. A guest account lives only in this browser; sign in with Google to keep
        it and use it on other devices.
      </p>
      {identity && 'uid' in identity && (
        <p className="mt-3 text-sm text-slate-300">
          Your account ID: <code className="break-all">{identity.uid}</code>
        </p>
      )}
      <p className="mt-3 text-sm text-slate-300">
        Your Google name and email are shown only to you, here. Other visitors never see them.{' '}
        <Link className="font-semibold underline underline-offset-4" to="/privacy">
          Privacy notice
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {identity?.kind === 'signed-out' && (
          <SecondaryButton type="button" disabled={busy} onClick={account.continueAsGuest}>
            Continue as guest
          </SecondaryButton>
        )}
        {(identity?.kind === 'signed-out' || identity?.kind === 'anonymous') && (
          <PrimaryButton type="button" disabled={busy} onClick={account.signInWithGoogle}>
            Sign in with Google
          </PrimaryButton>
        )}
        {identity && identity.kind !== 'signed-out' && (
          <SecondaryButton type="button" disabled={busy} onClick={account.signOut}>
            Sign out
          </SecondaryButton>
        )}
      </div>
      <p role="status" className="mt-4 text-sm text-slate-300">
        {message ?? ''}
      </p>
    </GlassPanel>
  );
}
