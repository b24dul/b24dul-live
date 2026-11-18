export type DirectoryEntry = Readonly<{
  name: string;
  category: string;
  description: string;
  availability: 'available' | 'planned';
  path: string;
}>;

export const games: readonly DirectoryEntry[] = [
  {
    name: 'Sudoku',
    category: 'Puzzle',
    description: 'Classic number-grid puzzles in three levels, with notes, hints and a timer.',
    availability: 'available',
    path: '/games',
  },
  {
    name: '2048',
    category: 'Puzzle',
    description: 'Merge tiles to reach 2048 and beat your best score.',
    availability: 'available',
    path: '/games',
  },
];

export const utilities: readonly DirectoryEntry[] = [
  {
    name: 'Calculators',
    category: 'Everyday',
    description: 'A directory of practical calculations.',
    availability: 'planned',
    path: '/tools',
  },
  {
    name: 'Timers',
    category: 'Productivity',
    description: 'Focus and countdown tools.',
    availability: 'planned',
    path: '/tools',
  },
  {
    name: 'QR Generator',
    category: 'Creative',
    description: 'Create QR codes from your own links.',
    availability: 'planned',
    path: '/tools',
  },
  {
    name: 'JSON Formatter',
    category: 'Developer',
    description: 'Inspect and format JSON safely.',
    availability: 'planned',
    path: '/tools',
  },
  {
    name: 'Unit Converter',
    category: 'Everyday',
    description: 'Convert common units.',
    availability: 'planned',
    path: '/tools',
  },
  {
    name: 'Notes',
    category: 'Productivity',
    description: 'Personal notes with local-first storage planned.',
    availability: 'planned',
    path: '/tools',
  },
];
