// Alpha-preserving source selection and deployment packing; no creative image editing.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { SPRITE_CLIPS } from '../src/render/rig/spriteClips';
import { ACTION_WIDTHS } from '../src/render/rig/actionClips';
import type { AnimalId } from '../src/engine/config';
import { extractCutouts } from './extract-cutouts';
const root = 'assets-src/2d/polish';
// Place each torso at the muddy surface while leaving its lifting forepaw readable.
const MUD_ANCHORS: Record<AnimalId, number> = { 0: 0.7, 1: 0.7, 2: 0.68, 3: 0.8, 4: 0.7 };
for (const [id, clip] of Object.entries(SPRITE_CLIPS)) {
  const animal = Number(id) as AnimalId,
    width = ACTION_WIDTHS[animal];
  const staticParts = await extractCutouts(`${root}/${clip.name}.png`, 3, 3),
    motionParts = await extractCutouts(`${root}/${clip.name}-motion.png`, 4, 3);
  const staticScale = width / staticParts[0].width,
    motionScale = width / motionParts[0].width;
  const records = [
    ...[2, 5].map((n) => ({
      ...staticParts[n],
      role: n === 2 ? 'jump/0' : 'clamber/0',
      scale: staticScale,
    })),
    ...motionParts.map((p, n) => ({
      ...p,
      role: `${['walk', 'mud', 'raft'][Math.floor(n / 4)]}/${n % 4}`,
      scale: motionScale,
    })),
  ].map((p) => ({
    ...p,
    worldWidth: Math.round(p.width * p.scale),
    worldHeight: Math.round(p.height * p.scale),
    anchor: {
      x: 0,
      y: p.role.startsWith('mud') ? MUD_ANCHORS[animal] : p.role.startsWith('raft') ? 0.62 : 1,
    },
  }));
  for (const density of [1, 2]) {
    const portrait = await sharp(staticParts[8].png)
      .resize(128 * density, 128 * density, { fit: 'contain', background: '#00000000' })
      .toBuffer();
    const base = `public/assets/portrait-${animal}@${density}x`;
    await writeFile(
      `${base}.webp`,
      await sharp(portrait).webp({ quality: 88, alphaQuality: 95 }).toBuffer(),
    );
    await writeFile(
      `${base}.png`,
      await sharp(portrait).png({ palette: true, quality: 90 }).toBuffer(),
    );
    const cellW = Math.max(...records.map((r) => r.worldWidth)) * density + 4,
      cellH = Math.max(...records.map((r) => r.worldHeight)) * density + 4,
      frames: Record<string, unknown> = {};
    const composite = await Promise.all(
      records.map(async (r, n) => {
        const w = r.worldWidth * density,
          h = r.worldHeight * density,
          left = (n % 4) * cellW + 2,
          top = Math.floor(n / 4) * cellH + 2;
        frames[`${clip.name}/${r.role}`] = {
          frame: { x: left, y: top, w, h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w, h },
          sourceSize: { w, h },
          anchor: r.anchor,
        };
        return { input: await sharp(r.png).resize(w, h).png().toBuffer(), left, top };
      }),
    );
    const full = await sharp({
      create: {
        width: cellW * 4,
        height: cellH * Math.ceil(records.length / 4),
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(composite)
      .png()
      .toBuffer();
    const atlas = `public/assets/${clip.name}-polish-sprite@${density}x`;
    await writeFile(
      `${atlas}.webp`,
      await sharp(full).webp({ quality: 82, alphaQuality: 95, effort: 6 }).toBuffer(),
    );
    await writeFile(
      `${atlas}.png`,
      await sharp(full).png({ palette: true, quality: 75, dither: 0.2, effort: 10 }).toBuffer(),
    );
    await writeFile(
      `${atlas}.json`,
      JSON.stringify({
        frames,
        meta: {
          image: `${clip.name}-polish-sprite@${density}x.webp`,
          size: { w: cellW * 4, h: cellH * Math.ceil(records.length / 4) },
          scale: String(density),
        },
      }),
    );
  }
  await writeFile(
    `${root}/${clip.name}-calibration.json`,
    JSON.stringify(
      {
        reference: 'run/run_04.png',
        targetWidth: width,
        staticScale,
        motionScale,
        frames: records.map(({ png: _png, ...r }) => r),
      },
      null,
      2,
    ),
  );
  console.log(`${clip.name}: 14 calibrated poses and portrait`);
}
