// Admin side of the stream progress checklist: the Up next card, the full list with ticks, list
// management, import with preview, and the guide prompt helper. Steps, deadlines and the game
// name are admin-only data (the database rules enforce this and the same length limits).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { GlassPanel, PrimaryButton, SecondaryButton } from '../../components/ui';
import type { AdminRuntime } from '../../services/adminRuntime';
import { ConfirmButton, type Run } from '../admin/AdminShared';
import {
  fillPrompt,
  LIMITS,
  orderedSections,
  progressOf,
  searchLinks,
  type Item,
  type PrivateList,
  type PublicList,
  type Section,
} from './checklistModel';
import { parseChecklist, parsedItemCount, type ParsedChecklist } from './checklistParser';
import { MissableTag } from './ChecklistViewer';

export type ChecklistData = {
  lists: PublicList[];
  privates: Record<string, PrivateList>;
  active: string | null;
  template: string | null;
};
type Tools = AdminRuntime['checklists'];
type Props = { data: ChecklistData; tools: Tools; run: Run };
type ListProps = { list: PublicList; priv: PrivateList; tools: Tools; run: Run };

/** The default guide prompt is a plain text file, fetched only when the admin needs it. */
const TEMPLATE_URL = `${import.meta.env.BASE_URL}checklist-guide-template.txt`;
const small = 'admin-small-button';

function Steps({ steps, deadline }: { steps?: string[]; deadline?: string }) {
  return (
    <>
      {steps?.length ? (
        <ol className="checklist-steps">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ) : null}
      {deadline && (
        <p className="checklist-deadline">
          <strong>Deadline:</strong> {deadline}
        </p>
      )}
    </>
  );
}

function UndoButton({ list, priv, tools, run }: ListProps) {
  const id = priv.lastTick;
  const last = id ? list.items[id] : undefined;
  if (!id || !last?.done) return null;
  return (
    <SecondaryButton
      className={small}
      onClick={() => void run(`undid “${last.title}”`, () => tools.untick(list.id, id, true))}
    >
      Undo “{last.title}”
    </SecondaryButton>
  );
}

/** The card at the top of admin: what to do now, how, and by when. */
export function UpNextCard({ data, tools, run }: Props) {
  const list = data.lists.find((candidate) => candidate.id === data.active);
  if (!list) return null;
  const priv = data.privates[list.id] ?? { items: {} };
  const { current, next, section, done, total } = progressOf(list);
  const details = current ? priv.items[current.id] : undefined;
  const links = searchLinks(priv.gameName, current?.title ?? '');
  const undo = <UndoButton list={list} priv={priv} tools={tools} run={run} />;
  return (
    <GlassPanel as="section" className="checklist-upnext p-4 sm:p-5" aria-labelledby="up-next">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="up-next" className="checklist-kicker">
          Up next · {list.title}
        </h2>
        <span className="checklist-count">
          {done}/{total}
        </span>
      </div>
      {current ? (
        <>
          {section && <p className="text-sm text-slate-300">{section.title}</p>}
          <p className="checklist-upnext-title">
            {current.title} {current.missable && <MissableTag />}
          </p>
          <Steps steps={details?.steps} deadline={details?.deadline} />
          <PrimaryButton
            className="checklist-done-button"
            onClick={() =>
              void run(`ticked “${current.title}”`, () => tools.tick(list.id, current.id))
            }
          >
            <Check size={22} aria-hidden="true" /> Done
          </PrimaryButton>
          <p className="checklist-then">
            {next ? (
              <>
                <span>Then:</span> {next.title}
              </>
            ) : (
              'This is the last item.'
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['YouTube', 'Google'] as const).map((site) => (
              <a
                key={site}
                className={`ui-button ui-button--secondary ${small}`}
                href={site === 'YouTube' ? links.youtube : links.google}
                target="_blank"
                rel="noopener noreferrer"
              >
                Search {site}
              </a>
            ))}
            {undo}
          </div>
        </>
      ) : (
        <>
          <p className="checklist-upnext-title">All done!</p>
          <div>{undo}</div>
        </>
      )}
    </GlassPanel>
  );
}

type Field = {
  key: string;
  label: string;
  max?: number;
  kind?: 'area' | 'check' | 'select';
  options?: Section[];
};
type Values = Record<string, string | boolean>;

/**
 * A small form for lists, sections and items. Inputs stop at the length limits; `check` can
 * return a problem to show instead of saving. Clears itself after adding (when not editing).
 */
