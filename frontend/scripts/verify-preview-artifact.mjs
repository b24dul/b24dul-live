// Checks the assembled GitHub Pages preview artifact (React build + legacy copy).
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

const forbidden = [
  /demo-[a-z0-9]/i,
  /connect[A-Za-z]*Emulator/,
  /emulator/i,
  /localhost:\d/,
  /127\.0\.0\.1/,
  /:(9099|9000|8080|4000)\b/,
  /firebaseio\.com/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /(browser|react)Fixture/,
  /synthetic/i,
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// The legacy directory is the unchanged current production site and is checked separately.
const reactFiles = walk(site).filter((path) => {
  const rel = relative(site, path).replaceAll('\\', '/');
  return !rel.startsWith('legacy/') && /\.(html|js|css|json|map)$/.test(rel);
});
for (const path of reactFiles) {
  if (path.endsWith('videos.json')) continue;
  const text = readFileSync(path, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) fail(relative(site, path) + ' matches ' + pattern);
  }
}
if (existsSync(join(site, 'production-gates.json'))) fail('gate file must not be published');

process.stdout.write(
  'Preview artifact PASS: ' + reactFiles.length + ' React files scanned, legacy copy present\n',
);
