import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseChecklist, parsedItemCount } from './checklistParser';

// Real output from the guide prompt template, kept byte for byte (tests run from frontend/).
const fixture = readFileSync('src/features/checklist/fixtures/gta6-chapter1-checklist.txt', 'utf8');
const items = (text: string) => parseChecklist(text).sections.flatMap((section) => section.items);

describe('parseChecklist with the real fixture', () => {
  const parsed = parseChecklist(fixture);
  const all = parsed.sections.flatMap((section) => section.items);

  it('imports with zero errors and zero warnings', () => {
    expect(parsed.errors).toEqual([]);
    expect(parsed.warnings).toEqual([]);
  });

  it('finds the title, 16 sections, 21 items and 20 deadlines', () => {
    expect(fixture.trimEnd().split('\n')).toHaveLength(141);
    expect(parsed.title).toBe('Chapter 1 progress');
    expect(parsed.sections).toHaveLength(16);
    expect(parsedItemCount(parsed)).toBe(21);
    expect(all.filter((item) => item.deadline)).toHaveLength(20);
    expect(all.filter((item) => !item.deadline).map((item) => item.title)).toEqual([
      'Recover treasure from the shipwreck',
    ]);
  });

  it('gives every section a note and every item 1 to 5 steps', () => {
    for (const section of parsed.sections) expect(section.note).toBeTruthy();
    for (const item of all) {
      expect(item.steps.length).toBeGreaterThanOrEqual(1);
      expect(item.steps.length).toBeLessThanOrEqual(5);
    }
  });

  it('keeps line 128 ("Game > Save Game") as a step, not a section note', () => {
    expect(fixture.split('\n')[127]).toContain('Game > Save Game');
    const save = all.find((item) => item.title === 'Keep a separate Chapter 1 save')!;
    expect(save.steps).toEqual([
      'Pause during free roam, go to Game > Save Game and choose a separate slot.',
    ]);
    const section = parsed.sections.find((s) => s.title === 'After Recalibration')!;
    expect(section.note).toBe("When free roam resumes and Take Up Mattia's Offer is available");
  });

  it('reads Missable tags and keeps accents, apostrophes, "$" and "!"', () => {
    expect(all.filter((item) => item.missable)).toHaveLength(14);
    expect(all[0]).toMatchObject({ title: 'Pick up the Macizo Cigars', missable: true });
    expect(all.some((item) => item.title === 'Grab the photo of Tomás')).toBe(true);
    expect(parsed.sections.some((s) => s.title === 'During Ring the Bell!')).toBe(true);
    expect(all.flatMap((item) => item.steps)).toContain(
      'Speak to the clerk and buy the custom gold chain for $475.',
    );
    expect(parsed.sections[1]!.title).toBe("During Get Shirley's Rum");
  });

  it('gives the same result with Windows line endings and trailing spaces', () => {
    const windows = fixture.replace(/\n/g, '  \r\n');
    expect(parseChecklist(windows)).toEqual(parsed);
  });
});

