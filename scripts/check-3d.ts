import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFile, stat } from 'node:fs/promises';
import { CourseProfile, type ProfileData } from '../src/render3d/course/profile';

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const lion = await io.read('public/assets/3d/lion-blockout.glb');
const body = lion
  .getRoot()
  .listNodes()
  .find((node) => node.getName() === 'LionBody');
if (!body?.getSkin() || body.getMesh()?.listPrimitives().length !== 1)
  throw new Error('Lion body must be one skinned primitive');
const joints = body.getSkin()!.listJoints();
for (const node of lion.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  if (
    !node.getSkin() ||
    node
      .getSkin()!
      .listJoints()
      .some((joint) => !joints.includes(joint))
  )
    throw new Error(`${node.getName()}: mismatched skeleton`);
  for (const primitive of node.getMesh()!.listPrimitives()) {
    const weights = primitive.getAttribute('WEIGHTS_0'),
      indices = primitive.getAttribute('JOINTS_0');
    if (!weights || !indices || primitive.getAttribute('WEIGHTS_1'))
      throw new Error('Missing weights or more than four influences');
    const value: number[] = [];
    for (let i = 0; i < weights.getCount(); i++) {
      weights.getElement(i, value);
      if (value.some((n) => n < 0) || Math.abs(value.reduce((a, b) => a + b, 0) - 1) > 0.001)
        throw new Error(`Invalid weights at ${i}`);
    }
  }
}
const clips = lion
  .getRoot()
  .listAnimations()
  .map((animation) => animation.getName().toLowerCase());
for (const expected of ['idle', 'gallop'])
  if (!clips.some((name) => name.includes(expected))) throw new Error(`Missing ${expected} clip`);
for (const animation of lion.getRoot().listAnimations()) {
  for (const sampler of animation.listSamplers()) {
    const values = sampler.getOutput()!,
      first: number[] = [],
      last: number[] = [];
    values.getElement(0, first);
    values.getElement(values.getCount() - 1, last);
    if (first.some((value, i) => Math.abs(value - last[i]) > 0.001))
      throw new Error(`Unclosed loop: ${animation.getName()}`);
  }
}
const profile = new CourseProfile(
  JSON.parse(await readFile('public/assets/3d/course-base.profile.json', 'utf8')) as ProfileData,
);
for (let lane = 0; lane < 5; lane++)
  for (let d = 0; d <= 300; d += 0.25) {
    const sample = profile.sample(d, lane);
    if (sample.ny < 0.9 || !Number.isFinite(sample.height))
      throw new Error('Invalid base course contact profile');
  }
for (const [name, budget] of [
  ['lion-blockout.glb', 450 * 1024],
  ['course-base.glb', 1.8 * 1024 * 1024],
] as const) {
  const bytes = (await stat(`public/assets/3d/${name}`)).size;
  if (bytes > budget) throw new Error(`${name} exceeds its asset budget`);
  console.log(`${name}: ${(bytes / 1024).toFixed(1)} KiB`);
}
console.log(
  'G1 structure, normalized skin weights, loop endpoints and course profiles pass. G2 deformation, foot lock and joint velocity gates are NOT yet implemented.',
);
