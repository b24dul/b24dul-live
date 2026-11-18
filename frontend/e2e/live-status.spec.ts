import { expect, test, type Page } from '@playwright/test';

const endpoint = '**/api/status';
const fresh = (body: Record<string, unknown>) => (page: Page) =>
  page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ checkedAt: Date.now(), stale: false, ...body }),
    }),
  );

test.beforeEach(async ({ page }) => {
  // The player is never fetched from YouTube in tests.
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
});

test('live: the stream plays on the Watch page with chat beside it on desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await fresh({ live: true, videoId: '1yVlKouJnag' })(page);
  await page.goto('./#/watch');
  await expect(page.getByRole('heading', { name: 'B24DUL is live now' })).toBeVisible();
  const player = page.getByTitle('B24DUL live stream');
  await expect(player).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/1yVlKouJnag?autoplay=1&mute=1&rel=0',
  );
  const chat = page.getByRole('heading', { name: 'Live chat' });
  await expect(chat).toBeVisible();
  const playerBox = (await player.boundingBox())!;
  const chatBox = (await chat.boundingBox())!;
  expect(chatBox.x).toBeGreaterThan(playerBox.x + playerBox.width - 1);
  await expect(page.getByRole('link', { name: 'Subscribe' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/@B24DUL?sub_confirmation=1',
  );
});

test('live on a phone: chat sits below the stream', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fresh({ live: true, videoId: '1yVlKouJnag' })(page);
  await page.goto('./#/watch');
  const playerBox = (await page.getByTitle('B24DUL live stream').boundingBox())!;
  const chatBox = (await page.getByRole('heading', { name: 'Live chat' }).boundingBox())!;
  expect(chatBox.y).toBeGreaterThan(playerBox.y + playerBox.height - 1);
});

test('offline: a clear message, latest videos, and no player', async ({ page }) => {
  await fresh({ live: false })(page);
  await page.goto('./#/watch');
  await expect(page.getByRole('heading', { name: 'B24DUL is offline right now' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest videos' })).toBeVisible();
  await expect(page.getByTitle('B24DUL live stream')).toHaveCount(0);
});

test('stale or blocked checks never claim live or offline', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live: true,
        videoId: '1yVlKouJnag',
        checkedAt: Date.now() - 240_000,
        stale: true,
      }),
    }),
  );
  await page.goto('./#/watch');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t check whether B24DUL is live' }),
  ).toBeVisible();
  await expect(page.getByTitle('B24DUL live stream')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the player anyway' }).click();
  await expect(page.getByTitle('B24DUL live stream')).toHaveAttribute(
    'src',
    /live_stream\?channel=/,
  );
});

test('the "stream just started" notice appears when the stream goes live', async ({ page }) => {
  let live = false;
  await page.clock.install();
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live,
        videoId: live ? '1yVlKouJnag' : '',
        checkedAt: Date.now(),
        stale: false,
      }),
    }),
  );
  await page.goto('./#/games');
  await page.waitForTimeout(500);
  await expect(page.getByText('B24DUL has started streaming!')).toHaveCount(0);
  live = true;
  await page.clock.runFor(61_000);
  await expect(page.getByText('B24DUL has started streaming!')).toBeVisible();
  await page.getByRole('button', { name: 'Watch stream' }).click();
  await expect(page).toHaveURL(/#\/watch$/);
  await expect(page.getByRole('heading', { name: 'B24DUL is live now' })).toBeVisible();
});
