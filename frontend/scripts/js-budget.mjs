import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import process from 'node:process';

const folder = 'dist/assets';
const javascript = readdirSync(folder).filter((filename) => filename.endsWith('.js'));
if (!javascript.length) throw new Error('Production build has no JavaScript assets.');
const bytes = javascript.reduce(
  (total, filename) => total + gzipSync(readFileSync(join(folder, filename))).length,
  0,
);
process.stdout.write(
  `Total production JS gzip transfer estimate: ${bytes} bytes across ${javascript.length} file(s)\n`,
);
if (bytes > 250_000) {
  process.stderr.write('Compressed JavaScript exceeds the 250 KB initial transfer budget.\n');
  process.exitCode = 1;
}
