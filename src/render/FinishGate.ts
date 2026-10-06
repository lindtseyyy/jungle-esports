import { Container, Graphics, Text } from 'pixi.js';
import { FINISH_X, TRACK_TOP, TRACK_BOTTOM } from './lanes';
export class FinishGate {
  readonly ground = new Container();
  readonly back = new Container();
  readonly front = new Container();
  private tape = new Graphics();
  constructor() {
    for (const c of [this.ground, this.back, this.front]) c.x = FINISH_X;
    const paint = new Graphics();
    for (let row = 0; row < 38; row++)
      for (let col = 0; col < 2; col++)
        paint
          .rect(
            -(20 + (row / 38) * 4) + (col * (20 + (row / 38) * 4)) / 2,
            TRACK_TOP + row * 12,
            (20 + (row / 38) * 4) / 2,
            12,
          )
          .fill((row + col) % 2 ? 0x2d3b33 : 0xf5ebd4);
    paint.rect(0, TRACK_TOP, 3, TRACK_BOTTOM - TRACK_TOP).fill(0xfff5e5);
    this.ground.addChild(paint);
    const gate = new Graphics()
      .rect(16, 260, 13, TRACK_TOP - 260)
      .fill(0xb7aa83)
      .roundRect(-90, 262, 210, 69, 7)
      .fill(0x293e30)
      .stroke({ color: 0xe5cf90, width: 3 });
    this.back.addChild(gate);
    const title = new Text({
      text: 'FINISH',
      style: { fontFamily: 'Lilita One', fontSize: 44, fill: 0xf6e9c7 },
    });
    title.anchor.set(0.5);
    title.position.set(15, 298);
    this.back.addChild(title);
    const post = new Graphics()
      .rect(-32, 336, 13, TRACK_BOTTOM - 336)
      .fill(0xb6a47c)
      .rect(-38, 335, 24, 10)
      .fill(0xe1ce9b);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++)
        post.rect(-20 + c * 13, 354 + r * 13, 13, 13).fill((r + c) % 2 ? 0xf4ead1 : 0x2c3d32);
    this.front.addChild(this.tape, post);
  }
  update(sinceCrossing: number | null, reduced: boolean) {
    this.tape.clear();
    if (sinceCrossing === null) {
      this.tape
        .moveTo(0, TRACK_TOP - 37)
        .lineTo(0, TRACK_BOTTOM - 37)
        .stroke({ color: 0xf3ded0, width: 5 });
      return;
    }
    if (sinceCrossing > 1) return;
    const u = reduced ? 1 : Math.min(1, sinceCrossing),
      mid = (TRACK_TOP + TRACK_BOTTOM) / 2 - 37;
    this.tape
      .moveTo(0, TRACK_TOP - 37)
      .quadraticCurveTo(-u * 140, mid - 100, -u * 170, mid - 60)
      .stroke({ color: 0xf3ded0, alpha: 1 - u, width: 5 });
    this.tape
      .moveTo(0, TRACK_BOTTOM - 37)
      .quadraticCurveTo(u * 120, mid + 100, u * 150, mid + 60)
      .stroke({ color: 0xf3ded0, alpha: 1 - u, width: 5 });
  }
}
