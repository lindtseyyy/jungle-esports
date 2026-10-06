export type Surface = 'grass' | 'dirt' | 'leaves' | 'rock' | 'mud' | 'water' | 'log' | 'wood';
export type ProfileSample = [height: number, nx: number, ny: number, nz: number, surface: Surface];
export interface ProfileData {
  version: 1;
  start: number;
  step: number;
  laneSpacing: number;
  lanes: ProfileSample[][];
}
export interface GroundSample {
  height: number;
  nx: number;
  ny: number;
  nz: number;
  surface: Surface;
}
export const laneZ = (lane: number) => (lane - 2) * 1.8;
export const worldX = (engineX: number) => -engineX * 0.1;
export class CourseProfile {
  constructor(readonly data: ProfileData) {
    if (
      data.version !== 1 ||
      data.step <= 0 ||
      !Number.isFinite(data.start) ||
      data.lanes.length !== 5 ||
      data.lanes.some(
        (l) =>
          l.length < 2 ||
          l.some((p) => p.length !== 5 || p.slice(0, 4).some((n) => !Number.isFinite(n))),
      )
    ) {
      throw new Error('Invalid 3D course profile');
    }
  }
  /** distance increases toward the finish; output may be reused to avoid allocations. */
  sample(
    distance: number,
    lane: number,
    out: GroundSample = { height: 0, nx: 0, ny: 1, nz: 0, surface: 'grass' },
  ) {
    const samples = this.data.lanes[Math.max(0, Math.min(4, Math.round(lane)))];
    const f = Math.max(
      0,
      Math.min(samples.length - 1, (distance - this.data.start) / this.data.step),
    );
    const i = Math.floor(f),
      a = samples[i],
      b = samples[Math.min(i + 1, samples.length - 1)],
      t = f - i;
    out.height = a[0] + (b[0] - a[0]) * t;
    out.nx = a[1] + (b[1] - a[1]) * t;
    out.ny = a[2] + (b[2] - a[2]) * t;
    out.nz = a[3] + (b[3] - a[3]) * t;
    const length = Math.hypot(out.nx, out.ny, out.nz);
    out.nx /= length || 1;
    out.ny /= length || 1;
    out.nz /= length || 1;
    out.surface = t < 0.5 ? a[4] : b[4];
    return out;
  }
}
