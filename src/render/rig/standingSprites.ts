import type { AnimalId } from '../../engine/config';
import { SPRITE_CLIPS } from './spriteClips';

// Center the torso over the stump, allowing asymmetric tails to extend to the side.
// Height and medal position use world units; centerX uses pixels in the source canvas.
export const STANDING_SPRITES: Record<
  AnimalId,
  { height: number; centerX: number; medalY: number }
> = {
  0: { height: 300, centerX: 630, medalY: -174 },
  1: { height: 280, centerX: 658, medalY: -168 },
  2: { height: 300, centerX: 636, medalY: -186 },
  3: { height: 260, centerX: 566, medalY: -162 },
  4: { height: 290, centerX: 626, medalY: -182 },
};

export function standingSheetFor(animal: AnimalId): string {
  return `${SPRITE_CLIPS[animal].name}-standing-sprite`;
}

export function standingFrameFor(animal: AnimalId): string {
  return `${SPRITE_CLIPS[animal].name}/stand/0`;
}
