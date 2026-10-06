import { spawnSync } from 'node:child_process';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const blender = process.env.BLENDER_BIN || join(homedir(), '.local/opt/blender/blender');
const scratch = await mkdtemp(join(tmpdir(), 'jungle-3d-'));
try {
  const run = spawnSync(
    blender,
    [
      '-b',
      '-t',
      '2',
      '--python-exit-code',
      '1',
      '--python',
      'assets-src/3d/blender/build.py',
      '--',
      scratch,
    ],
    { stdio: 'inherit' },
  );
  if (run.error || run.status !== 0)
    throw new Error(
      `Blender build failed. Set BLENDER_BIN to Blender 4.5 LTS or newer. ${run.error ?? ''}`,
    );
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  for (const name of ['lion-blockout', 'course-base']) {
    const document = await io.read(join(scratch, `${name}.glb`));
    await document.transform(
      dedup(),
      resample(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    await io.write(resolve(`public/assets/3d/${name}.glb`), document);
  }
  for (const file of ['lion-blockout.json', 'course-base.profile.json'])
    await copyFile(join(scratch, file), `public/assets/3d/${file}`);
  console.log('G1 assets rebuilt. Detailed modeling remains gated on style review.');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