function Form({
  fields,
  initial,
  submit,
  onSubmit,
  onCancel,
  check,
  children,
}: {
  fields: Field[];
  initial: Values;
  submit: string;
  onSubmit: (values: Values) => Promise<boolean>;
  onCancel?: () => void;
  check?: (values: Values) => string;
  children?: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [problem, setProblem] = useState('');
  return (
    <form
      className="checklist-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const found = check?.(values) ?? '';
        setProblem(found);
        if (!found && (await onSubmit(values)) && !onCancel) setValues(initial);
      }}
    >
      {fields.map(({ key, label, max, kind, options }) => {
        const value = values[key];
        const set = (next: string | boolean) => setValues({ ...values, [key]: next });
        return (
          <label key={key} className={kind === 'check' ? 'checklist-check' : undefined}>
            {kind === 'check' ? (
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => set(e.target.checked)}
              />
            ) : (
              label
            )}
            {kind === 'check' ? (
              label
            ) : kind === 'select' ? (
              <select
                className="admin-select"
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              >
                {options!.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            ) : kind === 'area' ? (
              <textarea
                className="admin-input"
                rows={4}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            ) : (
              <input
                className="admin-input"
                maxLength={max}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </label>
        );
      })}
      {problem && (
        <p role="alert" className="checklist-problems">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" className={small}>
          {submit}
        </PrimaryButton>
        {onCancel && (
          <SecondaryButton className={small} onClick={onCancel}>
            Cancel
          </SecondaryButton>
        )}
        {children}
      </div>
    </form>
  );
}

const lines = (text: unknown) =>
  String(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const required = (label: string) => (values: Values) =>
  String(values.title).trim() ? '' : `Add ${label}.`;

function itemFields(sections: Section[]): Field[] {
  return [
    { key: 'title', label: 'Item title', max: LIMITS.itemTitle },
    { key: 'section', label: 'Section', kind: 'select', options: sections },
    { key: 'missable', label: 'Missable', kind: 'check' },
    {
      key: 'steps',
      label: `Steps (one per line, up to ${LIMITS.steps}; only you see them)`,
      kind: 'area',
    },
    { key: 'deadline', label: 'Deadline (optional, only you see it)', max: LIMITS.deadline },
  ];
}
function checkItem(values: Values) {
  const steps = lines(values.steps);
  return (
    required('an item title')(values) ||
    (steps.length > LIMITS.steps ? `At most ${LIMITS.steps} steps.` : '') ||
    (steps.some((step) => step.length > LIMITS.step)
      ? `A step is over ${LIMITS.step} characters.`
      : '')
  );
}
const toItem = (values: Values) => ({
  title: String(values.title),
  section: String(values.section),
  missable: values.missable === true,
  steps: lines(values.steps),
  deadline: String(values.deadline),
});
const sectionFields: Field[] = [
  { key: 'title', label: 'Section title', max: LIMITS.sectionTitle },
  { key: 'note', label: 'Note (when this section starts, optional)', max: LIMITS.sectionNote },
];

function nextOrder(list: PublicList, section: string) {
  const orders = Object.values(list.items)
    .filter((item) => item.section === section)
    .map((item) => item.order + 1);
  return Math.min(LIMITS.items - 1, Math.max(0, ...orders));
}

function ItemRow({
  list,
  priv,
  item,
  siblings,
  sections,
  tools,
  run,
}: ListProps & { item: Item; siblings: Item[]; sections: Section[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const details = priv.items[item.id];
  const index = siblings.indexOf(item);
  const move = (by: number) => {
    const order = siblings.map((sibling) => sibling.id);
    [order[index], order[index + by]] = [order[index + by]!, order[index]!];
    void run('moved', () =>
      tools.reorderItems(list.id, Object.fromEntries(order.map((id, position) => [id, position]))),
    );
  };
  return (
    <li className={item.done ? 'checklist-row checklist-row--done' : 'checklist-row'}>
      <div className="checklist-row-main">
        <input
          type="checkbox"
          className="checklist-tick"
          checked={Boolean(item.done)}
          aria-label={`Done: ${item.title}`}
          onChange={(event) =>
            void run(`${event.target.checked ? 'ticked' : 'unticked'} “${item.title}”`, () =>
              event.target.checked
                ? tools.tick(list.id, item.id)
                : tools.untick(list.id, item.id, priv.lastTick === item.id),
            )
          }
        />
        <button
          type="button"
          className="checklist-row-title"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {item.title}
        </button>
        {item.missable && <MissableTag />}
      </div>
      {editing ? (
        <Form
          fields={itemFields(sections)}
          initial={{
            title: item.title,
            section: item.section,
            missable: Boolean(item.missable),
            steps: (details?.steps ?? []).join('\n'),
            deadline: details?.deadline ?? '',
          }}
          submit="Save item"
          check={checkItem}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const edited = toItem(values);
            const order =
              edited.section === item.section ? item.order : nextOrder(list, edited.section);
            const saved = await run('item saved', () =>
              tools.updateItem(list.id, item.id, edited, order),
            );
            if (saved) setEditing(false);
            return saved;
          }}
        />
      ) : (
        open && (
          <div className="checklist-row-details">
            <Steps steps={details?.steps} deadline={details?.deadline} />
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className={small} onClick={() => setEditing(true)}>
                Edit
              </SecondaryButton>
              {[-1, 1].map((by) => (
                <SecondaryButton
                  key={by}
                  className={small}
                  disabled={!siblings[index + by]}
                  onClick={() => move(by)}
                  aria-label={`Move “${item.title}” ${by < 0 ? 'up' : 'down'}`}
                >
                  {by < 0 ? '↑' : '↓'}
                </SecondaryButton>
              ))}
              <ConfirmButton
                small
                label="Delete item"
                confirmLabel={`Delete “${item.title}”`}
                onConfirm={() =>
                  void run('item deleted', () => tools.deleteItem(list.id, item.id, priv.lastTick))
                }
              />
            </div>
          </div>
        )
      )}
    </li>
  );
}

function SectionBlock(props: ListProps & { section: Section; items: Item[]; sections: Section[] }) {
  const { list, section, items, tools, run } = props;
  const [editing, setEditing] = useState(false);
  return (
    <li className="checklist-section">
      <div className="checklist-section-head">
        <h4 className="checklist-section-title">
          {section.title}{' '}
          <span className="checklist-section-count">
            ({items.filter((item) => item.done).length}/{items.length})
          </span>
        </h4>
        <SecondaryButton
          className={small}
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
        >
          Edit section
        </SecondaryButton>
      </div>
      {section.note && <p className="text-sm text-slate-300">{section.note}</p>}
      {editing && (
        <Form
          fields={sectionFields}
          initial={{ title: section.title, note: section.note ?? '' }}
          submit="Save section"
          check={required('a section title')}
          onCancel={() => setEditing(false)}
          onSubmit={async ({ title, note }) => {
            const saved = await run('section saved', () =>
              tools.updateSection(list.id, section.id, String(title), String(note)),
            );
            if (saved) setEditing(false);
            return saved;
          }}
        >
          {items.length === 0 && (
            <ConfirmButton
              small
              label="Delete empty section"
              confirmLabel={`Delete “${section.title}”`}
              onConfirm={() =>
                void run('section deleted', () => tools.deleteSection(list.id, section.id))
              }
            />
          )}
        </Form>
      )}
      <ul className="flex flex-col gap-1" aria-label={section.title}>
        {items.map((item) => (
          <ItemRow key={item.id} {...props} item={item} siblings={items} />
        ))}
      </ul>
    </li>
  );
}

function FullList({ active, ...props }: ListProps & { active: string | null }) {
  const { list, priv, tools, run } = props;
  const sections = orderedSections(list);
  const progress = progressOf(list);
  const [adding, setAdding] = useState('');
  const toggle = (what: string) => setAdding(adding === what ? '' : what);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="checklist-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="checklist-full" className="text-lg font-semibold">
          {list.title}{' '}
          <span className="checklist-count">
            {progress.done}/{progress.total}
          </span>
        </h3>
        <UndoButton {...props} />
      </div>
      <details className="checklist-details">
        <summary>List settings</summary>
        <Form
          key={`${list.title}|${list.showUpcoming}|${priv.gameName}`}
          fields={[
            { key: 'title', label: 'List title (viewers see this)', max: LIMITS.listTitle },
            {
              key: 'gameName',
              label: 'Game name (only you see it; used by the search buttons)',
              max: LIMITS.gameName,
            },
            { key: 'showUpcoming', label: 'Show upcoming item titles to viewers', kind: 'check' },
          ]}
          initial={{
            title: list.title,
            gameName: priv.gameName ?? '',
            showUpcoming: Boolean(list.showUpcoming),
          }}
          submit="Save settings"
          check={required('a list title')}
          onSubmit={(values) =>
            run('list saved', () =>
              tools.updateListDetails(list.id, {
                title: String(values.title),
                gameName: String(values.gameName),
                showUpcoming: values.showUpcoming === true,
              }),
            )
          }
        >
          <ConfirmButton
            small
            label="Delete list"
            confirmLabel={`Delete “${list.title}” for good`}
            onConfirm={() => void run('list deleted', () => tools.deleteList(list.id, active))}
          />
        </Form>
      </details>
      <ul className="flex flex-col gap-4" aria-label="Sections">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            {...props}
            section={section}
            items={progress.items.filter((item) => item.section === section.id)}
            sections={sections}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {['Add item', 'Add section'].map((what) => (
          <SecondaryButton
            key={what}
            className={small}
            aria-expanded={adding === what}
            onClick={() => toggle(what)}
          >
            {what}
          </SecondaryButton>
        ))}
      </div>
      {adding === 'Add item' && sections.length > 0 && (
        <Form
          fields={itemFields(sections)}
          initial={{
            title: '',
            section: progress.section?.id ?? sections[0]!.id,
            missable: false,
            steps: '',
            deadline: '',
          }}
          submit="Add item"
          check={checkItem}
          onSubmit={(values) => {
            const item = toItem(values);
            return run(`added “${item.title.trim()}”`, () =>
              tools.addItem(list.id, Object.keys(list.items), item, nextOrder(list, item.section)),
            );
          }}
        />
      )}
      {adding === 'Add section' && (
        <Form
          fields={sectionFields}
          initial={{ title: '', note: '' }}
          submit="Add section"
          check={required('a section title')}
          onSubmit={({ title, note }) =>
            run('section added', () =>
              tools.addSection(
                list.id,
                Object.keys(list.sections),
                String(title),
                String(note),
                Math.min(LIMITS.sections - 1, (sections.at(-1)?.order ?? -1) + 1),
              ),
            )
          }
        />
      )}
    </section>
  );
}

/** Preview of a parsed import: what will be saved and any problems, with line numbers. */
export function ImportPreview({ parsed }: { parsed: ParsedChecklist }) {
  const items = parsed.sections.flatMap((section) => section.items);
  const errors = parsed.errors.length;
  const problems = (label: string, list: ParsedChecklist['errors'], className: string) =>
    list.length > 0 && (
      <ul className={className} aria-label={label}>
        {list.map((problem, index) => (
          <li key={index}>
            {problem.line > 0 && `Line ${problem.line}: `}
            {problem.reason}
            {problem.text && <code> {problem.text}</code>}
          </li>
        ))}
      </ul>
    );
  return (
    <section className="checklist-preview" aria-labelledby="import-preview">
      <h4 id="import-preview" className="font-semibold">
        Preview: {parsed.title || '(no title)'}
      </h4>
      <p className="text-sm" data-testid="import-summary">
        {parsed.sections.length} sections · {items.length} items ·{' '}
        {items.filter((item) => item.deadline).length} deadlines ·{' '}
        {items.filter((item) => item.missable).length} Missable ·{' '}
        <span className={errors ? 'checklist-error-count' : undefined}>
          {errors} {errors === 1 ? 'problem' : 'problems'}
        </span>
      </p>
      {problems('Problems', parsed.errors, 'checklist-problems')}
      {problems('Worth checking', parsed.warnings, 'checklist-warnings')}
      <ol className="checklist-preview-sections">
        {parsed.sections.map((section, index) => (
          <li key={index}>
            <p className="checklist-section-title">{section.title}</p>
            {section.note && <p className="text-sm text-slate-300">{section.note}</p>}
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="checklist-preview-item">
                  <p>
                    {item.title} {item.missable && <MissableTag />}
                  </p>
                  <Steps steps={item.steps} deadline={item.deadline} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ImportBox({ data, tools, run, onSaved }: Props & { onSaved: (id: string) => void }) {
  const [text, setText] = useState('');
  const [gameName, setGameName] = useState('');
  const [showUpcoming, setShowUpcoming] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseChecklist(text) : null), [text]);
  const full = data.lists.length >= LIMITS.lists;
  const save = async () => {
    let created = '';
    const ok = await run(`saved “${parsed!.title}”`, async () => {
      created = await tools.createList(parsed!, {
        gameName,
        showUpcoming,
        existing: data.lists.map((list) => list.id),
      });
    });
    if (ok) {
      setText('');
      setGameName('');
      onSaved(created);
    }
  };
  return (
    <section className="checklist-form" aria-labelledby="checklist-import">
      <h3 id="checklist-import" className="text-lg font-semibold">
        Import a list
      </h3>
      <label>
        Paste the checklist text
        <textarea
          className="admin-input checklist-textarea"
          rows={10}
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <label>
        Game name (optional, only you see it)
        <input
          className="admin-input"
          maxLength={LIMITS.gameName}
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
      </label>
      <label className="checklist-check">
        <input
          type="checkbox"
          checked={showUpcoming}
          onChange={(e) => setShowUpcoming(e.target.checked)}
        />
        Show upcoming item titles to viewers
      </label>
      {full && (
        <p className="checklist-problems">
          There are already {LIMITS.lists} lists. Delete one first.
        </p>
      )}
      {parsed && <ImportPreview parsed={parsed} />}
      <div>
        <PrimaryButton
          disabled={!parsed || parsed.errors.length > 0 || !parsedItemCount(parsed) || full}
          onClick={() => void save()}
        >
          Save list
        </PrimaryButton>
      </div>
    </section>
  );
}

/** Fills the guide prompt template for a chat AI, with an editable, saved template. */
export function GuidePrompt({ data, tools, run }: Props) {
  const [fields, setFields] = useState({ GAME: '', PLATFORM: '', PART: '', FOCUS: '' });
  const [fallback, setFallback] = useState('');
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const template = data.template ?? fallback;
  const [draft, setDraft] = useState(template);
  useEffect(() => {
    if (data.template !== null || fallback) return;
    fetch(TEMPLATE_URL)
      .then((response) => (response.ok ? response.text() : ''))
      .then(setFallback, () => {});
  }, [data.template, fallback]);
  useEffect(() => setDraft(template), [template]);
  const prompt = fillPrompt(template, fields);
  return (
    <section className="checklist-form" aria-labelledby="guide-prompt">
      <h3 id="guide-prompt" className="text-lg font-semibold">
        Guide prompt
      </h3>
      <p className="text-slate-300">
        Use a chat AI with web search turned on. Copy only the text inside the code block.
      </p>
      <div className="checklist-guide-fields">
        {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
          <label key={key}>
            {key[0] + key.slice(1).toLowerCase()}
            <input
              className="admin-input"
              value={fields[key]}
              onChange={(event) => {
                setCopied(false);
                setFields({ ...fields, [key]: event.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <label>
        Finished prompt
        <textarea className="admin-input checklist-textarea" rows={8} readOnly value={prompt} />
      </label>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton
          className={small}
          onClick={() => void navigator.clipboard.writeText(prompt).then(() => setCopied(true))}
        >
          {copied ? 'Copied' : 'Copy'}
        </PrimaryButton>
        <SecondaryButton
          className={small}
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          Edit template
        </SecondaryButton>
      </div>
      {editing && (
        <>
          <label>
            Template ({'{GAME}'}, {'{PLATFORM}'}, {'{PART}'} and {'{FOCUS}'} are filled in)
            <textarea
              className="admin-input checklist-textarea"
              rows={10}
              maxLength={LIMITS.template}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              className={small}
              disabled={!draft.trim()}
              onClick={() => void run('template saved', () => tools.savePrompt(draft))}
            >
              Save template
            </PrimaryButton>
            <ConfirmButton
              small
              label="Reset to default"
              confirmLabel="Reset the template to the default"
              onConfirm={() => void run('template reset to default', () => tools.resetPrompt())}
            />
          </div>
        </>
      )}
    </section>
  );
}

/** The Checklist tab: pick the active list, manage lists, import, and the guide prompt. */
export function ChecklistTab({ data, tools, run }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const shown = data.lists.find((list) => list.id === (chosen ?? data.active)) ?? data.lists[0];
  const picker = (label: string, value: string, onChange: (id: string) => void, none?: string) => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        className="admin-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {none && <option value="">{none}</option>}
        {data.lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.title}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="checklist-lists">
        <h2 id="checklist-lists" className="text-lg font-semibold">
          Stream checklist
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          {picker(
            'Active list (viewers see it on Watch, and on Home while live)',
            data.active ?? '',
            (id) => {
              void run(id ? 'active list changed' : 'checklist hidden from viewers', () =>
                tools.setActive(id || null),
              );
              if (id) setChosen(id);
            },
            'None (hidden)',
          )}
          {data.lists.length > 1 && picker('Show list', shown?.id ?? '', setChosen)}
        </div>
        {!shown && <p className="text-sm text-slate-300">No lists yet. Import one below.</p>}
      </section>
      {shown && (
        <FullList
          key={shown.id}
          list={shown}
          priv={data.privates[shown.id] ?? { items: {} }}
          active={data.active}
          tools={tools}
          run={run}
        />
      )}
      <div className="checklist-tools">
        <ImportBox data={data} tools={tools} run={run} onSaved={setChosen} />
        <GuidePrompt data={data} tools={tools} run={run} />
      </div>
    </div>
  );
}
