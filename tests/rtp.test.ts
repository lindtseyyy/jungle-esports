import { it, expect } from 'vitest';
import { drawOrder, drawForms } from '../src/engine/draw';
import { seededRandom } from '../src/engine/rng';
import {
  winProbability,
  placeProbability,
  exactaProbability,
  quinellaProbability,
  oddsFor,
} from '../src/engine/odds';
it('one million races match exact frequencies; analytic RTP never exceeds 95%', () => {
  const weights = [2.5, 1.25, 0.8, 1, 1.25],
    random = seededRandom(0xabcdef),
    rounds = 1_000_000,
    win = Array(5).fill(0),
    place = Array(5).fill(0),
    exacta = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let n = 0; n < rounds; n++) {
    const [i, j] = drawOrder(weights, random);
    win[i]++;
    place[i]++;
    place[j]++;
    exacta[i][j]++;
  }
  for (let i = 0; i < 5; i++) {
    const cases = [
      [win[i] / rounds, winProbability(weights, i)],
      [place[i] / rounds, placeProbability(weights, i)],
    ];
    for (let j = 0; j < 5; j++)
      if (i !== j) {
        cases.push([exacta[i][j] / rounds, exactaProbability(weights, i, j)]);
        if (i < j)
          cases.push([(exacta[i][j] + exacta[j][i]) / rounds, quinellaProbability(weights, i, j)]);
      }
    for (const [empirical, p] of cases) {
      expect(Math.abs(empirical - p)).toBeLessThan(0.002);
      expect(p * oddsFor(p)).toBeLessThanOrEqual(0.95 + 1e-12);
      expect(Math.abs(empirical * oddsFor(p) - p * oddsFor(p))).toBeLessThan(0.018);
    }
  }
});
it('form frequencies match 20/60/20 and seeds replay exactly', () => {
  const random = seededRandom(88),
    counts = { Tired: 0, Normal: 0, Hyped: 0 };
  for (let n = 0; n < 20000; n++) for (const form of drawForms(random)) counts[form]++;
  expect(counts.Tired / 100000).toBeCloseTo(0.2, 2);
  expect(counts.Normal / 100000).toBeCloseTo(0.6, 2);
  expect(counts.Hyped / 100000).toBeCloseTo(0.2, 2);
  const a = seededRandom(123),
    b = seededRandom(123);
  for (let n = 0; n < 100; n++) expect(a()).toBe(b());
  expect(() => drawOrder([1, 1, 1, 1, 1], () => 1)).toThrow();
});
