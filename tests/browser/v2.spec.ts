import sharp from 'sharp';
import { test, expect } from '@playwright/test';
import { Game, raceTimeline } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';
import { type AnimalId, CHALLENGES } from '../../src/engine/config';
const key = 'jungle-esports-v2';
test.beforeEach(async ({ page }) => {
  const time = new Date('2026-10-03T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
});
async function seed(page: import('@playwright/test').Page, g: Game) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem('jungle-esports-motion', 'true');
    },
    { key, data: g.save() },
  );
}
async function ready(page: import('@playwright/test').Page, freeze = false) {
  await expect(page.locator('.race-canvas canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
  if (freeze) await page.getByRole('button', { name: 'Pause race', exact: true }).click();
  await page.clock.runFor(50);
  await page.evaluate(() => document.fonts.ready);
}
for (const id of [0, 1, 2, 3, 4] as AnimalId[])
  test(`V2 ${CHALLENGES[id].short} integrated track baseline`, async ({ page }) => {
    const g = new Game(seededRandom(55), () => 42);
    g.round.challenge = id;
    g.lock();
    g.round.phase = 'race';
    g.round.raceTime = 10.1;
    await seed(page, g);
    await page.goto('/');
    await ready(page, true);
    await expect(page.locator('.race-stage')).toHaveScreenshot(`challenge-${id}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.001,
      threshold: 0.1,
    });
  });
for (const [name, time] of [
  ['peak', 11],
  ['tumble', 11.4],
] as const)
  test(`Hill ${name} pose baseline`, async ({ page }) => {
    const g = new Game(seededRandom(55), () => 42);
    g.round.challenge = 0;
    g.lock();
    g.round.phase = 'race';
    g.round.raceTime = time;
    await seed(page, g);
    if (name === 'tumble')
      await page.addInitScript(() => localStorage.setItem('jungle-esports-motion', 'false'));
    await page.goto('/');
    await ready(page, true);
    await expect(page.locator('.race-stage')).toHaveScreenshot(`hill-${name}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.001,
      threshold: 0.1,
    });
  });
test('winner appears immediately and every bet settles at second crossing', async ({ page }) => {
  const g = new Game(seededRandom(55), () => 42);
  for (const id of [0, 1, 2, 3, 4] as AnimalId[]) g.place('win', [id], 10);
  g.place('place', [0], 10);
  g.lock();
  const t = raceTimeline(g.choreography!, g.round.order!);
  g.round.phase = 'finish';
  g.round.raceTime = t.winner - 0.08;
  await seed(page, g);
  await page.goto('/');
  await ready(page);
  await expect(page.getByTestId('winner-card')).toHaveCount(0);
  await page.clock.runFor(120);
  await expect(page.getByTestId('winner-card')).toContainText(
    ['Lion', 'Warthog', 'Cheetah', 'Squirrel', 'Hyena'][g.round.order![0]],
  );
  await expect(page.locator('.bet-results b').filter({ hasText: 'WON' })).toHaveCount(1);
  await page.clock.runFor(Math.ceil((t.settle - t.winner + 0.1) * 1000));
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.round.settled).toBe(true);
  expect(saved.history).toHaveLength(1);
  await expect(page.getByTestId('bet-result-5')).toBeVisible();
  const balance = saved.balance;
  await page.reload();
  await ready(page);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).balance, key)).toBe(
    balance,
  );
});
test('theater and fullscreen support betting, keyboard exit, and automatic drawer hiding', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('t');
  await expect(page.locator('.arena-frame')).toHaveClass(/theater/);
  await page.getByRole('button', { name: 'Overlay 50 coin chip', exact: true }).click();
  await page.getByRole('button', { name: 'Overlay Win Lion', exact: true }).click();
  await expect(page.getByTestId('stage-betting')).toContainText('50');
  await page.keyboard.press('Escape');
  await expect(page.locator('.arena-frame')).not.toHaveClass(/theater/);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const box = await page.locator('.arena-frame').boundingBox();
  expect(box!.width).toBe(1440);
  expect(box!.height).toBe(1100);
  await page.getByRole('button', { name: 'Overlay Win Warthog', exact: true }).click();
  await expect(page.getByTestId('stage-betting')).toContainText('100');
  await page.getByTestId('stage-betting').getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('stage-betting')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});
