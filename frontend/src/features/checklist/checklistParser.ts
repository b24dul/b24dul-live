// Turns pasted checklist text into sections, items, steps and deadlines. Forgiving on purpose:
// it ignores code fences, blank lines, Windows line endings, trailing spaces and bold markers,
// accepts "-", "*" or "•" bullets and any indent, and strips step numbers. Anything it can't
// understand is reported with its line number instead of being guessed.
//
// Format:
//   First line          list title
//   ## Section          section title; a "> note" line straight after it is the section note
//   - Item [missable]   item title, optional Missable tag
//     indented lines    1 to 5 private steps; "Deadline: ..." is the private deadline
import { LIMITS } from './checklistModel.ts';

export type ParsedItem = {
  title: string;
  missable: boolean;
  steps: string[];
  deadline?: string;
  line: number;
};
export type ParsedSection = { title: string; note?: string; items: ParsedItem[]; line: number };
export type ParseProblem = { line: number; text: string; reason: string };
export type ParsedChecklist = {
  title: string;
  sections: ParsedSection[];
  /** Problems that stop the list being saved. */
  errors: ParseProblem[];
  /** Things worth checking that don't stop saving. */
  warnings: ParseProblem[];
};

const BULLET = /^[-*•+]\s+/;
const NUMBER = /^(?:step\s*)?\(?\d{1,2}[.):]\s+/i;
const DEADLINE = /^deadline\s*:\s*/i;
const MISSABLE = /\s*\[missable\]$/i;

