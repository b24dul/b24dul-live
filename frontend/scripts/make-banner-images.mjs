// Builds the optimised banner images from design/b24dul-banner.png (2172x724).
// sharp is not a site dependency; install it anywhere and pass its folder:
//   node scripts/make-banner-images.mjs <folder containing node_modules/sharp>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const tools = process.argv[2];
if (!tools) throw new Error('Pass the folder that has node_modules/sharp');
const sharp = createRequire(join(resolve(tools), 'package.json'))('sharp');

const SOURCE = 'design/b24dul-banner.png';
const OUT = 'public/banner';
mkdirSync(OUT, { recursive: true });

// The logo sits at about x 435-1850, y 200-630 of the original; its centre is x ~1142.
const MOBILE_CROP = { left: 402, top: 0, width: 1480, height: 724 };

async function variants(name, pipelineFor, widths) {
  for (const width of widths) {
    await pipelineFor()
      .resize({ width })
      .avif({ quality: 55, effort: 6 })
      .toFile(`${OUT}/${name}-${width}.avif`);
    await pipelineFor()
      .resize({ width })
      .webp({ quality: 78 })
      .toFile(`${OUT}/${name}-${width}.webp`);
  }
  const fallback = widths[Math.floor(widths.length / 2)];
  await pipelineFor()
    .resize({ width: fallback })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(`${OUT}/${name}-${fallback}.jpg`);
}

await variants('banner', () => sharp(SOURCE), [640, 960, 1280, 1600, 2172]);
await variants('banner-mobile', () => sharp(SOURCE).extract(MOBILE_CROP), [480, 720, 960]);

// Share image 1200x630: the whole banner on a blurred, darkened copy of itself (nothing cropped).
const backdrop = await sharp(SOURCE)
  .resize({ width: 1200, height: 630, fit: 'cover' })
  .blur(24)
  .modulate({ brightness: 0.55 })
  .toBuffer();
const front = await sharp(SOURCE).resize({ width: 1200 }).toBuffer(); // 1200x400
await sharp(backdrop)
  .composite([{ input: front, top: 115, left: 0 }])
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(`${OUT}/share-1200x630.jpg`);
process.stdout.write(`Banner images written to ${OUT}\n`);
