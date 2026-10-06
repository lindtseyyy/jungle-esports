import { START_X } from './lanes';
export class Camera {
  offset = 0;
  zoom = 1;
  update(first: number, second: number, delta: number, photo: boolean, width: number) {
    const target = (first + second) / 2 + width * 0.53 - START_X;
    this.offset += (target - this.offset) * (1 - Math.exp(-delta * 8));
    this.zoom += ((photo ? 1.08 : 1) - this.zoom) * (1 - Math.exp(-delta * 5));
  }
  reset(width: number, distance = 0) {
    this.offset = (distance > 0 ? distance + width * 0.53 : width * 0.72) - START_X;
    this.zoom = 1;
  }
}
