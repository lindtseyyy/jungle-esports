import { footTarget } from '../src/render/rig/gaits';
import type { AnimalId } from '../src/engine/config';
import { describe, it, expect } from 'vitest';
import { LANES, viewportGeometry, resolutionFor } from '../src/render/lanes';
import { SPECIES } from '../src/render/species';
describe('V2 world geometry', () => {
  it('uses identical axes and letterboxes out-of-range aspect ratios', () => {
    for (const [w, h] of [
      [1440, 1080],
      [1920, 1080],
      [2520, 1080],
      [390, 844],
      [3840, 1080],
    ]) {
      const v = viewportGeometry(w, h);
      expect(v.visibleWidth).toBeGreaterThanOrEqual(1440);
      expect(v.visibleWidth).toBeLessThanOrEqual(2520);
      expect(v.x).toBeGreaterThanOrEqual(-0.000001);
      expect(v.y).toBeGreaterThanOrEqual(-0.000001);
      expect(v.scale * 1080 + v.y * 2).toBeCloseTo(h);
    }
  });
  it('keeps lanes 90 units apart with distinct anatomical proportions', () => {
    expect(LANES[0].scale).toBeCloseTo(0.84);
    expect(LANES[4].scale).toBeCloseTo(1);
    for (let i = 1; i < 5; i++) expect(LANES[i].floor - LANES[i - 1].floor).toBe(90);
    expect(SPECIES[1].upper).toBeLessThan(SPECIES[2].upper);
    expect(SPECIES[3].tailBones).toBe(8);
    expect(SPECIES[4].shoulder[1]).toBeLessThan(SPECIES[4].hip[1]);
  });
  it('caps fullscreen pixel dimensions and density', () => {
    for (const [w, h, d] of [
      [1920, 1080, 3],
      [3840, 2160, 2],
      [5120, 2880, 2],
      [7680, 4320, 2],
    ]) {
      const r = resolutionFor(w, h, d);
      expect(r).toBeLessThanOrEqual(2);
      expect(w * r).toBeLessThanOrEqual(3840);
      expect(h * r).toBeLessThanOrEqual(2160);
    }
  });
});

it('keeps a planted foot fixed on the ground while moving right to left', () => {
  for (const id of [0, 1, 2, 3, 4] as AnimalId[]) {
    const stride = SPECIES[id].strideLength,
      speed = 150,
      t = 0.02;
    const first = footTarget(id, 0),
      next = footTarget(id, (speed * t) / stride);
    expect(first.stance && next.stance).toBe(true);
    expect(-speed * t + next.x).toBeCloseTo(first.x);
    expect(next.lift).toBe(0);
  }
});
