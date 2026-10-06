import { SPECIES } from '../species';
import type { AnimalId } from '../../engine/config';
// Eight normalized stride keys: extension, first suspension, fore contact,
// support, collection, second suspension, hind contact, propulsion.
// Timing is adapted from public-domain locomotion sequences; see assets-src/REFERENCES.md.
export const STRIDE_KEYS = [
  [0.85, 0.1, -0.5],
  [0.45, 0.8, -0.85],
  [-0.15, 0.45, -0.65],
  [-0.65, 0, -0.2],
  [-0.85, 0.2, 0.5],
  [-0.35, 0.9, 0.85],
  [0.25, 0.5, 0.65],
  [0.7, 0, 0.15],
] as const;
export const GAITS: Record<
  AnimalId,
  { phases: number[]; suspension: number; flex: number; contact: number }
> = {
  0: { phases: [0, 0.12, 0.5, 0.62], suspension: 4, flex: 3, contact: 0.36 },
  1: { phases: [0, 0.5, 0.5, 0], suspension: 2, flex: 1, contact: 0.26 },
  2: { phases: [0, 0.11, 0.5, 0.61], suspension: 7, flex: 13, contact: 0.26 },
  3: { phases: [0, 0.08, 0.45, 0.53], suspension: 8, flex: 5, contact: 0.3 },
  4: { phases: [0, 0.5, 0.62, 0.12], suspension: 3, flex: 4, contact: 0.24 },
};
export function strideKey(cycle: number) {
  const t = (((cycle % 1) + 1) % 1) * 8,
    i = Math.floor(t),
    u = t - i;
  const blend = u * u * (3 - 2 * u);
  return STRIDE_KEYS[i].map((v, k) => v + (STRIDE_KEYS[(i + 1) % 8][k] - v) * blend);
}
export function footTarget(animal: AnimalId, cycle: number) {
  const a = SPECIES[animal],
    contact = GAITS[animal].contact,
    p = ((cycle % 1) + 1) % 1,
    stance = p < contact;
  const x = stance
    ? (p - contact / 2) * a.strideLength
    : (contact / 2 - ((p - contact) / (1 - contact)) * contact) * a.strideLength;
  const lift = stance
    ? 0
    : Math.sin(((p - contact) / (1 - contact)) * Math.PI) * (a.height * 23 + 8);
  return { x, lift, stance };
}
export function legAngles(x: number, y: number, upper: number, lower: number) {
  const d = Math.min(
    upper + lower - 0.1,
    Math.max(Math.abs(upper - lower) + 0.1, Math.hypot(x, y)),
  );
  const knee =
    Math.PI -
    Math.acos(
      Math.max(-1, Math.min(1, (upper * upper + lower * lower - d * d) / (2 * upper * lower))),
    );
  const hip =
    Math.atan2(-x, y) -
    Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - lower * lower) / (2 * upper * d))));
  return { hip, knee };
}
