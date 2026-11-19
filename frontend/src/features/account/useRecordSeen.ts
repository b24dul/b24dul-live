import { useEffect } from 'react';
import { useAccount } from '../../contexts/AccountContext';

/** For Google sign-ins only: note that the account was seen (first/last seen times). */
export function useRecordSeen() {
  const { session } = useAccount();
  const uid =
    session.status === 'ready' && session.identity.kind === 'google' ? session.identity.uid : null;
  useEffect(() => {
    if (!uid) return;
    void import('../../services/seenRuntime')
      .then(({ recordSeenNow }) => recordSeenNow(uid))
      .catch(() => {
        // Best effort: never disturbs the visitor.
      });
  }, [uid]);
}
