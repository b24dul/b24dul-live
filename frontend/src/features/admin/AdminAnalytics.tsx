import { useId, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { StatsDay } from '../../services/adminService';
import { statsDay, type DayTotals, type Metric } from '../../services/dailyTotals';

export const GOATCOUNTER_DASHBOARD = 'https://b24dul.goatcounter.com';

type Point = { day: string; value: number };

const DAILY: { metric: Metric | Metric[]; label: string }[] = [
  { metric: 'visits', label: 'Visits' },
  { metric: 'siteMinutes', label: 'Minutes on site' },
  { metric: 'liveMinutes', label: 'Minutes watched while live' },
  { metric: 'videoPlays', label: 'Video plays' },
  { metric: 'subscribeClicks', label: 'Subscribe clicks' },
  { metric: ['sudokuStarts', 'g2048Starts'], label: 'Game starts' },
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
const GAMES: { metric: Metric; label: string }[] = [
  { metric: 'sudokuStarts', label: 'Sudoku' },
  { metric: 'g2048Starts', label: '2048' },
];

const valueOf = (totals: DayTotals | undefined, metric: Metric | Metric[]) =>
  (Array.isArray(metric) ? metric : [metric]).reduce((sum, m) => sum + (totals?.[m] ?? 0), 0);

/** The last `count` UTC days, oldest first, with missing days as zero. */
export function lastDays(days: StatsDay[], count: number, today = new Date()): StatsDay[] {
  const byDay = new Map(days.map((day) => [day.day, day.totals]));
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getTime() - (count - 1 - i) * 86_400_000);
    const day = statsDay(date);
    return { day, totals: byDay.get(day) ?? {} };
  });
}

const shortDate = (day: string) =>
  new Date(day + 'T12:00:00Z').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** One series of daily bars: thin rounded bars on a baseline, hover/focus tooltip. */
function DailyBars({ label, points }: { label: string; points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const max = Math.max(1, ...points.map((point) => point.value));
  const peak = points.reduce(
    (best, point) => (point.value > best.value ? point : best),
    points[0]!,
  );
  const W = 300;
  const H = 110;
  const slot = W / points.length;
  const bar = Math.max(2, slot - 2); // 2px gap between bars
  const shown = hover === null ? null : points[hover]!;
  return (
    <figure className="admin-chart" aria-labelledby={titleId}>
      <figcaption id={titleId} className="admin-chart-head">
        <span>{label}</span>
        <strong>{total.toLocaleString()}</strong>
      </figcaption>
      <div className="admin-chart-plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-summary`}
          onMouseLeave={() => setHover(null)}
        >
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="admin-chart-axis" />
          {points.map((point, i) => {
            const h = point.value === 0 ? 0 : Math.max(2, (point.value / max) * (H - 6));
            const x = i * slot + (slot - bar) / 2;
            const r = Math.min(4, bar / 2, h);
            return (
              <g key={point.day}>
                {h > 0 && (
                  <path
                    className={
                      hover === i ? 'admin-chart-bar admin-chart-bar--hover' : 'admin-chart-bar'
                    }
                    d={`M${x},${H} V${H - h + r} Q${x},${H - h} ${x + r},${H - h} H${x + bar - r} Q${x + bar},${H - h} ${x + bar},${H - h + r} V${H} Z`}
                  />
                )}
                <rect
                  x={i * slot}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
        {shown && (
          <div className="admin-chart-tip" role="status">
            {shortDate(shown.day)}: <strong>{shown.value.toLocaleString()}</strong>
          </div>
        )}
      </div>
      <div className="admin-chart-x" aria-hidden="true">
        <span>{shortDate(points[0]!.day)}</span>
        <span>{shortDate(points[points.length - 1]!.day)}</span>
      </div>
      <p id={`${titleId}-summary`} className="sr-only">
        {label}: {total} in total; highest {peak.value} on {shortDate(peak.day)}.
      </p>
    </figure>
  );
}

/** Part-to-whole as labelled horizontal bars (single hue, percentages in text). */
function Breakdown({
  title,
  rows,
  days,
}: {
  title: string;
  rows: { metric: Metric; label: string }[];
  days: StatsDay[];
}) {
  const values = rows.map((row) => ({
    ...row,
    value: days.reduce((sum, day) => sum + valueOf(day.totals, row.metric), 0),
  }));
  const total = values.reduce((sum, row) => sum + row.value, 0);
  return (
    <section className="admin-breakdown" aria-label={title}>
      <h4 className="font-semibold">{title}</h4>
      <ul className="mt-2 flex flex-col gap-2">
        {values.map((row) => {
          const share = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <li key={row.metric}>
              <div className="flex justify-between gap-3 text-sm">
                <span>{row.label}</span>
                <span className="text-slate-300">
                  {row.value.toLocaleString()} · {share}%
                </span>
              </div>
              <div className="admin-breakdown-track" aria-hidden="true">
                <div className="admin-breakdown-fill" style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AdminAnalytics({ days }: { days: StatsDay[] | null }) {
  const [range, setRange] = useState<7 | 30>(7);
  const [table, setTable] = useState(false);
  if (days === null) return <p className="text-sm text-slate-300">Loading…</p>;
  const shown = lastDays(days, range);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-segmented" role="group" aria-label="Date range">
          {([7, 30] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
            >
              Last {option} days
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="ui-button ui-button--secondary admin-small-button"
            aria-pressed={table}
            onClick={() => setTable((open) => !open)}
          >
            {table ? 'Show charts' : 'Show table'}
          </button>
          <a
            className="ui-button ui-button--secondary admin-small-button"
            href={GOATCOUNTER_DASHBOARD}
            target="_blank"
            rel="noopener noreferrer"
          >
            GoatCounter: pages, countries, referrers <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="text-sm text-slate-300">
        Daily totals (UTC days). Totals only — nothing is kept about individual visitors.
      </p>
      {table ? (
        <div className="overflow-x-auto">
          <table className="admin-stats-table">
            <caption className="sr-only">Daily totals, last {range} days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {DAILY.map((series) => (
                  <th key={series.label} scope="col">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...shown].reverse().map((day) => (
                <tr key={day.day}>
                  <th scope="row">{day.day}</th>
                  {DAILY.map((series) => (
                    <td key={series.label}>{valueOf(day.totals, series.metric)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-chart-grid">
          {DAILY.map((series) => (
            <DailyBars
              key={series.label}
              label={series.label}
              points={shown.map((day) => ({
                day: day.day,
                value: valueOf(day.totals, series.metric),
              }))}
            />
          ))}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        <Breakdown title="Visits by device" rows={DEVICES} days={shown} />
        <Breakdown title="Where visitors came from" rows={SOURCES} days={shown} />
        <Breakdown title="Game starts" rows={GAMES} days={shown} />
      </div>
    </div>
  );
}
