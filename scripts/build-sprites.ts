// Packs frame-by-frame 2D animation (see assets-src/2d/<name>/SOURCE.md)
// into Pixi spritesheets at 1× and 2× with WebP and a PNG fallback.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { SPRITE_CLIPS } from '../src/render/rig/spriteClips';
import { ANIMALS } from '../src/engine/config';
import {
  STANDING_SPRITES,
  standingFrameFor,
  standingSheetFor,
} from '../src/render/rig/standingSprites';

const COLUMNS = 4;
for (const { name, frames: count, sourceWidth, sourceHeight, worldScale } of Object.values(
  SPRITE_CLIPS,
)) {
  const clip = 'run',
    worldWidth = sourceWidth * worldScale;
  const source = `assets-src/2d/${name}`,
    dir = `${source}/${clip}`;
  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
  if (files.length !== count)
    throw new Error(`${name}: expected ${count} frames, got ${files.length}`);
  const meta = await sharp(`${dir}/${files[0]}`).metadata();
  if (meta.width !== sourceWidth || meta.height !== sourceHeight)
    throw new Error(`${name}: source canvas does not match the sprite clip`);
  const ready = JSON.parse(await readFile(`${source}/ready.json`, 'utf8')) as {
    bounds: { left: number; top: number; width: number; height: number };
    worldHeight: number;
    noseX: number;
    groundY: number;
  };
  for (const density of [1, 2]) {
    // One texture pixel per world unit at 1×, two at 2×.
    const factor = Math.min(1, (worldWidth * density) / meta.width!),
      w = Math.round(meta.width! * factor),
      h = Math.round(meta.height! * factor),
      rows = Math.ceil((files.length + 1) / COLUMNS);
    const frames: Record<string, unknown> = {};
    const composites = await Promise.all(
      files.map(async (file, i) => {
        const left = (i % COLUMNS) * w,
          top = Math.floor(i / COLUMNS) * h;
        frames[`${name}/${clip}/${i}`] = {
          frame: { x: left, y: top, w, h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w, h },
          sourceSize: { w, h },
        };
        const input = await sharp(`${dir}/${file}`).resize(w, h, { kernel: 'lanczos3' }).toBuffer();
        return { input, left, top };
      }),
    );
    // One grounded starting pose fits into a spare cell in the existing run atlas.
    const readyHeight = Math.round(ready.worldHeight * density),
      readyWidth = Math.round((ready.bounds.width / ready.bounds.height) * readyHeight),
      readyLeft = (files.length % COLUMNS) * w,
      readyTop = Math.floor(files.length / COLUMNS) * h;
    if (readyWidth > w || readyHeight > h)
      throw new Error(`${name}: starting pose must fit inside the sprite cell`);
    frames[`${name}/ready/0`] = {
      frame: { x: readyLeft, y: readyTop, w: readyWidth, h: readyHeight },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: readyWidth, h: readyHeight },
      sourceSize: { w: readyWidth, h: readyHeight },
      anchor: {
        x: (ready.noseX - ready.bounds.left) / ready.bounds.width,
        y: (ready.groundY - ready.bounds.top) / ready.bounds.height,
      },
    };
    composites.push({
      input: await sharp(`${source}/ready/ready_00.png`)
        .extract(ready.bounds)
        .resize(readyWidth, readyHeight, { kernel: 'lanczos3' })
        .png()
        .toBuffer(),
      left: readyLeft,
      top: readyTop,
    });
    const sheet = sharp({
      create: {
        width: w * COLUMNS,
        height: h * rows,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(composites);
    const full = await sheet.png().toBuffer();
    const base = `public/assets/${name}-sprite@${density}x`;
    await writeFile(
      `${base}.webp`,
      await sharp(full)
        .webp({ quality: 82, alphaQuality: 95, effort: 6, smartSubsample: true })
        .toBuffer(),
    );
    // The PNG is only a fallback for browsers without WebP, so a palette PNG keeps the cache small.
    await writeFile(
      `${base}.png`,
      await sharp(full)
        .png({ palette: true, quality: 75, compressionLevel: 9, dither: 0.25, effort: 10 })
        .toBuffer(),
    );
    await writeFile(
      `${base}.json`,
      JSON.stringify({
        frames,
        meta: {
          image: `${name}-sprite@${density}x.webp`,
          size: { w: w * COLUMNS, h: h * rows },
          scale: String(density),
        },
      }),
    );
    console.log(`${base}: ${files.length} run frames and a grounded starting pose`);
  }
}

// Reuse the existing standing images. Each one-frame sheet also serves the DOM winner card.
for (const { id } of ANIMALS) {
  const { name } = SPRITE_CLIPS[id],
    pose = STANDING_SPRITES[id],
    source = `assets-src/2d/${name}`,
    data = JSON.parse(await readFile(`${source}/stand.json`, 'utf8')) as {
      bounds: { left: number; top: number; width: number; height: number };
    },
    bounds = data.bounds;
  for (const density of [1, 2]) {
    const h = pose.height * density,
      w = Math.round((bounds.width / bounds.height) * h),
      base = `${standingSheetFor(id)}@${density}x`,
      image = await sharp(`${source}/stand/stand_00.png`)
        .extract(bounds)
        .resize(w, h, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
    await writeFile(
      `public/assets/${base}.webp`,
      await sharp(image).webp({ quality: 88, alphaQuality: 95 }).toBuffer(),
    );
    await writeFile(
      `public/assets/${base}.png`,
      await sharp(image)
        .png({ palette: true, quality: 80, compressionLevel: 9, effort: 10 })
        .toBuffer(),
    );
    await writeFile(
      `public/assets/${base}.json`,
      JSON.stringify({
        frames: {
          [standingFrameFor(id)]: {
            frame: { x: 0, y: 0, w, h },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w, h },
            sourceSize: { w, h },
            anchor: { x: (pose.centerX - bounds.left) / bounds.width, y: 1 },
          },
        },
        meta: { image: `${base}.webp`, size: { w, h }, scale: String(density) },
      }),
    );
    console.log(`public/assets/${base}: standing pose of ${w}×${h}`);
  }
}
