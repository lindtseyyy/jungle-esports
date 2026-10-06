import { PerspectiveCamera, Vector3 } from 'three';
import type { Choreography } from '../engine/choreography';

/** Precomputed forward/backward smoothing has no runtime lag or frame-rate dependence. */
export class CameraPath {
  readonly positions: Float64Array;
  readonly step = 0.05;
  constructor(
    choreography: Choreography,
    readonly reducedMotion = false,
  ) {
    const end = Math.max(...choreography.finishTimes) + 2;
    const count = Math.ceil(end / this.step) + 1;
    this.positions = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const positions = choreography.curves
        .map((c) => c.sample(i * this.step).x)
        .sort((a, b) => b - a);
      this.positions[i] = -positions[0] * 0.1;
    }
    const alpha = reducedMotion ? 0.14 : 0.26;
    for (let i = 1; i < count; i++)
      this.positions[i] = alpha * this.positions[i] + (1 - alpha) * this.positions[i - 1];
    for (let i = count - 2; i >= 0; i--)
      this.positions[i] = alpha * this.positions[i] + (1 - alpha) * this.positions[i + 1];
  }
  sample(time: number) {
    const f = Math.max(0, Math.min(this.positions.length - 1, time / this.step)),
      i = Math.floor(f),
      t = f - i;
    const at = (n: number) => this.positions[Math.max(0, Math.min(this.positions.length - 1, n))];
    const a = at(i - 1),
      b = at(i),
      c = at(i + 1),
      d = at(i + 2);
    return (
      0.5 *
      (2 * b +
        (-a + c) * t +
        (2 * a - 5 * b + 4 * c - d) * t * t +
        (-a + 3 * b - 3 * c + d) * t * t * t)
    );
  }
}
const target = new Vector3();
export function frameCamera(
  camera: PerspectiveCamera,
  leaderX: number,
  ground = 0,
  turntable = 0,
  closeup = false,
) {
  const visibleHeight = closeup ? 3.8 : Math.max(7.5, 13 / camera.aspect);
  const distance = visibleHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const width = visibleHeight * camera.aspect;
  target.set(leaderX + (closeup ? 0.9 : width * 0.15), ground + 0.75, 0);
  const pitch = Math.PI / 6;
  camera.position.set(
    target.x + Math.sin(turntable) * distance * Math.cos(pitch),
    target.y + Math.sin(pitch) * distance,
    Math.cos(turntable) * distance * Math.cos(pitch),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
}
