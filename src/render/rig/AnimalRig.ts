import { Container, Graphics, MeshPlane, Sprite, Text, type Texture } from 'pixi.js';
import { GAITS, footTarget, legAngles, strideKey } from './gaits';
import { ANIMALS, type AnimalId } from '../../engine/config';
import { SPECIES } from '../species';
export type Pose = 'ready' | 'idle' | 'run' | 'struggle' | 'signature' | 'stumble';
export class AnimalRig extends Container {
  readonly anatomy;
  readonly marker = new Container();
  /** Where dust kicks up, relative to the rig origin. */
  readonly footX = 40;
  private torso: MeshPlane;
  private body = new Container();
  private head = new Container();
  private ears: Sprite[] = [];
  private eyes: Sprite;
  private jaw: Sprite;
  private bib: Sprite;
  private tail: MeshPlane;
  private legs: {
    hip: Container;
    knee: Container;
    paw: Sprite;
    front: boolean;
    phase: number;
    mud: Sprite;
  }[] = [];
  private cycle = 0;
  private mud = 0;
  constructor(
    readonly animal: AnimalId,
    textures: Record<string, Texture>,
  ) {
    super();
    const a = (this.anatomy = SPECIES[animal]);
    const sprite = (part: string) => new Sprite(textures[`animals/${animal}/${part}`]);
    const shadow = new Graphics()
      .ellipse(0, 1, a.length * 0.43, 7)
      .fill({ color: 0x182c23, alpha: 0.22 });
    this.addChild(shadow);
    this.tail = new MeshPlane({
      texture: textures[`animals/${animal}/tail`],
      verticesX: a.tailBones + 1,
      verticesY: 2,
    });
    this.tail.position.set(a.length * 0.32, animal === 1 ? -112 : animal === 3 ? -100 : -92);
    this.tail.scale.set(animal === 3 ? 0.85 : animal === 1 ? 0.65 : animal === 4 ? 0.55 : 0.7);
    this.addChild(this.tail);
    for (let i = 0; i < 4; i++) {
      const front = i < 2,
        hip = new Container(),
        knee = new Container(),
        upper = sprite('upperleg'),
        lower = sprite('lowerleg'),
        paw = sprite('paw');
      upper.pivot.set(16, 3);
      lower.pivot.set(16, 3);
      paw.pivot.set(16, 3);
      knee.y = a.upper;
      paw.y = a.lower;
      knee.addChild(lower, paw);
      hip.addChild(upper, knee);
      const mud = sprite('lowerleg');
      mud.pivot.set(16, 3);
      mud.tint = 0x58402c;
      mud.alpha = 0;
      knee.addChild(mud);
      hip.position.set(...(front ? a.shoulder : a.hip));
      if (i % 2 === 0) {
        upper.tint = 0x9c9489;
        lower.tint = 0x9c9489;
        paw.tint = 0x9c9489;
      }
      this.legs.push({ hip, knee, paw, front, phase: GAITS[animal].phases[i], mud });
      if (i % 2 === 0) this.addChild(hip);
    }
    this.torso = new MeshPlane({
      texture: textures[`animals/${animal}/body`],
      verticesX: 4,
      verticesY: 3,
    });
    this.torso.position.set(-a.length / 2, a.shoulder[1] - 30);
    this.body.addChild(this.torso);
    this.bib = sprite('bib');
    this.bib.anchor.set(0.5);
    this.bib.scale.set(animal === 3 ? 0.48 : 0.65);
    this.bib.position.set(0, a.shoulder[1] - 5);
    this.bib.visible = false;
    this.body.addChild(this.bib);
    this.addChild(this.body);
    for (const leg of this.legs.filter((_, i) => i % 2 === 1)) this.addChild(leg.hip);
    const neck = new Sprite(textures[`animals/${animal}/upperleg`]);
    neck.anchor.set(0.5);
    neck.position.set(a.head[0] + 22, a.head[1] + 15);
    neck.rotation = -0.7;
    neck.scale.set(1.4, 1.1);
    this.addChild(neck);
    const face = sprite('head');
    face.pivot.set(52, 50);
    face.scale.set(a.headScale);
    this.head.addChild(face);
    this.head.position.set(...a.head);
    this.jaw = sprite('jaw');
    this.jaw.scale.set(a.headScale * 0.7);
    this.jaw.position.set(-40 * a.headScale, 13 * a.headScale);
    this.head.addChild(this.jaw);
    for (let i = 0; i < 2; i++) {
      const ear = sprite('ear');
      ear.pivot.set(15, 30);
      ear.scale.set(a.headScale * (animal === 4 ? 0.78 : 0.54));
      ear.position.set((i ? 15 : -3) * a.headScale, -28 * a.headScale);
      this.head.addChild(ear);
      this.ears.push(ear);
    }
    this.eyes = sprite('eyes');
    this.eyes.anchor.set(0.5);
    this.eyes.scale.set(a.headScale * 0.7);
    this.eyes.position.set(-22 * a.headScale, -14 * a.headScale);
    this.head.addChild(this.eyes);
    this.addChild(this.head);
    this.marker.addChild(
      new Graphics().circle(0, 0, 12).fill(Number.parseInt(ANIMALS[animal].color.slice(1), 16)),
    );
    const n = new Text({
      text: String(animal + 1),
      style: { fontFamily: 'Nunito', fontWeight: '900', fontSize: 15, fill: 0x15251b },
    });
    n.anchor.set(0.5);
    this.marker.addChild(n);
    this.marker.position.set(0, a.head[1] - 65 * a.headScale);
    this.addChild(this.marker);
  }
  noseOffset() {
    const nose = [48, 48, 47, 46, 50][this.animal] * this.anatomy.headScale;
    return (
      (this.anatomy.head[0] -
        nose * Math.cos(this.head.rotation) -
        5 * this.anatomy.headScale * Math.sin(this.head.rotation)) *
      this.scale.x
    );
  }
  animate(
    time: number,
    delta: number,
    speed: number,
    pose: Pose,
    challenge: number,
    reducedMotion = false,
  ) {
    const a = this.anatomy,
      g = GAITS[this.animal],
      running = pose !== 'idle' && pose !== 'ready';
    this.cycle += running ? (delta * speed) / Math.max(0.01, this.scale.x) / a.strideLength : 0;
    const key = strideKey(this.cycle),
      bob = reducedMotion
        ? 0
        : running
          ? -Math.abs(key[1]) * g.suspension
          : Math.sin(time * 1.4) * 0.7;
    const flex = running && !reducedMotion ? key[2] * g.flex : 0;
    this.body.y = bob;
    const vertices = this.torso.geometry.getBuffer('aPosition');
    const data = vertices.data as Float32Array;
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++) {
        const i = (row * 4 + col) * 2;
        data[i] = (col * a.length) / 3 + (col === 1 ? flex : col === 2 ? -flex : 0);
        data[i + 1] = (row * 78) / 2 + (col === 1 || col === 2 ? -flex * 0.45 : 0);
      }
    vertices.update();
    this.head.y = a.head[1] + bob * 0.6;
    this.head.rotation = running ? key[0] * 0.035 : Math.sin(time) * 0.015;
    this.rotation = pose === 'stumble' && !reducedMotion ? Math.sin(time * 22) * 0.1 : 0;
    this.jaw.rotation = running ? 0.08 + Math.abs(key[1]) * 0.12 : 0;
    this.eyes.scale.y = a.headScale * 0.7 * (time % 4.7 < 0.1 ? 0.08 : 1);
    this.eyes.tint = this.animal === 4 && pose === 'signature' ? 0xd4ff93 : 0xffffff;
    this.ears.forEach(
      (ear, i) => (ear.rotation = running ? -0.15 + key[0] * 0.05 : Math.sin(time * 2 + i) * 0.035),
    );
    const tailBuffer = this.tail.geometry.getBuffer('aPosition'),
      tailData = tailBuffer.data as Float32Array;
    for (let row = 0; row < 2; row++)
      for (let col = 0; col <= a.tailBones; col++) {
        const i = (row * (a.tailBones + 1) + col) * 2;
        tailData[i] = (col * 140) / a.tailBones;
        tailData[i + 1] =
          row * 130 +
          (reducedMotion
            ? 0
            : Math.sin(this.cycle * Math.PI * 2 - col * 0.55) *
              col *
              (this.animal === 3 ? 1.8 : 0.8));
      }
    tailBuffer.update();
    this.tail.rotation = this.animal === 1 ? 0 : Math.sin(this.cycle * Math.PI) * 0.08;
    this.mud = pose === 'struggle' && challenge === 1 ? 1 : Math.max(0, this.mud - delta * 0.16);
    for (const leg of this.legs) {
      const origin = leg.front ? a.shoulder : a.hip,
        p = (this.cycle + leg.phase) % 1;
      // Moving left: a planted foot moves right relative to the body, at exactly race speed.
      const target = footTarget(this.animal, p);
      let x = running ? target.x : 0,
        lift = running ? target.lift : 0;
      if (pose === 'struggle') {
        if (challenge === 1) lift *= 1.8;
        if (challenge === 2) this.head.rotation = -0.18;
        if (challenge === 3 && leg.front) {
          x = -18;
          lift += 25;
        }
        if (challenge === 4) {
          x *= 0.6;
          this.head.rotation = Math.sin(time * 3) * 0.12;
        }
      }
      if (pose === 'signature' && this.animal === 1) {
        x = leg.front ? -22 : 16;
        lift = 10;
        this.body.y += 2;
      }
      const angles = legAngles(x, -origin[1] - a.paw - lift - bob, a.upper, a.lower);
      leg.hip.y = origin[1] + bob;
      leg.hip.rotation = angles.hip;
      leg.knee.rotation = angles.knee;
      leg.paw.rotation = -angles.hip - angles.knee;
      leg.mud.alpha = this.mud * 0.7;
    }
  }
}
