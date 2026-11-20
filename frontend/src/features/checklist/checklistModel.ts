// Stream progress checklist: shared types, limits and small helpers (no Firebase here).
//
// Public parts (titles, sections, notes, Missable tags, ticks and tick times) live under
// /v2/checklists and anyone can read the active list. Steps, deadlines, the game name and the
// guide prompt template live under admin-only paths and are never sent to viewers.
// "Show upcoming" only hides upcoming item titles in the viewer panel; the titles themselves are
// still in the public data.

/** The same limits are enforced by firebase/v2.rules.json. */
export const LIMITS = {
  listTitle: 60,
  sectionTitle: 60,
  sectionNote: 150,
  itemTitle: 80,
  step: 150,
  steps: 5,
  deadline: 120,
  gameName: 60,
  items: 60,
  sections: 60,
  lists: 20,
  template: 4000,
} as const;

export type Section = { id: string; title: string; note?: string; order: number };
export type Item = {
  id: string;
  title: string;
  section: string;
  order: number;
  missable?: boolean;
  done?: boolean;
  doneAt?: number;
};
/** The public part of a list (what viewers can read). */
export type PublicList = {
  id: string;
  title: string;
  showUpcoming?: boolean;
  sections: Record<string, Omit<Section, 'id'>>;
  items: Record<string, Omit<Item, 'id'>>;
};
export type PrivateItem = { steps?: string[]; deadline?: string };
/** The admin-only part of a list. */
export type PrivateList = {
  gameName?: string;
  items: Record<string, PrivateItem>;
  lastTick?: string;
};

export const listId = (index: number) => `l${String(index).padStart(2, '0')}`;
export const sectionId = (index: number) => `s${String(index).padStart(2, '0')}`;
export const itemId = (index: number) => `i${String(index).padStart(2, '0')}`;

/** The first unused ID of the form prefix00..prefix(max-1), or null when all are taken. */
export function freeId(used: Iterable<string>, make: (index: number) => string, max: number) {
  const taken = new Set(used);
  for (let index = 0; index < max; index += 1) if (!taken.has(make(index))) return make(index);
  return null;
}

/** Sections in display order. */
export function orderedSections(list: PublicList): Section[] {
  return Object.entries(list.sections ?? {})
    .map(([id, section]) => ({ id, ...section }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Items in display order: by section, then by position inside the section. */
export function orderedItems(list: PublicList): Item[] {
  const sectionOrder = new Map(orderedSections(list).map((section, index) => [section.id, index]));
  return Object.entries(list.items ?? {})
    .map(([id, item]) => ({ id, ...item }))
    .sort(
      (a, b) =>
        (sectionOrder.get(a.section) ?? 999) - (sectionOrder.get(b.section) ?? 999) ||
        a.order - b.order ||
        a.id.localeCompare(b.id),
    );
}

export type Progress = {
  items: Item[];
  done: number;
  total: number;
  /** The first unticked item, or null when everything is done. */
  current: Item | null;
  /** The unticked item after the current one. */
  next: Item | null;
  /** The section of the current item (or the last section when all are done). */
  section: Section | null;
};

export function progressOf(list: PublicList): Progress {
  const items = orderedItems(list);
  const open = items.filter((item) => !item.done);
  const sections = orderedSections(list);
  const current = open[0] ?? null;
  return {
    items,
    done: items.length - open.length,
    total: items.length,
    current,
    next: open[1] ?? null,
    section: current
      ? (sections.find((section) => section.id === current.section) ?? null)
      : (sections.at(-1) ?? null),
  };
}

/** Admin-only search links for the game name plus the item title. */
export function searchLinks(gameName: string | undefined, itemTitle: string) {
  const query = encodeURIComponent([gameName?.trim(), itemTitle].filter(Boolean).join(' '));
  return {
    youtube: `https://www.youtube.com/results?search_query=${query}`,
    google: `https://www.google.com/search?q=${query}`,
  };
}

/** Fills {GAME}, {PLATFORM}, {PART} and {FOCUS} in the guide prompt template. */
export function fillPrompt(template: string, fields: Record<string, string>) {
  return template.replace(/\{(GAME|PLATFORM|PART|FOCUS)\}/g, (_, key: string) =>
    (fields[key] ?? '').trim(),
  );
}
