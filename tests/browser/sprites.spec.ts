import { test, expect } from '@playwright/test';
import { Game, raceTimeline } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';

const names = ['lion', 'boar', 'cheetah', 'squirrel', 'dog'];

for (const density of [1, 2]) {
  test.describe(`${density}× running sprites`, () => {
    test.use({
      deviceScaleFactor: density,
      viewport: { width: 1000, height: 900 },
      serviceWorkers: 'block',
    });

    for (const fallback of density === 1 ? [false, true] : [false]) {
      test(`loads all five animals using ${fallback ? 'PNG fallback' : 'WebP'}`, async ({
        page,
      }, testInfo) => {
        const errors: string[] = [],
          loaded = new Set<string>();
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => {
          const file = response.url().split('/').pop()!;
          if (response.ok() && /-sprite@\dx\.(json|webp|png)$/.test(file)) loaded.add(file);
        });
        if (fallback) await page.route('**/*-sprite@*.webp', (route) => route.abort());

        const now = new Date('2026-10-04T04:00:00Z');
        await page.clock.install({ time: now });
        await page.clock.pauseAt(new Date(now.getTime() + 1000));
        const game = new Game(seededRandom(55), () => 42);
        game.lock();
        game.round.phase = 'race';
        game.round.raceTime = 0.1;
        await page.addInitScript((data) => {
          localStorage.setItem('jungle-esports-v2', JSON.stringify(data));
          localStorage.setItem('jungle-esports-motion', 'true');
        }, game.save());
        await page.goto('/');
        const canvas = page.locator('.race-canvas canvas');
        await expect(canvas).toBeVisible();
        await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
        for (const name of names) {
          expect(loaded.has(`${name}-sprite@${density}x.json`)).toBe(true);
          expect(loaded.has(`${name}-sprite@${density}x.${fallback ? 'png' : 'webp'}`)).toBe(true);
        }
        expect([...loaded].every((file) => file.includes(`@${density}x`))).toBe(true);

        await page.clock.runFor(100);
        if (density === 1) {
          await page.getByRole('button', { name: 'Pause race', exact: true }).click();
          await page.clock.runFor(50);
          const paused = await canvas.screenshot({
            path: testInfo.outputPath('runners.png'),
            scale: 'css',
          });
          await page.clock.runFor(250);
          expect((await canvas.screenshot({ scale: 'css' })).equals(paused)).toBe(true);
          await page.getByRole('button', { name: 'Resume race', exact: true }).click();
          await page.clock.runFor(150);
          expect((await canvas.screenshot({ scale: 'css' })).equals(paused)).toBe(false);
        }
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('production offline sprites', () => {
  test.setTimeout(120000);
  test.use({ deviceScaleFactor: 2, viewport: { width: 1000, height: 900 } });

  for (const format of ['webp', 'png']) {
    test(`caches ${format} at both densities and reloads the race and podium offline`, async ({
      page,
      context,
    }) => {
      test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Requires the production offline cache');
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      if (format === 'png') {
        // Simulate a browser without WebP decoding in the worker and renderer.
        await context.route('**/sw.js', async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            body: `self.createImageBitmap = undefined;\n${await response.text()}`,
          });
        });
        await page.route('**/*@*.webp', (route) => route.abort());
      }
      const now = new Date('2026-10-04T04:00:00Z');
      await page.clock.install({ time: now });
      await page.clock.pauseAt(new Date(now.getTime() + 1000));
      const game = new Game(seededRandom(55), () => 42);
      game.round.challenge = 4;
      game.lock();
      game.round.phase = 'race';
      game.round.raceTime = 10.1;
      await page.addInitScript((data) => {
        if (!localStorage.getItem('jungle-esports-v2'))
          localStorage.setItem('jungle-esports-v2', JSON.stringify(data));
        localStorage.setItem('jungle-esports-motion', 'true');
      }, game.save());
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
      await page.evaluate(() => navigator.serviceWorker.ready);
      const files = await page.evaluate(async () => {
        const key = (await caches.keys()).find((key) => key.startsWith('jungle-'))!;
        return (await (await caches.open(key)).keys()).map((request) =>
          request.url.split('/').pop(),
        );
      });
      for (const name of names)
        for (const density of [1, 2]) {
          expect(files).toContain(`${name}-sprite@${density}x.${format}`);
          expect(files).toContain(`${name}-standing-sprite@${density}x.${format}`);
          expect(files).toContain(`${name}-crossing-sprite@${density}x.${format}`);
        }
      expect(
        files.some((file) => /@[12]x\.(png|webp)$/.test(file!) && !file!.endsWith(format)),
      ).toBe(false);

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
      await page.clock.runFor(150);
      await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'race');
      await expect(page.locator('.loading-screen')).toHaveCount(0);
      game.round.phase = 'result';
      game.round.raceTime = raceTimeline(game.choreography!, game.round.order!).podium;
      game.tick(0.001);
      game.round.elapsed = 4.1;
      await page.addInitScript(
        (data) => localStorage.setItem('jungle-esports-v2', JSON.stringify(data)),
        game.save(),
      );
      await page.reload();
      await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
      await page.clock.runFor(30);
      await expect(page.locator('.race-stage')).toHaveAttribute('data-phase', 'podium');
      await expect(page.locator('.race-canvas')).toHaveAttribute('data-podium-fits', 'true');
      expect(errors).toEqual([]);
    });
  }
});
