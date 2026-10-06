import { test, expect } from '@playwright/test';
import { Game } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';
import { CHALLENGES, type AnimalId } from '../../src/engine/config';
import { settleBets } from '../../src/engine/bets';
import { createChoreography } from '../../src/engine/choreography';
const key = 'jungle-esports-v2';
test.beforeEach(async ({ page }) => {
  const time = new Date('2026-10-03T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
});
const fresh = (home: AnimalId = 1) => {
  const game = new Game(seededRandom(55), () => 42);
  game.round.challenge = home;
  game.round.forms = ['Normal', 'Normal', 'Normal', 'Normal', 'Normal'];
  return game;
};
async function seed(page: import('@playwright/test').Page, game: Game) {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key,
    data: game.save(),
  });
}
async function ready(page: import('@playwright/test').Page) {
  await expect(page.locator('.race-canvas canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
  await page.clock.runFor(50);
}
test('chips, exacta/quinella, undo/clear and reload preserve the ledger', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: '50 coin chip', exact: true }).click();
  await page.getByRole('button', { name: /^Win Lion at/ }).click();
  await expect(page.getByTestId('wallet')).toHaveText('9,950');
  await page.getByRole('button', { name: 'Undo last chip' }).click();
  await expect(page.getByTestId('wallet')).toHaveText('10,000');
  await page.getByRole('button', { name: 'Exacta', exact: true }).click();
  await page.getByRole('button', { name: 'exacta Lion Warthog', exact: true }).click();
  await expect(page.getByTestId('wallet')).toHaveText('9,950');
  await page.getByRole('button', { name: 'Quinella', exact: true }).click();
  await page.getByRole('button', { name: 'quinella Lion Cheetah', exact: true }).click();
  await expect(page.getByTestId('wallet')).toHaveText('9,900');
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('wallet')).toHaveText('9,900');
  await page.getByRole('button', { name: 'Clear bets' }).click();
  await expect(page.getByTestId('wallet')).toHaveText('10,000');
  expect(errors).toEqual([]);
});
test('complete race locks results, reaches podium, pays once and supports replay/repeat', async ({
  page,
}) => {
  const game = fresh();
  await seed(page, game);
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Bet Win on Warthog', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const locked = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(locked.round.order).toHaveLength(5);
  expect(locked.round.phase).toBe('locked');
  await expect(page.getByRole('button', { name: 'Bet Win on Lion', exact: true })).toBeDisabled();
  const motion = createChoreography(locked.round.order, locked.round.challenge, locked.round.seed);
  await page.clock.fastForward(4500);
  await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'race');
  await page.clock.fastForward(
    Math.ceil(
      (3.6 +
        motion.finishTimes[locked.round.order[2]] +
        1.2 +
        (motion.photoFinish ? 1.4 : 0) +
        0.7) *
        1000,
    ) - 4500,
  );
  await expect(page.locator('.payout-box')).toBeVisible();
  const settled = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(settled.history).toHaveLength(1);
  expect(settled.round.order).toEqual(locked.round.order);
  expect(settled.balance).toBe(990000 + settleBets(locked.round.bets, locked.round.order));
  await page.getByRole('button', { name: 'Next race', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Repeat last bets' })).toBeEnabled();
  await page.getByRole('button', { name: 'Repeat last bets' }).click();
  await expect(page.locator('.slip-bet')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear bets' }).click();
  const before = await page.getByTestId('wallet').textContent();
  await page.getByRole('button', { name: 'Replay race 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop replay' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop replay' }).click();
  expect(await page.getByTestId('wallet').textContent()).toBe(before);
});
for (const c of CHALLENGES)
  test(`${c.short} renders its challenge and podium without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const game = fresh(c.id);
    game.lock();
    game.round.phase = 'race';
    game.round.raceTime = 9.6;
    await seed(page, game);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'race');
    await page.screenshot({ path: `test-results/terrain-${c.id}.png` });
    await page.clock.fastForward(
      Math.ceil(
        (game.choreography!.finishTimes[game.round.order![2]] +
          1.2 -
          9.6 +
          0.8 +
          (game.choreography!.photoFinish ? 1.4 : 0)) *
          1000,
      ),
    );
    await expect(page.locator('.payout-box')).toBeVisible();
    expect(errors).toEqual([]);
  });
test('portrait and landscape layouts fit, dialogs trap focus, settings work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({ path: 'test-results/portrait.png', fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/landscape.png', fullPage: true });
});
test('production service worker reloads and races offline', async ({ page, context }) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    'Run against the production preview to validate its generated offline cache',
  );
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ready(page);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('wallet')).toHaveText('10,000');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bet Win on Lion', exact: true })).toBeDisabled();
  await context.setOffline(false);
});
