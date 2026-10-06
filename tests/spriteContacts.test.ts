import { it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { SPRITE_CLIPS } from '../src/render/rig/spriteClips';

it('bridge paw anchors match the lowest visible pixel in every actual running frame', async () => {
  for (const clip of Object.values(SPRITE_CLIPS)) {
    const dir = `assets-src/2d/${clip.name}/run`;
    const files = (await readdir(dir)).filter((file) => file.endsWith('.png')).sort();
    expect(clip.contactGroundY).toHaveLength(files.length);
    for (const [frame, file] of files.entries()) {
      const { data, info } = await sharp(`${dir}/${file}`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let lowest = -1;
      for (let y = info.height - 1; y >= 0 && lowest < 0; y--)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] > 30) {
            lowest = y;
            break;
          }
      expect(clip.contactGroundY[frame], `${clip.name} frame ${frame}`).toBe(lowest + 1);
    }
  }
});

it('encoded run sheets retain the planted paw within 1.5 world pixels at both densities and formats', async () => {
  for (const clip of Object.values(SPRITE_CLIPS))
    for (const density of [1, 2]) {
      const base = `public/assets/${clip.name}-sprite@${density}x`;
      const atlas = JSON.parse(await readFile(`${base}.json`, 'utf8'));
      for (const format of ['webp', 'png']) {
        const { data, info } = await sharp(`${base}.${format}`)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        for (let n = 0; n < clip.frames; n++) {
          const f = atlas.frames[`${clip.name}/run/${n}`].frame;
          let lowest = -1;
          for (let y = f.h - 1; y >= 0 && lowest < 0; y--)
            for (let x = 0; x < f.w; x++)
              if (data[((f.y + y) * info.width + f.x + x) * 4 + 3] > 100) {
                lowest = y;
                break;
              }
          const gap = ((clip.contactGroundY[n] / clip.sourceHeight) * f.h - (lowest + 1)) / density;
          expect(
            Math.abs(gap),
            `${clip.name} frame ${n}, ${density}× ${format}`,
          ).toBeLessThanOrEqual(1.5);
        }
      }
    }
});
