import { Container, Graphics, TilingSprite, type Texture } from 'pixi.js';
import type { AnimalId } from '../../engine/config';
import { seededRandom } from '../../engine/rng';
import { LANES, TRACK_TOP, TRACK_BOTTOM } from '../lanes';
import {
  HILL_END,
  HILL_PEAK,
  HILL_START,
  hillHeight,
  sampleCrossing,
  vineAnchor,
  VINE_COUNT,
  ZONE_ENTRY,
  ZONE_EXIT,
  ZONE_WIDTH,
  POOL_DEPTH,
  type Crossing,
} from './crossing';
export { ZONE_ENTRY, ZONE_EXIT, ZONE_WIDTH, ZONE_MID } from './crossing';
/** Bark shading and cut ends used by the permanent log bridges. */
export function drawLog(g: Graphics, x: number, y: number, width: number, height = 32) {
  g.roundRect(x, y, width, height, height / 2).fill(0x493326);
  g.roundRect(x + 3, y + 2, width - 6, height * 0.58, height / 3).fill(0x96704c);
  g.moveTo(x + 10, y + 3)
    .lineTo(x + width - 12, y + 3)
    .stroke({ color: 0xb4ad6b, width: 5 });
  for (let n = 0; n < 3; n++)
    g.moveTo(x + 16, y + 10 + n * 7)
      .lineTo(x + width - 12, y + 8 + n * 8)
      .stroke({ color: n === 1 ? 0xcca37b : 0x62472f, width: 2, alpha: 0.8 });
  for (const end of [x + 7, x + width - 7]) {
    g.ellipse(end, y + height / 2, 8, height / 2 - 2).fill(0xc39b68);
    g.ellipse(end, y + height / 2, 4, height / 3).stroke({ color: 0x765337, width: 2 });
  }
  for (let n = 0; n < width / 170; n++)
    g.ellipse(x + 65 + n * 170, y + height * 0.65, 13, 4).stroke({ color: 0x523727, width: 2 });
  return g;
}
/** Atlas-backed painted material constrained by the actual contact silhouette. */
function material(
  parent: Container,
  shape: Graphics,
  texture?: Texture,
  alpha = 1,
  tint = 0xffffff,
) {
  if (!texture) {
    shape.tint = tint;
    shape.alpha = alpha;
    parent.addChild(shape);
    return;
  }
  const bounds = shape.getLocalBounds();
  const tile = new TilingSprite({ texture, width: bounds.width, height: bounds.height });
  tile.position.set(bounds.minX, bounds.minY);
  tile.tileScale.set(0.8);
  tile.alpha = alpha;
  tile.tint = tint;
  parent.addChild(tile, shape);
  tile.mask = shape;
}
function fern(g: Graphics, x: number, y: number, size: number) {
  g.ellipse(x, y + 3, size * 0.6, 5).fill({ color: 0x172a1b, alpha: 0.35 });
  for (let n = -2; n <= 2; n++) {
    const endX = x + n * size * 0.24,
      endY = y - size * (0.7 - Math.abs(n) * 0.13);
    g.moveTo(x, y)
      .quadraticCurveTo(x + n * size * 0.2, y - size * 0.25, endX, endY)
      .stroke({ color: 0x436c37, width: 2 });
    for (let k = 1; k < 5; k++) {
      const t = k / 5,
        px = x + (endX - x) * t,
        py = y + (endY - y) * t,
        leaf = size * 0.14 * (1 - t * 0.5);
      g.poly([px, py, px - leaf, py - leaf * 0.5, px - leaf * 0.4, py + 3]).fill(
        n % 2 ? 0x547e3b : 0x6b8f40,
      );
      g.poly([px, py, px + leaf, py - leaf * 0.65, px + leaf * 0.4, py + 2]).fill(0x82a54e);
    }
  }
}
function rock(g: Graphics, x: number, y: number, size: number) {
  g.ellipse(x, y + size * 0.25, size * 0.75, 6).fill({ color: 0x182c22, alpha: 0.4 });
  g.poly([
    x - size * 0.6,
    y + size * 0.2,
    x - size * 0.4,
    y - size * 0.3,
    x + size * 0.1,
    y - size * 0.55,
    x + size * 0.6,
    y - size * 0.12,
    x + size * 0.7,
    y + size * 0.24,
  ]).fill(0x526054);
  g.poly([
    x - size * 0.4,
    y - size * 0.3,
    x + size * 0.1,
    y - size * 0.55,
    x + size * 0.6,
    y - size * 0.12,
    x,
    y - size * 0.1,
  ]).fill(0x839079);
  g.moveTo(x - size * 0.35, y - size * 0.28)
    .lineTo(x + size * 0.1, y - size * 0.5)
    .stroke({ color: 0xa8b18b, width: 2, alpha: 0.65 });
  g.ellipse(x - size * 0.18, y - size * 0.18, size * 0.2, 3).fill(0x647b3d);
}
/** Draw a gently rounded, symmetric hill profile from its foot to the crest and back down. */
function hillProfile(
  g: Graphics,
  startX: number,
  peakX: number,
  endX: number,
  floor: number,
  height: number,
) {
  const peakY = floor - height,
    upWidth = startX - peakX,
    downWidth = peakX - endX;
  return g
    .moveTo(startX, floor)
    .bezierCurveTo(startX - upWidth / 3, floor, peakX + upWidth / 3, peakY, peakX, peakY)
    .bezierCurveTo(peakX - downWidth / 3, peakY, endX + downWidth / 3, floor, endX, floor);
}
export interface TerrainRacer {
  x: number;
  y: number;
  crossing: Crossing;
  grip?: { x: number; y: number };
}
export class Terrain extends Container {
  readonly back = LANES.map(() => new Container());
  readonly front = LANES.map(() => new Container());
  readonly overlay = new Container();
  /** Kept for the preview debug dataset; open water has no floating props. */
  readonly floatingLogs: Container[] = [];
  private splashes = LANES.map(() => new Graphics());
  private vines = LANES.map(() => new Graphics());
  private ambient = new Graphics();
  private id: AnimalId = 0;
  get challengeId() {
    return this.id;
  }
  hillMounds = 0;
  constructor(_textures: Record<string, Texture>) {
    super();
  }
  setChallenge(id: AnimalId, textures: Record<string, Texture>, seed: number) {
    this.id = id;
    this.hillMounds = id === 0 ? 1 : 0;
    for (const c of [this, ...this.back, ...this.front, this.overlay])
      for (const child of c.removeChildren()) child.destroy({ children: true });
    this.splashes = LANES.map(() => new Graphics());
    this.vines = LANES.map(() => new Graphics());
    this.ambient = new Graphics();
    const random = seededRandom(seed),
      earth = undefined;
    const details = new Graphics();
    if (id === 2 || id === 3) {
      const pit = new Container();
      material(
        pit,
        new Graphics()
          .rect(ZONE_EXIT, TRACK_TOP, ZONE_WIDTH, TRACK_BOTTOM - TRACK_TOP + 80)
          .fill(0xffffff),
        undefined,
        1,
        0x789184,
      );
      pit.addChild(
        new Graphics()
          .rect(ZONE_EXIT, TRACK_TOP, ZONE_WIDTH, TRACK_BOTTOM - TRACK_TOP + 80)
          .fill({ color: 0x081e1e, alpha: 0.38 }),
      );
      for (const edge of [ZONE_EXIT, ZONE_ENTRY]) {
        const dir = edge === ZONE_EXIT ? 1 : -1,
          points = [edge, TRACK_TOP - 6];
        for (let y = TRACK_TOP; y <= TRACK_BOTTOM + 70; y += 38)
          points.push(edge + dir * (55 + random() * 35), y);
        points.push(edge, TRACK_BOTTOM + 80);
        material(
          pit,
          new Graphics().poly(points).fill(0xffffff),
          earth,
          1,
          edge === ZONE_EXIT ? 0x6f7561 : 0xa1a47c,
        );
        details
          .moveTo(edge, TRACK_TOP)
          .lineTo(edge, TRACK_BOTTOM + 70)
          .stroke({ color: 0x17291d, width: 12, alpha: 0.65 });
        for (let n = 0; n < 9; n++) {
          const y = TRACK_TOP + 20 + n * 55,
            x = edge + dir * (12 + random() * 25);
          details
            .moveTo(x, y)
            .bezierCurveTo(x + dir * 22, y + 20, x + dir * 12, y + 45, x + dir * 35, y + 65)
            .stroke({ color: 0x3f3525, width: 4 });
          details
            .moveTo(x + dir * 10, y + 22)
            .lineTo(x + dir * 28, y + 30)
            .stroke({ color: 0x857e4e, width: 2 });
          fern(details, edge - dir * 8, y, 26 + random() * 23);
          if (n % 2) rock(details, x + dir * 45, y + 55, 22 + random() * 16);
        }
      }
      this.addChild(pit);
      for (let n = 0; n < 24; n++) {
        const x = ZONE_EXIT + 90 + random() * (ZONE_WIDTH - 180),
          y = TRACK_TOP + 90 + random() * 430;
        if (n % 3) fern(details, x, y, 16 + random() * 24);
        else rock(details, x, y, 18 + random() * 21);
      }
      this.addChild(details);
    }
    if (id === 0) {
      // One connected extruded ridge is shared by all five lanes; no lane-specific mounds.
      const x = (p: number) => ZONE_ENTRY - p * ZONE_WIDTH,
        near = LANES[4].floor,
        far = LANES[0].floor,
        h = hillHeight(HILL_PEAK);
      const mound = new Container();
      const startX = x(HILL_START),
        peakX = x(HILL_PEAK),
        endX = x(HILL_END),
        ridge = hillProfile(new Graphics(), startX, peakX, endX, far, h)
          .lineTo(endX, near)
          .bezierCurveTo(
            endX + (peakX - endX) / 3,
            near,
            peakX - (peakX - endX) / 3,
            near - h,
            peakX,
            near - h,
          )
          .bezierCurveTo(
            peakX + (startX - peakX) / 3,
            near - h,
            startX - (startX - peakX) / 3,
            near,
            startX,
            near,
          )
          .closePath()
          .fill(0xffffff);
      material(mound, ridge, earth, 1, 0x8d704e);
      material(
        mound,
        hillProfile(new Graphics(), startX, peakX, endX, near, h)
          .lineTo(endX, near + 70)
          .lineTo(startX, near + 70)
          .closePath()
          .fill(0xffffff),
        earth,
        1,
        0x806447,
      );
      mound.addChild(
        new Graphics()
          .moveTo(peakX, far - h)
          .bezierCurveTo(
            peakX - (peakX - endX) / 3,
            far - h,
            endX + (peakX - endX) / 3,
            far,
            endX,
            far,
          )
          .lineTo(endX, near)
          .bezierCurveTo(
            endX + (peakX - endX) / 3,
            near,
            peakX - (peakX - endX) / 3,
            near - h,
            peakX,
            near - h,
          )
          .closePath()
          .fill({ color: 0x243c29, alpha: 0.26 }),
      );
      for (const floor of [far, near]) {
        hillProfile(details, startX, peakX, endX, floor, h).stroke({
          color: 0x6f8746,
          width: 12,
          join: 'round',
        });
        hillProfile(details, startX, peakX, endX, floor - 2, h).stroke({
          color: 0xb2b76a,
          width: 3,
          join: 'round',
          alpha: 0.7,
        });
      }
      // A single long crest emphasizes the depth and continuity of the hill.
      details
        .moveTo(x(HILL_PEAK), far - h)
        .bezierCurveTo(
          x(HILL_PEAK) - 40,
          far - h,
          x(HILL_PEAK) - 40,
          near - h,
          x(HILL_PEAK),
          near - h,
        )
        .stroke({ color: 0xa3a86c, width: 5, alpha: 0.6 });
      for (let n = 0; n < 40; n++) {
        const p = HILL_START + random() * (HILL_END - HILL_START),
          px = x(p),
          floor = far + random() * (near - far),
          py = floor - hillHeight(p);
        if (n % 4 === 0) fern(details, px, py, 16 + random() * 12);
        else if (n % 5 === 0) rock(details, px, py, 12 + random() * 10);
        else
          details
            .moveTo(px, py)
            .lineTo(px + 8, py - 2)
            .stroke({ color: 0xd1b582, width: 2, alpha: 0.55 });
      }
      this.addChild(mound, details);
    }
    if (id === 1 || id === 4) {
      const water = id === 4,
        pool = new Container();
      const rim = new Graphics()
        .roundRect(
          ZONE_EXIT - 14,
          TRACK_TOP - 8,
          ZONE_WIDTH + 28,
          TRACK_BOTTOM - TRACK_TOP + 110,
          38,
        )
        .fill(0xffffff);
      material(pool, rim, earth, 1, water ? 0xa7a17c : 0xa7926b);
      pool.addChild(
        new Graphics()
          .roundRect(
            ZONE_EXIT + 22,
            TRACK_TOP + 24,
            ZONE_WIDTH - 44,
            TRACK_BOTTOM - TRACK_TOP + 73,
            34,
          )
          .fill(0x302d21),
      );
      pool.addChild(
        new Graphics()
          .roundRect(
            ZONE_EXIT + 40,
            TRACK_TOP + POOL_DEPTH,
            ZONE_WIDTH - 80,
            TRACK_BOTTOM - TRACK_TOP + 35,
            28,
          )
          .fill(water ? 0x286b70 : 0x604431),
      );
      // The top and side bank cast a shadow on the lower liquid surface.
      pool.addChild(
        new Graphics()
          .roundRect(ZONE_EXIT + 41, TRACK_TOP + POOL_DEPTH, ZONE_WIDTH - 82, 30, 13)
          .fill({ color: 0x152e23, alpha: 0.42 }),
      );
      const texture = new Graphics();
      for (let n = 0; n < 180; n++) {
        const x = ZONE_EXIT + 60 + random() * (ZONE_WIDTH - 120),
          y = TRACK_TOP + POOL_DEPTH + 28 + random() * 420;
        if (water)
          texture
            .moveTo(x, y)
            .quadraticCurveTo(x + 16, y - 4, x + 36 + random() * 35, y)
            .stroke({ color: n % 2 ? 0x7abcad : 0x195259, width: 1 + random(), alpha: 0.25 });
        else {
          texture
            .ellipse(x, y, 4 + random() * 25, 2 + random() * 5)
            .fill({ color: n % 2 ? 0x896344 : 0x3e2a20, alpha: 0.35 });
          if (n % 7 === 0)
            texture
              .moveTo(x, y)
              .quadraticCurveTo(x + 14, y - 5, x + 24, y + 3)
              .stroke({ color: 0xb28e61, width: 2, alpha: 0.25 });
        }
      }
      pool.addChild(texture, this.ambient);
      this.addChild(pool);
      for (const edge of [ZONE_EXIT, ZONE_ENTRY])
        for (let n = 0; n < 10; n++) {
          const y = TRACK_TOP + 15 + n * 51,
            x = edge + (edge === ZONE_EXIT ? -6 : 6);
          if (n % 2) fern(details, x, y, 25 + random() * 28);
          else rock(details, x, y, 24 + random() * 22);
          // Exposed roots run down the bank wall rather than across the pool.
          details
            .moveTo(x, y)
            .quadraticCurveTo(
              x + (edge === ZONE_EXIT ? 22 : -22),
              y + 13,
              x + (edge === ZONE_EXIT ? 36 : -36),
              y + 37,
            )
            .stroke({ color: 0x544330, width: 3, alpha: 0.8 });
        }
      this.addChild(details);
    }
    for (const lane of LANES) {
      const i = lane.index,
        floor = lane.floor;
      if (id === 2) {
        const bridge = new Container(),
          g = drawLog(new Graphics(), ZONE_EXIT - 32, floor, ZONE_WIDTH + 64, 33);
        bridge.addChild(g);
        this.back[i].addChild(bridge);
      }
      if (id === 1 || id === 4) {
        const water = id === 4,
          line = floor + (water ? POOL_DEPTH - 3 : POOL_DEPTH - 27);
        const surface = new Graphics()
          .rect(ZONE_EXIT + 42, line, ZONE_WIDTH - 84, water ? 40 : 64)
          .fill({ color: water ? 0x286b70 : 0x604431, alpha: water ? 0.82 : 0.68 });
        for (let n = 0; n < 22; n++) {
          const x = ZONE_EXIT + 55 + n * 79;
          surface
            .moveTo(x, line)
            .quadraticCurveTo(x + 18, line - (water ? 3 : 1), x + 38, line)
            .stroke({ color: water ? 0x6caea8 : 0x97704b, width: water ? 1.5 : 3, alpha: 0.36 });
        }
        this.front[i].addChild(surface);
        this.front[i].addChild(this.splashes[i]);
      } else this.front[i].addChild(this.splashes[i]);
      if (id === 3) this.back[i].addChild(this.vines[i]);
    }
    this.update(
      0,
      LANES.map((l) => ({
        x: ZONE_ENTRY + 100,
        y: l.floor,
        crossing: sampleCrossing(id, ZONE_ENTRY + 100, 0),
      })),
      true,
    );
  }
  elevation(_lane: number, x: number) {
    return sampleCrossing(this.id, x, 0).offsetY;
  }
  update(time: number, racers: readonly TerrainRacer[], reduced: boolean) {
    const water = this.id === 4;
    if (this.id === 1 || water) {
      this.ambient.clear();
      for (let n = 0; n < 16; n++) {
        const age = reduced ? 0.4 : (time * (water ? 0.3 : 0.12) + n * 0.173) % 1;
        this.ambient
          .ellipse(
            ZONE_EXIT + 75 + n * 106,
            TRACK_TOP + POOL_DEPTH + 35 + ((n * 79) % 410),
            3 + age * (water ? 27 : 8),
            1 + age * 3,
          )
          .stroke({
            color: water ? 0xa5d8cf : 0xb18a5b,
            width: water ? 1.5 : 3,
            alpha: (1 - age) * 0.3,
          });
      }
    }
    for (const lane of LANES) {
      const i = lane.index,
        racer = racers[i],
        state = racer.crossing,
        g = this.splashes[i];
      g.clear();
      if (this.id === 1 || water) {
        if (state.progress > 0.085 && state.progress < 0.94) {
          const stroke = state.phase % 1,
            effort = Math.sin(stroke * Math.PI);
          for (let n = 0; n < 3; n++) {
            const age = reduced ? (n + 1) / 4 : (time * (water ? 1.1 : 0.65) + n / 3) % 1,
              x = racer.x + 95 + age * (water ? 145 : 58),
              y = lane.floor + POOL_DEPTH - (water ? 4 : 27);
            if (water)
              g.ellipse(x, y, 25 + age * 65, 4 + age * 6).stroke({
                color: 0xb8dac8,
                width: 2,
                alpha: (1 - age) * 0.6,
              });
            else {
              // Raised clumps gather against the paws; short brown trails show mud resistance.
              g.ellipse(x, y + 2, 12 + effort * 13, 4 + effort * 5).fill({
                color: 0x3b291e,
                alpha: (1 - age) * 0.7,
              });
              g.moveTo(x - 18, y)
                .quadraticCurveTo(x, y - 8 - effort * 4, x + 23, y)
                .stroke({ color: 0x9b734b, width: 3, alpha: (1 - age) * 0.55 });
            }
            if (!reduced) {
              const lift = Math.sin(age * Math.PI) * (water ? 15 : 10);
              g.ellipse(racer.x + 35 + age * 35, y - lift, water ? 2.5 : 5, water ? 3 : 5).fill({
                color: water ? 0xa7cfc3 : 0x7c5538,
                alpha: 1 - age,
              });
            }
          }
        }
      }
      if (this.id === 3) {
        const vines = this.vines[i];
        vines.clear();
        for (let n = 0; n < VINE_COUNT; n++) {
          const held = n === state.vine && !!racer.grip,
            reach = state.stage === 'transfer' && n === state.vine + 1 && !!racer.grip;
          // Three staggered banks of resting vines stay visible after all five racers jump.
          if (i % 2 && !held && !reach) continue;
          const topX = vineAnchor(n) + i * 24,
            endX = held
              ? racer.grip!.x
              : reach
                ? racer.grip!.x - 35
                : topX + (reduced ? 0 : Math.sin(time * 1.2 + n + i) * 18),
            endY = held ? racer.grip!.y : reach ? racer.grip!.y - 5 : lane.floor - 205;
          vines
            .moveTo(topX, -30)
            .quadraticCurveTo(topX + (endX - topX) * 0.22, endY * 0.5, endX, endY)
            .stroke({
              color: held || reach ? 0x697f36 : 0x354b2c,
              width: held || reach ? 6 : 2.5,
              cap: 'round',
              alpha: held || reach ? 1 : 0.7,
            });
          vines
            .moveTo(topX + 1, -30)
            .quadraticCurveTo(topX + 2 + (endX - topX) * 0.22, endY * 0.5, endX + 1, endY)
            .stroke({ color: 0xa6b465, width: held || reach ? 1.7 : 0.7, alpha: 0.75 });
          for (let k = 1; k < 6; k++) {
            const t = k / 6,
              x = topX + (endX - topX) * t * t,
              y = endY * t;
            vines.ellipse(x + (k % 2 ? 5 : -5), y, 7, 3).fill({ color: 0x668943, alpha: 0.8 });
          }
          if (held || reach) vines.circle(endX, endY, 5).stroke({ color: 0xacae69, width: 2 });
        }
      }
      if (this.id === 0 && state.stage === 'tumble' && !reduced)
        for (let n = 0; n < 3; n++)
          g.ellipse(racer.x + 100 + n * 24, racer.y + 4, 9 + n * 5, 3 + n).fill({
            color: 0xba9d69,
            alpha: 0.45 - n * 0.1,
          });
    }
  }
}
