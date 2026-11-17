export type DirectoryEntry = Readonly<{
  name: string;
  category: string;
  description: string;
  availability: 'existing-site' | 'planned' | 'preview';
  path: string;
}>;

export const games: readonly DirectoryEntry[] = [
  {
    name: 'Sudoku',
    category: 'Puzzle',
    description: 'Classic number-grid puzzles on the existing B24DUL site.',
    availability: 'existing-site',
    path: '/games',
  },
  {
    name: '2048',
    category: 'Puzzle',
    description: 'Merge tiles and improve your best score on the current site.',
    availability: 'existing-site',
    path: '/games',
  },
  {
    name: 'Minesweeper',
    category: 'Logic',
    description: 'A future logic-game experience.',
    availability: 'planned',
    path: '/games',
  },
  {
    name: 'Snake',
    category: 'Arcade',
    description: 'Classic arcade gameplay planned for a later milestone.',
    availability: 'planned',
    path: '/games',
  },
  {
    name: 'Memory Match',
    category: 'Casual',
    description: 'An upcoming card-matching game.',
    availability: 'planned',
    path: '/games',
  },
  {
    name: 'Connect Four',
    category: 'Strategy',
    description: 'Turn-based strategy planned for later development.',
    availability: 'planned',
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
