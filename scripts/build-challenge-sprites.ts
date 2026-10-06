// Extract six disconnected poses from each generated transparent source sheet.
// This only selects source pixels, crops transparent margins and packs deployment textures.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { SPRITE_CLIPS } from '../src/render/rig/spriteClips';
const widths = { lion: 330, boar: 250, cheetah: 310, squirrel: 190, dog: 250 };
const hangHeights = { lion: 150, boar: 115, cheetah: 140, squirrel: 110, dog: 135 };
const tuckHeights = { lion: 100, boar: 80, cheetah: 90, squirrel: 80, dog: 95 };
for (const { name } of Object.values(SPRITE_CLIPS)) {
  const source = `assets-src/2d/challenge-poses/${name}.png`;
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const owner = new Int32Array(info.width * info.height),
    parts: {
      id: number;
      left: number;
      top: number;
      width: number;
      height: number;
      count: number;
    }[] = [];
  let id = 0;
  for (let start = 0; start < owner.length; start++) {
    if (owner[start] || data[start * 4 + 3] < 30) continue;
    id++;
    const todo = [start];
    owner[start] = id;
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0,
      count = 0;
    while (todo.length) {
      const i = todo.pop()!,
        x = i % info.width,
        y = Math.floor(i / info.width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count++;
      for (const j of [i - 1, i + 1, i - info.width, i + info.width]) {
        if (
          j < 0 ||
          j >= owner.length ||
          owner[j] ||
          data[j * 4 + 3] < 30 ||
          Math.abs((j % info.width) - x) > 1
        )
          continue;
        owner[j] = id;
        todo.push(j);
      }
    }
    if (count > 1000)
      parts.push({ id, left, top, width: right - left + 1, height: bottom - top + 1, count });
  }
  if (parts.length !== 6)
    throw new Error(`${name}: expected 6 separate opaque animals, found ${parts.length}`);
  parts.sort((a, b) => a.left - b.left);
  const selected = [0, 1, 2].flatMap((column) =>
    parts
      .slice(column * 2, column * 2 + 2)
      .sort((a, b) => a.top - b.top)
      .map((part, frame) => ({ ...part, kind: ['paddle', 'hang', 'tuck'][column], frame })),
  );
  const records = [];
  for (const part of selected) {
    const rgba = Buffer.alloc(part.width * part.height * 4);
    // Preserve alpha edges within two pixels of the chosen connected silhouette.
    for (let y = 0; y < part.height; y++)
      for (let x = 0; x < part.width; x++) {
        const i = (part.top + y) * info.width + part.left + x;
        let belongs = owner[i] === part.id;
        if (!owner[i] && data[i * 4 + 3] > 0) {
          for (let dy = -2; dy <= 2 && !belongs; dy++)
            for (let dx = -2; dx <= 2; dx++) {
              const near = i + dy * info.width + dx;
              if (near >= 0 && near < owner.length && owner[near] === part.id) {
                belongs = true;
                break;
              }
            }
        }
        if (belongs) data.copy(rgba, (y * part.width + x) * 4, i * 4, i * 4 + 4);
      }
    const worldHeight =
      part.kind === 'paddle'
        ? Math.round((part.height / part.width) * widths[name as keyof typeof widths])
        : part.kind === 'hang'
          ? hangHeights[name as keyof typeof hangHeights]
          : tuckHeights[name as keyof typeof tuckHeights];
    const worldWidth = Math.round((part.width / part.height) * worldHeight);
    let gripX = 0,
      gripCount = 0;
    if (part.kind === 'hang') {
      for (let y = 0; y < part.height * 0.08; y++)
        for (let x = 0; x < part.width; x++)
          if (rgba[(y * part.width + x) * 4 + 3] > 30) {
            gripX += x;
            gripCount++;
          }
    }
    records.push({
      ...part,
      worldHeight,
      worldWidth,
      anchor:
        part.kind === 'hang'
          ? { x: gripX / Math.max(1, gripCount) / part.width, y: 0.035 }
          : part.kind === 'tuck'
            ? { x: 0.5, y: 0.5 }
            : { x: 0, y: 1 },
      rgba,
    });
  }
  await writeFile(
    `assets-src/2d/challenge-poses/${name}.json`,
    JSON.stringify(
      records.map(({ rgba: _rgba, ...record }) => record),
      null,
      2,
    ),
  );
  const packed = records.filter((r) => r.kind !== 'paddle');
  for (const density of [1, 2]) {
    const cellW = Math.max(...packed.map((r) => r.worldWidth)) * density + 4;
    const cellH = Math.max(...packed.map((r) => r.worldHeight)) * density + 4;
    const frames: Record<string, unknown> = {};
    const composites = await Promise.all(
      packed.map(async (r, n) => {
        const w = r.worldWidth * density,
          h = r.worldHeight * density,
          left = (n % 3) * cellW + 2,
          top = Math.floor(n / 3) * cellH + 2;
        frames[`${name}/${r.kind}/${r.frame}`] = {
          frame: { x: left, y: top, w, h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w, h },
          sourceSize: { w, h },
          anchor: r.anchor,
        };
        return {
          input: await sharp(r.rgba, { raw: { width: r.width, height: r.height, channels: 4 } })
            .resize(w, h)
            .png()
            .toBuffer(),
          left,
          top,
        };
      }),
    );
    const full = await sharp({
      create: {
        width: cellW * 3,
        height: cellH * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
    const base = `public/assets/${name}-crossing-sprite@${density}x`;
    await writeFile(
      `${base}.webp`,
      await sharp(full).webp({ quality: 82, alphaQuality: 95, effort: 6 }).toBuffer(),
    );
    await writeFile(
      `${base}.png`,
      await sharp(full)
        .png({ palette: true, quality: 75, compressionLevel: 9, effort: 10, dither: 0.2 })
        .toBuffer(),
    );
    await writeFile(
      `${base}.json`,
      JSON.stringify({
        frames,
        meta: {
          image: `${name}-crossing-sprite@${density}x.webp`,
          size: { w: cellW * 3, h: cellH * 2 },
          scale: String(density),
        },
      }),
    );
    console.log(`${base}: four hang/tuck poses`);
  }
  // Validate that the source itself contains actual transparency, rather than a painted backdrop.
  const alpha = await sharp(source).stats();
  if (alpha.channels[3].min !== 0) throw new Error(`${name}: source is not transparent`);
  await readFile(source);
}
