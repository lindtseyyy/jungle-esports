import { it, expect } from 'vitest';
import { createChoreography } from '../src/engine/choreography';
import { drawOrder } from '../src/engine/draw';
import { seededRandom } from '../src/engine/rng';
import { CONFIG, type AnimalId } from '../src/engine/config';
it('500 seeded races are monotone, bounded, and finish in the drawn order', () => {
  const random = seededRandom(929);
  let photos = 0;
  for (let seed = 0; seed < 500; seed++) {
    const order = drawOrder([1, 1, 1, 1, 1], random),
      home = (seed % 5) as AnimalId,
      c = createChoreography(order, home, seed);
    if (c.photoFinish) photos++;
    expect([...order].sort((a, b) => c.finishTimes[a] - c.finishTimes[b])).toEqual(order);
    for (let i = 0; i < 5; i++) {
      let prev = -1,
        minSpeed = Infinity,
        maxSpeed = 0,
        monotone = true;
      const average = CONFIG.trackLength / c.finishTimes[i];
      for (let t = 0; t < c.finishTimes[i]; t += 0.025) {
        const s = c.curves[i].sample(t);
        monotone &&= s.x >= prev;
        minSpeed = Math.min(minSpeed, s.speed);
        maxSpeed = Math.max(maxSpeed, s.speed);
        prev = s.x;
      }
      expect(monotone).toBe(true);
      expect(minSpeed).toBeGreaterThanOrEqual(0.4 * average - 1e-6);
      expect(maxSpeed).toBeLessThanOrEqual(1.8 * average + 1e-6);
      expect(c.curves[i].sample(c.finishTimes[i]).x).toBe(CONFIG.trackLength);
    }
    const entries = c.curves
        .map((curve, id) => ({ id, t: curve.points[2].t }))
        .sort((a, b) => a.t - b.t),
      exits = c.curves.map((curve, id) => ({ id, t: curve.points[3].t })).sort((a, b) => a.t - b.t);
    expect(entries.findIndex((x) => x.id === home)).toBeGreaterThanOrEqual(3);
    expect(exits.findIndex((x) => x.id === home)).toBeLessThanOrEqual(1);
    expect(createChoreography(order, home, seed).curves.map((x) => x.points)).toEqual(
      c.curves.map((x) => x.points),
    );
  }
  expect(photos).toBeGreaterThan(45);
  expect(photos).toBeLessThan(105);
});
