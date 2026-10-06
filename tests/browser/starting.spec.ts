import { test, expect } from '@playwright/test';
import { Game } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';

const names = ['lion', 'boar', 'cheetah', 'squirrel', 'dog'];
for (const [density, fallback] of [
  [1, false],
  [1, true],
  [2, false],
] as const) {
  test.describe(`${density}× ${fallback ? 'PNG' : 'WebP'} starting poses`, () => {
    test.use({
      deviceScaleFactor: density,
      viewport: { width: 1000, height: 900 },
      serviceWorkers: 'block',
    });
    test('all five animals wait at the line through countdown and launch into the race', async ({
      page,
    }, testInfo) => {
      const errors: string[] = [],
        atlases = new Map<string, Record<string, { anchor?: { x: number; y: number } }>>();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', async (response) => {
        const match = response.url().match(/\/([a-z]+)-sprite@\dx.json$/);
        if (match && response.ok()) atlases.set(match[1], (await response.json()).frames);
      });
      if (fallback) await page.route('**/*-sprite@*.webp', (route) => route.abort());
      const now = new Date('2026-10-05T04:00:00Z');
      await page.clock.install({ time: now });
      await page.clock.pauseAt(new Date(now.getTime() + 1000));
      const game = new Game(seededRandom(55), () => 42);
      game.lock();
      game.round.phase = 'lineup';
      game.round.elapsed = 2.7;
      await page.addInitScript((data) => {
        localStorage.setItem('jungle-esports-v2', JSON.stringify(data));
        localStorage.setItem('jungle-esports-motion', 'true');
      }, game.save());
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
      await page.clock.runFor(30);
      await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'lineup');
      for (const name of names) {
        const frames = atlases.get(name)!;
        expect(frames[`${name}/ready/0`].anchor?.y).toBe(1);
        expect(Object.keys(frames).filter((frame) => frame.includes('/run/'))).toHaveLength(
          name === 'dog' ? 9 : 11,
        );
      }
      await page
        .locator('.race-stage')
        .screenshot({ path: testInfo.outputPath('starting-countdown.png'), scale: 'css' });
      await page.clock.runFor(400);
      await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'race');
      await page
        .locator('.race-stage')
        .screenshot({ path: testInfo.outputPath('starting-launch.png'), scale: 'css' });
      expect(errors).toEqual([]);
    });
  });
}
