import { Container, Sprite, type Texture } from 'pixi.js';
import { ANIMALS, type AnimalId } from '../../engine/config';
import { STANDING_SPRITES, standingFrameFor } from './standingSprites';

export class PodiumRig extends Container {
  private body: Sprite;
  private trophy: Sprite;
  private medal: Sprite;
  private bodyScale: number;
  constructor(
    readonly animal: AnimalId,
    readonly rank: number,
    textures: Record<string, Texture>,
  ) {
    super();
    const pose = STANDING_SPRITES[animal];
    this.body = new Sprite(textures[standingFrameFor(animal)]);
    this.bodyScale = pose.height / this.body.texture.height;
    this.body.scale.set(this.bodyScale);
    this.addChild(this.body);

    this.medal = new Sprite(textures[`podium/medal-${rank + 1}`]);
    this.medal.anchor.set(0.5, 0);
    this.medal.position.set(0, pose.medalY);
    this.medal.scale.set(0.75);
    this.addChild(this.medal);

    // Place the winner's trophy beside the standing animal on the platform.
    this.trophy = new Sprite(textures['podium/trophy']);
    this.trophy.anchor.set(0.5);
    this.trophy.position.set(-90, -36);
    this.trophy.scale.set(0.65);
    this.trophy.visible = false;
    this.addChild(this.trophy);
    this.label = ANIMALS[animal].species;
  }
  update(time: number, reduced: boolean) {
    const awardAt = this.rank === 2 ? 1.8 : this.rank === 1 ? 2.2 : 2.65,
      breathing = reduced ? 1 : 1 + Math.sin(time * 2.2 + this.animal) * 0.008;
    this.body.scale.y = this.bodyScale * breathing;
    this.medal.visible = time >= awardAt;
    this.medal.y =
      STANDING_SPRITES[this.animal].medalY * breathing +
      (reduced ? 0 : Math.max(0, 1 - (time - awardAt) * 4) * -90);
    this.trophy.visible = this.rank === 0 && time >= 2.65;
  }
}
