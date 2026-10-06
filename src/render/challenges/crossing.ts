import type { AnimalId } from '../../engine/config';
import { DISTANCE_SCALE, START_X } from '../lanes';
export const ZONE_ENTRY = START_X - 1200 * DISTANCE_SCALE;
export const ZONE_WIDTH = 600 * DISTANCE_SCALE;
export const ZONE_EXIT = ZONE_ENTRY - ZONE_WIDTH;
export const ZONE_MID = (ZONE_ENTRY + ZONE_EXIT) / 2;
export const HILL_HEIGHT = 210;
export const HILL_START = 0.32;
export const HILL_PEAK = 0.5;
export const HILL_END = 0.68;
export const VINE_COUNT = 9;
export const POOL_DEPTH = 54;
export const BOARD_START = 0.1;
export const BOARD_END = 0.88;
export type CrossingStage =
  | 'run'
  | 'approach'
  | 'climb'
  | 'peak'
  | 'tumble'
  | 'recover'
  | 'bridge'
  | 'jump-mud'
  | 'enter-mud'
  | 'paddle'
  | 'leave-mud'
  | 'jump'
  | 'swing'
  | 'transfer'
  | 'land'
  | 'board'
  | 'float'
  | 'disembark';
export interface Crossing {
  stage: CrossingStage;
  animation: 'run' | 'paddle' | 'hang' | 'tuck' | 'walk' | 'jump' | 'mud' | 'clamber' | 'raft';
  progress: number;
  offsetY: number;
  angle: number;
  floating: boolean;
  submerged: boolean;
  vine: number;
  phase: number;
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export function hillHeight(p: number) {
  if (p <= HILL_START || p >= HILL_END) return 0;
  const t = (p - HILL_START) / (HILL_END - HILL_START),
    round = 16 * t * t * (1 - t) * (1 - t);
  return HILL_HEIGHT * round;
}
/** Tangent of the rounded ground profile, in screen coordinates. */
export function hillAngle(p: number) {
  if (p <= HILL_START || p >= HILL_PEAK) return 0;
  const t = (p - HILL_START) / (HILL_END - HILL_START),
    derivative = (32 * HILL_HEIGHT * t * (1 - t) * (1 - 2 * t)) / (HILL_END - HILL_START);
  return Math.atan(derivative / ZONE_WIDTH);
}
/** Distance along the uphill surface, used to time planted walking steps. */
export function hillPathDistance(p: number) {
  const end = Math.max(0, Math.min(HILL_PEAK, p));
  if (end <= HILL_START) return p * ZONE_WIDTH;
  const slices = 32,
    span = end - HILL_START,
    dp = span / slices;
  let extra = 0;
  for (let n = 0; n < slices; n++) {
    const midpoint = HILL_START + (n + 0.5) * dp,
      gradient = Math.tan(hillAngle(midpoint));
    extra += ZONE_WIDTH * dp * (Math.hypot(1, gradient) - 1);
  }
  return p * ZONE_WIDTH + extra;
}
export function vineAnchor(index: number) {
  return ZONE_ENTRY - (0.08 + ((index + 0.5) * 0.84) / VINE_COUNT) * ZONE_WIDTH;
}
/** Legacy preview helper retained for callers that still inspect the old log crossing. */
export function floatingLogContact(progress: number) {
  return ZONE_ENTRY - clamp(Math.max(BOARD_START, Math.min(BOARD_END, progress))) * ZONE_WIDTH;
}
/** Contacts are derived from distance, so pausing and replay preserve every handoff. */
export function sampleCrossing(
  id: AnimalId,
  contactX: number,
  time: number,
  reducedMotion = false,
): Crossing {
  const p = (ZONE_ENTRY - contactX) / ZONE_WIDTH;
  const r: Crossing = {
    stage: 'run',
    animation: 'run',
    progress: p,
    offsetY: 0,
    angle: 0,
    floating: false,
    submerged: false,
    vine: -1,
    phase: 0,
  };
  if (p < 0 || p > 1) return r;
  if (id === 0) {
    r.offsetY = hillHeight(p) > 0 ? -hillHeight(p) : 0;
    if (p < HILL_START) r.stage = 'approach';
    else if (p < HILL_PEAK - 0.018) {
      r.stage = 'climb';
      r.animation = 'walk';
      r.phase = hillPathDistance(p) / ZONE_WIDTH;
      r.angle = hillAngle(p);
    } else if (p < HILL_PEAK + 0.018) {
      r.stage = 'peak';
      r.animation = 'tuck';
    } else if (p < HILL_END) {
      r.stage = 'tumble';
      r.animation = 'tuck';
      r.phase = clamp((p - HILL_PEAK - 0.018) / (HILL_END - HILL_PEAK - 0.018));
      r.angle = reducedMotion ? -hillAngle(HILL_PEAK - 0.018) : -Math.PI * 4 * r.phase;
    } else {
      r.stage = 'recover';
      r.animation = p < HILL_END + 0.035 ? 'tuck' : 'run';
    }
  } else if (id === 1) {
    const surface = POOL_DEPTH - 27;
    if (p < 0.08) {
      const t = p / 0.08;
      r.stage = 'jump-mud';
      r.animation = 'jump';
      r.offsetY = (POOL_DEPTH + 32) * smooth(t) - Math.sin(t * Math.PI) * 88;
      r.angle = -0.1 * smooth((t - 0.5) * 2);
    } else if (p < 0.86) {
      r.stage = p < 0.14 ? 'enter-mud' : 'paddle';
      r.animation = 'mud';
      r.submerged = true;
      r.phase = time * 0.72;
      const effort = Math.sin((r.phase % 1) * Math.PI * 2);
      // Mud textures are anchored at mid-body so about half the animal is occluded.
      r.offsetY =
        surface -
        12 * (1 - smooth((p - 0.08) / 0.06)) +
        (reducedMotion ? 0 : Math.max(0, effort) * 3);
      r.angle = reducedMotion ? 0 : effort * 0.018;
    } else {
      const t = (p - 0.86) / 0.14;
      r.stage = 'leave-mud';
      r.animation = t < 0.94 ? 'clamber' : 'walk';
      r.phase = time * 0.75;
      r.offsetY = surface * (1 - smooth(t));
      r.submerged = t < 0.62;
    }
  } else if (id === 2) {
    r.stage = 'bridge';
    r.animation = 'walk';
    r.phase = time * 0.85;
    r.angle = reducedMotion ? 0 : Math.sin(time * 2.1) * 0.012;
  } else if (id === 4) {
    const bob = reducedMotion ? 0 : Math.sin(time * 2.4) * 3;
    const level = POOL_DEPTH - 25 + bob;
    if (p < BOARD_START) {
      const t = p / BOARD_START;
      r.stage = 'board';
      r.animation = 'jump';
      r.offsetY = level * smooth(t) - Math.sin(t * Math.PI) * 78;
    } else if (p < BOARD_END) {
      r.stage = 'float';
      r.animation = 'raft';
      r.floating = true;
      r.phase = time * 1.05;
      r.offsetY = level;
      r.angle = reducedMotion ? 0 : Math.sin(time * 2.4) * 0.012;
    } else {
      const t = (p - BOARD_END) / (1 - BOARD_END);
      r.stage = 'disembark';
      r.animation = t < 0.82 ? 'jump' : 'walk';
      r.phase = time;
      r.offsetY = level * (1 - smooth(t)) - Math.sin(t * Math.PI) * 58;
    }
  } else {
    if (p < 0.08) {
      const t = p / 0.08;
      r.stage = 'jump';
      r.animation = t < 0.72 ? 'jump' : 'hang';
      r.phase = t;
      r.offsetY = -85 * smooth(t) - Math.sin(t * Math.PI) * 25;
    } else if (p <= 0.92) {
      const crossing = ((p - 0.08) / 0.84) * VINE_COUNT;
      r.vine = Math.min(VINE_COUNT - 1, Math.floor(crossing));
      r.phase = crossing - r.vine;
      r.stage = r.phase > 0.82 && r.vine < VINE_COUNT - 1 ? 'transfer' : 'swing';
      r.animation = 'hang';
      r.offsetY = -85 + Math.sin(r.phase * Math.PI) * 22;
    } else {
      const t = (p - 0.92) / 0.08;
      r.stage = 'land';
      r.animation = t < 0.7 ? 'jump' : 'walk';
      r.phase = time;
      r.offsetY = -85 * (1 - smooth(t));
    }
  }
  return r;
}