test('unsupported fullscreen falls back to theater', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.locator('.arena-frame')).toHaveClass(/theater/);
  await expect(page.locator('.fullscreen-hint')).toContainText('Theater view');
  await expect(page.getByTestId('stage-betting')).toBeVisible();
});
for (const [w, h] of [
  [1200, 900],
  [1600, 900],
  [2100, 900],
])
  test(`uniform scale and safe podium at ${w}:${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const g = new Game(seededRandom(12), () => 42);
    g.lock();
    g.round.phase = 'result';
    g.round.raceTime = raceTimeline(g.choreography!, g.round.order!).podium;
    g.tick(0.001);
    g.round.elapsed = 4.1;
    await seed(page, g);
    await page.goto('/?debug');
    await ready(page, true);
    await page.getByRole('button', { name: 'Theater mode', exact: true }).click();
    await expect(page.locator('.arena-frame')).toHaveClass(/theater/);
    await expect(page.locator('.race-stage')).toHaveCSS('width', `${w}px`);
    await expect(page.locator('.race-stage')).toHaveCSS('height', `${h}px`);
    await page.clock.runFor(30);
    const data = await page
      .locator('.race-canvas')
      .evaluate((node) => ({ ...(node as HTMLElement).dataset }));
    expect(data.scaleX).toBe(data.scaleY);
    expect(data.podiumFits).toBe('true');
    const { data: pixels, info } = await sharp(await page.locator('.race-stage').screenshot())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const scale = Number(data.scaleX),
      cx = 200 * scale + (w - Number(data.visibleWidth) * scale) / 2,
      cy = 100 * scale;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (
      let y = Math.max(0, Math.floor(cy - 40 * scale));
      y < Math.min(info.height, cy + 40 * scale);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(cx - 40 * scale));
        x < Math.min(info.width, cx + 40 * scale);
        x++
      ) {
        const i = (y * info.width + x) * 4;
        if (pixels[i] === 228 && pixels[i + 1] === 239 && pixels[i + 2] === 206) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    expect(maxX - minX).toBeGreaterThan(40 * scale);
    expect(Math.abs(maxX - minX - (maxY - minY))).toBeLessThanOrEqual(1);

    await expect(page.locator('.race-stage')).toHaveScreenshot(`podium-${w}-${h}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.001,
      threshold: 0.1,
    });
  });
test('migrates the V1 storage key and settles an old podium once', async ({ page }) => {
  const g = new Game(seededRandom(12), () => 42);
  g.place('place', [0], 10);
  g.lock();
  g.round.phase = 'podium';
  g.round.raceTime = 25;
  await page.addInitScript(
    (data) => localStorage.setItem('jungle-esports-v1', JSON.stringify({ ...data, version: 1 })),
    g.save(),
  );
  await page.goto('/');
  await ready(page);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.version).toBe(2);
  expect(saved.round.settled).toBe(true);
  expect(saved.history).toHaveLength(1);
  await page.reload();
  await ready(page);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).balance, key)).toBe(
    saved.balance,
  );
});

test('loads only the current challenge and reports actual draw calls within budget', async ({
  page,
}) => {
  const g = new Game(seededRandom(55), () => 42);
  g.round.challenge = 4;
  g.lock();
  g.round.phase = 'race';
  g.round.raceTime = 10.1;
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/challenge-\d@/.test(request.url())) requests.push(request.url());
  });
  await seed(page, g);
  await page.goto('/?debug');
  await ready(page);
  await page.clock.runFor(650);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => url.includes('challenge-4@'))).toBe(true);
  const metrics = await page.locator('.performance-overlay').textContent();
  const draws = Number(metrics!.split(' ')[0]);
  expect(draws).toBeGreaterThan(0);
  expect(draws).toBeLessThanOrEqual(60);
});

test('Exit theater leaves both fullscreen and theater', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Exit theater', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(page.locator('.arena-frame')).not.toHaveClass(/theater/);
});
