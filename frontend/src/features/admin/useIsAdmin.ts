import { useEffect, useState } from 'react';
import { useAccount } from '../../contexts/AccountContext';

/**
 * True when the signed-in Google account is on the public /v2/admins list. Visitors who aren't
 * signed in with Google never load anything for this, so the check costs them nothing.
 */
export function useIsAdmin() {
  const { session } = useAccount();
  const uid =
    session.status === 'ready' && session.identity.kind === 'google' ? session.identity.uid : null;
  const [admins, setAdmins] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import('../../services/chatRuntime').then(({ startChatRuntime }) => {
      if (!cancelled) stop = startChatRuntime().watchAdmins(setAdmins);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid]);

  return uid !== null && admins?.has(uid) === true;
}
