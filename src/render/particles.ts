import { seededRandom } from '../engine/rng';
import { Container, Sprite, type Texture } from 'pixi.js';
interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
}
export class ParticlePool extends Container {
  private pool: Particle[] = [];
  private nextIndex = 0;
  private random = seededRandom(42);
  reset(seed: number) {
    this.random = seededRandom(seed);
    this.nextIndex = 0;
    for (const p of this.pool) {
      p.life = 0;
      p.sprite.visible = false;
    }
  }
  constructor(texture: Texture, count = 100) {
    super();
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.addChild(sprite);
      this.pool.push({ sprite, vx: 0, vy: 0, life: 0, max: 0, spin: 0 });
    }
  }
  spawn(
    x: number,
    y: number,
    color: number,
    kind: 'dust' | 'confetti' | 'mud' | 'rock' = 'dust',
  ): void {
    const p = this.pool[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.pool.length;
    p.sprite.position.set(x, y);
    p.sprite.visible = true;
    p.sprite.tint = color;
    p.sprite.alpha = 0.7;
    p.sprite.scale.set(kind === 'confetti' ? 0.14 : 0.065);
    p.sprite.rotation = this.random() * 6;
    p.vx = (this.random() - 0.35) * (kind === 'confetti' ? 80 : 120);
    p.vy = kind === 'confetti' ? 35 : -45 - this.random() * 70;
    p.max = p.life = kind === 'confetti' ? 3 : 0.5 + this.random() * 0.4;
    p.spin = (this.random() - 0.5) * 5;
  }
  update(delta: number): void {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= delta;
      p.sprite.visible = p.life > 0;
      if (p.life > 0) {
        p.sprite.x += p.vx * delta;
        p.sprite.y += p.vy * delta;
        p.vy += delta * 90;
        p.sprite.rotation += p.spin * delta;
        p.sprite.alpha = Math.max(0, p.life / p.max) * 0.75;
      }
    }
  }
}
