import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  fillPrompt,
  freeId,
  itemId,
  progressOf,
  searchLinks,
  type PublicList,
} from './checklistModel';
import { ChecklistPanel } from './ChecklistViewer';

const list: PublicList = {
  id: 'l00',
  title: 'Part 1 progress',
  sections: {
    s01: { title: 'After the job', note: 'When free roam opens', order: 1 },
    s00: { title: 'During the job', order: 0 },
  },
  items: {
    i02: { title: 'Buy a hat', section: 's01', order: 0 },
    i00: { title: 'Grab the keys', section: 's00', order: 0, done: true, doneAt: 5 },
    i01: { title: 'Open the safe', section: 's00', order: 1, done: true, doneAt: 6 },
    i03: { title: 'Sell the car', section: 's01', order: 1, missable: true },
  },
};

describe('checklist model', () => {
  it('orders by section then item, and finds the current and next items', () => {
    const progress = progressOf(list);
    expect(progress.items.map((item) => item.id)).toEqual(['i00', 'i01', 'i02', 'i03']);
    expect(progress).toMatchObject({ done: 2, total: 4 });
    expect(progress.current?.title).toBe('Buy a hat');
    expect(progress.next?.title).toBe('Sell the car');
    expect(progress.section?.title).toBe('After the job');
  });

  it('builds admin search links from the game name and item title', () => {
    expect(searchLinks('Sample Game', 'Find the $5 coin!')).toEqual({
      youtube:
        'https://www.youtube.com/results?search_query=Sample%20Game%20Find%20the%20%245%20coin!',
      google: 'https://www.google.com/search?q=Sample%20Game%20Find%20the%20%245%20coin!',
    });
    expect(searchLinks(undefined, 'Hat').google).toBe('https://www.google.com/search?q=Hat');
  });

  it('fills the four placeholders, everywhere they appear', () => {
    expect(
      fillPrompt('{GAME}/{PLATFORM}/{PART}/{FOCUS}/{GAME}/{OTHER}', {
        GAME: ' G ',
        PLATFORM: 'P',
        PART: 'Part 2',
        FOCUS: 'all',
      }),
    ).toBe('G/P/Part 2/all/G/{OTHER}');
  });

  it('ships the default guide prompt template as a text file', () => {
    const template = readFileSync('public/checklist-guide-template.txt', 'utf8');
    expect(
      template.startsWith('GAME: {GAME}\nPLATFORM: {PLATFORM}\nPART: {PART}\nFOCUS: {FOCUS}\n'),
    ).toBe(true);
    expect(template).toContain('13. No other markdown inside the code block');
    expect(template.trimEnd().endsWith("  Deadline: before the chapter's final mission\n```")).toBe(
      true,
    );
  });

  it('picks the first free ID', () => {
    expect(freeId(['i00', 'i02'], itemId, 60)).toBe('i01');
    expect(
      freeId(
        Array.from({ length: 60 }, (_, i) => itemId(i)),
        itemId,
        60,
      ),
    ).toBeNull();
  });
});

describe('viewer panel', () => {
  it('shows the title, count, section, done items and Now, with upcoming hidden', () => {
    render(<ChecklistPanel list={list} />);
    expect(screen.getByRole('heading', { name: 'Part 1 progress' })).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText('When free roam opens')).toBeInTheDocument();
    expect(screen.getByText('Buy a hat')).toBeInTheDocument();
    expect(screen.queryByText('Sell the car')).not.toBeInTheDocument();
    expect(screen.getByText('Done earlier (2)')).toBeInTheDocument();
  });

  it('shows upcoming titles when the list allows it, and "All done!" at the end', () => {
    const { rerender } = render(<ChecklistPanel list={{ ...list, showUpcoming: true }} />);
    expect(screen.getByText('Sell the car')).toBeInTheDocument();
    expect(screen.getByText('Missable')).toBeInTheDocument();
    const finished = structuredClone(list);
    for (const item of Object.values(finished.items)) item.done = true;
    rerender(<ChecklistPanel list={finished} />);
    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });
});
