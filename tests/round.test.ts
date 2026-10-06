import { describe, it, expect } from 'vitest';
import { Game, raceTimeline } from '../src/engine/round';
import { CONFIG } from '../src/engine/config';
import { seededRandom } from '../src/engine/rng';
const create = () => new Game(seededRandom(12), () => 42);
const advance = (g: Game, seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds * 100); i++) g.tick(0.01);
};
describe('wallet and round lifecycle', () => {
  it('treats both quinella directions as the same capped selection', () => {
    const g = create(),
      home = g.round.challenge,
      other = ((home + 1) % 5) as typeof home;
    g.place('quinella', [home, other], 1000);
    const before = g.save();
    expect(() => g.place('quinella', [other, home], 10)).toThrow();
    expect(g.save()).toEqual(before);
  });
  it('rejects saved slips that exceed an aggregate selection limit', () => {
    const g = create();
    g.round.forms = ['Normal', 'Normal', 'Normal', 'Normal', 'Normal'];
    g.place('place', [g.round.challenge], 3000);
    const saved = g.save();
    saved.round.bets.push({ ...saved.round.bets[0] });
    expect(create().restore(saved)).toBe(false);
  });
  it('preserves elapsed race time at low frame rates', () => {
    const fast = create(),
      slow = create();
    fast.lock();
    slow.lock();
    advance(fast, 15);
    for (let n = 0; n < 30; n++) slow.tick(0.5);
    expect(slow.round.phase).toBe(fast.round.phase);
    expect(Math.abs(slow.round.raceTime - fast.round.raceTime)).toBeLessThan(0.2);
  });
  it('reserves stakes, supports undo/clear, and rejects locked bets', () => {
    const g = create();
    g.place('win', [0], 100);
    expect(g.balance).toBe(CONFIG.startingBalance - 10000);
    g.place('place', [1], 50);
    g.undo();
    expect(g.stake).toBe(100);
    g.clear();
    expect(g.balance).toBe(CONFIG.startingBalance);
    g.lock();
    expect(() => g.place('win', [0], 10)).toThrow();
    expect(g.round.order).toHaveLength(5);
  });
  it('pays exactly once across reload, preserves odds and replays without ledger changes', () => {
    const g = create();
    g.place('place', [0], 10);
    g.lock();
    advance(g, 3.7);
    expect(g.round.phase).toBe('race');
    while (g.round.phase !== 'podium') g.tick(0.01);
    expect(g.round.phase).toBe('podium');
    expect(g.history).toHaveLength(1);
    const balance = g.balance,
      saved = g.save(),
      loaded = create();
    expect(loaded.restore(saved)).toBe(true);
    const order = [...loaded.round.order!];
    loaded.startReplay(loaded.history[0]);
    for (let n = 0; loaded.replay && n < 4000; n++) loaded.tick(0.01);
    expect(loaded.replay).toBeNull();
    expect(loaded.balance).toBe(balance);
    expect(loaded.round.order).toEqual(order);
    loaded.nextRound();
    expect(loaded.balance).toBe(balance);
    expect(loaded.history).toHaveLength(1);
    expect(loaded.round.phase).toBe('betting');
  });
  it('restores locked results rather than re-drawing after reload', () => {
    const g = create();
    g.place('win', [2], 100);
    g.lock();
    advance(g, 8);
    const copy = create();
    expect(copy.restore(g.save())).toBe(true);
    expect(copy.round).toEqual(g.round);
    expect(copy.choreography?.curves.map((c) => c.points)).toEqual(
      g.choreography?.curves.map((c) => c.points),
    );
  });
  it('enforces funds, aggregated selection limits and round exposure', () => {
    const g = create();
    g.balance = 500;
    expect(() => g.place('win', [0], 10)).toThrow();
    g.balance = CONFIG.startingBalance;
    g.place('win', [0], 5000);
    expect(() => g.place('win', [0], 10)).toThrow();
    expect(() => g.place('exacta', [1, 2], 1000)).toThrow();
  });
  it('refills once per local day below 1,000 coins with an empty slip', () => {
    const g = create();
    g.balance = 99900;
    g.refill('2026-10-03');
    expect(g.balance).toBe(CONFIG.startingBalance);
    g.balance = 0;
    expect(() => g.refill('2026-10-03')).toThrow();
    g.refill('2026-10-04');
    g.balance = 90000;
    g.place('win', [0], 10);
    expect(() => g.refill('2026-10-05')).toThrow();
  });
  it('recomputes repeat odds and never partially applies a failed repeat', () => {
    const g = create();
    g.place('win', [0], 100);
    g.lock();
    g.round.phase = 'podium';
    g.nextRound();
    g.place('win', [1], 10);
    g.repeat();
    expect(g.stake).toBe(100);
    expect(g.round.bets[0].odds).not.toBe(g.lastBets[0].odds);
    g.balance = 0;
    const before = g.save();
    expect(() => g.repeat()).not.toThrow();
    g.clear();
    g.balance = 0;
    const empty = g.save();
    expect(() => g.repeat()).toThrow();
    expect(g.save()).toEqual(empty);
    expect(before.round.bets).toHaveLength(1);
  });
  it('rejects corrupt saves and handles round transitions without betting', () => {
    const g = create();
    expect(g.restore({ version: 1, balance: -1 })).toBe(false);
    const saved = g.save();
    saved.round.challenge = 9 as never;
    expect(g.restore(saved)).toBe(false);
    advance(g, 20.1);
    expect(g.round.phase).toBe('locked');
    advance(g, 33);
    expect(g.history).toHaveLength(1);
    expect(g.balance).toBe(CONFIG.startingBalance);
    expect(g.statistics.flat().reduce((s, n) => s + n, 0)).toBe(1);
  });
});

