// Scores repeated Lighthouse runs on their MEDIAN and records runner CPU speed.
//
// Usage: node scripts/lighthouse-report.mjs --mobile m1.json m2.json m3.json --desktop d1.json ...
//
// A single run is noisy on shared CI runners: the 4x CPU throttle is applied on top of
// the runner's real CPU, so slow hosts (low benchmarkIndex) score lower for the same
// build. Each category is gated on the median across runs; targets are unchanged.
import { appendFileSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const files = { mobile: [], desktop: [] };
let current = null;
for (const arg of process.argv.slice(2)) {
  if (arg === '--mobile' || arg === '--desktop') current = arg.slice(2);
  else if (current) files[current].push(arg);
  else throw new Error('Unexpected argument before --mobile/--desktop: ' + arg);
}
for (const [profile, list] of Object.entries(files)) {
  if (!list.length) throw new Error(`No ${profile} Lighthouse reports were given.`);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

const summarise = (file) => {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const score = (key) => Math.round((raw.categories?.[key]?.score ?? 0) * 100);
  const metric = (key) => raw.audits?.[key]?.numericValue ?? null;
  return {
    file,
    finalUrl: raw.finalUrl,
    lighthouseVersion: raw.lighthouseVersion,
    benchmarkIndex: raw.environment?.benchmarkIndex ?? null,
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    cls: metric('cumulative-layout-shift'),
    lcpMs: metric('largest-contentful-paint'),
    totalBlockingTimeMs: metric('total-blocking-time'),
    transferBytes: metric('total-byte-weight'),
  };
};

const medianKeys = [
  'performance',
  'accessibility',
  'bestPractices',
  'seo',
  'cls',
  'lcpMs',
  'totalBlockingTimeMs',
  'benchmarkIndex',
];
const report = {};
for (const [profile, list] of Object.entries(files)) {
  const runs = list.map(summarise);
  const medians = Object.fromEntries(
    medianKeys.map((key) => [key, median(runs.map((run) => run[key] ?? 0))]),
  );
  // Keep the run whose performance equals the median as the representative full report.
  const representative = runs.find((run) => run.performance === medians.performance) ?? runs[0];
  copyFileSync(representative.file, `lighthouse-${profile}.json`);
  report[profile] = {
    runs: runs.length,
    lighthouseVersion: runs[0].lighthouseVersion,
    finalUrl: representative.finalUrl,
    median: medians,
    representativeRun: representative.file,
    perRun: runs,
  };
}
writeFileSync('lighthouse-summary.json', JSON.stringify(report, null, 2) + '\n');

const lines = ['## Lighthouse (median of repeated runs)', ''];
for (const [profile, result] of Object.entries(report)) {
  lines.push(
    `### ${profile} — ${result.runs} runs, Lighthouse ${result.lighthouseVersion}`,
    '',
    '| Run | benchmarkIndex | Performance | A11y | Best practices | SEO | LCP ms | TBT ms | CLS |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...result.perRun.map(
      (run, index) =>
        `| ${index + 1} | ${run.benchmarkIndex} | ${run.performance} | ${run.accessibility} | ${run.bestPractices} | ${run.seo} | ${Math.round(run.lcpMs)} | ${Math.round(run.totalBlockingTimeMs)} | ${run.cls} |`,
    ),
    `| **median** | ${result.median.benchmarkIndex} | **${result.median.performance}** | ${result.median.accessibility} | ${result.median.bestPractices} | ${result.median.seo} | ${Math.round(result.median.lcpMs)} | ${Math.round(result.median.totalBlockingTimeMs)} | ${result.median.cls} |`,
    '',
  );
}
const markdown = lines.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
process.stdout.write(markdown);

const minimumScores = {
  performance: 90,
  accessibility: 95,
  bestPractices: 95,
  seo: 90,
};
let failures = 0;
for (const [profile, result] of Object.entries(report)) {
  for (const [metric, minimum] of Object.entries(minimumScores)) {
    if (result.median[metric] < minimum) {
      failures += 1;
      process.stderr.write(
        `${profile}: median ${metric} ${result.median[metric]} is below target ${minimum}\n`,
      );
    }
  }
  if (result.median.cls === null || result.median.cls >= 0.1) {
    failures += 1;
    process.stderr.write(`${profile}: median CLS ${result.median.cls} must be below 0.1\n`);
  }
}
if (failures) process.exitCode = 1;