describe('parseChecklist with messy input', () => {
  it('ignores code fences and blank lines, and strips bold markers', () => {
    const parsed = parseChecklist(
      '```\n\n**Part 2 progress**\n\n## **After the Heist**\n> When it ends\n\n- **Buy** the car\n  Go to the shop.\n```\n',
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.title).toBe('Part 2 progress');
    expect(parsed.sections[0]).toMatchObject({ title: 'After the Heist', note: 'When it ends' });
    expect(parsed.sections[0]!.items[0]).toMatchObject({
      title: 'Buy the car',
      steps: ['Go to the shop.'],
    });
  });

  it('accepts "*" and "•" bullets and tabs or any indent for steps', () => {
    const parsed = parseChecklist(
      'T\n## S\n* First [MISSABLE]\n\tStep a\n• Second\n      Step b\n',
    );
    expect(parsed.errors).toEqual([]);
    expect(items('T\n## S\n* First [MISSABLE]\n\tStep a\n• Second\n      Step b')).toEqual([
      { title: 'First', missable: true, steps: ['Step a'], line: 3 },
      { title: 'Second', missable: false, steps: ['Step b'], line: 5 },
    ]);
  });

  it('strips step numbers like "1." and "1)", even when the indent is lost', () => {
    const list = items('T\n## S\n- Item\n  1. One\n  2) Two\n3. Three\n  - Four\n  Deadline: soon');
    expect(list[0]).toMatchObject({ steps: ['One', 'Two', 'Three', 'Four'], deadline: 'soon' });
  });

  it('splits joined lines: "## Section > note" and a deadline joined onto a step', () => {
    const parsed = parseChecklist(
      'T\n## During X > When X starts\n- Do it\n  Go there. Deadline: before Y',
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.sections[0]).toMatchObject({ title: 'During X', note: 'When X starts' });
    expect(parsed.sections[0]!.items[0]).toMatchObject({
      steps: ['Go there.'],
      deadline: 'before Y',
    });
  });

  it('warns about missing steps without blocking the import', () => {
    const parsed = parseChecklist('T\n## S\n- No steps here\n- Has one\n  Step');
    expect(parsed.errors).toEqual([]);
    expect(parsed.warnings).toEqual([
      { line: 3, text: 'No steps here', reason: 'Item has no steps' },
    ]);
  });

  it('reports over-length text and too many steps with line numbers', () => {
    const parsed = parseChecklist(
      `${'L'.repeat(61)}\n## S\n- ${'i'.repeat(81)}\n  ${'s'.repeat(151)}\n  2\n  3\n  4\n  5\n  6\n  Deadline: ${'d'.repeat(121)}`,
    );
    expect(parsed.errors.map((e) => [e.line, e.reason])).toEqual([
      [1, 'List title is 61 characters (max 60)'],
      [3, 'Item title is 81 characters (max 80)'],
      [4, 'Step is 151 characters (max 150)'],
      [9, 'More than 5 steps for this item'],
      [10, 'Deadline is 121 characters (max 120)'],
    ]);
  });

  it('does not count the deadline towards the 5 steps', () => {
    const parsed = parseChecklist('T\n## S\n- I\n  1\n  2\n  3\n  4\n  5\n  Deadline: later');
    expect(parsed.errors).toEqual([]);
  });

  it('treats ">" as a note only straight after a section and at the start of a line', () => {
    const parsed = parseChecklist('T\n## S\n- I\n  Open Menu > Save\n> stray note');
    expect(parsed.sections[0]!.note).toBeUndefined();
    expect(parsed.sections[0]!.items[0]!.steps).toEqual(['Open Menu > Save']);
    expect(parsed.errors).toEqual([
      {
        line: 5,
        text: '> stray note',
        reason: 'Note line (">") not straight after a section line',
      },
    ]);
  });

  it('reports lines it cannot understand and items before any section', () => {
    const parsed = parseChecklist('T\n- Orphan item\n## S\nrandom words\n- I\n  step');
    expect(parsed.errors.map((e) => [e.line, e.reason])).toEqual([
      [2, 'Item before the first "## " section line'],
      [4, "Couldn't understand this line"],
    ]);
  });

  it('limits a list to 60 items', () => {
    const lines = ['T', '## S', ...Array.from({ length: 61 }, (_, i) => `- Item ${i}\n  step`)];
    const parsed = parseChecklist(lines.join('\n'));
    expect(parsed.errors).toEqual([
      { line: 123, text: '- Item 60', reason: 'More than 60 items in one list' },
    ]);
  });

  it('says when there is nothing to import or no sections', () => {
    expect(parseChecklist('\n```\n```\n').errors[0]!.reason).toBe('Nothing to import');
    expect(parseChecklist('Just a title').errors[0]!.reason).toBe('No "## " sections found');
    expect(parseChecklist('## S\n- I').errors[0]!.reason).toBe(
      'The first line should be the list title',
    );
  });
});
