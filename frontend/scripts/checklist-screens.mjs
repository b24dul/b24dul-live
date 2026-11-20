// Takes desktop and phone screenshots of the stream checklist from the test page (sample data,
// no Firebase). Start the dev server first (npm run dev -- --port 4173), then:
//   node scripts/checklist-screens.mjs <output folder>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/checklist-screens.mjs <output folder>');
const base = 'http://127.0.0.1:4173/b24dul-live/e2e/harness/checklist.html';
const fixture = readFileSync('src/features/checklist/fixtures/gta6-chapter1-checklist.txt', 'utf8');
const sizes = {
  desktop: { width: 1366, height: 900 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch();
for (const [device, size] of Object.entries(sizes)) {
  const { width, height, ...options } = size;
  const page = await browser.newPage({ viewport: { width, height }, ...options });
  const path = (name) => join(out, `${name}-${device}.png`);
  /** The whole viewport, or one element with a small margin around it. */
  const shot = async (name, element) => {
    if (!element) return page.screenshot({ path: path(name), animations: 'disabled' });
    await element.scrollIntoViewIfNeeded();
    const box = await element.boundingBox();
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const margin = 12;
    await page.screenshot({
      path: path(name),
      fullPage: true,
      animations: 'disabled',
      clip: {
        x: Math.max(0, box.x + scroll.x - margin),
        y: Math.max(0, box.y + scroll.y - margin),
        width: box.width + 2 * margin,
        height: box.height + 2 * margin,
      },
    });
  };

  // 1. Admin page with an active list: the Up next card comes first.
  await page.goto(`${base}?view=admin`);
  const card = page.getByRole('region', { name: /Up next/ });
  await card.waitFor();
  await card.scrollIntoViewIfNeeded();
  await shot('1-admin-up-next', device === 'phone' ? undefined : card);

  // 2. Import preview of the real fixture.
  await page.goto(base);
  await page.getByLabel('Paste the checklist text').fill(fixture);
  await page.getByLabel('Game name (optional, only you see it)').fill('Sample game');
  const importBox = page.getByRole('region', { name: 'Import a list' });
  await importBox.getByTestId('import-summary').waitFor();
  await shot('2-import-preview', importBox);

  // 3. Guide prompt helper, filled in.
  await page.getByLabel('Game', { exact: true }).fill('Sample game');
  await page.getByLabel('Platform', { exact: true }).fill('PS5');
  await page.getByLabel('Part', { exact: true }).fill('Chapter 2');
  await page.getByLabel('Focus', { exact: true }).fill('missables and trophies');
  await shot('3-guide-prompt', page.getByRole('region', { name: 'Guide prompt' }));

  // 4. The viewer panel on the Watch page while live (upcoming items hidden).
  // A real B24DUL video stands in for the live stream.
  await page.goto(`${base}?view=watch&video=1yVlKouJnag`);
  const panel = page.getByRole('region', { name: 'Chapter 1 progress' });
  await panel.waitFor();
  await page.waitForTimeout(3000); // let the player draw
  await page.screenshot({ path: path('4-watch-viewer-panel-page'), fullPage: true });
  await shot('4-watch-viewer-panel', panel);
  await page.close();
}
await browser.close();
