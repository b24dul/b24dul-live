import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { GlassPanel } from '../../components/ui';
import type { ChecklistViewer as ViewerService } from '../../services/checklistService';
import { orderedSections, progressOf, type Item, type PublicList } from './checklistModel';

export type LoadChecklistViewer = () => Promise<ViewerService>;
const loadFirebaseViewer: LoadChecklistViewer = () =>
  import('../../services/checklistRuntime').then((module) => module.startChecklistRuntime());

export function MissableTag() {
  return <span className="checklist-missable">Missable</span>;
}

function DoneItem({ item }: { item: Item }) {
  return (
    <li className="checklist-viewer-item checklist-viewer-item--done">
      <Check size={16} aria-hidden="true" />
      <span>
        <span className="sr-only">Done: </span>
        {item.title}
      </span>
    </li>
  );
}

/**
 * What viewers see of the active list: title, progress, the current section and the current item.
 * Upcoming item titles are only hidden here (unless the list allows them); they are still in the
 * public data, which is accepted.
 */
export function ChecklistPanel({ list }: { list: PublicList }) {
  const progress = progressOf(list);
  const { current, section } = progress;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const inSection = progress.items.filter((item) => item.section === section?.id);
  const doneHere = inSection.filter((item) => item.done);
  const upcoming = inSection.filter((item) => !item.done && item.id !== current?.id);
  const sectionIds = orderedSections(list).map((s) => s.id);
  const sectionIndex = section ? sectionIds.indexOf(section.id) : -1;
  const doneEarlier = progress.items.filter(
    (item) => item.done && sectionIds.indexOf(item.section) < sectionIndex,
  );

  return (
    <GlassPanel
      as="section"
      className="checklist-viewer p-4 sm:p-5"
      aria-labelledby="checklist-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-title" className="text-xl">
          {list.title}
        </h2>
        <span className="checklist-count" aria-label={`${progress.done} of ${progress.total} done`}>
          {progress.done}/{progress.total}
        </span>
      </div>
      <div
        className="checklist-bar"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      {section && (
        <div className="mt-3">
          <p className="checklist-section-title">{section.title}</p>
          {section.note && <p className="text-sm text-slate-300">{section.note}</p>}
        </div>
      )}
      <ul className="checklist-viewer-list" aria-label="This section">
        {doneHere.map((item) => (
          <DoneItem key={item.id} item={item} />
        ))}
        {current ? (
          <li className="checklist-viewer-item checklist-viewer-item--now">
            <span className="checklist-now-label">Now:</span>
            <span>{current.title}</span>
            {current.missable && <MissableTag />}
          </li>
        ) : (
          <li className="checklist-viewer-item checklist-viewer-item--now">All done!</li>
        )}
        {list.showUpcoming &&
          upcoming.map((item) => (
            <li key={item.id} className="checklist-viewer-item checklist-viewer-item--upcoming">
              <span className="sr-only">Up next: </span>
              {item.title}
              {item.missable && <MissableTag />}
            </li>
          ))}
      </ul>
      {doneEarlier.length > 0 && (
        <details className="checklist-earlier">
          <summary>Done earlier ({doneEarlier.length})</summary>
          <ul className="checklist-viewer-list">
            {doneEarlier.map((item) => (
              <DoneItem key={item.id} item={item} />
            ))}
          </ul>
        </details>
      )}
    </GlassPanel>
  );
}

/** Follows the active list live. Shows nothing when no list is active or it can't be read. */
export function StreamChecklist({
  loadService = loadFirebaseViewer,
}: {
  loadService?: LoadChecklistViewer;
}) {
  const [list, setList] = useState<PublicList | null>(null);
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    loadService().then(
      (service) => {
        if (!cancelled) stop = service.watchActiveList(setList);
      },
      () => {},
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [loadService]);
  return list ? <ChecklistPanel list={list} /> : null;
}
