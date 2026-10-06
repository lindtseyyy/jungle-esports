import { CONFIG } from '../engine/config';
export const WORLD_HEIGHT = 1080;
export const START_X = 1500;
/**
 * World units drawn per engine unit. The engine's 3000-unit track is drawn 3× longer so that
 * full-size animals gallop at a natural cadence with planted feet. Race math is unaffected.
 */
export const DISTANCE_SCALE = 3;
export const FINISH_X = START_X - CONFIG.trackLength * DISTANCE_SCALE;
export const TRACK_TOP = 615;
export const TRACK_BOTTOM = 1070;
export const LANES = Array.from({ length: 5 }, (_, index) => ({
  index,
  floor: 665 + index * 90,
  scale: 0.84 + index * 0.04,
}));
export function viewportGeometry(width: number, height: number) {
  const aspect = Math.max(4 / 3, Math.min(21 / 9, width / Math.max(1, height)));
  const scale = Math.min(height / WORLD_HEIGHT, width / (WORLD_HEIGHT * aspect));
  const visibleWidth = WORLD_HEIGHT * aspect;
  return {
    scale,
    visibleWidth,
    x: (width - visibleWidth * scale) / 2,
    y: (height - WORLD_HEIGHT * scale) / 2,
  };
}
export function resolutionFor(width: number, height: number, density: number) {
  const cap = Math.min(3840 / Math.max(1, width), 2160 / Math.max(1, height));
  return Math.min(cap, Math.max(0.6, Math.min(density, 2)));
}