/** Removes stray markdown (bold/italic markers and backticks) and tidies spaces. */
export function clean(text: string) {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseChecklist(input: string): ParsedChecklist {
  const result: ParsedChecklist = { title: '', sections: [], errors: [], warnings: [] };
  const problem = (list: ParseProblem[], line: number, text: string, reason: string) =>
    list.push({ line, text: text.trim().slice(0, 200), reason });
  const error = (line: number, text: string, reason: string) =>
    problem(result.errors, line, text, reason);

  let section: ParsedSection | null = null;
  let item: ParsedItem | null = null;
  let previous: 'title' | 'section' | 'note' | 'item' | 'step' | null = null;
  let itemCount = 0;

  const addStep = (lineNo: number, raw: string, text: string) => {
    if (!item) return error(lineNo, raw, 'Step without an item above it');
    if (!text) return;
    if (item.steps.length >= LIMITS.steps)
      return error(lineNo, raw, `More than ${LIMITS.steps} steps for this item`);
    if (text.length > LIMITS.step)
      error(lineNo, raw, `Step is ${text.length} characters (max ${LIMITS.step})`);
    item.steps.push(text);
    previous = 'step';
  };
  const setDeadline = (lineNo: number, raw: string, text: string) => {
    if (!item) return error(lineNo, raw, 'Deadline without an item above it');
    if (item.deadline !== undefined) return error(lineNo, raw, 'Second deadline for this item');
    if (!text) return error(lineNo, raw, 'Deadline is empty');
    if (text.length > LIMITS.deadline)
      error(lineNo, raw, `Deadline is ${text.length} characters (max ${LIMITS.deadline})`);
    item.deadline = text;
    previous = 'step';
  };
  /** A step line, which may have a deadline joined onto its end. */
  const stepOrDeadline = (lineNo: number, raw: string, content: string) => {
    let text = clean(content.replace(BULLET, '').replace(NUMBER, ''));
    if (DEADLINE.test(text)) return setDeadline(lineNo, raw, text.replace(DEADLINE, ''));
    const joined = text.match(/^(.*?)\s+deadline\s*:\s*(.*)$/i);
    if (joined) text = joined[1]!;
    addStep(lineNo, raw, text);
    if (joined) setDeadline(lineNo, raw, joined[2]!);
  };
  const startItem = (lineNo: number, raw: string, content: string) => {
    if (!section) return error(lineNo, raw, 'Item before the first "## " section line');
    let title = clean(content);
    const joined = title.match(/^(.*?)\s+deadline\s*:\s*(.*)$/i);
    if (joined) title = joined[1]!;
    const missable = MISSABLE.test(title);
    title = title.replace(MISSABLE, '').trim();
    itemCount += 1;
    if (itemCount > LIMITS.items) error(lineNo, raw, `More than ${LIMITS.items} items in one list`);
    if (!title) return error(lineNo, raw, 'Item has no title');
    if (title.length > LIMITS.itemTitle)
      error(lineNo, raw, `Item title is ${title.length} characters (max ${LIMITS.itemTitle})`);
    item = { title, missable, steps: [], line: lineNo };
    section.items.push(item);
    previous = 'item';
    if (joined) setDeadline(lineNo, raw, joined[2]!);
  };
  const startSection = (lineNo: number, raw: string, content: string) => {
    let title = clean(content);
    let note: string | undefined;
    // Joined line: "## Section > note".
    const joined = title.match(/^(.*?)\s+>\s+(.*)$/);
    if (joined) [title, note] = [joined[1]!, joined[2]!];
    if (result.sections.length >= LIMITS.sections)
      return error(lineNo, raw, `More than ${LIMITS.sections} sections`);
    if (!title) return error(lineNo, raw, 'Section has no title');
    if (title.length > LIMITS.sectionTitle)
      error(
        lineNo,
        raw,
        `Section title is ${title.length} characters (max ${LIMITS.sectionTitle})`,
      );
    section = { title, items: [], line: lineNo };
    result.sections.push(section);
    item = null;
    previous = 'section';
    if (note !== undefined) setNote(lineNo, raw, note);
  };
  function setNote(lineNo: number, raw: string, text: string) {
    if (!section || !text) return error(lineNo, raw, 'Empty section note');
    if (text.length > LIMITS.sectionNote)
      error(lineNo, raw, `Section note is ${text.length} characters (max ${LIMITS.sectionNote})`);
    section.note = text;
    previous = 'note';
  }

  input.split(/\r\n|\r|\n/).forEach((rawLine, index) => {
    const lineNo = index + 1;
    const raw = rawLine.replace(/\s+$/, '');
    if (!raw.trim() || /^\s*(```|~~~)/.test(raw)) return;
    const indented = /^\s/.test(raw);
    const content = raw.trim();

    if (previous === null) {
      previous = 'title';
      if (/^##/.test(content) || BULLET.test(content)) {
        error(lineNo, raw, 'The first line should be the list title');
      } else {
        const title = clean(content.replace(/^#\s*/, ''));
        if (title.length > LIMITS.listTitle)
          error(lineNo, raw, `List title is ${title.length} characters (max ${LIMITS.listTitle})`);
        result.title = title;
        return;
      }
    }

    if (!indented) {
      if (/^#{1,6}\s*\S/.test(content))
        return startSection(lineNo, raw, content.replace(/^#+/, ''));
      if (content.startsWith('>')) {
        if (previous !== 'section')
          return error(lineNo, raw, 'Note line (">") not straight after a section line');
        return setNote(lineNo, raw, clean(content.slice(1)));
      }
      if (BULLET.test(content)) return startItem(lineNo, raw, content.replace(BULLET, ''));
      // Steps or deadlines that lost their indent, e.g. "1. Go to..." or "Deadline: ...".
      if (item && (NUMBER.test(content) || DEADLINE.test(content)))
        return stepOrDeadline(lineNo, raw, content);
      return error(lineNo, raw, "Couldn't understand this line");
    }

    // Indented: a step or deadline under the current item. An indented bullet straight under a
    // section (before any item) is treated as an item.
    if (!item && section && BULLET.test(content))
      return startItem(lineNo, raw, content.replace(BULLET, ''));
    if (!item) return error(lineNo, raw, 'Indented line without an item above it');
    stepOrDeadline(lineNo, raw, content);
  });

  if (!result.title && result.errors.length === 0 && result.sections.length === 0)
    error(0, '', 'Nothing to import');
  else if (result.sections.length === 0) error(0, '', 'No "## " sections found');
  for (const parsedSection of result.sections) {
    if (parsedSection.items.length === 0)
      problem(result.warnings, parsedSection.line, parsedSection.title, 'Section has no items');
    for (const parsedItem of parsedSection.items)
      if (parsedItem.steps.length === 0)
        problem(result.warnings, parsedItem.line, parsedItem.title, 'Item has no steps');
  }
  return result;
}

export const parsedItemCount = (parsed: ParsedChecklist) =>
  parsed.sections.reduce((sum, section) => sum + section.items.length, 0);