describe('V2 crossing timeline and save migration', () => {
  const locked = () => {
    const g = create();
    g.place('win', [0], 10);
    g.place('place', [1], 10);
    g.place('exacta', [0, 1], 10);
    g.place('quinella', [0, 1], 10);
    g.lock();
    g.round.phase = 'race';
    return g;
  };
  it('reveals at t1, pays at t2, enters podium at t3 + 1.2, then opens betting after five seconds', () => {
    const g = locked(),
      t = raceTimeline(g.choreography!, g.round.order!),
      before = g.balance;
    g.choreography!.photoFinish = false;
    g.round.raceTime = t.winner - 0.002;
    g.tick(0.001);
    expect(g.view().crossed).toEqual([]);
    expect(g.round.settled).toBe(false);
    g.tick(0.002);
    expect(g.round.phase).toBe('result');
    expect(g.view().crossed).toEqual([g.round.order![0]]);
    expect(g.balance).toBe(before);
    g.round.raceTime = t.settle - 0.002;
    g.tick(0.001);
    expect(g.round.settled).toBe(false);
    g.tick(0.002);
    expect(g.round.settled).toBe(true);
    expect(g.balance).toBe(before + g.round.payout);
    expect(g.history).toHaveLength(1);
    g.round.raceTime = t.podium - 0.002;
    g.tick(0.001);
    expect(g.round.phase).toBe('result');
    g.tick(0.002);
    expect(g.round.phase).toBe('podium');
    g.tick(4.8);
    expect(g.round.phase).toBe('podium');
    g.tick(0.3);
    expect(g.round.phase).toBe('betting');
    expect(g.history).toHaveLength(1);
  });
  for (const phase of ['locked', 'lineup', 'race', 'finish', 'result', 'podium'] as const)
    it(`settles once across reload in ${phase}`, () => {
      const g = locked(),
        t = raceTimeline(g.choreography!, g.round.order!);
      g.round.phase = phase;
      if (phase === 'finish') g.round.raceTime = t.winner - 0.1;
      if (phase === 'result') g.round.raceTime = t.winner + 0.001;
      if (phase === 'podium') {
        g.round.raceTime = t.podium;
        g.round.phase = 'result';
        g.tick(0.001);
      }
      const saved = g.save(),
        copy = create();
      expect(copy.restore(saved)).toBe(true);
      while (copy.round.phase !== 'podium') copy.tick(0.01);
      const balance = copy.balance,
        again = create();
      expect(again.restore(copy.save())).toBe(true);
      again.tick(0.1);
      again.nextRound();
      expect(again.balance).toBe(balance);
      expect(again.history).toHaveLength(1);
      expect(again.statistics.flat().reduce((a, b) => a + b, 0)).toBe(1);
    });
  for (const phase of ['race', 'finish', 'podium', 'payout'])
    it(`migrates V1 ${phase} saves without duplicate credit`, () => {
      const g = locked(),
        t = raceTimeline(g.choreography!, g.round.order!),
        before = g.balance;
      if (phase === 'payout') {
        g.round.phase = 'result';
        g.round.raceTime = t.podium;
        g.tick(0.001);
      }
      const legacy = { ...g.save(), version: 1, round: { ...g.round, phase, raceTime: t.podium } },
        copy = create();
      expect(copy.restore(legacy)).toBe(true);
      expect(copy.round.phase).toBe('podium');
      expect(copy.round.settled).toBe(true);
      expect(copy.history).toHaveLength(1);
      expect(copy.balance).toBe(before + copy.round.payout);
      const again = create();
      expect(again.restore(copy.save())).toBe(true);
      again.nextRound();
      expect(again.balance).toBe(copy.balance);
    });
  it('rejects an inconsistent V2 save atomically', () => {
    const g = locked(),
      bad = g.save();
    bad.round.phase = 'podium';
    const target = create(),
      before = target.save();
    expect(target.restore(bad)).toBe(false);
    expect(target.save()).toEqual(before);
  });
  it('uses the same crossing and podium times in replay without changing the wallet', () => {
    const g = locked(),
      t = raceTimeline(g.choreography!, g.round.order!);
    g.round.raceTime = t.podium;
    g.tick(0.01);
    g.nextRound();
    const before = g.save();
    g.startReplay(g.history[0]);
    g.replay!.time = t.winner + 0.001;
    expect(g.view().displayPhase).toBe('result');
    expect(g.view().crossed).toHaveLength(1);
    g.replay!.time = t.podium + 0.001;
    expect(g.view().displayPhase).toBe('podium');
    g.tick(5.1);
    expect(g.replay).toBeNull();
    expect(g.save()).toEqual(before);
  });
});

it('holds the photo finish scene briefly while the winner result remains visible', () => {
  const g = create();
  g.lock();
  g.round.phase = 'finish';
  g.choreography!.photoFinish = true;
  const t = raceTimeline(g.choreography!, g.round.order!);
  g.round.raceTime = t.winner - 0.001;
  g.tick(0.01);
  expect(g.round.phase).toBe('result');
  const frozen = g.round.raceTime;
  g.tick(0.1);
  expect(g.round.raceTime).toBe(frozen);
  expect(g.view().crossed[0]).toBe(g.round.order![0]);
  g.tick(0.2);
  expect(g.round.raceTime).toBeGreaterThan(frozen);
});
