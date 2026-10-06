import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { SPECIES } from '../src/render/species';
import { ANIMALS, type AnimalId } from '../src/engine/config';
import { GAITS, footTarget, legAngles, strideKey } from '../src/render/rig/gaits';
const output = 'public/model-sheets';
await mkdir(output, { recursive: true });
const wrap = (content: string, w = 320, h = 200) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
const masks: Uint8Array[] = [];
for (let id = 0; id < 5; id++) {
  const a = SPECIES[id],
    parts: Record<string, string> = {};
  for (const part of ['body', 'head', 'ear', 'tail', 'upperleg', 'lowerleg', 'paw', 'bib']) {
    const source = await readFile(`assets-src/animals/${id}/${part}.svg`, 'utf8');
    parts[part] = source
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace(/id="([^"]+)"/g, `id="${part}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${part}-$1)`);
  }
  const pose = (cycle: number) => {
    const g = GAITS[id as AnimalId],
      key = strideKey(cycle),
      bob = -Math.abs(key[1]) * g.suspension;
    const legs = Array.from({ length: 4 }, (_, i) => {
      const origin = i < 2 ? a.shoulder : a.hip,
        p = (cycle + g.phases[i]) % 1,
        target = footTarget(id as AnimalId, p);
      const { x, lift } = target;
      const r = legAngles(x, -origin[1] - a.paw - lift - bob, a.upper, a.lower),
        deg = (v: number) => (v * 180) / Math.PI;
      return `<g transform="translate(${origin[0]} ${origin[1] + bob}) rotate(${deg(r.hip)})"><g transform="translate(-16 -3)">${parts.upperleg}</g><g transform="translate(0 ${a.upper}) rotate(${deg(r.knee)})"><g transform="translate(-16 -3)">${parts.lowerleg}</g><g transform="translate(0 ${a.lower}) rotate(${deg(-r.hip - r.knee)}) translate(-16 -3)">${parts.paw}</g></g></g>`;
    });
    const tailScale = id === 3 ? 0.85 : id === 1 ? 0.65 : id === 4 ? 0.55 : 0.7,
      tailY = id === 1 ? -112 : id === 3 ? -100 : -92;
    const neck = `<g transform="translate(${a.head[0] + 22} ${a.head[1] + 15}) rotate(${(-0.7 * 180) / Math.PI}) scale(1.4 1.1) translate(-16 ${-(a.upper + 8) / 2})">${parts.upperleg}</g>`;
    const flex = key[2] * g.flex,
      bodyWarp = Array.from({ length: 3 }, (_, col) => {
        const x0 = (col * a.length) / 3,
          x1 = ((col + 1) * a.length) / 3;
        const shift0 = col === 1 ? flex : col === 2 ? -flex : 0,
          shift1 = col + 1 === 1 ? flex : col + 1 === 2 ? -flex : 0;
        const y0 = col === 1 || col === 2 ? -flex * 0.45 : 0,
          y1 = col + 1 === 1 || col + 1 === 2 ? -flex * 0.45 : 0;
        const sx = (x1 + shift1 - x0 - shift0) / (x1 - x0),
          slope = (y1 - y0) / (x1 - x0);
        return `<defs><clipPath id="slice-${col}"><rect x="${x0}" y="-10" width="${a.length / 3 + 0.2}" height="100"/></clipPath></defs><g transform="matrix(${sx} ${slope} 0 1 ${x0 + shift0 - sx * x0} ${y0 - slope * x0})"><g clip-path="url(#slice-${col})">${parts.body}</g></g>`;
      }).join('');
    const head = `<g transform="translate(${a.head[0]} ${a.head[1] + bob * 0.6}) scale(${a.headScale}) translate(-52 -50)">${parts.head}</g>`;
    const ears = `<g transform="translate(${a.head[0]} ${a.head[1] + bob * 0.6})"><g transform="translate(${15 * a.headScale} ${-28 * a.headScale}) scale(${a.headScale * (id === 4 ? 0.78 : 0.54)}) translate(-15 -30)">${parts.ear}</g></g>`;
    return `<g transform="translate(151 178)"><g transform="translate(${a.length * 0.32} ${tailY}) scale(${tailScale})">${parts.tail}</g>${legs[0]}${legs[2]}<g transform="translate(${-a.length / 2} ${a.shoulder[1] - 30 + bob})">${bodyWarp}</g>${legs[1]}${legs[3]}${neck}${head}${ears}<g transform="translate(-16 ${a.shoulder[1] - 18 + bob}) scale(.65)">${parts.bib}</g></g>`;
  };
  const side = pose(0),
    png = new Resvg(wrap(side)).render().asPng();
  await writeFile(`${output}/${a.name}-side.png`, png);
  const rgba = await sharp(png).ensureAlpha().raw().toBuffer();
  const mask = new Uint8Array(320 * 200);
  const black = Buffer.alloc(320 * 200 * 4);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = rgba[i * 4 + 3] > 96 ? 1 : 0;
    black[i * 4 + 3] = mask[i] * 255;
  }
  masks.push(mask);
  const silhouette = await sharp(black, { raw: { width: 320, height: 200, channels: 4 } })
    .png()
    .toBuffer();
  await writeFile(`${output}/${a.name}-silhouette.png`, silhouette);
  let cells = `<text x="20" y="29" font-size="23" fill="#D5DABD" font-family="sans-serif">${ANIMALS[id].name} · ${a.name.toUpperCase()}</text><g transform="translate(0 35)">${side}</g><image x="320" y="35" width="320" height="200" href="data:image/png;base64,${silhouette.toString('base64')}"/>`;
  for (let n = 0; n < 8; n++)
    cells += `<g transform="translate(${(n % 4) * 320} ${Math.floor(n / 4) * 200 + 245})">${pose(n / 8)}</g>`;
  const svg = wrap(`<rect width="1280" height="650" fill="#7F8A76"/>${cells}`, 1280, 650);
  await writeFile(`${output}/${a.name}.svg`, svg);
  await writeFile(`${output}/${a.name}.png`, new Resvg(svg).render().asPng());
}
const overlaps: Record<string, number> = {};
for (let i = 0; i < 5; i++)
  for (let j = i + 1; j < 5; j++) {
    let intersection = 0,
      union = 0;
    for (let n = 0; n < masks[i].length; n++) {
      intersection += masks[i][n] & masks[j][n];
      union += masks[i][n] | masks[j][n];
    }
    const overlap = intersection / union;
    overlaps[`${SPECIES[i].name}/${SPECIES[j].name}`] = overlap;
    if (overlap >= 0.75)
      throw new Error(
        `Silhouettes too similar: ${SPECIES[i].name}/${SPECIES[j].name} ${(overlap * 100).toFixed(1)}%`,
      );
  }
await writeFile(`${output}/silhouettes.json`, JSON.stringify(overlaps, null, 2));
console.log('All ten silhouette pairs below 75% IoU:', overlaps);
