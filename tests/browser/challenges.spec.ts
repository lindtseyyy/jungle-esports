import { test, expect } from '@playwright/test';
import { Game } from '../../src/engine/round';
import { seededRandom } from '../../src/engine/rng';
import { CHALLENGES, type AnimalId } from '../../src/engine/config';
import type { Crossing } from '../../src/render/challenges/crossing';

test.use({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
type State = Crossing & {
  animal: AnimalId;
  frame: string;
  x: number;
  y: number;
  floor: number;
  grip?: { x: number; y: number };
};
const names = ['lion', 'boar', 'cheetah', 'squirrel', 'dog'];
for (const id of [0, 1, 2, 3, 4] as AnimalId[]) {
  test(`${CHALLENGES[id].short}: all five animals traverse the complete obstacle`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const now = new Date('2026-10-05T12:00:00Z');
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 1000));
    const game = new Game(seededRandom(55), () => 42);
    game.round.challenge = id;
    game.lock();
    game.round.phase = 'race';
    game.round.raceTime = 7;
    await page.addInitScript((data) => {
      localStorage.setItem('jungle-esports-v2', JSON.stringify(data));
      localStorage.setItem('jungle-esports-motion', 'false');
    }, game.save());
    await page.goto('/?debug');
    await expect(page.getByRole('button', { name: 'Pause race', exact: true })).toBeVisible();
    const seen = names.map(() => new Set<string>()),
      vines = names.map(() => new Set<number>()),
      frames = names.map(() => new Set<string>());
    let captured = 0;
    for (let n = 0; n < 82; n++) {
      // Skip excess draw frames but still sample the distance-based animation every 120 ms.
      await page.clock.fastForward(103);
      await page.clock.runFor(17);
      const states: State[] = JSON.parse(
        (await page.locator('.race-canvas').getAttribute('data-crossings'))!,
      );
      for (const s of states) {
        seen[s.animal].add(s.stage);
        frames[s.animal].add(s.frame);
        if (s.vine >= 0) vines[s.animal].add(s.vine);
        if (s.stage === 'bridge') {
          expect(s.y).toBe(s.floor);
          expect(s.frame).toContain('/walk/');
        }
        if (s.stage === 'paddle') {
          expect(s.y).toBeGreaterThanOrEqual(s.floor + 27);
          expect(s.frame).toContain(id === 1 ? '/mud/' : '/raft/');
        }
        if (s.stage === 'float') {
          expect(s.floating).toBe(true);
          expect(s.frame).toContain(id === 1 ? '/mud/' : '/raft/');
        }
        if (s.stage === 'swing' || s.stage === 'transfer') {
          expect(s.grip!.y).toBeLessThan(s.floor - 150);
          expect(s.frame).toContain('/hang/');
        }
        if (s.stage === 'tumble') expect(s.frame).toContain('/tuck/');
      }
      if (n === 18 || n === 29 || n === 42 || n === 81) {
        await page
          .locator('.race-stage')
          .screenshot({ path: info.outputPath(`crossing-${captured++}.png`), scale: 'css' });
      }
    }
    for (let animal = 0; animal < 5; animal++) {
      const stages = seen[animal];
      expect(stages.has('run')).toBe(true);
      for (const stage of id === 0
        ? ['approach', 'climb', 'peak', 'tumble', 'recover']
        : id === 1
          ? ['jump-mud', 'enter-mud', 'paddle', 'leave-mud']
          : id === 2
            ? ['bridge']
            : id === 3
              ? ['jump', 'swing', 'transfer', 'land']
              : ['board', 'float', 'disembark'])
        expect(stages.has(stage)).toBe(true);
      if (id === 3)
        expect([...vines[animal]].sort()).toEqual(Array.from({ length: 9 }, (_, i) => i));
      if (id === 1 || id === 4) {
        expect(frames[animal].has(`${names[animal]}/${id === 1 ? 'mud' : 'raft'}/0`)).toBe(true);
        expect(frames[animal].has(`${names[animal]}/${id === 1 ? 'mud' : 'raft'}/1`)).toBe(true);
      }
    }
    await page.getByRole('button', { name: 'Pause race', exact: true }).click();
    await page.clock.runFor(20);
    const paused = await page.locator('.race-stage canvas').screenshot();
    await page.clock.fastForward(500);
    await page.clock.runFor(20);
    expect((await page.locator('.race-stage canvas').screenshot()).equals(paused)).toBe(true);
    expect(errors).toEqual([]);
  });
}
