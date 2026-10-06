import { describe, it, expect } from 'vitest';
import { ANIMALS, CHALLENGES, weightsFor } from '../src/engine/config';
import {
  winProbability,
  placeProbability,
  exactaProbability,
  quinellaProbability,
  oddsFor,
} from '../src/engine/odds';
import { makeBet, maximumReturn, settleBets } from '../src/engine/bets';
const w = [2.5, 1, 1, 1, 1];
describe('exact Plackett–Luce math', () => {
  it('matches the worked examples', () => {
    expect(winProbability(w, 0)).toBeCloseTo(5 / 13, 12);
    expect(placeProbability(w, 0)).toBeCloseTo(0.664335664335, 10);
    expect(oddsFor(winProbability(w, 0))).toBe(2.46);
    expect(oddsFor(placeProbability(w, 0))).toBe(1.43);
    expect(oddsFor(winProbability(w, 1))).toBe(6.17);
    expect(oddsFor(placeProbability(w, 1))).toBe(2.84);
    expect(oddsFor(exactaProbability(w, 0, 1))).toBe(9.87);
    expect(oddsFor(exactaProbability(w, 1, 0))).toBe(13.58);
    expect(oddsFor(exactaProbability(w, 1, 2))).toBe(33.96);
    expect(quinellaProbability(w, 0, 1)).toBeCloseTo(
      exactaProbability(w, 0, 1) + exactaProbability(w, 1, 0),
      12,
    );
  });
  it('matches the form example', () => {
    const weights = weightsFor(0, ['Normal', 'Hyped', 'Tired', 'Normal', 'Hyped']);
    expect(weights.map((_, i) => oddsFor(winProbability(weights, i)))).toEqual([
      2.58, 5.16, 8.07, 6.45, 5.16,
    ]);
  });
  it('is symmetric over the complete challenge roster', () => {
    expect(CHALLENGES.map((c) => c.home)).toEqual(ANIMALS.map((a) => a.id));
    expect(
      ANIMALS.map(
        (a) =>
          CHALLENGES.reduce(
            (s, c) =>
              s +
              winProbability(
                weightsFor(c.home, ['Normal', 'Normal', 'Normal', 'Normal', 'Normal']),
                a.id,
              ),
            0,
          ) / 5,
      ),
    ).toEqual(Array(5).fill(0.2));
  });
  it('sums win/exacta/quinella distributions to one and place to two', () => {
    const forms = ['Tired', 'Normal', 'Hyped'] as const;
    for (let code = 0; code < 243; code++) {
      let n = code;
      const fs = ANIMALS.map(() => {
        const f = forms[n % 3];
        n = Math.floor(n / 3);
        return f;
      });
      for (const challenge of CHALLENGES) {
        const weights = weightsFor(challenge.home, fs);
        let win = 0,
          place = 0,
          exacta = 0,
          quinella = 0;
        for (const a of ANIMALS) {
          win += winProbability(weights, a.id);
          place += placeProbability(weights, a.id);
          for (const b of ANIMALS) {
            if (a.id !== b.id) exacta += exactaProbability(weights, a.id, b.id);
            if (a.id < b.id) quinella += quinellaProbability(weights, a.id, b.id);
            for (const p of [
              winProbability(weights, a.id),
              placeProbability(weights, a.id),
              a.id !== b.id ? exactaProbability(weights, a.id, b.id) : 1e-3,
              a.id < b.id ? quinellaProbability(weights, a.id, b.id) : 1e-3,
            ])
              expect(p * oddsFor(p)).toBeLessThanOrEqual(0.95 + 1e-12);
          }
        }
        expect(win).toBeCloseTo(1, 12);
        expect(place).toBeCloseTo(2, 12);
        expect(exacta).toBeCloseTo(1, 12);
        expect(quinella).toBeCloseTo(1, 12);
      }
    }
  });
  it('settles inclusive returns in integer cents and finds mutually exclusive max return', () => {
    const bets = [
      makeBet('win', [0], 100, w),
      makeBet('place', [1], 50, w),
      makeBet('exacta', [0, 1], 10, w),
      makeBet('quinella', [0, 1], 10, w),
    ];
    expect(settleBets(bets, [0, 1, 2, 3, 4])).toBe(
      100 * 246 + 50 * 284 + 10 * 987 + 10 * Math.round(bets[3].odds * 100),
    );
    expect(settleBets(bets, [2, 3, 4, 1, 0])).toBe(0);
    const alternatives = [makeBet('win', [0], 100, w), makeBet('win', [1], 100, w)];
    expect(maximumReturn(alternatives)).toBe(61700);
  });
  it('rejects invalid bets and weights', () => {
    expect(() => makeBet('exacta', [1, 1], 10, w)).toThrow();
    expect(() => makeBet('win', [0], 100.5, w)).toThrow();
    expect(() => makeBet('quinella', [0, 1], 1001, w)).toThrow();
    expect(() => winProbability([1, 0, 1, 1, 1], 0)).toThrow();
    expect(() => oddsFor(0)).toThrow();
  });
});
