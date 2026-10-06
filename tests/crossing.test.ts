import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import type { AnimalId } from '../src/engine/config';
import { LANES } from '../src/render/lanes';
import { Terrain } from '../src/render/challenges/Terrain';
import {
  HILL_HEIGHT,
  POOL_DEPTH,
  floatingLogContact,
  hillHeight,
  sampleCrossing,
  VINE_COUNT,
  ZONE_ENTRY,
  ZONE_WIDTH,
} from '../src/render/challenges/crossing';
import { SPRITE_CLIPS, startingFrameFor } from '../src/render/rig/spriteClips';
import { SpriteRunner } from '../src/render/rig/SpriteRunner';

const at = (id: AnimalId, p: number, time = 1, reduced = false) =>
  sampleCrossing(id, ZONE_ENTRY - p * ZONE_WIDTH, time, reduced);
describe('obstacle contact paths', () => {
  it('has exactly five lane bridges and keeps feet on the log tops across the full gap', () => {
    const terrain = new Terrain({});
    terrain.setChallenge(2, {}, 42);
    expect(terrain.back.map((lane) => lane.children.length)).toEqual([1, 1, 1, 1, 1]);
    for (let p = 0; p <= 1; p += 0.01) {
      const state = at(2, p);
      expect(state.offsetY).toBe(0);
      expect(state.animation).toBe('walk');
      expect(Math.abs(state.angle)).toBeLessThan(0.02);
    }
    terrain.destroy({ children: true });
    for (const layer of [...terrain.back, ...terrain.front, terrain.overlay])
      layer.destroy({ children: true });
  });
  it('enters deep mud, paddles below the surface, and emerges smoothly', () => {
    expect(at(1, 0).offsetY).toBe(0);
    expect(at(1, 0.03)).toMatchObject({ stage: 'jump-mud', animation: 'jump' });
    expect(at(1, 0.03).offsetY).toBeLessThan(0);
    expect(at(1, 0.1).stage).toBe('enter-mud');
    expect(at(1, 0.5)).toMatchObject({ stage: 'paddle', animation: 'mud', submerged: true });
    expect(at(1, 0.5).offsetY).toBeGreaterThanOrEqual(POOL_DEPTH - 27);
    expect(at(1, 0.92)).toMatchObject({ stage: 'leave-mud', animation: 'clamber' });
    expect(at(1, 1).offsetY).toBe(0);
    expect(at(1, 1.01).animation).toBe('run');
  });
  it('boards a floating log, bobs on water, then disembarks onto land', () => {
    expect(at(4, 0.03).stage).toBe('board');
    expect(at(4, 0.5)).toMatchObject({ stage: 'float', floating: true, animation: 'raft' });
    expect(at(4, 0.5, 1).offsetY).not.toBe(at(4, 0.5, 2).offsetY);
    expect(at(4, 0.97).stage).toBe('disembark');
    expect(at(4, 1.01)).toMatchObject({ stage: 'run', floating: false, offsetY: 0 });
  });
  it('jumps, holds five consecutive vines, transfers, and lands before running', () => {
    expect(at(3, 0.03).stage).toBe('jump');
    const held = new Set<number>();
    for (let p = 0.08; p < 0.92; p += 0.003) {
      const state = at(3, p);
      expect(state.animation).toBe('hang');
      expect(state.offsetY).toBeLessThan(-50);
      held.add(state.vine);
    }
    expect([...held]).toEqual(Array.from({ length: VINE_COUNT }, (_, n) => n));
    expect(at(3, 0.08 + (0.84 / VINE_COUNT) * 0.95).stage).toBe('transfer');
    expect(at(3, 0.95).stage).toBe('land');
    expect(at(3, 1.01)).toMatchObject({ stage: 'run', offsetY: 0 });
  });
  it('approaches, climbs a steep mound, reaches the peak, tumbles downhill, and recovers', () => {
    expect(at(0, 0.2).stage).toBe('approach');
    expect(at(0, 0.4)).toMatchObject({ stage: 'climb', animation: 'walk' });
    expect(at(0, 0.4).angle).toBeGreaterThan(0.5);
    expect(hillHeight(0.5)).toBe(HILL_HEIGHT);
    expect(at(0, 0.5)).toMatchObject({ stage: 'peak', animation: 'tuck', offsetY: -HILL_HEIGHT });
    expect(at(0, 0.6)).toMatchObject({ stage: 'tumble', animation: 'tuck' });
    expect(at(0, 0.6).angle).toBeLessThan(-Math.PI);
    expect(at(0, 0.7).stage).toBe('recover');
    expect(at(0, 0.8)).toMatchObject({ animation: 'run', offsetY: 0, angle: 0 });
  });
  it('keeps five floating logs visible before boarding, while traversing, and after exit', () => {
    const terrain = new Terrain({});
    terrain.setChallenge(4, {}, 42);
    const logs = [...terrain.floatingLogs];
    expect(logs).toHaveLength(5);
    for (const p of [-0.2, 0.5, 1.2]) {
      terrain.update(
        1,
        LANES.map((lane) => ({
          x: ZONE_ENTRY - p * ZONE_WIDTH,
          y: lane.floor,
          crossing: at(4, p),
        })),
        true,
      );
      expect(terrain.floatingLogs).toEqual(logs);
      for (const log of logs) expect(log.visible).toBe(true);
    }
    expect(floatingLogContact(-0.2)).toBe(floatingLogContact(0.1));
    expect(floatingLogContact(1.2)).toBe(floatingLogContact(0.88));
    expect(floatingLogContact(0.5)).toBe(ZONE_ENTRY - ZONE_WIDTH * 0.5);
    terrain.destroy({ children: true });
    for (const layer of [...terrain.back, ...terrain.front, terrain.overlay])
      layer.destroy({ children: true });
  });
  it('uses one shared hill instead of five separate lane hills', () => {
    const terrain = new Terrain({});
    terrain.setChallenge(0, {}, 42);
    expect(terrain.hillMounds).toBe(1);
    expect(terrain.back.every((lane) => lane.children.length === 0)).toBe(true);
    terrain.destroy({ children: true });
    for (const layer of [...terrain.back, ...terrain.front, terrain.overlay])
      layer.destroy({ children: true });
  });
  it('reduced motion preserves obstacle contact without continuous tumble or bobbing', () => {
    expect(at(4, 0.5, 1, true).offsetY).toBe(at(4, 0.5, 2, true).offsetY);
    expect(Math.abs(at(0, 0.6, 1, true).angle)).toBeLessThan(1);
    expect(at(3, 0.5, 1, true).animation).toBe('hang');
    expect(at(1, 0.5, 1, true).submerged).toBe(true);
  });
});

