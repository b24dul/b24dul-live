import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const base = '/b24dul-live/';
const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const links = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (!html.includes('<div id="root"></div>')) {
  throw new Error('Missing React root in release HTML.');
}
if (!links.length) throw new Error('Release HTML does not reference any assets.');
for (const link of links) {
  if (!link.startsWith(base)) {
    throw new Error('Release HTML has an unexpected base-path asset: ' + link);
  }
  const asset = join(dist, link.slice(base.length));
  if (!existsSync(asset) || !statSync(asset).isFile()) {
    throw new Error('Release HTML references a missing asset: ' + link);
  }
}
const scripts = readdirSync(join(dist, 'assets')).filter((name) => name.endsWith('.js'));
if (!scripts.length) throw new Error('No compiled JavaScript assets found.');
if (html.includes('/src/main.tsx')) {
  throw new Error('Development entrypoint leaked into production HTML.');
}
process.stdout.write('Release static integrity PASS: ' + links.length + ' referenced assets, ' + scripts.length + ' JS bundles, base ' + base + '\n');
