// Stream progress checklist in the Realtime Database. Viewers read /v2/checklists/active and
// then only that one list (the rules allow reading a list only while it is the active one).
// Everything else here is admin-only and the rules enforce that; this module adds no access.
import {
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';
import {
  freeId,
  itemId,
  LIMITS,
  listId,
  sectionId,
  type PrivateList,
  type PublicList,
} from '../features/checklist/checklistModel.ts';
import type { ParsedChecklist } from '../features/checklist/checklistParser';

const ROOT = 'v2';
const ignore = () => {};

function toPublic(id: string, value: unknown): PublicList | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PublicList>;
  if (typeof raw.title !== 'string') return null;
  return {
    id,
    title: raw.title,
    showUpcoming: raw.showUpcoming === true,
    sections: raw.sections ?? {},
    items: raw.items ?? {},
  };
}

function toPrivate(value: unknown): PrivateList {
  const raw = (value ?? {}) as Omit<Partial<PrivateList>, 'items'> & {
    items?: Record<string, { steps?: unknown; deadline?: string }>;
  };
  const items: PrivateList['items'] = {};
  for (const [id, item] of Object.entries(raw.items ?? {})) {
    // Stored as an array, or as an object with keys "0" to "4" if a gap was ever left.
    const steps = Object.entries((item.steps ?? {}) as Record<string, unknown>)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, step]) => step)
      .filter((step): step is string => typeof step === 'string');
    items[id] = { steps, ...(item.deadline ? { deadline: item.deadline } : {}) };
  }
  return { gameName: raw.gameName, lastTick: raw.lastTick, items };
}

/** What a viewer can do: follow the active list. */
export function createChecklistViewer(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);
  return {
    /** Calls back with the active list, or null when no list is active. */
    watchActiveList(onList: (list: PublicList | null) => void) {
      let stopList = ignore;
      const stopActive = onValue(
        at('checklists/active'),
        (snapshot) => {
          stopList();
          stopList = ignore;
          const id = snapshot.val();
          if (typeof id !== 'string') return onList(null);
          stopList = onValue(
            at(`checklists/lists/${id}`),
            (list) => onList(toPublic(id, list.val())),
            () => onList(null),
          );
        },
        () => onList(null),
      );
      return () => {
        stopList();
        stopActive();
      };
    },
  };
}

export type NewItem = {
  title: string;
  section: string;
  missable: boolean;
  steps: string[];
  deadline?: string;
};

const stepsValue = (steps: string[]) => (steps.length ? steps : null);

