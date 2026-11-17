import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const [mobileFile, desktopFile] = process.argv.slice(2);
if (!mobileFile || !desktopFile) throw new Error('Both mobile and desktop JSON reports are required.');
const report = {};
for (const [name, file] of [['mobile', mobileFile], ['desktop', desktopFile]]) {
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
