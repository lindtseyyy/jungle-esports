import {
  AnimationMixer,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  SkeletonHelper,
  SkinnedMesh,
  Vector3,
  type AnimationAction,
  type Object3D,
} from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { loadGLB } from '../assets';
import { toonMaterial } from '../materials/toon';
import { CourseProfile, laneZ, worldX, type GroundSample } from '../course/profile';

/** G1 single lion blockout. The other four are deliberately not fabricated before G2. */
export class Animal extends Group {
  private ground: GroundSample = { height: 0, nx: 0, ny: 1, nz: 0, surface: 'grass' };
  readonly trails = new Group();
  private actions: AnimationAction[] = [];
  private nosePosition = new Vector3();
  readonly mixer: AnimationMixer;
  readonly bones: SkeletonHelper;
  private nose: Object3D;
  static async load() {
    const asset = await loadGLB('lion-blockout');
    const model = clone(asset.scene);
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry = node.geometry.clone();
      const convert = (mat: MeshStandardMaterial) =>
        toonMaterial({ color: mat.color, roughness: mat.roughness });
      node.material = Array.isArray(node.material)
        ? node.material.map(convert)
        : convert(node.material);
      node.castShadow = node.receiveShadow = true;
    });
    const animal = new Animal(model);
    for (const clip of asset.animations) {
      const action = animal.mixer.clipAction(clip);
      animal.actions.push(action);
      action.play();
      action.enabled = clip.name.toLowerCase().includes('gallop');
    }
    // Sample the actual FK feet over a full loop for the development motion-trail overlay.
    const positions = new Float32Array(61 * 3),
      point = new Vector3();
    for (const name of ['fore_L_paw', 'fore_R_paw', 'hind_L_paw', 'hind_R_paw']) {
      const foot = model.getObjectByName(name);
      if (!foot) continue;
      for (let i = 0; i <= 60; i++) {
        animal.mixer.setTime(i / 60);
        model.updateMatrixWorld(true);
        foot.getWorldPosition(point);
        point.toArray(positions, i * 3);
      }
      const geometry = new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(positions.slice(), 3),
      );
      animal.trails.add(
        new Line(geometry, new LineBasicMaterial({ color: '#D8F5AD', depthTest: false })),
      );
    }
    animal.trails.visible = false;
    animal.add(animal.trails);
    animal.mixer.setTime(0);
    return animal;
  }
  constructor(readonly model: Object3D) {
    super();
    this.add(model);
    this.mixer = new AnimationMixer(model);
    this.nose = model.getObjectByName('nose') ?? model;
    this.bones = new SkeletonHelper(model);
    this.bones.visible = false;
  }
  pose(enginePosition: number, time: number, lane: number, profile: CourseProfile, running = true) {
    const phase = running ? (enginePosition * 0.1) / 6.5 : time / 4;
    // Absolute mixer time makes seeking and replay independent of render frame rate.
    for (const action of this.actions)
      action.enabled = action
        .getClip()
        .name.toLowerCase()
        .includes(running ? 'gallop' : 'idle');
    this.mixer.setTime(phase);
    const ground = profile.sample(enginePosition * 0.1, lane, this.ground);
    this.rotation.set(0, 0, Math.atan2(ground.nx, ground.ny));
    this.position.set(worldX(enginePosition), ground.height, laneZ(lane));
    this.updateMatrixWorld(true);
    this.nose.getWorldPosition(this.nosePosition);
    // Animated nose, rather than root or nominal offset, is the engine's finish anchor.
    this.position.x += worldX(enginePosition) - this.nosePosition.x;
    this.updateMatrixWorld(true);
  }
  wireframe(value: boolean) {
    this.model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        material.wireframe = value;
    });
  }
  dispose() {
    this.model.traverse((node) => {
      if (node instanceof SkinnedMesh) node.skeleton.dispose();
    });
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.bones.dispose();
    this.trails.traverse((node) => {
      if (node instanceof Line) {
        node.geometry.dispose();
        (node.material as LineBasicMaterial).dispose();
      }
    });
  }
}
