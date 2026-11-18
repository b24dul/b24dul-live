import { useEffect, useRef } from 'react';
import { watchDevtools } from './devtoolsHint';

type ScoreSession = {
  watch: ReturnType<typeof watchDevtools> | null;
  eligible: boolean;
  sent: Set<string>;
};

/** One leaderboard session per game: copies of old-site saves are not eligible. */
export function useScoreSession() {
  const session = useRef<ScoreSession>({ watch: null, eligible: false, sent: new Set() });
  useEffect(() => () => session.current.watch?.stop(), []);
  return {
    begin(eligible: boolean) {
      session.current.watch?.stop();
      session.current = { watch: eligible ? watchDevtools() : null, eligible, sent: new Set() };
    },
    /** True the first time a given result is offered in this session. */
    claim(key: string) {
      if (!session.current.eligible || session.current.sent.has(key)) return false;
      session.current.sent.add(key);
      return true;
    },
    flagged: () => session.current.watch?.flagged() ?? false,
  };
}
