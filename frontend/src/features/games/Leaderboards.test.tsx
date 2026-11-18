import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../../contexts/AccountContext';
import type { AccountRuntime } from '../../services/accountRuntime';
import type { AuthIdentity } from '../../services/authSession';
import type { LeaderboardService, ScoreEntry } from '../../services/leaderboardService';
import { chatNameFor } from '../chat/chatPolicy';
import { Leaderboards, useScoreSubmission } from './Leaderboards';
import type { BoardId } from './leaderboardBoards';

function account(identity: AuthIdentity, displayName: string | null = null): AccountRuntime {
  return {
    subscribe: (onSession) => {
      onSession(
        { status: 'ready', identity },
        displayName ? { displayName, email: 'p@example.invalid' } : null,
      );
      return () => {};
    },
    transitions: {
      enterAnonymously: async () => ({ type: 'completed' }),
      enterWithGoogle: async () => ({ type: 'completed' }),
      signOut: async () => ({ type: 'signed-out' }),
    },
  };
}

function fakeService(
  entries: Partial<Record<BoardId, ScoreEntry[]>> = {},
  best: number | null = null,
) {
  return {
    watchTop: vi.fn((board: BoardId, _lower: boolean, onEntries: (e: ScoreEntry[]) => void) => {
      onEntries(entries[board] ?? []);
      return () => {};
    }),
    myBest: vi.fn(async () => best),
    submit: vi.fn(async () => {}),
    watchFlags: vi.fn(() => () => {}),
    deleteScore: vi.fn(async () => {}),
  } satisfies LeaderboardService;
}

function wrap(identity: AuthIdentity, ui: React.ReactNode, displayName: string | null = null) {
  return render(
    <MemoryRouter>
      <AccountProvider loadRuntime={async () => account(identity, displayName)}>
        {ui}
      </AccountProvider>
    </MemoryRouter>,
  );
}

describe('Leaderboards', () => {
  it('shows generated names only, best first, and highlights you', async () => {
    const service = fakeService({
      g2048: [
        { uid: 'first-player', value: 4096, ts: 1 },
        { uid: 'member', value: 1024, ts: 1 },
      ],
    });
    wrap(
      { kind: 'google', uid: 'member' },
      <Leaderboards loadService={async () => service} />,
      'Sam Member',
    );
    expect(await screen.findByText(chatNameFor('first-player'))).toBeInTheDocument();
    expect(screen.getByText('4,096')).toBeInTheDocument();
    expect(screen.queryByText(/Sam Member/)).not.toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign in with Google/ })).not.toBeInTheDocument();
  });

  it('switches boards and invites visitors who are not on Google to sign in', async () => {
    const service = fakeService({ 'sudoku-easy': [{ uid: 'fast', value: 95, ts: 1 }] });
    wrap({ kind: 'anonymous', uid: 'guest' }, <Leaderboards loadService={async () => service} />);
    expect(await screen.findByText('No scores yet. Be the first!')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Board'), { target: { value: 'sudoku-easy' } });
    expect(await screen.findByText('1:35')).toBeInTheDocument();
    expect(service.watchTop).toHaveBeenLastCalledWith(
      'sudoku-easy',
      true,
      expect.any(Function),
      expect.any(Function),
    );
    expect(
      screen.getByRole('button', { name: 'Sign in with Google to join the leaderboards' }),
    ).toBeInTheDocument();
  });
});

function Submitter({
  service,
  board,
  value,
  flagged,
}: {
  service: LeaderboardService;
  board: BoardId;
  value: number;
  flagged: boolean;
}) {
  const { submit } = useScoreSubmission(async () => service);
  const [result, setResult] = useState('');
  return (
    <>
      <button onClick={() => void submit(board, value, flagged).then(setResult)}>Submit</button>
      <p>{result}</p>
    </>
  );
}

async function submitWith(
  identity: AuthIdentity,
  service: LeaderboardService,
  board: BoardId,
  value: number,
  flagged = false,
) {
  wrap(identity, <Submitter service={service} board={board} value={value} flagged={flagged} />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  });
}

describe('useScoreSubmission', () => {
  it('saves a new best, passing the dev-tools hint along silently', async () => {
    const service = fakeService({}, 1024);
    await submitWith({ kind: 'google', uid: 'member' }, service, 'g2048', 2048, true);
    expect(service.submit).toHaveBeenCalledWith('g2048', 'member', 2048, true);
    expect(screen.getByText(/New personal best .* 2,048!/)).toBeInTheDocument();
    expect(screen.queryByText(/dev tools|flag|review/i)).not.toBeInTheDocument();
  });

  it('keeps the old best when the new result is not better', async () => {
    const service = fakeService({}, 120);
    await submitWith({ kind: 'google', uid: 'member' }, service, 'sudoku-easy', 150);
    expect(service.submit).not.toHaveBeenCalled();
    expect(screen.getByText('Your best on the leaderboard is still 2:00.')).toBeInTheDocument();
  });

  it('never sends impossible results or results from guests', async () => {
    const service = fakeService();
    await submitWith({ kind: 'google', uid: 'member' }, service, 'sudoku-easy', 12);
    expect(service.submit).not.toHaveBeenCalled();
    expect(screen.getByText('This result can’t go on the leaderboard.')).toBeInTheDocument();
  });

  it('asks guests to sign in with Google', async () => {
    const service = fakeService();
    await submitWith({ kind: 'anonymous', uid: 'guest' }, service, 'g2048', 64);
    expect(service.submit).not.toHaveBeenCalled();
    expect(screen.getByText(/Sign in with Google on your Account page/)).toBeInTheDocument();
  });
});
