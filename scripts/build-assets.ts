import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { packAsync, type TexturePackerOptions } from 'free-tex-packer-core';
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.svg')) out.push(p);
  }
  return out.sort();
}
await mkdir('public/assets', { recursive: true });
const sources = await walk('assets-src');
for (const group of [
  'animals',
  'environment',
  ...Array.from({ length: 5 }, (_, i) => `challenge-${i}`),
])
  for (const scale of [1, 2]) {
    const selected = sources.filter((p) =>
      group === 'animals'
        ? p.includes('/animals/')
        : group === 'environment'
          ? !p.includes('/animals/') &&
            !p.includes('/challenges/') &&
            !/\/env\/(mud|rock|grass|log|cave)\.svg$/.test(p)
          : p.includes(`/challenges/${group.slice(-1)}/`),
    );
    const images = await Promise.all(
      selected.map(async (p) => ({
        path: p.replace('assets-src/', '').replace('.svg', '.png'),
        contents: new Resvg(await readFile(p), { fitTo: { mode: 'zoom', value: scale } })
          .render()
          .asPng(),
      })),
    );
    const name = `${group}@${scale}x`;
    const files = await packAsync(images, {
      textureName: name,
      width: 4096,
      height: 4096,
      padding: 2,
      extrude: 1,
      allowRotation: false,
      allowTrim: false,
      detectIdentical: false,
      exporter: 'Pixi' as TexturePackerOptions['exporter'],
      removeFileExtension: true,
      prependFolderName: true,
      textureFormat: 'png' as TexturePackerOptions['textureFormat'],
    });
    for (const file of files) {
      if (file.name.endsWith('.png')) {
        await writeFile(
          `public/assets/${file.name}`,
          await sharp(file.buffer).png({ palette: true, quality: 90 }).toBuffer(),
        );
        await writeFile(
          `public/assets/${file.name.replace('.png', '.webp')}`,
          await sharp(file.buffer).webp({ quality: 90, alphaQuality: 100 }).toBuffer(),
        );
      } else {
        const data = JSON.parse(file.buffer.toString());
        data.meta.scale = String(scale);
        await writeFile(`public/assets/${file.name}`, JSON.stringify(data));
      }
    }
  }
for (let i = 0; i < 5; i++)
  await copyFile(`assets-src/animals/${i}/head.svg`, `public/assets/portrait-${i}.svg`);
await mkdir('public/assets/music', { recursive: true });
for (const track of ['Betting', 'Racing', 'Winners'])
  await copyFile(`assets-src/musics/${track}.mp3`, `public/assets/music/${track}.mp3`);
await copyFile('assets-src/ui/coin.svg', 'public/assets/coin.svg');
for (const f of ['tired', 'normal', 'hyped'])
  await copyFile(`assets-src/ui/${f}.svg`, `public/assets/${f}.svg`);
const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#17251A"/><path d="M35 145Q16 62 152 28 182 120 35 145Z" fill="#BDDF78"/><path d="M40 140 145 40" stroke="#375F37" stroke-width="12"/><path d="M87 92 78 55 M106 74l39 7" stroke="#375F37" stroke-width="8"/></svg>';
await writeFile('public/icon.svg', icon);
for (const size of [192, 512])
  await writeFile(
    `public/icon-${size}.png`,
    new Resvg(icon, { fitTo: { mode: 'width', value: size } }).render().asPng(),
  );
// Original synthesized percussion, effects and fanfare, encoded into a single audio sprite.
const rate = 16000,
  segments: Record<string, [number, number, boolean?]> = {},
  samples: number[] = [];
function tone(name: string, duration: number, fn: (t: number) => number, loop = false) {
  const start = samples.length / rate;
  for (let i = 0; i < Math.floor(duration * rate); i++)
    samples.push(Math.max(-1, Math.min(1, fn(i / rate))));
  segments[name] = [Math.round(start * 1000), Math.round(duration * 1000), loop];
  for (let i = 0; i < rate * 0.03; i++) samples.push(0);
}
const noise = (t: number) => Math.sin(t * 123456.7) * Math.sin(t * 78621.3);
tone(
  'drums',
  6.4,
  (t) => {
    const b = t % 0.4,
      beat = Math.floor(t / 0.4);
    return (
      0.24 * Math.sin(2 * Math.PI * (70 * b - 45 * b * b)) * Math.exp(-b * 24) +
      0.06 * noise(t) * Math.exp(-b * 42) * (beat % 2) +
      0.035 * Math.sin(2 * Math.PI * [196, 220, 261.6, 293.7][Math.floor(t / 1.6)] * t)
    );
  },
  true,
);
tone(
  'paws',
  0.12,
  (t) =>
    0.16 * noise(t) * Math.exp(-t * 45) + 0.12 * Math.sin(t * 2 * Math.PI * 90) * Math.exp(-t * 35),
);
tone('beep', 0.18, (t) => 0.23 * Math.sin(t * 2 * Math.PI * 660) * Math.exp(-t * 18));
tone('go', 0.4, (t) => 0.2 * Math.sin(t * 2 * Math.PI * 990) * Math.exp(-t * 7));
tone('chip', 0.16, (t) => 0.18 * Math.sin(t * 2 * Math.PI * 1400) * Math.exp(-t * 28));
tone('mud', 0.35, (t) => 0.4 * noise(t) * Math.exp(-t * 9) * Math.sin(t * 2 * Math.PI * 60));
tone(
  'rock',
  0.4,
  (t) =>
    0.32 * noise(t) * Math.exp(-t * 12) + 0.3 * Math.sin(t * 2 * Math.PI * 55) * Math.exp(-t * 15),
);
tone('whoosh', 0.4, (t) => 0.3 * noise(t) * Math.sin((t / 0.4) * Math.PI));
tone(
  'cave',
  0.8,
  (t) =>
    0.13 * Math.sin(t * 2 * Math.PI * 180) * Math.exp(-t * 4) +
    0.1 * Math.sin(t * 2 * Math.PI * 270) * Math.exp(-t * 3),
);
tone(
  'cheer',
  1.2,
  (t) =>
    0.16 * noise(t) * Math.sin((t / 1.2) * Math.PI) +
    0.06 * Math.sin(t * 2 * Math.PI * (420 + Math.sin(t * 17) * 30)),
);
tone(
  'coin',
  0.3,
  (t) =>
    0.14 *
    (Math.sin(t * 2 * Math.PI * 1046) + Math.sin(t * 2 * Math.PI * 1568)) *
    Math.exp(-t * 15),
);
tone(
  'fanfare',
  1.6,
  (t) =>
    0.17 *
    Math.sin(t * 2 * Math.PI * [523.25, 659.25, 783.99, 1046.5][Math.min(3, Math.floor(t / 0.4))]) *
    Math.exp(-(t % 0.4) * 4),
);
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples.length * 2, 40);
samples.forEach((s, i) => wav.writeInt16LE(Math.round(s * 32767), 44 + i * 2));
await writeFile('public/assets/audio.wav', wav);
await writeFile('public/assets/audio.json', JSON.stringify(segments));
console.log(
  `Built ${sources.length} original SVG sources, 1×/2× WebP + PNG atlases, and audio sprite.`,
);
