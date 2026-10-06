import { test, expect } from '@playwright/test';
import { Game } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';
const key = 'jungle-esports-v2';
async function frozen(page: import('@playwright/test').Page) {
  const time = new Date('2026-10-04T04:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}
async function ready(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
  await page.clock.runFor(50);
}
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`minimal betting UI and accessible icons at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await frozen(page);
    await page.goto('/');
    await ready(page);
    const words = (await page.locator('.app-shell').innerText()).match(/\p{L}+/gu) ?? [];
    expect(words.length).toBeLessThanOrEqual(40);
    await expect(page.getByText('WIN CHANCE')).toHaveCount(0);
    await expect(
      page.locator('.probability-bar,.history-panel,.page-intro,.challenge-banner,.arena-topbar'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Statistics', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const missing = await page
      .locator('button')
      .evaluateAll(
        (buttons) =>
          buttons.filter(
            (button) =>
              button.getClientRects().length &&
              !button.textContent?.trim() &&
              !button.getAttribute('aria-label'),
          ).length,
      );
    expect(missing).toBe(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Racer number markers' })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
}
test('history stays inside the stage, retains ten/six winners and opens a replay', async ({
  page,
}) => {
  await frozen(page);
  const g = new Game(seededRandom(55), () => 42);
  g.lock();
  while (g.round.phase !== 'podium') g.tick(0.1);
  g.nextRound();
  g.history = Array.from({ length: 12 }, (_, i) => ({ ...g.history[0], id: 12 - i }));
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key,
    data: g.save(),
  });
  await page.goto('/');
  await ready(page);
  const column = page.getByTestId('history-column');
  await expect(column.getByRole('button')).toHaveCount(10);
  const stage = await page.locator('.race-stage').boundingBox(),
    box = await column.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  expect(box!.y).toBeGreaterThan(stage!.y);
  expect(box!.y + box!.height).toBeLessThan(stage!.y + stage!.height);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(column.locator('button:visible')).toHaveCount(6);
  await column.getByRole('button').first().click();
  await page.clock.runFor(150);
  await expect(column).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop replay' })).toBeVisible();
});

test('3D G1 lab loads real skinned assets, seeks deterministically and restores WebGL', async ({
  page,
}) => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'G1 lab is development-only');
  test.setTimeout(120000);
  await frozen(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?lab=animals&quality=low');
  const stage = page.locator('[data-renderer="3d"]');
  await expect
    .poll(
      async () => {
        await page.clock.runFor(100);
        return stage.count();
      },
      { timeout: 60000 },
    )
    .toBe(1);
  await page.clock.runFor(60);
  const first = await stage.screenshot();
  await page.getByLabel('Time', { exact: true }).fill('2.5');
  await page.clock.runFor(30);
  await page.getByLabel('Time', { exact: true }).fill('0');
  await page.clock.runFor(30);
  const second = await stage.screenshot();
  expect(first.equals(second)).toBe(true);
  await page.getByLabel('Wireframe', { exact: true }).check();
  await page.getByLabel('Bones', { exact: true }).check();
  await page.clock.runFor(30);
  expect(first.equals(await stage.screenshot())).toBe(false);
  await page.getByLabel('Wireframe', { exact: true }).uncheck();
  await page.getByLabel('Bones', { exact: true }).uncheck();
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const extension = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 100);
  });
  await page.clock.runFor(60);
  await expect(stage).toHaveAttribute('data-context', 'lost');
  await page.clock.runFor(200);
  await expect
    .poll(
      async () => {
        await page.clock.runFor(100);
        return stage.getAttribute('data-context');
      },
      { timeout: 30000 },
    )
    .toBe('ready');
  await page.clock.runFor(30);
  expect(errors).toEqual([]);
});
test('shipping page never downloads the development 3D renderer', async ({ page }) => {
  await frozen(page);
  const assets: string[] = [];
  page.on('request', (request) => {
    if (/\/render3d\/|\.glb(?:\?|$)/.test(request.url())) assets.push(request.url());
  });
  await page.goto('/');
  await ready(page);
  expect(assets).toEqual([]);
});
