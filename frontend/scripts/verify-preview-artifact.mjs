// Checks the assembled GitHub Pages preview artifact (React build, /legacy/ redirect, data).
// Fails if emulator, demo-project or test-credential material reaches the React bundle.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const site = process.argv[2] ?? 'dist';
const fail = (message) => {
  throw new Error('Preview artifact check FAILED: ' + message);
};

const read = (path) => readFileSync(join(site, path), 'utf8');
for (const required of ['index.html', '404.html', 'videos.json', 'legacy/index.html']) {
  if (!existsSync(join(site, required))) fail('missing ' + required);
}
if (read('index.html') !== read('404.html')) fail('404.html must be a copy of index.html');
JSON.parse(read('videos.json'));

// Since step 5 the old site is not published: /legacy/ holds only a small page that sends visitors
// to the new home page. Anything else under legacy/ means the old site leaked back in.
const legacyFiles = existsSync(join(site, 'legacy'))
  ? readdirSync(join(site, 'legacy'), { recursive: true })
  : [];
if (legacyFiles.length !== 1 || legacyFiles[0] !== 'index.html')
  fail('legacy/ must contain only the redirect index.html, found: ' + legacyFiles.join(', '));
const redirect = read('legacy/index.html');
if (
  !redirect.includes("location.replace('/b24dul-live/')") ||
  !redirect.includes('url=/b24dul-live/')
)
  fail('legacy/index.html must redirect to the new home page');
if (redirect.length > 3000 || /firebase|goatcounter|gateForm|<iframe/i.test(redirect))
  fail('legacy/index.html must be the small redirect page, not the old site');

// The Firebase SDK contains dormant emulator-support code and its own default domains,
// so generic words are not checked. Instead: no emulator hosts or ports, no demo
// projects or test fixtures, and the only API key / project allowed is production's.
const production = readFileSync('src/services/firebaseConfig.ts', 'utf8');
const field = (name) => production.match(new RegExp(name + ": '([^']+)'"))?.[1];
const productionKey = field('apiKey');
const productionProject = field('projectId');
if (!productionKey || !productionProject) fail('cannot read src/services/firebaseConfig.ts');

const forbidden = [
  /demo-[a-z0-9]/i,
  /localhost:\d/,
  /127\.0\.0\.1/,
  /\[::1\]/,
  /:(9099|9000|8080|4000|4400|9199)\b/,
  /(browser|react|presence)Fixture/,
  /synthetic/i,
  /example\.invalid/,
  /b24dul-live\/legacy/, // the old site is not linked from the new one
];
const SDK_MOCK_TOKEN_DEFAULT = '||"demo-project",';
const keyPattern = /AIza[0-9A-Za-z_-]{20,}/g;
const projectPattern = /projectId:\s*["']([^"']+)["']/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// Every published file is scanned, including the /legacy/ redirect.
const reactFiles = walk(site).filter((path) => {
  const rel = relative(site, path).replaceAll('\\', '/');
  return /\.(html|js|css|json|map)$/.test(rel);
});
for (const path of reactFiles) {
  if (path.endsWith('videos.json')) continue;
  const text = readFileSync(path, 'utf8');
  // The Firebase Database SDK's createMockUserToken helper (only used with connectDatabaseEmulator,
  // which the site never calls) defaults its project to this exact literal. Only that exact
  // snippet is exempt; any other demo- project, and any non-production projectId, still fails.
  const scanned = text.replaceAll(SDK_MOCK_TOKEN_DEFAULT, '');
  for (const pattern of forbidden) {
    if (pattern.test(scanned)) fail(relative(site, path) + ' matches ' + pattern);
  }
  for (const [key] of text.matchAll(keyPattern)) {
    if (key !== productionKey) fail(relative(site, path) + ' contains a non-production API key');
  }
  for (const [, project] of text.matchAll(projectPattern)) {
    if (project !== productionProject)
      fail(relative(site, path) + ' configures project ' + project);
  }
}
if (existsSync(join(site, 'production-gates.json'))) fail('gate file must not be published');

process.stdout.write(
  'Preview artifact PASS: ' + reactFiles.length + ' files scanned; /legacy/ is only the redirect\n',
);
