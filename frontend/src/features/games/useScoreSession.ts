import { useEffect, useRef } from 'react';
import { watchDevtools } from './devtoolsHint';

type ScoreSession = {
  watch: ReturnType<typeof watchDevtools> | null;
  eligible: boolean;
  sent: Set<string>;
};

/** One leaderboard session per game, with its own dev-tools hint. */
export function useScoreSession() {
  const session = useRef<ScoreSession>({ watch: null, eligible: false, sent: new Set() });
  useEffect(() => () => session.current.watch?.stop(), []);
  return {
    /** `alreadySent`: results a restored game already offered, so they aren't sent twice. */
    begin(eligible: boolean, alreadySent: string[] = []) {
      session.current.watch?.stop();
      session.current = {
        watch: eligible ? watchDevtools() : null,
        eligible,
        sent: new Set(alreadySent),
      };
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