/** Admin-only reads and writes. */
export function createChecklistAdmin(database: Database) {
  const at = (path: string) => ref(database, `${ROOT}/${path}`);
  const write = (updates: Record<string, unknown>) => update(ref(database, ROOT), updates);

  return {
    ...createChecklistViewer(database),

    watchActive(onActive: (id: string | null) => void) {
      return onValue(
        at('checklists/active'),
        (snapshot) => onActive(typeof snapshot.val() === 'string' ? snapshot.val() : null),
        ignore,
      );
    },
    watchLists(onLists: (lists: PublicList[]) => void) {
      return onValue(
        at('checklists/lists'),
        (snapshot) => {
          const lists: PublicList[] = [];
          snapshot.forEach((child) => {
            const list = toPublic(child.key!, child.val());
            if (list) lists.push(list);
          });
          onLists(lists);
        },
        ignore,
      );
    },
    watchPrivate(onPrivate: (lists: Record<string, PrivateList>) => void) {
      return onValue(
        at('checklistsPrivate'),
        (snapshot) => {
          const lists: Record<string, PrivateList> = {};
          snapshot.forEach((child) => {
            lists[child.key!] = toPrivate(child.val());
          });
          onPrivate(lists);
        },
        ignore,
      );
    },
    watchPrompt(onTemplate: (template: string | null) => void) {
      return onValue(
        at('checklistPrompt/template'),
        (snapshot) => onTemplate(typeof snapshot.val() === 'string' ? snapshot.val() : null),
        ignore,
      );
    },

    /** Saves an imported list as a new list. Returns its ID. */
    async createList(
      parsed: ParsedChecklist,
      options: { gameName?: string; showUpcoming: boolean; existing: string[] },
    ) {
      const id = freeId(options.existing, listId, LIMITS.lists);
      if (!id) throw new Error(`There can be at most ${LIMITS.lists} lists.`);
      const sections: Record<string, unknown> = {};
      const items: Record<string, unknown> = {};
      const privateItems: Record<string, unknown> = {};
      let count = 0;
      parsed.sections.forEach((section, sectionIndex) => {
        const sid = sectionId(sectionIndex);
        sections[sid] = { title: section.title, order: sectionIndex, note: section.note ?? null };
        section.items.forEach((item, order) => {
          const iid = itemId(count);
          count += 1;
          items[iid] = { title: item.title, section: sid, order, missable: item.missable || null };
          if (item.steps.length || item.deadline)
            privateItems[iid] = { steps: stepsValue(item.steps), deadline: item.deadline ?? null };
        });
      });
      const gameName = options.gameName?.trim();
      await write({
        [`checklists/lists/${id}`]: {
          title: parsed.title,
          showUpcoming: options.showUpcoming,
          sections,
          items,
        },
        [`checklistsPrivate/${id}`]: { gameName: gameName || null, items: privateItems },
      });
      return id;
    },

    setActive: (id: string | null) =>
      id ? set(at('checklists/active'), id) : remove(at('checklists/active')),

    updateListDetails: (
      id: string,
      details: { title: string; showUpcoming: boolean; gameName: string },
    ) =>
      write({
        [`checklists/lists/${id}/title`]: details.title.trim(),
        [`checklists/lists/${id}/showUpcoming`]: details.showUpcoming,
        [`checklistsPrivate/${id}/gameName`]: details.gameName.trim() || null,
      }),

    deleteList: (id: string, active: string | null) =>
      write({
        [`checklists/lists/${id}`]: null,
        [`checklistsPrivate/${id}`]: null,
        ...(active === id ? { 'checklists/active': null } : {}),
      }),

    /** Ticks an item. The tick time is the server's clock (the rules require it). */
    tick: (list: string, item: string) =>
      write({
        [`checklists/lists/${list}/items/${item}/done`]: true,
        [`checklists/lists/${list}/items/${item}/doneAt`]: serverTimestamp(),
        [`checklistsPrivate/${list}/lastTick`]: item,
      }),
    untick: (list: string, item: string, clearLastTick: boolean) =>
      write({
        [`checklists/lists/${list}/items/${item}/done`]: null,
        [`checklists/lists/${list}/items/${item}/doneAt`]: null,
        ...(clearLastTick ? { [`checklistsPrivate/${list}/lastTick`]: null } : {}),
      }),

    addSection: (list: string, existing: string[], title: string, note: string, order: number) => {
      const id = freeId(existing, sectionId, LIMITS.sections);
      if (!id) throw new Error(`A list can have at most ${LIMITS.sections} sections.`);
      return write({
        [`checklists/lists/${list}/sections/${id}`]: {
          title: title.trim(),
          note: note.trim() || null,
          order,
        },
      });
    },
    updateSection: (list: string, section: string, title: string, note: string) =>
      write({
        [`checklists/lists/${list}/sections/${section}/title`]: title.trim(),
        [`checklists/lists/${list}/sections/${section}/note`]: note.trim() || null,
      }),
    deleteSection: (list: string, section: string) =>
      remove(at(`checklists/lists/${list}/sections/${section}`)),

    addItem: (list: string, existing: string[], item: NewItem, order: number) => {
      const id = freeId(existing, itemId, LIMITS.items);
      if (!id) throw new Error(`A list can have at most ${LIMITS.items} items.`);
      return write({
        [`checklists/lists/${list}/items/${id}`]: {
          title: item.title.trim(),
          section: item.section,
          order,
          missable: item.missable || null,
        },
        [`checklistsPrivate/${list}/items/${id}`]: {
          steps: stepsValue(item.steps),
          deadline: item.deadline?.trim() || null,
        },
      });
    },
    /** Edits an item's text and section; its tick and tick time are left alone. */
    updateItem: (list: string, id: string, item: NewItem, order: number) =>
      write({
        [`checklists/lists/${list}/items/${id}/title`]: item.title.trim(),
        [`checklists/lists/${list}/items/${id}/section`]: item.section,
        [`checklists/lists/${list}/items/${id}/order`]: order,
        [`checklists/lists/${list}/items/${id}/missable`]: item.missable || null,
        [`checklistsPrivate/${list}/items/${id}`]: {
          steps: stepsValue(item.steps),
          deadline: item.deadline?.trim() || null,
        },
      }),
    deleteItem: (list: string, id: string, lastTick: string | undefined) =>
      write({
        [`checklists/lists/${list}/items/${id}`]: null,
        [`checklistsPrivate/${list}/items/${id}`]: null,
        ...(lastTick === id ? { [`checklistsPrivate/${list}/lastTick`]: null } : {}),
      }),
    /** Sets new positions for items, e.g. after moving one up or down. */
    reorderItems: (list: string, orders: Record<string, number>) =>
      write(
        Object.fromEntries(
          Object.entries(orders).map(([id, order]) => [
            `checklists/lists/${list}/items/${id}/order`,
            order,
          ]),
        ),
      ),

    savePrompt: (template: string) => set(at('checklistPrompt/template'), template),
    resetPrompt: () => remove(at('checklistPrompt')),
  };
}

export type ChecklistViewer = ReturnType<typeof createChecklistViewer>;
export type ChecklistAdmin = ReturnType<typeof createChecklistAdmin>;
