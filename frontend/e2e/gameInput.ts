import type { Locator, Page } from '@playwright/test';

/** A touch swipe across an element: real touch input in Chromium, touch pointer events elsewhere. */
export async function touchSwipe(page: Page, target: Locator, dx: number, dy: number) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (page.context().browser()?.browserType().name() !== 'chromium') {
    // Firefox and WebKit can't send real touch input here: send touch pointer events instead.
    const init = { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
    await target.dispatchEvent('pointerdown', { ...init, clientX: x, clientY: y });
    await target.dispatchEvent('pointermove', { ...init, clientX: x + dx, clientY: y + dy });
    await target.dispatchEvent('pointerup', { ...init, clientX: x + dx, clientY: y + dy });
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const touch = (type: string, points: { x: number; y: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y }]);
  for (let step = 1; step <= 5; step++)
    await touch('touchMove', [{ x: x + (dx * step) / 5, y: y + (dy * step) / 5 }]);
  await touch('touchEnd', []);
  await cdp.detach();
}

/** A mouse click-and-drag across an element. */
export async function mouseDrag(page: Page, target: Locator, dx: number, dy: number) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}
