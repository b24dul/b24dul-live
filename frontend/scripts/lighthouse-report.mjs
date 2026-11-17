import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const [mobileFile, desktopFile] = process.argv.slice(2);
if (!mobileFile || !desktopFile)
  throw new Error('Both mobile and desktop JSON reports are required.');
const report = {};
for (const [name, file] of [
  ['mobile', mobileFile],
  ['desktop', desktopFile],
]) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const score = (key) => Math.round((raw.categories?.[key]?.score ?? 0) * 100);
  const metric = (key) => raw.audits?.[key]?.numericValue ?? null;
  report[name] = {
    finalUrl: raw.finalUrl,
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    cls: metric('cumulative-layout-shift'),
    lcpMs: metric('largest-contentful-paint'),
    totalBlockingTimeMs: metric('total-blocking-time'),
    transferBytes: metric('total-byte-weight'),
  };
}
writeFileSync('lighthouse-summary.json', JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report, null, 2) + '\n');

const minimumScores = {
  performance: 90,
  accessibility: 95,
  bestPractices: 95,
  seo: 90,
};
let failures = 0;
for (const [profile, result] of Object.entries(report)) {
  for (const [metric, minimum] of Object.entries(minimumScores)) {
    if (result[metric] < minimum) {
      failures += 1;
      process.stderr.write(`${profile}: ${metric} ${result[metric]} is below target ${minimum}\n`);
    }
  }
  if (result.cls === null || result.cls >= 0.1) {
    failures += 1;
    process.stderr.write(`${profile}: CLS ${result.cls} must be below 0.1\n`);
  }
}
if (failures) process.exitCode = 1;
