import type { ReactNode } from 'react';

/**
 * Win or game-over screen laid over a game board. The celebration is CSS only and is switched
 * off for reduced motion (see .game-confetti in index.css).
 */
export function GameResult({
  id,
  title,
  win,
  role = 'dialog',
  newBest,
  message,
  children,
}: {
  id: string;
  title: string;
  win: boolean;
  role?: 'dialog' | 'group';
  newBest: boolean;
  /** Leaderboard result or the guest sign-in prompt. */
  message?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-labelledby={id}
      aria-modal={role === 'dialog' ? false : undefined}
      className={`game-result ${win ? 'game-result--win' : 'game-result--over'}`}
      role={role}
    >
      {win && (
        <div aria-hidden="true" className="game-confetti">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      )}
      <p className="game-result-title" id={id}>
        {title}
      </p>
      {newBest && <p className="game-result-best">New best!</p>}
      {children}
      {message && (
        <p className="game-result-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
