import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { loadGLB } from '../assets';
import { toonMaterial } from '../materials/toon';
import { CourseProfile, type ProfileData } from './profile';
import { seededRandom } from '../../engine/rng';

export class Course extends Group {
  static async load() {
    const [asset, response] = await Promise.all([
      loadGLB('course-base'),
      fetch(`${import.meta.env.BASE_URL}assets/3d/course-base.profile.json`),
    ]);
    if (!response.ok) throw new Error('3D course profile unavailable');
    const course = new Course(new CourseProfile((await response.json()) as ProfileData));
    const model = asset.scene.clone(true);
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry = node.geometry.clone();
      const convert = (mat: MeshStandardMaterial) => toonMaterial({ color: mat.color });
      node.material = Array.isArray(node.material)
        ? node.material.map(convert)
        : convert(node.material);
      node.receiveShadow = true;
    });
    course.add(model);
    course.addJungle();
    course.addMarkers();
    return course;
  }
  constructor(readonly profile: CourseProfile) {
    super();
  }
  private addJungle() {
    const random = seededRandom(3101),
      count = 200;
    const trunks = new InstancedMesh(
      new CylinderGeometry(0.16, 0.32, 1, 7),
      toonMaterial({ color: '#63563D' }),
      count,
    );
    const crowns = new InstancedMesh(
      new SphereGeometry(1, 9, 6),
      toonMaterial({ color: '#386C46', flatShading: true }),
      count,
    );
    const matrix = new Matrix4(),
      pos = new Vector3(),
      scale = new Vector3(),
      rotation = new Quaternion();
    for (let i = 0; i < count; i++) {
      const d = -8 + random() * 320,
        z = -9 - random() * 36,
        height = 5 + random() * 10;
      pos.set(-d, height / 2, z);
      scale.set(1.5, height, 1.5);
      matrix.compose(pos, rotation, scale);
      trunks.setMatrixAt(i, matrix);
      pos.y = height;
      scale.set(2 + random() * 2, 2 + random() * 2.5, 2 + random() * 2);
      matrix.compose(pos, rotation, scale);
      crowns.setMatrixAt(i, matrix);
    }
    trunks.receiveShadow = crowns.receiveShadow = true;
    this.add(trunks, crowns);
    const rocks = new InstancedMesh(
      new SphereGeometry(1, 7, 5),
      toonMaterial({ color: '#8C8A80', flatShading: true }),
      120,
    );
    for (let i = 0; i < 120; i++) {
      const d = random() * 300,
        z = (random() > 0.5 ? 1 : -1) * (5 + random() * 3);
      pos.set(-d, this.profile.sample(d, 2).height + 0.12, z);
      scale.set(0.12 + random() * 0.5, 0.15 + random() * 0.25, 0.14 + random() * 0.4);
      matrix.compose(pos, rotation, scale);
      rocks.setMatrixAt(i, matrix);
    }
    rocks.receiveShadow = true;
    this.add(rocks);
  }
  private addMarkers() {
    const white = toonMaterial({ color: '#EFE9D4' }),
      dark = toonMaterial({ color: '#243C2C' });
    for (const d of [0, 300]) {
      const line = new Mesh(new BoxGeometry(0.1, 0.012, 9.5), white);
      line.position.set(-d, 0.018, 0);
      this.add(line);
      for (const z of [-5.2, 5.2]) {
        const pole = new Mesh(
          new CylinderGeometry(0.09, 0.13, 2.6, 8),
          toonMaterial({ color: '#AA9258' }),
        );
        pole.position.set(-d, 1.3, z);
        pole.castShadow = true;
        this.add(pole);
      }
      if (d === 300)
        for (let i = 0; i < 20; i++)
          for (let j = 0; j < 2; j++) {
            const square = new Mesh(new BoxGeometry(0.25, 0.015, 0.48), (i + j) % 2 ? dark : white);
            square.position.set(-d - 0.15 - j * 0.25, 0.025, -4.56 + i * 0.48);
            this.add(square);
          }
    }
  }
}
/** Shared disposal for individually owned/cloned geometry and materials. */
export function disposeTree(root: Object3D) {
  const geometries = new Set<Mesh['geometry']>(),
    materials = new Set<MeshStandardMaterial>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material])
      materials.add(material);
    if (node instanceof InstancedMesh) node.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
