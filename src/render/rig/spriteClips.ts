import type { AnimalId } from '../../engine/config';

/** Source-canvas measurements for the run cycles in assets-src/2d/<name>/. */
export interface SpriteClip {
  name: string;
  frames: number;
  sourceWidth: number;
  sourceHeight: number;
  /** Mean x of the nose across the cycle; the racer's position is its nose. */
  noseX: number;
  /** Lowest opaque row while a foot is planted. */
  groundY: number;
  /** Lowest opaque paw row per frame, used to bind bridge and slope contacts. */
  contactGroundY: number[];
  /** Source pixels of ground covered by one stride; estimated for generated cycles. */
  stride: number;
  /** World units per source pixel at lane scale 1. */
  worldScale: number;
}

// Shared by the renderer and atlas builder so texture sizes match the displayed animals.
export const SPRITE_CLIPS: Record<AnimalId, SpriteClip> = {
  0: {
    name: 'lion',
    contactGroundY: [570, 612, 656, 656, 656, 656, 656, 656, 656, 656, 656],
    frames: 11,
    sourceWidth: 1336,
    sourceHeight: 660,
    noseX: 64,
    groundY: 654,
    stride: 990,
    worldScale: 0.27,
  },
  // Boar artwork occupies the existing warthog lane.
  1: {
    name: 'boar',
    contactGroundY: [590, 628, 574, 641, 624, 605, 608, 619, 548, 581, 564],
    frames: 11,
    sourceWidth: 1336,
    sourceHeight: 660,
    noseX: 112,
    groundY: 640,
    stride: 1000,
    worldScale: 0.27,
  },
  2: {
    name: 'cheetah',
    contactGroundY: [548, 599, 636, 641, 634, 633, 632, 633, 587, 588, 586],
    frames: 11,
    sourceWidth: 1336,
    sourceHeight: 660,
    noseX: 150,
    groundY: 640,
    stride: 1300,
    worldScale: 0.27,
  },
  3: {
    name: 'squirrel',
    contactGroundY: [566, 603, 636, 641, 622, 610, 604, 621, 628, 627, 635],
    frames: 11,
    sourceWidth: 1336,
    sourceHeight: 660,
    noseX: 116,
    groundY: 640,
    stride: 900,
    worldScale: 0.2,
  },
  // Dog artwork occupies the existing hyena lane until the V3 roster switch.
  4: {
    name: 'dog',
    contactGroundY: [567, 569, 573, 565, 584, 579, 572, 563, 555],
    frames: 9,
    sourceWidth: 926,
    sourceHeight: 588,
    noseX: 42,
    groundY: 578,
    stride: 1300,
    worldScale: 0.27,
  },
};

export function spriteSheetFor(animal: AnimalId): string {
  return `${SPRITE_CLIPS[animal].name}-sprite`;
}

export function startingFrameFor(animal: AnimalId): string {
  return `${SPRITE_CLIPS[animal].name}/ready/0`;
}
