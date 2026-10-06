import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { createChoreography } from '../src/engine/choreography';
import { CameraPath, frameCamera } from '../src/render3d/camera';
import { CourseProfile, laneZ, worldX } from '../src/render3d/course/profile';
import { FrameStats, pixelRatio } from '../src/render3d/quality';
const profile = new CourseProfile(
  JSON.parse(readFileSync('public/assets/3d/course-base.profile.json', 'utf8')),
);
describe('V3 G1 world geometry', () => {
  it('maps nose crossings and lane positions exactly', () => {
    expect(worldX(3000)).toBe(-300);
    expect([0, 1, 2, 3, 4].map(laneZ)).toEqual([-3.6, -1.8, 0, 1.8, 3.6]);
  });
  it('uses exported hills and dips with unit upward normals and flat start/finish', () => {
    for (let lane = 0; lane < 5; lane++) {
      expect(profile.sample(0, lane).height).toBeCloseTo(0);
      expect(profile.sample(78, lane).height).toBeCloseTo(1.2, 2);
      expect(profile.sample(222, lane).height).toBeCloseTo(-0.7, 2);
      expect(profile.sample(300, lane).height).toBeCloseTo(0);
      for (let d = 0; d < 300; d += 0.33) {
        const sample = profile.sample(d, lane);
        expect(Math.hypot(sample.nx, sample.ny, sample.nz)).toBeCloseTo(1, 5);
        expect(sample.ny).toBeGreaterThan(0.9);
      }
    }
  });
  it('clamps beyond track extents without NaNs', () => {
    expect(profile.sample(-100, 0).height).toBe(profile.sample(-10, 0).height);
    expect(profile.sample(400, 4).height).toBe(profile.sample(310, 4).height);
  });
});
describe('deterministic precomputed camera', () => {
  const choreography = createChoreography([0, 1, 2, 3, 4], 0, 42);
  it('does not depend on seek order or frame rate', () => {
    const path = new CameraPath(choreography),
      other = new CameraPath(choreography);
    const sample = path.sample(9.417);
    for (let t = 20; t > 0; t -= 0.017) path.sample(t);
    expect(path.sample(9.417)).toBe(sample);
    expect(other.sample(9.417)).toBe(sample);
  });
  it('keeps the leader in frame across supported wide viewports', () => {
    const path = new CameraPath(choreography);
    for (const aspect of [4 / 3, 16 / 9, 21 / 9]) {
      const camera = new PerspectiveCamera(30, aspect, 0.1, 240);
      for (let t = 0; t < 20; t += 0.1) {
        const positions = choreography.curves.map((curve) => curve.sample(t).x);
        const leader = Math.max(...positions),
          lane = positions.indexOf(leader);
        const target = path.sample(t);
        frameCamera(camera, target, profile.sample(-target, 2).height);
        const nose = new Vector3(
          worldX(leader),
          profile.sample(leader * 0.1, lane).height + 1.2,
          laneZ(lane),
        ).project(camera);
        expect(nose.x).toBeGreaterThan(-0.8);
        expect(nose.x).toBeLessThan(0.8);
        expect(Math.abs(nose.y)).toBeLessThan(1);
      }
    }
  });
});
it('bounds pixel ratios and reports percentiles while discarding hidden-tab stalls', () => {
  expect(pixelRatio('high', 3)).toBe(2);
  expect(pixelRatio('medium', 3)).toBe(1.5);
  expect(pixelRatio('low', 3, 0.1)).toBe(0.6);
  const stats = new FrameStats();
  for (let i = 1; i <= 100; i++) stats.add(i);
  stats.add(5000);
  expect(stats.percentiles()).toEqual({ p50: 50, p95: 95, p99: 99 });
  stats.reset();
  expect(stats.percentiles().p95).toBe(0);
});