describe('every animal uses its own crossing art', () => {
  for (const animal of [0, 1, 2, 3, 4] as AnimalId[])
    it(SPRITE_CLIPS[animal].name, () => {
      const clip = SPRITE_CLIPS[animal],
        sheet: Record<string, Texture> = {};
      for (let n = 0; n < clip.frames; n++)
        sheet[`${clip.name}/run/${n}`] = new Texture({ source: Texture.WHITE.source });
      sheet[startingFrameFor(animal)] = new Texture({
        source: Texture.WHITE.source,
        defaultAnchor: { x: 0, y: 1 },
      });
      const actions: Record<string, Texture> = {};
      for (const kind of ['paddle', 'hang', 'tuck', 'walk', 'jump', 'mud', 'clamber', 'raft'])
        for (let n = 0; n < 4; n++)
          actions[`${clip.name}/${kind}/${n}`] = new Texture({
            source: Texture.WHITE.source,
            defaultAnchor:
              kind === 'tuck'
                ? { x: 0.5, y: 0.5 }
                : !['hang', 'tuck'].includes(kind)
                  ? { x: 0, y: 1 }
                  : { x: 0.2, y: 0.03 },
          });
      const rig = new SpriteRunner(animal, sheet, clip);
      rig.scale.set(LANES[animal].scale);
      rig.position.set(20, 700);
      rig.setCrossingTextures(actions);
      for (const id of [0, 1, 3, 4] as AnimalId[]) {
        const state = at(id, 0.6, 2);
        rig.setCrossing(state);
        rig.animate(2, 0.1, 200, 'run', id);
        expect(rig.frameKey).toContain(`/${state.animation}/`);
        expect(rig.sprite.texture).toBe(actions[rig.frameKey]);
        if (id === 3) {
          expect(rig.gripPoint()).toEqual({
            x: rig.x + rig.sprite.x * rig.scale.x,
            y: rig.y + rig.sprite.y * rig.scale.y,
          });
          expect(rig.gripPoint()!.y).toBeLessThan(rig.y - 80);
        }
      }
      rig.setCrossing(at(1, 0.51, 0.2));
      rig.animate(0.2, 0, 200, 'run', 1);
      const firstStroke = rig.frameKey;
      rig.setCrossing(at(1, 0.55, 1.1));
      rig.animate(1.1, 0, 200, 'run', 1);
      expect(rig.frameKey).not.toBe(firstStroke);
      rig.setCrossing(at(4, 1.01));
      rig.animate(3, 0.1, 200, 'run', 4);
      expect(rig.frameKey).toContain('/run/');
      for (const progress of [0.5, 0.7]) {
        rig.setCrossing(at(0, progress));
        rig.animate(4, 0, 200, 'run', 0);
        expect(rig.sprite.getBounds().maxY).toBeCloseTo(rig.y, 6);
      }
      rig.setCrossing(at(2, 0.5, 1, true));
      rig.animate(4, 0.1, 200, 'run', 2, true);
      expect(rig.frameKey).toContain('/walk/');
      expect(rig.sprite.anchor.y).toBe(1);
      expect(rig.sprite.getBounds().maxY).toBeCloseTo(rig.y, 6);
      rig.destroy({ children: true });
    });
});
