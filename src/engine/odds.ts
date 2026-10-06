import { CONFIG } from './config';
export function validateWeights(w: readonly number[]): number {
  if (w.length !== 5 || w.some((x) => !Number.isFinite(x) || x <= 0))
    throw new Error('Expected five positive finite weights');
  return w.reduce((sum, x) => sum + x, 0);
}
export function winProbability(w: readonly number[], i: number): number {
  return w[i] / validateWeights(w);
}
export function exactaProbability(w: readonly number[], i: number, j: number): number {
  if (i === j) return 0;
  const total = validateWeights(w);
  return ((w[i] / total) * w[j]) / (total - w[i]);
}
export function placeProbability(w: readonly number[], i: number): number {
  return (
    winProbability(w, i) +
    w.reduce((sum, _, j) => sum + (j === i ? 0 : exactaProbability(w, j, i)), 0)
  );
}
export function quinellaProbability(w: readonly number[], i: number, j: number): number {
  return exactaProbability(w, i, j) + exactaProbability(w, j, i);
}
export function oddsFor(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability > 1)
    throw new Error('Invalid probability');
  const odds = Math.min(CONFIG.maxOdds, Math.floor((CONFIG.rtp / probability) * 100) / 100);
  // The minimum applies to the supported roster. Never raise an odds floor past RTP.
  return Math.max(
    Math.min(CONFIG.minOdds, Math.floor((CONFIG.rtp / probability) * 100) / 100),
    odds,
  );
}
