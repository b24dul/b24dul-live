import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { AuthSession } from '../services/authSession';
import type { AccountProfile } from '../services/firebaseIdentity';
import type { TransitionResult } from '../services/identityTransitions';
import type { AccountRuntime } from '../services/accountRuntime';

export type AccountState = {
  session: AuthSession | { status: 'idle' };
  profile: AccountProfile;
  pending: boolean;
  result?: TransitionResult;
};

export type AccountApi = AccountState & {
  /** Loads Firebase and starts observing the session. Safe to call repeatedly. */
  start(): void;
  continueAsGuest(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
};

const AccountContext = createContext<AccountApi | null>(null);

export type LoadRuntime = () => Promise<AccountRuntime>;
const loadFirebaseRuntime: LoadRuntime = () =>
  import('../services/accountRuntime').then((module) => module.startAccountRuntime());

export function AccountProvider({
  children,
  loadRuntime = loadFirebaseRuntime,
}: PropsWithChildren<{ loadRuntime?: LoadRuntime }>) {
  const [state, setState] = useState<AccountState>({
    session: { status: 'idle' },
    profile: null,
    pending: false,
  });
  const runtime = useRef<Promise<AccountRuntime> | null>(null);

  const start = useCallback(() => {
    if (runtime.current) return;
    setState((current) => ({ ...current, session: { status: 'checking' } }));
    const loading = loadRuntime().then(
      (loaded) => {
        loaded.subscribe((session, profile) =>
          setState((current) => ({ ...current, session, profile })),
        );
        return loaded;
      },
      (error: unknown) => {
        runtime.current = null;
        setState((current) => ({
          ...current,
          session: { status: 'error', reason: 'Sign-in could not be loaded' },
        }));
        // Rejected for callers waiting on an action; start() itself handles the error.
        throw error;
      },
    );
    loading.catch(() => {});
    runtime.current = loading;
  }, [loadRuntime]);

  const run = useCallback(
    async (pick: (loaded: AccountRuntime) => Promise<TransitionResult>) => {
      if (!runtime.current) start();
      setState((current) => ({ ...current, pending: true, result: undefined }));
      let result: TransitionResult = { type: 'failed' };
      try {
        result = await pick(await runtime.current!);
      } catch {
        result = { type: 'failed' };
      }
      setState((current) => ({ ...current, pending: false, result }));
    },
    [start],
  );

  const api = useMemo<AccountApi>(
    () => ({
      ...state,
      start,
      continueAsGuest: () => run((loaded) => loaded.transitions.enterAnonymously()),
      signInWithGoogle: () => run((loaded) => loaded.transitions.enterWithGoogle()),
      signOut: () => run((loaded) => loaded.transitions.signOut()),
    }),
    [state, start, run],
  );

  return <AccountContext.Provider value={api}>{children}</AccountContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): AccountApi {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside AccountProvider');
  return value;
}
