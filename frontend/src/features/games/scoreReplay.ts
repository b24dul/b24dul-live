import { move2048, new2048, type Direction } from './game2048';

const MAX_MOVES = 4096;
const directions = new Set<Direction>(['left', 'right', 'up', 'down']);

/**
 * A deterministic replay primitive for a future server-side verifier.
 * This does not establish user identity, challenge ownership, one-time use,
 * server authority, fair play or leaderboard permission. Never trust a seed
 * or computed result supplied by a browser.
 */
function randomFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

export type ReplayResult =
  | { status: 'invalid' }
  | {
      status: 'replayed';
      score: number;
      grid: number[];
      claimedScoreMatches: boolean;
      eligibleCheckpoint: boolean;
    };

/**
 * Replay canonical successful moves against an externally supplied seed.
 * A real server must select and retain the seed, authenticate the player,
 * atomically prevent challenge reuse, and enforce score writes itself.
 */
export function replay2048(trustedSeed: number, untrustedSubmission: unknown): ReplayResult {
  if (!Number.isInteger(trustedSeed) || trustedSeed <= 0 || trustedSeed > 0xffffffff) {
    return { status: 'invalid' };
  }
  if (typeof untrustedSubmission !== 'object' || untrustedSubmission === null) {
    return { status: 'invalid' };
  }
  const submission = untrustedSubmission as Record<string, unknown>;
  if (
    !Array.isArray(submission.moves) ||
    submission.moves.length > MAX_MOVES ||
    !submission.moves.every(
      (move: unknown) => typeof move === 'string' && directions.has(move as Direction),
    ) ||
    typeof submission.score !== 'number' ||
    !Number.isSafeInteger(submission.score) ||
    submission.score < 0
  )
    return { status: 'invalid' };

  const random = randomFromSeed(trustedSeed);
  let game = new2048(random);
  let reached2048 = false;
  for (const direction of submission.moves as Direction[]) {
    const result = move2048(game, direction, random);
    if (!result.moved) return { status: 'invalid' };
    game = result.game;
    reached2048 = result.reached2048;
  }
  return {
    status: 'replayed',
    score: game.score,
    grid: game.grid,
    claimedScoreMatches: submission.score === game.score,
    eligibleCheckpoint: reached2048 || game.over,
  };
}
