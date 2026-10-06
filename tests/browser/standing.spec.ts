import { test, expect, type Page } from '@playwright/test';
import { Game, raceTimeline } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';
import { createChoreography } from '../../src/engine/choreography';
import { ANIMALS, type AnimalId } from '../../src/engine/config';

const names = ['lion', 'boar', 'cheetah', 'squirrel', 'dog'];
test.use({ viewport: { width: 1000, height: 900 }, serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  const now = new Date('2026-10-04T04:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
});
async function seed(page: Page, game: Game) {
  await page.addInitScript((data) => {
    localStorage.setItem('jungle-esports-v2', JSON.stringify(data));
    localStorage.setItem('jungle-esports-motion', 'true');
  }, game.save());
}
async function ready(page: Page) {
  await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
  await page.clock.runFor(30);
}

for (const order of [
  [0, 1, 2, 3, 4],
  [3, 4, 0, 1, 2],
] as AnimalId[][]) {
  test(`standing podium displays ${order
    .slice(0, 3)
    .map((id) => names[id])
    .join(', ')}`, async ({ page }, testInfo) => {
    const errors: string[] = [],
      loaded = new Set<string>();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.ok() && /-standing-sprite@1x.webp$/.test(response.url()))
        loaded.add(response.url().split('/').pop()!);
    });
    const game = new Game(seededRandom(55), () => 42);
    game.lock();
    game.round.order = order;
    game.choreography = createChoreography(order, game.round.challenge, game.round.seed);
    game.round.phase = 'result';
    game.round.raceTime = raceTimeline(game.choreography, order).podium;
    game.tick(0.001);
    game.round.elapsed = 4.1;
    await seed(page, game);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'podium');
    expect([...loaded].sort()).toEqual(
      order
        .slice(0, 3)
        .map((id) => `${names[id]}-standing-sprite@1x.webp`)
        .sort(),
    );
    await expect(page.locator('.race-canvas')).toHaveAttribute('data-podium-fits', 'true');
    await page.getByRole('button', { name: 'Pause race', exact: true }).click();
    await page.clock.runFor(20);
    await page
      .locator('.race-stage')
      .screenshot({ path: testInfo.outputPath('standing-podium.png') });
    expect(errors).toEqual([]);
  });
}

test('the winner card uses the existing standing image and falls back to PNG', async ({
  page,
}, testInfo) => {
  const game = new Game(seededRandom(55), () => 42);
  game.lock();
  const winner = game.round.order![0];
  game.round.phase = 'result';
  game.round.raceTime = raceTimeline(game.choreography!, game.round.order!).winner + 0.03;
  game.round.elapsed = 0.5;
  await page.route('**/*-standing-sprite@*.webp', (route) => route.abort());
  await seed(page, game);
  await page.goto('/');
  await ready(page);
  const card = page.getByTestId('winner-card'),
    image = card.getByRole('img', { name: `${ANIMALS[winner].species} standing` });
  await expect(card).toBeVisible();
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  expect(await image.evaluate((node: HTMLImageElement) => node.currentSrc)).toContain(
    `${names[winner]}-standing-sprite@1x.png`,
  );
  await card.screenshot({ path: testInfo.outputPath('standing-winner.png') });
});

test('standing images preload after lock without adding them to initial betting requests', async ({
  page,
}) => {
  const loaded = new Set<string>();
  page.on('response', (response) => {
    if (response.ok() && /-standing-sprite@1x.webp$/.test(response.url()))
      loaded.add(response.url().split('/').pop()!);
  });
  await seed(page, new Game(seededRandom(55), () => 42));
  await page.goto('/');
  await ready(page);
  expect(loaded.size).toBe(0);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.clock.runFor(30);
  await expect.poll(() => loaded.size).toBe(3);
  const order = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jungle-esports-v2')!).round.order as AnimalId[],
  );
  expect([...loaded].sort()).toEqual(
    order
      .slice(0, 3)
      .map((id) => `${names[id]}-standing-sprite@1x.webp`)
      .sort(),
  );
});
