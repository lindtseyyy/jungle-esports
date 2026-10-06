import {
  ANIMALS,
  CHALLENGES,
  CONFIG,
  isAnimal,
  weightsFor,
  type AnimalId,
  type Form,
} from './config';
import { makeBet, maximumReturn, settleBets, validateSlip, type Bet, type BetType } from './bets';
import { drawForms, drawOrder } from './draw';
import { createChoreography, type Choreography } from './choreography';
import { secureRandom, secureSeed, type RandomSource } from './rng';
export type Phase = 'betting' | 'locked' | 'lineup' | 'race' | 'finish' | 'result' | 'podium';
export interface RaceRecord {
  id: number;
  challenge: AnimalId;
  forms: Form[];
  order: AnimalId[];
  seed: number;
  stake: number;
  payout: number;
}
export interface RoundData {
  id: number;
  challenge: AnimalId;
  forms: Form[];
  phase: Phase;
  elapsed: number;
  raceTime: number;
  bets: Bet[];
  order: AnimalId[] | null;
  seed: number;
  settled: boolean;
  payout: number;
}
export interface SaveData {
  version: 2;
  balance: number;
  round: RoundData;
  history: RaceRecord[];
  statistics: number[][];
  lastBets: Bet[];
  refillDate: string | null;
}
export function raceTimeline(choreography: Choreography, order: readonly AnimalId[]) {
  return {
    winner: choreography.finishTimes[order[0]],
    settle: choreography.finishTimes[order[1]],
    podium: choreography.finishTimes[order[2]] + 1.2,
  };
}
export class Game {
  balance: number = CONFIG.startingBalance;
  round: RoundData;
  history: RaceRecord[] = [];
  statistics = ANIMALS.map(() => ANIMALS.map(() => 0));
  lastBets: Bet[] = [];
  refillDate: string | null = null;
  choreography: Choreography | null = null;
  replay: {
    record: RaceRecord;
    choreography: Choreography;
    time: number;
    snapshotHold: number;
  } | null = null;
  constructor(
    private random: RandomSource = secureRandom,
    private seedSource: () => number = secureSeed,
  ) {
    this.round = this.newRound(1);
  }
  private newRound(id: number): RoundData {
    return {
      id,
      challenge: Math.floor(this.random() * 5) as AnimalId,
      forms: drawForms(this.random),
      phase: 'betting',
      elapsed: 0,
      raceTime: 0,
      bets: [],
      order: null,
      seed: 0,
      settled: false,
      payout: 0,
    };
  }
  get weights(): number[] {
    return weightsFor(this.round.challenge, this.round.forms);
  }
  get stake(): number {
    return this.round.bets.reduce((s, b) => s + b.stake, 0);
  }
  get maxReturn(): number {
    return maximumReturn(this.round.bets);
  }
  get canBet(): boolean {
    return this.round.phase === 'betting' && !this.replay;
  }
  place(type: BetType, picks: AnimalId[], stake: number): void {
    if (!this.canBet) throw new Error('Betting is closed for this race');
    const bet = makeBet(type, picks, stake, this.weights);
    const same = this.round.bets
      .filter((b) => b.type === type && b.picks.join() === bet.picks.join())
      .reduce((s, b) => s + b.stake, 0);
    makeBet(type, picks, stake + same, this.weights);
    if (stake * 100 > this.balance) throw new Error('Not enough coins. Try a smaller chip.');
    if (maximumReturn([...this.round.bets, bet]) > CONFIG.maxRoundPayout)
      throw new Error('Round payout limit reached. Try a smaller chip.');
    this.balance -= stake * 100;
    this.round.bets = [...this.round.bets, bet];
  }
  undo(): void {
    if (!this.canBet) return;
    const bet = this.round.bets.at(-1);
    if (bet) {
      this.balance += bet.stake * 100;
      this.round.bets = this.round.bets.slice(0, -1);
    }
  }
  clear(): void {
    if (!this.canBet) return;
    this.balance += this.stake * 100;
    this.round.bets = [];
  }
  repeat(): void {
    const winnerBets = this.lastBets.filter((b) => b.type === 'win');
    if (!this.canBet || !winnerBets.length) throw new Error('No previous Winner bets to repeat');
    const proposed = winnerBets.map((b) => makeBet(b.type, b.picks, b.stake, this.weights));
    validateSlip(proposed, this.weights);
    const total = proposed.reduce((s, b) => s + b.stake, 0);
    if (
      total * 100 > this.balance + this.stake * 100 ||
      maximumReturn(proposed) > CONFIG.maxRoundPayout
    )
      throw new Error('Previous bets exceed your balance or this round’s limit');
    this.clear();
    this.balance -= total * 100;
    this.round.bets = proposed;
  }
  lock(): void {
    if (!this.canBet) return;
    this.round.order = drawOrder(this.weights, this.random);
    this.round.seed = this.seedSource();
    this.choreography = createChoreography(this.round.order, this.round.challenge, this.round.seed);
    this.lastBets = this.round.bets.map((b) => ({ ...b, picks: [...b.picks] }));
    this.transition('locked');
  }
  private transition(phase: Phase): void {
    this.round.phase = phase;
    this.round.elapsed = 0;
  }
  tick(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const replayAtStart = this.replay;
    while (delta > 1e-9) {
      const step = Math.min(delta, 0.1);
      this.advance(step);
      delta -= step;
      if (replayAtStart && !this.replay) break;
    }
  }
  private advance(delta: number): void {
    if (this.replay) {
      const replay = this.replay,
        timeline = raceTimeline(replay.choreography, replay.record.order);
      if (replay.snapshotHold > 0) {
        replay.snapshotHold = Math.max(0, replay.snapshotHold - delta);
        return;
      }
      const before = replay.time;
      const slow =
        replay.choreography.photoFinish &&
        before > timeline.winner - 0.45 &&
        before < timeline.winner + 0.25;
      replay.time += delta * (slow ? 0.35 : 1);
      if (
        replay.choreography.photoFinish &&
        before < timeline.winner &&
        replay.time >= timeline.winner
      )
        replay.snapshotHold = 0.18;
      if (
        this.replay.time >
        raceTimeline(this.replay.choreography, this.replay.record.order).podium + 5
      )
        this.replay = null;
      return;
    }
    const r = this.round;
    r.elapsed += delta;
    switch (r.phase) {
      case 'betting':
        if (r.elapsed >= CONFIG.bettingSeconds) this.lock();
        break;
      case 'locked':
        if (r.elapsed >= 0.6) this.transition('lineup');
        break;
      case 'lineup':
        if (r.elapsed >= 3) this.transition('race');
        break;
      case 'race':
      case 'finish':
      case 'result': {
        if (!this.choreography || !r.order) throw new Error('Race result missing');
        const timeline = raceTimeline(this.choreography, r.order);
        const finish = timeline.winner;
        const slow =
          this.choreography.photoFinish && r.raceTime > finish - 0.45 && r.raceTime < finish + 0.25;
        // Hold the actual scene briefly after a photo crossing, while the winner card is live.
        const snapshot = this.choreography.photoFinish && r.phase === 'result' && r.elapsed < 0.18;
        if (!snapshot) r.raceTime += delta * (slow ? 0.35 : 1);
        if (r.phase === 'race' && r.raceTime >= finish - 0.45) this.transition('finish');
        if (r.raceTime >= timeline.winner && r.phase !== 'result') this.transition('result');
        if (r.raceTime >= timeline.settle) this.settle();
        if (r.raceTime >= timeline.podium) this.transition('podium');
        break;
      }
      case 'podium':
        if (r.elapsed >= 5) this.nextRound();
        break;
    }
  }
  private settle(): void {
    const r = this.round;
    if (r.settled || !r.order) return;
    r.payout = settleBets(r.bets, r.order);
    this.balance += r.payout;
    r.settled = true;
    this.statistics[r.challenge][r.order[0]]++;
    this.history = [
      {
        id: r.id,
        challenge: r.challenge,
        forms: [...r.forms],
        order: [...r.order],
        seed: r.seed,
        stake: this.stake,
        payout: r.payout,
      },
      ...this.history,
    ].slice(0, 20);
  }
  nextRound(): void {
    if (this.replay || this.round.phase !== 'podium') return;
    this.settle();
    this.round = this.newRound(this.round.id + 1);
    this.choreography = null;
  }
  refill(date: string): void {
    if (this.balance >= 100_000 || this.refillDate === date || !this.canBet || this.stake > 0)
      throw new Error('Refill is available once daily below 1,000 coins, with an empty bet slip');
    this.balance = CONFIG.startingBalance;
    this.refillDate = date;
  }
  startReplay(record: RaceRecord): void {
    this.replay = {
      record,
      choreography: createChoreography(record.order, record.challenge, record.seed),
      time: 0,
      snapshotHold: 0,
    };
  }
  save(): SaveData {
    return JSON.parse(
      JSON.stringify({
        version: 2,
        balance: this.balance,
        round: this.round,
        history: this.history,
        statistics: this.statistics,
        lastBets: this.lastBets,
        refillDate: this.refillDate,
      }),
    ) as SaveData;
  }
  get crossed(): AnimalId[] {
    const choreography = this.replay?.choreography ?? this.choreography;
    const order = this.replay?.record.order ?? this.round.order;
    const time = this.replay?.time ?? this.round.raceTime;
    return choreography && order ? order.filter((id) => time >= choreography.finishTimes[id]) : [];
  }
  view() {
    const choreography = this.replay?.choreography ?? this.choreography;
    const order = this.replay?.record.order ?? this.round.order;
    const raceTime = this.replay?.time ?? this.round.raceTime;
    const crossed =
      choreography && order ? order.filter((id) => raceTime >= choreography.finishTimes[id]) : [];
    const replayPhase =
      this.replay && choreography && order
        ? raceTime >= raceTimeline(choreography, order).podium
          ? 'podium'
          : crossed.length
            ? 'result'
            : 'race'
        : null;
    return {
      crossed,
      displayPhase: replayPhase ?? this.round.phase,
      resultOrder: order,
      resultWeights: this.replay
        ? weightsFor(this.replay.record.challenge, this.replay.record.forms)
        : this.weights,
      ...this.save(),
      weights: this.weights,
      stake: this.stake,
      maxReturn: this.maxReturn,
      canBet: this.canBet,
      replaying: !!this.replay,
      replayRecord: this.replay?.record ?? null,
    };
  }
  restore(value: unknown): boolean {
    try {
      const d = JSON.parse(JSON.stringify(value)) as Omit<SaveData, 'version' | 'round'> & {
        version: number;
        round: Omit<RoundData, 'phase'> & { phase: Phase | 'payout' };
      };
      if (
        !d ||
        ![1, 2].includes(d.version) ||
        !Number.isSafeInteger(d.balance) ||
        d.balance < 0 ||
        d.balance > 1e12
      )
        return false;
      const r = d.round;
      const validForms = (forms: Form[]) =>
        Array.isArray(forms) &&
        forms.length === 5 &&
        forms.every((f) => ['Tired', 'Normal', 'Hyped'].includes(f));
      const validOrder = (order: AnimalId[]) =>
        Array.isArray(order) &&
        order.length === 5 &&
        order.every(isAnimal) &&
        new Set(order).size === 5;
      const validBets = (bets: Bet[], w: number[]) =>
        Array.isArray(bets) &&
        bets.length <= 1000 &&
        bets.every((b) => makeBet(b.type, b.picks, b.stake, w).odds === b.odds);
      if (
        !r ||
        !Number.isSafeInteger(r.id) ||
        r.id < 1 ||
        !isAnimal(r.challenge) ||
        !validForms(r.forms) ||
        !['betting', 'locked', 'lineup', 'race', 'finish', 'result', 'podium', 'payout'].includes(
          r.phase,
        )
      )
        return false;
      if (
        !Number.isFinite(r.elapsed) ||
        r.elapsed < 0 ||
        r.elapsed > 60 ||
        !Number.isFinite(r.raceTime) ||
        r.raceTime < 0 ||
        r.raceTime > 30 ||
        !Number.isSafeInteger(r.seed) ||
        r.seed < 0 ||
        r.seed > 0xffffffff ||
        typeof r.settled !== 'boolean'
      )
        return false;
      const w = weightsFor(r.challenge, r.forms);
      validateSlip(r.bets, w);
      if (
        !validBets(r.bets, w) ||
        maximumReturn(r.bets) > CONFIG.maxRoundPayout ||
        !Number.isSafeInteger(r.payout) ||
        r.payout < 0
      )
        return false;
      if (r.phase === 'betting' ? r.order !== null || r.settled : !r.order || !validOrder(r.order))
        return false;
      if (
        (r.settled && !['result', 'podium', 'payout'].includes(r.phase)) ||
        (d.version === 1 && r.phase === 'payout' && !r.settled) ||
        (d.version === 2 && r.phase === 'payout') ||
        (r.settled && r.payout !== settleBets(r.bets, r.order!))
      )
        return false;
      if (
        !Array.isArray(d.history) ||
        d.history.length > 20 ||
        !d.history.every(
          (h) =>
            Number.isInteger(h.id) &&
            isAnimal(h.challenge) &&
            validForms(h.forms) &&
            validOrder(h.order) &&
            Number.isSafeInteger(h.seed) &&
            h.seed >= 0 &&
            h.seed <= 0xffffffff &&
            Number.isFinite(h.stake) &&
            h.stake >= 0 &&
            Number.isSafeInteger(h.payout) &&
            h.payout >= 0,
        )
      )
        return false;
      if (
        !Array.isArray(d.statistics) ||
        d.statistics.length !== 5 ||
        !d.statistics.every(
          (row) =>
            Array.isArray(row) &&
            row.length === 5 &&
            row.every((n) => Number.isSafeInteger(n) && n >= 0),
        )
      )
        return false;
      if (
        !Array.isArray(d.lastBets) ||
        d.lastBets.length > 1000 ||
        !d.lastBets.every(
          (b) =>
            ['win', 'place', 'exacta', 'quinella'].includes(b.type) &&
            Array.isArray(b.picks) &&
            b.picks.every(isAnimal) &&
            Number.isInteger(b.stake) &&
            b.stake > 0 &&
            b.stake <= 5000 &&
            Number.isFinite(b.odds) &&
            b.odds >= 1 &&
            b.odds <= 500,
        )
      )
        return false;
      if (
        d.refillDate !== null &&
        (typeof d.refillDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.refillDate))
      )
        return false;
      const choreography = r.order ? createChoreography(r.order, r.challenge, r.seed) : null;
      if (choreography && r.order && d.version === 2) {
        const timeline = raceTimeline(choreography, r.order);
        if (r.phase === 'podium' && (!r.settled || r.raceTime < timeline.podium)) return false;
        if (r.settled && r.raceTime < timeline.settle) return false;
        if (r.phase === 'result' && r.raceTime < timeline.winner) return false;
      }
      this.choreography = choreography;
      this.balance = d.balance;
      this.round = { ...r, phase: r.phase === 'payout' ? 'podium' : r.phase };
      this.history = d.history;
      this.statistics = d.statistics;
      this.lastBets = d.lastBets;
      this.refillDate = d.refillDate;
      if (this.choreography && this.round.order) {
        const timeline = raceTimeline(this.choreography, this.round.order);
        if (d.version === 1 && ['race', 'finish', 'result', 'podium'].includes(this.round.phase)) {
          if (this.round.phase === 'podium' || this.round.raceTime >= timeline.settle)
            this.settle();
          if (this.round.phase !== 'podium' && this.round.raceTime >= timeline.winner)
            this.transition('result');
          if (this.round.raceTime >= timeline.podium && this.round.phase !== 'podium')
            this.transition('podium');
          this.round.elapsed = Math.min(this.round.elapsed, 4.9);
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
export const ROUND_CHALLENGES = CHALLENGES;
