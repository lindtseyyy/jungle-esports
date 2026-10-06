import type { AnimalId } from '../../engine/config';
/** Visible silhouette lengths measured against the existing race characters, not their padded canvases. */
export const ACTION_WIDTHS: Record<AnimalId, number> = { 0: 300, 1: 220, 2: 270, 3: 165, 4: 210 };
export const ACTION_FRAMES = 4;
export function contactCycle(
  animal: AnimalId,
  progress: number,
  scale: number,
  animation: string,
  groundDistance = progress * 1800,
) {
  const stride =
    ACTION_WIDTHS[animal] *
    (animation === 'walk' ? 0.36 : animation === 'mud' ? 0.55 : 0.65) *
    scale;
  return groundDistance / stride;
}
