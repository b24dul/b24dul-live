import { chromium } from '@playwright/test';
const OUT = process.argv[2];
const browser = await chromium.launch();
const shots = [
  ['users', null, false],
  ['user-detail', null, true],
  ['analytics', 'Analytics', false],
  ['leaderboards', 'Leaderboards', false],
  ['privacy', 'Privacy requests', false],
];
for (const [device, viewport] of [['desktop', { width: 1600, height: 1000 }], ['tablet', { width: 1024, height: 1366 }]]) {
  for (const [name, tab, detail] of shots) {
    if (device === 'tablet' && !['users', 'analytics'].includes(name)) continue;
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html',
      body: '<body style="margin:0;display:grid;place-items:center;height:100vh;background:radial-gradient(circle at 50% 40%,#3a1a4a,#0b0914);color:#a9a3bd;font:600 13px system-ui">YouTube preview (placeholder)</body>' }));
    await page.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Users' }).waitFor();
    if (tab) await page.getByRole('tab', { name: tab }).click();
    if (detail) await page.getByRole('button', { name: /^Open details for/ }).nth(3).click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: viewport.width, height });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${device}-${name}.png` });
    if (errors.length) console.log(name, errors);
    await page.close();
  }
}
await browser.close();
console.log('done');
