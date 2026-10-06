import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { TRACK_TOP, WORLD_HEIGHT } from './lanes';
export class Parallax extends Container {
  private layers: { sprites: Sprite[]; speed: number; width: number }[] = [];
  private spectators: { group: Container; index: number }[] = [];
  private sky: Sprite;
  constructor(textures: Record<string, Texture>) {
    super();
    this.sky = new Sprite(textures['env/sky']);
    this.sky.height = WORLD_HEIGHT;
    this.addChild(this.sky);
    for (const [key, speed, y, width, height] of [
      ['far', 0.12, 140, 1600, 490],
      ['mid', 0.28, 240, 1300, 440],
      ['tree', 0.55, 20, 600, 640],
      ['track', 1, TRACK_TOP, 1200, WORLD_HEIGHT - TRACK_TOP],
    ] as const) {
      const sprites: Sprite[] = [];
      for (let i = 0; i < 6; i++) {
        const s = new Sprite(textures[`env/${key}`]);
        s.width = width;
        s.height = height;
        s.y = y;
        this.addChild(s);
        sprites.push(s);
      }
      this.layers.push({ sprites, speed, width });
    }
    for (let i = 0; i < 7; i++) {
      const group = new Container();
      group.addChild(
        new Graphics()
          .moveTo(-70, 0)
          .quadraticCurveTo(0, 7, 70, -8)
          .stroke({ color: 0x62583b, width: 13 }),
      );
      const s = new Sprite(textures[i % 3 ? 'env/monkey' : 'env/parrot']);
      s.anchor.set(0.5, 1);
      s.scale.set(0.62);
      group.addChild(s);
      group.y = TRACK_TOP - 35 - (i % 2) * 95;
      this.spectators.push({ group, index: i });
      this.addChild(group);
    }
  }
  update(camera: number, time: number, reduced: boolean, width: number) {
    this.sky.width = width;
    for (const l of this.layers) {
      const offset = (((camera * l.speed) % l.width) + l.width) % l.width;
      l.sprites.forEach((s, i) => (s.x = (i - 1) * l.width + offset));
    }
    this.spectators.forEach(({ group, index }) => {
      group.x = ((index * 420 + camera * 0.55) % (width + 420)) - 180;
      group.rotation = reduced ? 0 : Math.sin(time * 1.5 + index) * 0.012;
    });
  }
}
