// Summarises an `npm audit --json` report: lists every finding (production and dev)
// in the job summary, annotates dev findings as warnings, and FAILS when a high or
// critical dev finding has a patched version published (so it could be fixed now).
// Production findings are gated separately by `npm audit --omit=dev --audit-level=high`.
//
// Usage: node scripts/audit-summary.mjs dependency-audit.json [package-lock.json]
import { appendFileSync, readFileSync } from 'node:fs';
import process from 'node:process';

const [reportPath = 'dependency-audit.json', lockPath = 'package-lock.json'] =
  process.argv.slice(2);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const lock = JSON.parse(readFileSync(lockPath, 'utf8')).packages ?? {};
const blocking = new Set(['high', 'critical']);

if (report.error) throw new Error('npm audit failed to produce a report: ' + report.error.summary);

// Patched version from the GitHub Advisory Database (null when no fix exists).
async function firstPatched(ghsa, name) {
  const headers = { Accept: 'application/vnd.github+json' };
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await globalThis.fetch('https://api.github.com/advisories/' + ghsa, { headers });
  if (!response.ok) throw new Error(`Advisory lookup failed for ${ghsa}: HTTP ${response.status}`);
  const advisory = await response.json();
  const patched = (advisory.vulnerabilities ?? [])
    .filter((entry) => entry.package?.name === name)
    .map((entry) => entry.first_patched_version)
    .filter(Boolean);
  return patched.length ? patched.join(', ') : null;
}

const rows = [];
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  const production = vuln.nodes.some((node) => lock[node] && !lock[node].dev);
  const versions = [...new Set(vuln.nodes.map((node) => lock[node]?.version).filter(Boolean))];
  for (const via of vuln.via) {
    if (typeof via !== 'object') continue; // dependents are listed under their root advisory
    const ghsa = via.url.split('/').pop();
    rows.push({
      name,
      versions: versions.join(', '),
      ghsa,
      severity: via.severity,
      range: via.range,
      title: via.title,
      scope: production ? 'production' : 'dev',
      patched: await firstPatched(ghsa, name),
      dependents: vuln.effects.length,
    });
  }
}

const counts = report.metadata?.vulnerabilities ?? {};
const lines = [
  '## Dependency audit',
  '',
  `npm audit entries (including dependents): ${counts.total ?? 0} — critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, moderate ${counts.moderate ?? 0}, low ${counts.low ?? 0}.`,
  `Distinct advisories: ${rows.length}.`,
  '',
  '| Package | Installed | Advisory | Severity | Affected | Patched | Scope | Dependents |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.name} | ${r.versions} | [${r.ghsa}](https://github.com/advisories/${r.ghsa}) | ${r.severity} | \`${r.range}\` | ${r.patched ?? 'none published'} | ${r.scope} | ${r.dependents} |`,
  ),
  '',
];

const fixableDev = rows.filter((r) => r.scope === 'dev' && blocking.has(r.severity) && r.patched);
for (const r of rows.filter((row) => row.scope === 'dev')) {
  const fix = r.patched ? `patched in ${r.patched}` : 'no patched version published';
  process.stdout.write(
    `::warning title=Dev dependency ${r.severity}: ${r.name}::${r.ghsa} ${r.title} (${r.range}); ${fix}\n`,
  );
}
if (fixableDev.length) {
  lines.push(
    '**FAIL:** high/critical dev findings with a published fix: ' +
      fixableDev.map((r) => `${r.name} (${r.ghsa}, patched ${r.patched})`).join('; '),
  );
} else {
  lines.push('No high/critical dev finding has a published fix.');
}

const summary = lines.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
else process.stdout.write(summary);

if (fixableDev.length) {
  for (const r of fixableDev) {
    process.stdout.write(
      `::error title=Fix available: ${r.name}::${r.ghsa} is patched in ${r.patched}\n`,
    );
  }
  process.exitCode = 1;
}
