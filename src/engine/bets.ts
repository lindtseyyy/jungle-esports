import { CONFIG, isAnimal, type AnimalId } from './config';
import {
  winProbability,
  placeProbability,
  exactaProbability,
  quinellaProbability,
  oddsFor,
} from './odds';
export type BetType = 'win' | 'place' | 'exacta' | 'quinella';
export interface Bet {
  type: BetType;
  picks: AnimalId[];
  stake: number;
  odds: number;
}
export function probabilityFor(
  type: BetType,
  picks: readonly AnimalId[],
  w: readonly number[],
): number {
  const exotic = type === 'exacta' || type === 'quinella';
  if (
    picks.length !== (exotic ? 2 : 1) ||
    picks.some((i) => !isAnimal(i)) ||
    (exotic && picks[0] === picks[1])
  )
    throw new Error('Invalid selections');
  switch (type) {
    case 'win':
      return winProbability(w, picks[0]);
    case 'place':
      return placeProbability(w, picks[0]);
    case 'exacta':
      return exactaProbability(w, picks[0], picks[1]);
    case 'quinella':
      return quinellaProbability(w, picks[0], picks[1]);
    default:
      throw new Error('Invalid bet type');
  }
}
export function makeBet(
  type: BetType,
  picks: AnimalId[],
  stake: number,
  w: readonly number[],
): Bet {
  const limit = type === 'win' || type === 'place' ? CONFIG.maxStake : CONFIG.maxExoticStake;
  if (!Number.isInteger(stake) || stake <= 0 || stake > limit)
    throw new Error(`Stake must be 1–${limit} coins`);
  return {
    type,
    picks: type === 'quinella' ? [...picks].sort((a, b) => a - b) : [...picks],
    stake,
    odds: oddsFor(probabilityFor(type, picks, w)),
  };
}
export function betWins(bet: Bet, order: readonly AnimalId[]): boolean {
  const [i, j] = bet.picks;
  switch (bet.type) {
    case 'win':
      return order[0] === i;
    case 'place':
      return order.slice(0, 2).includes(i);
    case 'exacta':
      return order[0] === i && order[1] === j;
    case 'quinella':
      return order.slice(0, 2).includes(i) && order.slice(0, 2).includes(j);
  }
}
// All ledger amounts are integer hundredths of a coin.
export function settleBets(bets: readonly Bet[], order: readonly AnimalId[]): number {
  return bets.reduce(
    (sum, bet) => sum + (betWins(bet, order) ? bet.stake * Math.round(bet.odds * 100) : 0),
    0,
  );
}
export function maximumReturn(bets: readonly Bet[]): number {
  let max = 0;
  for (let first = 0; first < 5; first++)
    for (let second = 0; second < 5; second++) {
      if (first === second) continue;
      const order = [
        first,
        second,
        ...[0, 1, 2, 3, 4].filter((i) => i !== first && i !== second),
      ] as AnimalId[];
      max = Math.max(max, settleBets(bets, order));
    }
  return max;
}

export function validateSlip(bets: readonly Bet[], weights: readonly number[]): void {
  const sums = new Map<string, number>();
  for (const bet of bets) {
    const priced = makeBet(bet.type, bet.picks, bet.stake, weights);
    if (priced.odds !== bet.odds) throw new Error('Saved odds do not match the round');
    const key = priced.type + ':' + priced.picks.join(',');
    const sum = (sums.get(key) ?? 0) + bet.stake;
    makeBet(priced.type, priced.picks, sum, weights);
    sums.set(key, sum);
  }
  if (maximumReturn(bets) > CONFIG.maxRoundPayout)
    throw new Error('Slip exceeds round payout limit');
}
