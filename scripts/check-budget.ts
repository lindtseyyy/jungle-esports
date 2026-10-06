import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}
let js = 0,
  total = 0,
  initial = 0,
  webp = 0,
  png = 0;
const initialChallenges: number[] = [];
for (const p of await walk('dist')) {
  const data = await readFile(p);
  const bytes = gzipSync(data).length;
  if (!p.includes('/model-sheets/')) {
    // The service worker caches either WebP or PNG atlases, at both densities.
    if (/@[12]x\.webp$/.test(p)) webp += bytes;
    else if (/@[12]x\.png$/.test(p)) png += bytes;
    else total += bytes;
  }
  if (p.endsWith('.js')) js += bytes;
  if (
    !p.includes('/model-sheets/') &&
    !p.includes('/assets/music/') &&
    !p.endsWith('/assets/audio.wav') &&
    !/\/(animals|environment|challenge-\d|[a-z-]+-sprite)@/.test(p)
  )
    // Count text as gzip transfer bytes and already-compressed media at full size.
    initial += /\.(js|css|html)$/.test(p) ? bytes : data.length;
  // Standing sprites preload after lock, rather than with the initial betting scene.
  if (/\/(animals|environment|[a-z]+-sprite)@2x\.(json|webp)$/.test(p)) initial += data.length;
  const challenge = p.match(/challenge-(\d)@2x\.(json|webp)$/);
  if (challenge) {
    const id = Number(challenge[1]);
    initialChallenges[id] = (initialChallenges[id] ?? 0) + data.length;
  }
}
initial += Math.max(...initialChallenges);
total += Math.max(webp, png);
console.log(
  `JavaScript: ${(js / 1024).toFixed(1)} KiB gzip / 350 KiB. Entire offline cache: ${(total / 1024).toFixed(1)} KiB gzip / 18 MiB.`,
);
console.log(
  `Initial download (2× WebP, largest challenge): ${(initial / 1024).toFixed(1)} KiB / 2.5 MiB.`,
);
if (initial > 2.5 * 1024 * 1024) throw new Error('Initial download budget exceeded');
// Crossing art and phase music stay available offline after being used once.
// Effects and music load after sound is enabled, leaving the initial limits unchanged.
if (js > 350 * 1024 || total > 18 * 1024 * 1024) throw new Error('Performance budget exceeded');
