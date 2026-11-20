// Test double for the checklist database service: same methods as createChecklistAdmin, kept in
// memory and shared by every panel on the harness page. Browser tests only; never published.
// The real service and the database rules are tested against the Firebase emulator.
import type { ChecklistAdmin, NewItem } from '../../src/services/checklistService';
import {
  freeId,
  itemId,
  LIMITS,
  listId,
  sectionId,
  type PrivateList,
  type PublicList,
} from '../../src/features/checklist/checklistModel';
import type { ParsedChecklist } from '../../src/features/checklist/checklistParser';

type State = {
  lists: Record<string, PublicList>;
  privates: Record<string, PrivateList>;
  active: string | null;
  template: string | null;
};

export function createMemoryChecklist(clock: () => number = Date.now) {
  const state: State = { lists: {}, privates: {}, active: null, template: null };
  const listeners = new Set<() => void>();
  const emit = () => setTimeout(() => listeners.forEach((listener) => listener()), 0);
  const watch = (call: () => void) => {
    const listener = () => call();
    listeners.add(listener);
    listener();
    return () => void listeners.delete(listener);
  };
  const clone = <T>(value: T): T => structuredClone(value);
  const change = async (mutate: () => void) => {
    mutate();
    emit();
  };
  const privateOf = (id: string) => (state.privates[id] ??= { items: {} });

  const service = {
    watchActiveList: (onList: (list: PublicList | null) => void) =>
      watch(() =>
        onList(
          state.active && state.lists[state.active] ? clone(state.lists[state.active]!) : null,
        ),
      ),
    watchActive: (onActive: (id: string | null) => void) => watch(() => onActive(state.active)),
    watchLists: (onLists: (lists: PublicList[]) => void) =>
      watch(() =>
        onLists(Object.values(clone(state.lists)).sort((a, b) => a.id.localeCompare(b.id))),
      ),
    watchPrivate: (onPrivate: (lists: Record<string, PrivateList>) => void) =>
      watch(() => onPrivate(clone(state.privates))),
    watchPrompt: (onTemplate: (template: string | null) => void) =>
      watch(() => onTemplate(state.template)),

    async createList(
      parsed: ParsedChecklist,
      options: { gameName?: string; showUpcoming: boolean; existing: string[] },
    ) {
      const id = freeId(options.existing, listId, LIMITS.lists);
      if (!id) throw new Error('Too many lists');
      const list: PublicList = {
        id,
        title: parsed.title,
        showUpcoming: options.showUpcoming,
        sections: {},
        items: {},
      };
      const priv: PrivateList = { gameName: options.gameName?.trim() || undefined, items: {} };
      let count = 0;
      parsed.sections.forEach((section, index) => {
        const sid = sectionId(index);
        list.sections[sid] = { title: section.title, note: section.note, order: index };
        section.items.forEach((item, order) => {
          const iid = itemId(count++);
          list.items[iid] = {
            title: item.title,
            section: sid,
            order,
            missable: item.missable || undefined,
          };
          priv.items[iid] = { steps: item.steps, deadline: item.deadline };
        });
      });
      await change(() => {
        state.lists[id] = list;
        state.privates[id] = priv;
      });
      return id;
    },
    setActive: (id: string | null) => change(() => (state.active = id)),
    updateListDetails: (
      id: string,
      details: { title: string; showUpcoming: boolean; gameName: string },
    ) =>
      change(() => {
        state.lists[id]!.title = details.title.trim();
        state.lists[id]!.showUpcoming = details.showUpcoming;
        privateOf(id).gameName = details.gameName.trim() || undefined;
      }),
    deleteList: (id: string, active: string | null) =>
      change(() => {
        delete state.lists[id];
        delete state.privates[id];
        if (active === id) state.active = null;
      }),
    tick: (list: string, item: string) =>
      change(() => {
        Object.assign(state.lists[list]!.items[item]!, { done: true, doneAt: clock() });
        privateOf(list).lastTick = item;
      }),
    untick: (list: string, item: string, clearLastTick: boolean) =>
      change(() => {
        delete state.lists[list]!.items[item]!.done;
        delete state.lists[list]!.items[item]!.doneAt;
        if (clearLastTick) delete privateOf(list).lastTick;
      }),
    addSection: (list: string, existing: string[], title: string, note: string, order: number) =>
      change(() => {
        const id = freeId(existing, sectionId, LIMITS.sections)!;
        state.lists[list]!.sections[id] = {
          title: title.trim(),
          note: note.trim() || undefined,
          order,
        };
      }),
    updateSection: (list: string, section: string, title: string, note: string) =>
      change(() => {
        Object.assign(state.lists[list]!.sections[section]!, {
          title: title.trim(),
          note: note.trim() || undefined,
        });
      }),
    deleteSection: (list: string, section: string) =>
      change(() => void delete state.lists[list]!.sections[section]),
    addItem: (list: string, existing: string[], item: NewItem, order: number) =>
      change(() => {
        const id = freeId(existing, itemId, LIMITS.items)!;
        state.lists[list]!.items[id] = {
          title: item.title.trim(),
          section: item.section,
          order,
          missable: item.missable || undefined,
        };
        privateOf(list).items[id] = {
          steps: item.steps,
          deadline: item.deadline?.trim() || undefined,
        };
      }),
    updateItem: (list: string, id: string, item: NewItem, order: number) =>
      change(() => {
        Object.assign(state.lists[list]!.items[id]!, {
          title: item.title.trim(),
          section: item.section,
          order,
          missable: item.missable || undefined,
        });
        privateOf(list).items[id] = {
          steps: item.steps,
          deadline: item.deadline?.trim() || undefined,
        };
      }),
    deleteItem: (list: string, id: string, lastTick: string | undefined) =>
      change(() => {
        delete state.lists[list]!.items[id];
        delete privateOf(list).items[id];
        if (lastTick === id) delete privateOf(list).lastTick;
      }),
    reorderItems: (list: string, orders: Record<string, number>) =>
      change(() => {
        for (const [id, order] of Object.entries(orders))
          state.lists[list]!.items[id]!.order = order;
      }),
    savePrompt: (template: string) => change(() => (state.template = template)),
    resetPrompt: () => change(() => (state.template = null)),
  };
  return service satisfies ChecklistAdmin;
}
