import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}
const files = (await walk('dist')).filter(
  (f) =>
    !f.includes('/model-sheets/') &&
    !f.endsWith('sw.js') &&
    !f.endsWith('_headers') &&
    !f.endsWith('_redirects'),
);
const hash = createHash('sha256');
hash.update('supported-atlas-format-v1');
for (const file of files.sort()) hash.update(await readFile(file));
const cache = `jungle-${hash.digest('hex').slice(0, 12)}`;
const webpProbe = './' + files.find((file) => file.endsWith('challenge-1@1x.webp'))!.slice(5);
await writeFile(
  'dist/sw.js',
  `const CACHE=${JSON.stringify(cache)};const FILES=${JSON.stringify(['./', ...files.map((p) => './' + p.slice(5))])};
// Cache the supported atlas format at both densities, including every challenge.
// Keeping both WebP and its PNG fallback would duplicate all five run cycles.
async function supportsWebP(){try{const response=await fetch(${JSON.stringify(webpProbe)});const bitmap=await createImageBitmap(await response.blob());bitmap.close();return true;}catch{return false;}}
self.addEventListener('install',event=>{event.waitUntil(supportsWebP().then(webp=>{const excluded=webp?'.png':'.webp';const files=FILES.filter(file=>!(/@[12]x/.test(file)&&file.endsWith(excluded)));return caches.open(CACHE).then(cache=>cache.addAll(files));}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('jungle-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match(new URL('./index.html',self.registration.scope)):Response.error())));});
`,
);
console.log(`Offline cache created: ${files.length} available files, supported atlas format only.`);
