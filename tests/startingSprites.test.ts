import { describe, expect, it } from 'vitest';
import { SpriteRunner } from '../src/render/rig/SpriteRunner';
import { SPRITE_CLIPS, startingFrameFor } from '../src/render/rig/spriteClips';
import { Texture } from 'pixi.js';
import type { AnimalId } from '../src/engine/config';

describe('starting-line sprite poses', () => {
  for (const id of [0, 1, 2, 3, 4] as AnimalId[]) {
    it(`${SPRITE_CLIPS[id].name} waits on planted feet, runs, and resets for the next start`, () => {
      const clip = SPRITE_CLIPS[id],
        starting = new Texture({ source: Texture.WHITE.source, defaultAnchor: { x: 0.1, y: 1 } }),
        run = Array.from(
          { length: clip.frames },
          () => new Texture({ source: Texture.WHITE.source }),
        ),
        sheet = Object.fromEntries(
          run.map((texture, index) => [`${clip.name}/run/${index}`, texture]),
        );
      sheet[startingFrameFor(id)] = starting;
      const rig = new SpriteRunner(id, sheet, clip),
        sprite = rig.sprite;

      rig.animate(1, 0.1, 0, 'ready', 0);
      expect(sprite.texture).toBe(starting);
      expect(sprite.anchor.y).toBe(1);
      const feet = sprite.getLocalBounds().maxY;
      rig.animate(2, 0.1, 0, 'ready', 0);
      expect(sprite.texture).toBe(starting);
      expect(sprite.getLocalBounds().maxY).toBe(feet);

      rig.animate(2, 0, 100, 'run', 0);
      expect(sprite.texture).toBe(run[0]);
      rig.animate(2.5, 0.5, clip.stride * clip.worldScale, 'run', 0);
      expect(sprite.texture).toBe(run[Math.floor(clip.frames / 2)]);
      rig.animate(3, 0, 0, 'idle', 0);
      expect(sprite.texture).toBe(run[Math.floor(clip.frames / 2)]);

      rig.animate(4, 0, 0, 'ready', 0, true);
      expect(sprite.texture).toBe(starting);
      expect(sprite.scale.y).toBe(sprite.scale.x);
      // GO can initially have zero speed before the first movement sample.
      rig.animate(5, 0, 0, 'idle', 0);
      expect(sprite.texture).toBe(run[0]);
      rig.animate(5, 0, 100, 'run', 0);
      expect(sprite.texture).toBe(run[0]);
      rig.destroy({ children: true });
    });
  }
});
