import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { AnimalId } from '../../engine/config';
import type { Pose } from './AnimalRig';
import { startingFrameFor, type SpriteClip } from './spriteClips';
import { hillPathDistance, type Crossing } from '../challenges/crossing';
import { ACTION_WIDTHS, ACTION_FRAMES, contactCycle } from './actionClips';

/** Running follows ground distance; obstacle poses follow each contact sequence. */
export class SpriteRunner extends Container {
  readonly marker = new Container();
  readonly footX: number;
  readonly sprite: Sprite;
  private body = new Container();
  private shadow: Graphics;
  private textures: Texture[];
  private startingTexture: Texture;
  private actions: Record<string, Texture> = {};
  private crossing?: Crossing;
  private cycle = 0;
  private wasReady = true;
  frameKey = '';
  constructor(
    readonly animal: AnimalId,
    sheet: Record<string, Texture>,
    readonly clip: SpriteClip,
  ) {
    super();
    const name = clip.name;
    this.textures = Array.from({ length: clip.frames }, (_, i) => sheet[`${name}/run/${i}`]);
    this.startingTexture = sheet[startingFrameFor(animal)];
    const width = clip.sourceWidth * clip.worldScale;
    this.footX = ACTION_WIDTHS[animal] * 0.44;
    this.shadow = new Graphics()
      .ellipse(width * 0.33, 0, width * 0.28, 9)
      .fill({ color: 0x182c23, alpha: 0.26 });
    this.addChild(this.shadow);
    this.addChild(this.body);
    this.sprite = new Sprite(this.startingTexture);
    this.sprite.scale.set(width / this.textures[0].width);
    this.body.addChild(this.sprite);
    this.body.pivot.x = this.body.x = this.footX;
  }
  noseOffset() {
    return 0;
  }
  setCrossingTextures(sheet: Record<string, Texture>) {
    Object.assign(this.actions, sheet);
  }
  setCrossing(crossing: Crossing) {
    this.crossing = crossing;
  }
  gripPoint() {
    if (this.crossing?.animation !== 'hang') return undefined;
    return { x: this.x + this.sprite.x * this.scale.x, y: this.y + this.sprite.y * this.scale.y };
  }
  animate(
    time: number,
    delta: number,
    speed: number,
    pose: Pose,
    _challenge: number,
    reducedMotion = false,
  ) {
    const ready = pose === 'ready',
      running = !ready && pose !== 'idle' && speed > 0;
    const stride = this.clip.stride * this.clip.worldScale * this.scale.x;
    if (!ready && this.wasReady) this.cycle = 0;
    if (running) this.cycle = (this.cycle + (delta * speed) / stride) % 1;
    const crossing = ready ? undefined : this.crossing;
    const action = crossing?.animation;
    if (crossing && ['walk', 'mud', 'raft'].includes(action!)) {
      const pathDistance =
        action === 'walk' && crossing.stage === 'climb'
          ? hillPathDistance(crossing.progress)
          : undefined;
      crossing.phase = contactCycle(
        this.animal,
        crossing.progress,
        this.scale.x,
        action!,
        pathDistance,
      );
    }
    const actionFrame =
      action === 'walk' || action === 'raft' || action === 'mud'
        ? Math.floor((crossing!.phase % 1) * ACTION_FRAMES)
        : action === 'hang'
          ? crossing!.stage === 'transfer' || crossing!.stage === 'jump'
            ? 0
            : 1
          : action === 'tuck' && ['recover', 'land'].includes(crossing!.stage)
            ? 1
            : 0;
    const runFrame = Math.floor(this.cycle * this.clip.frames) % this.clip.frames;
    const key = ready
      ? startingFrameFor(this.animal)
      : action && action !== 'run'
        ? `${this.clip.name}/${action}/${actionFrame}`
        : `${this.clip.name}/run/${runFrame}`;
    const actionTexture = this.actions[key];
    this.sprite.texture = ready ? this.startingTexture : (actionTexture ?? this.textures[runFrame]);
    this.frameKey = actionTexture || ready ? key : `${this.clip.name}/run/${runFrame}`;
    if (ready || actionTexture) this.sprite.anchor.copyFrom(this.sprite.texture.defaultAnchor!);
    else
      this.sprite.anchor.set(
        this.clip.noseX / this.clip.sourceWidth,
        (crossing && ['bridge', 'climb'].includes(crossing.stage)
          ? this.clip.contactGroundY[runFrame]
          : this.clip.groundY) / this.clip.sourceHeight,
      );
    this.wasReady = ready;
    this.sprite.position.set(0, 0);
    this.sprite.rotation = 0;
    this.body.rotation = crossing?.angle ?? 0;
    this.body.pivot.set(this.footX, 0);
    this.body.position.set(this.footX, 0);
    this.sprite.scale.y =
      this.sprite.scale.x * (!ready || reducedMotion ? 1 : 1 + Math.sin(time * 2.2) * 0.008);
    if (actionTexture && action === 'hang') {
      // The texture anchor is the actual raised paws; the vine ends at this point.
      this.body.pivot.set(0, 0);
      this.body.position.set(0, 0);
      this.body.rotation = 0;
      this.sprite.position.set(this.footX * 0.35, -120);
      this.sprite.rotation = reducedMotion ? 0 : Math.cos(crossing!.phase * Math.PI) * 0.2;
    }
    if (actionTexture && action === 'clamber') {
      const progress = Math.max(0, Math.min(1, (crossing!.progress - 0.86) / 0.14));
      this.sprite.anchor.y = 0.5 + progress * 0.5;
    }
    if (actionTexture && action === 'mud' && !reducedMotion) {
      this.sprite.x = Math.sin(crossing!.phase * Math.PI * 2) * 4;
    }
    if (actionTexture && action === 'tuck') {
      // Rotate around the tucked torso, with the rolling silhouette resting on the slope.
      this.body.rotation = 0;
      const radius = Math.hypot(
        (this.sprite.width / 2) * Math.sin(crossing!.angle),
        (this.sprite.height / 2) * Math.cos(crossing!.angle),
      );
      this.sprite.position.set(this.footX, -radius);
      this.sprite.rotation = crossing!.angle;
    }
    this.shadow.visible =
      !crossing ||
      ['run', 'approach', 'climb', 'peak', 'tumble', 'recover', 'bridge'].includes(crossing.stage);
    this.rotation = pose === 'stumble' && !reducedMotion ? Math.sin(time * 22) * 0.06 : 0;
  }
}
