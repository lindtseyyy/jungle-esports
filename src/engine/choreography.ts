import { CONFIG, type AnimalId } from './config';
import { seededRandom } from './rng';
export interface Point {
  t: number;
  x: number;
}
export class MotionCurve {
  readonly slopes: number[];
  constructor(readonly points: Point[]) {
    const d = points.slice(1).map((p, i) => (p.x - points[i].x) / (p.t - points[i].t));
    this.slopes = [d[0], ...d.slice(1).map((v, i) => 2 / (1 / d[i] + 1 / v)), d[d.length - 1]];
    for (let i = 0; i < d.length; i++) {
      const a = this.slopes[i] / d[i],
        b = this.slopes[i + 1] / d[i],
        magnitude = Math.hypot(a, b);
      if (magnitude > 3) {
        const factor = 3 / magnitude;
        this.slopes[i] *= factor;
        this.slopes[i + 1] *= factor;
      }
    }
  }
  sample(time: number): { x: number; speed: number } {
    const pts = this.points;
    if (time >= pts[pts.length - 1].t) return { x: CONFIG.trackLength, speed: 0 };
    let i = 0;
    while (i < pts.length - 2 && time > pts[i + 1].t) i++;
    const a = pts[i],
      b = pts[i + 1],
      h = b.t - a.t,
      u = Math.max(0, (time - a.t) / h),
      u2 = u * u,
      u3 = u2 * u;
    return {
      x:
        (2 * u3 - 3 * u2 + 1) * a.x +
        (u3 - 2 * u2 + u) * h * this.slopes[i] +
        (-2 * u3 + 3 * u2) * b.x +
        (u3 - u2) * h * this.slopes[i + 1],
      speed:
        ((6 * u2 - 6 * u) * a.x +
          (3 * u2 - 4 * u + 1) * h * this.slopes[i] +
          (-6 * u2 + 6 * u) * b.x +
          (3 * u2 - 2 * u) * h * this.slopes[i + 1]) /
        h,
    };
  }
}
export interface Choreography {
  curves: MotionCurve[];
  finishTimes: number[];
  photoFinish: boolean;
  seed: number;
  lateChange: boolean;
}
export function createChoreography(
  order: readonly AnimalId[],
  home: AnimalId,
  seed: number,
): Choreography {
  if (order.length !== 5 || new Set(order).size !== 5) throw new Error('Invalid finishing order');
  const race = seededRandom(seed),
    photoFinish = race() < 0.15,
    winnerTime = 19 + race() * 2;
  for (let attempt = 0; attempt < 100; attempt++) {
    const random = seededRandom((seed + attempt * 7919) >>> 0);
    // Keep the finish scenario fixed while retrying a curve that misses its speed bounds.
    random();
    random();
    const finishTimes = new Array<number>(5);
    let time = winnerTime;
    order.forEach((id, rank) => {
      if (rank > 0)
        time += rank === 1 && photoFinish ? 0.04 + random() * 0.04 : 0.15 + random() * 0.75;
      finishTimes[id] = time;
    });
    const shuffle = (values: readonly AnimalId[]) =>
      [...values]
        .map((value) => ({ value, key: random() }))
        .sort((a, b) => a.key - b.key)
        .map((a) => a.value);
    const early = shuffle(order),
      entry = shuffle(order.filter((i) => i !== home));
    entry.splice(3 + Math.floor(random() * 2), 0, home);
    const exit = shuffle(order.filter((i) => i !== home));
    exit.splice(Math.floor(random() * 2), 0, home);
    const late = [...order],
      lateChange = random() < 0.6;
    if (lateChange) {
      const i = Math.floor(random() * 4);
      [late[i], late[i + 1]] = [late[i + 1], late[i]];
    }
    const ranks = [early, entry, exit, late];
    const fractions = [0.2, 0.4, 0.6, 0.85],
      // Spend more time making deliberate steps and strokes on sticky/narrow crossings.
      bases = [1, 2, 4].includes(home) ? [0.17, 0.34, 0.68, 0.86] : [0.2, 0.36, 0.64, 0.85],
      spreads = [0.055, 0.075, 0.09, 0.075];
    const curves = [0, 1, 2, 3, 4].map(
      (id) =>
        new MotionCurve([
          { t: 0, x: 0 },
          ...fractions.map((u, k) => ({
            t:
              bases[k] * winnerTime +
              ranks[k].indexOf(id as AnimalId) * spreads[k] +
              random() * 0.015,
            x: u * CONFIG.trackLength,
          })),
          { t: finishTimes[id], x: CONFIG.trackLength },
        ]),
    );
    const valid = curves.every((curve, i) => {
      const average = CONFIG.trackLength / finishTimes[i];
      for (let t = 0; t < finishTimes[i]; t += 0.05) {
        const v = curve.sample(t).speed;
        if (v < 0.4 * average || v > 1.8 * average) return false;
      }
      return true;
    });
    if (valid) return { curves, finishTimes, photoFinish, seed, lateChange };
  }
  throw new Error('Could not create valid race choreography');
}
