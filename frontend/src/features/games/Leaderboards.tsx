import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { GlassPanel, PrimaryButton, StatusIndicator } from '../../components/ui';
import { useAccount } from '../../contexts/AccountContext';
import type { LeaderboardService, ScoreEntry } from '../../services/leaderboardService';
import { chatNameFor } from '../chat/chatPolicy';
import {
  BOARDS,
  boardFor,
  formatScore,
  isBetter,
  isPossibleScore,
  TOP_SHOWN,
  type BoardId,
} from './leaderboardBoards';

export type LoadLeaderboards = () => Promise<LeaderboardService>;
const loadFirebaseLeaderboards: LoadLeaderboards = () =>
  import('../../services/leaderboardRuntime').then((module) => module.startLeaderboardRuntime());

/** Shared by the games: whether the visitor can save scores, and how to save one. */
export function useScoreSubmission(loadService: LoadLeaderboards = loadFirebaseLeaderboards) {
  const account = useAccount();
  const { start } = account;
  useEffect(() => start(), [start]);
  const service = useRef<Promise<LeaderboardService> | null>(null);
  const identity = account.session.status === 'ready' ? account.session.identity : null;
  const uid = identity?.kind === 'google' ? identity.uid : null;

  const submit = useCallback(
    async (boardId: BoardId, value: number, flagged: boolean): Promise<string> => {
      const board = boardFor(boardId);
      if (!uid) return 'Sign in with Google on your Account page to put scores on the leaderboard.';
      if (!isPossibleScore(board, value)) return 'This result can’t go on the leaderboard.';
      try {
        service.current ??= loadService();
        const leaderboards = await service.current;
        const best = await leaderboards.myBest(boardId, uid);
        if (!isBetter(board, value, best))
          return `Your best on the leaderboard is still ${formatScore(board, best!)}.`;
        await leaderboards.submit(boardId, uid, value, flagged);
        return `New personal best on the ${board.label} leaderboard: ${formatScore(board, value)}!`;
      } catch {
        return 'Your score could not be saved right now. Try again in a few seconds.';
      }
    },
    [uid, loadService],
  );

  return { canSubmit: uid !== null, submit, signInWithGoogle: account.signInWithGoogle };
}

export function Leaderboards({
  initialBoard = 'g2048',
  loadService = loadFirebaseLeaderboards,
}: {
  initialBoard?: BoardId;
  loadService?: LoadLeaderboards;
}) {
  const account = useAccount();
  const { start } = account;
  useEffect(() => start(), [start]);
  const [boardId, setBoardId] = useState<BoardId>(initialBoard);
  const [service, setService] = useState<LeaderboardService | null>(null);
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const board = boardFor(boardId);
  const identity = account.session.status === 'ready' ? account.session.identity : null;
  const myUid = identity && 'uid' in identity ? identity.uid : null;

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
    setEntries(null);
    setFailed(false);
    return service.watchTop(boardId, board.lowerWins, setEntries, () => setFailed(true));
  }, [service, boardId, board.lowerWins]);

  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="lb-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="lb-title" className="flex items-center gap-2 text-xl font-semibold">
          <Trophy size={20} aria-hidden="true" /> Leaderboards
        </h2>
        <label className="flex items-center gap-2 text-sm">
          Board
          <select
            className="admin-select"
            value={boardId}
            onChange={(event) => setBoardId(event.target.value as BoardId)}
          >
            {BOARDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-300">
        {board.lowerWins ? 'Fastest hint-free solves.' : 'Highest scores.'} Players appear under a
        name made up from their account, never their Google name.
      </p>
      {failed ? (
        <StatusIndicator status="danger">Leaderboard isn’t available right now</StatusIndicator>
      ) : entries === null ? (
        <p className="text-sm text-slate-300">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-300">
          {board.lowerWins ? 'No times yet. Be the first!' : 'No scores yet. Be the first!'}
        </p>
      ) : (
        <ol className="leaderboard-list" aria-label={`${board.label} top ${TOP_SHOWN}`}>
          {entries.map((entry, index) => (
            <li
              key={entry.uid}
              className={entry.uid === myUid ? 'leaderboard-row leaderboard-me' : 'leaderboard-row'}
            >
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {chatNameFor(entry.uid)}
                {entry.uid === myUid && <span className="sr-only"> (you)</span>}
              </span>
              <span className="font-semibold">{formatScore(board, entry.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {identity?.kind !== 'google' && (
        <div>
          <PrimaryButton disabled={account.pending} onClick={account.signInWithGoogle}>
            Sign in with Google to join the leaderboards
          </PrimaryButton>
        </div>
      )}
    </GlassPanel>
  );
}
