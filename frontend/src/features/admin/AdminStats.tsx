import { useEffect, useState } from 'react';
import { GlassPanel } from '../../components/ui';
import type { AdminRuntime } from '../../services/adminRuntime';
import type { StatsDay } from '../../services/adminService';
import type { DayTotals, Metric } from '../../services/dailyTotals';

const COLUMNS: { metric: Metric; label: string }[] = [
  { metric: 'visits', label: 'Visits' },
  { metric: 'siteMinutes', label: 'Minutes on site' },
  { metric: 'liveMinutes', label: 'Minutes watching live' },
  { metric: 'videoPlays', label: 'Video plays' },
  { metric: 'sudokuStarts', label: 'Sudoku games' },
  { metric: 'g2048Starts', label: '2048 games' },
  { metric: 'subscribeClicks', label: 'Subscribe clicks' },
];
const DEVICES: { metric: Metric; label: string }[] = [
  { metric: 'devicePhone', label: 'Phone' },
  { metric: 'deviceTablet', label: 'Tablet' },
  { metric: 'deviceDesktop', label: 'Computer' },
];
const SOURCES: { metric: Metric; label: string }[] = [
  { metric: 'sourceYoutube', label: 'YouTube' },
  { metric: 'sourceSearch', label: 'Search engines' },
  { metric: 'sourceDirect', label: 'Direct or bookmark' },
  { metric: 'sourceOther', label: 'Other websites' },
];

const value = (totals: DayTotals, metric: Metric) => totals[metric] ?? 0;
const sum = (days: StatsDay[], metric: Metric) =>
  days.reduce((total, day) => total + value(day.totals, metric), 0);

function Breakdown({
  title,
  rows,
  days,
}: {
  title: string;
  rows: { metric: Metric; label: string }[];
  days: StatsDay[];
}) {
  const total = rows.reduce((all, row) => all + sum(days, row.metric), 0);
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-1 text-sm text-slate-200">
        {rows.map((row) => {
          const count = sum(days, row.metric);
          return (
            <li key={row.metric}>
              {row.label}: {count}
              {total > 0 && ` (${Math.round((count / total) * 100)}%)`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Daily site totals for the last 30 days. Totals only: the site keeps nothing per person. */
export function AdminStats({ runtime }: { runtime: AdminRuntime }) {
  const [days, setDays] = useState<StatsDay[] | null>(null);
  useEffect(() => runtime.admin.watchStats(setDays), [runtime]);
  return (
    <GlassPanel as="section" className="flex flex-col gap-4 p-5" aria-labelledby="admin-stats">
      <h2 id="admin-stats" className="text-lg font-semibold">
        Visitor statistics
      </h2>
      <p className="text-sm text-slate-300">
        Daily totals for the last 30 days (UTC dates). Totals only — nothing is kept about
        individual visitors. Page counts, countries and referring sites are on GoatCounter
        (b24dul.goatcounter.com).
      </p>
      {days === null ? (
        <p className="text-sm text-slate-300">Loading…</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-slate-300">No visits counted yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="admin-stats-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  {COLUMNS.map((column) => (
                    <th key={column.metric} scope="col">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.day}>
                    <th scope="row">{day.day}</th>
                    {COLUMNS.map((column) => (
                      <td key={column.metric}>{value(day.totals, column.metric)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {COLUMNS.map((column) => (
                    <td key={column.metric}>{sum(days, column.metric)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Breakdown title="Visits by device" rows={DEVICES} days={days} />
            <Breakdown title="Where visitors came from" rows={SOURCES} days={days} />
          </div>
        </>
      )}
    </GlassPanel>
  );
}
