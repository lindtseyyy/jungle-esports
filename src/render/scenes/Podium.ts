import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { ANIMALS, type AnimalId } from '../../engine/config';
import { PodiumRig } from '../rig/PodiumRig';
export class Podium extends Container {
  private places: { group: Container; rig: PodiumRig; rank: number; y: number }[] = [];
  constructor(private textures: Record<string, Texture>) {
    super();
    this.visible = false;
  }
  show(order: readonly AnimalId[]) {
    for (const c of this.removeChildren()) c.destroy({ children: true });
    this.places = [];
    this.addChild(new Graphics().ellipse(0, 885, 490, 40).fill({ color: 0x102b21, alpha: 0.24 }));
    for (const rank of [1, 2, 0]) {
      const x = [0, -340, 340][rank],
        y = [650, 725, 760][rank],
        group = new Container();
      group.x = x;
      const stump = new Sprite(this.textures['podium/stump']);
      stump.anchor.set(0.5, 0);
      stump.y = -20;
      stump.scale.set(1.3, rank === 0 ? 1.35 : rank === 1 ? 0.95 : 0.75);
      group.addChild(stump);
      const rig = new PodiumRig(order[rank], rank, this.textures);
      rig.scale.set(1.08);
      group.addChild(rig);
      const number = new Text({
        text: String(rank + 1),
        style: {
          fontFamily: 'Lilita One',
          fontSize: 67,
          fill: [0xd4af37, 0xc0c0c0, 0xcd7f32][rank],
        },
      });
      number.anchor.set(0.5);
      number.y = rank === 0 ? 130 : rank === 1 ? 94 : 65;
      group.addChild(number);
      const name = new Text({
        text: ANIMALS[order[rank]].species.toUpperCase(),
        style: { fontFamily: 'Nunito', fontWeight: '900', fontSize: 25, fill: 0xf6ecd7 },
      });
      name.anchor.set(0.5);
      name.y = rank === 0 ? 207 : rank === 1 ? 161 : 130;
      group.addChild(name);
      this.addChild(group);
      this.places.push({ group, rig, rank, y });
    }
  }
  update(elapsed: number, reduced: boolean) {
    for (const p of this.places) {
      const enter = [1.2, 0.65, 0.15][p.rank],
        t = Math.max(0, Math.min(1, (elapsed - enter) / 0.55));
      p.group.visible = elapsed >= enter;
      p.group.y = p.y + (reduced ? 0 : (1 - t) * 145 - Math.sin(t * Math.PI) * 45);
      p.rig.update(elapsed, reduced);
    }
  }
}
