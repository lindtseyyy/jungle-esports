import { Application, Assets, Container, Graphics, Spritesheet, type Texture } from 'pixi.js';
import { ANIMALS, type AnimalId } from '../engine/config';
import { raceTimeline, type Game } from '../engine/round';
import { AnimalRig, type Pose } from './rig/AnimalRig';
import { SpriteRunner } from './rig/SpriteRunner';
import { SPRITE_CLIPS, spriteSheetFor } from './rig/spriteClips';
import { standingFrameFor, standingSheetFor } from './rig/standingSprites';
import { Camera } from './camera';
import { Parallax } from './parallax';
import { Terrain } from './challenges/Terrain';
import { sampleCrossing, type Crossing } from './challenges/crossing';
import { ParticlePool } from './particles';
import { Podium } from './scenes/Podium';
import { FinishGate } from './FinishGate';
import {
  DISTANCE_SCALE,
  FINISH_X,
  LANES,
  START_X,
  TRACK_TOP,
  TRACK_BOTTOM,
  WORLD_HEIGHT,
  viewportGeometry,
  resolutionFor,
} from './lanes';
const sheets = new Map<string, Promise<Record<string, Texture>>>();
async function loadSheet(group: string): Promise<Record<string, Texture>> {
  const density = Math.min(devicePixelRatio || 1, 2) > 1 ? 2 : 1,
    key = `${group}@${density}x`;
  const cached = sheets.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const base = `${import.meta.env.BASE_URL}assets/${key}`;
    const response = await fetch(`${base}.json`);
    if (!response.ok) throw new Error(`Atlas unavailable: ${group}`);
    const data = await response.json();
    let texture: Texture;
    try {
      texture = await Assets.load<Texture>(`${base}.webp`);
    } catch {
      texture = await Assets.load<Texture>(`${base}.png`);
    }
    const sheet = new Spritesheet(texture, data);
    await sheet.parse();
    return sheet.textures;
  })();
  sheets.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    sheets.delete(key);
    throw e;
  }
}
import type { RenderOptions } from './types';
export async function createRenderer(
  host: HTMLElement,
  game: Game,
  options: RenderOptions,
): Promise<() => void> {
  const app = new Application(),
    [animals, environment, initial] = await Promise.all([
      loadSheet('animals'),
      loadSheet('environment'),
      loadSheet(`challenge-${game.round.challenge}`),
    ]),
    textures = { ...animals, ...environment };
  await app.init({
    width: host.clientWidth,
    height: host.clientHeight,
    resolution: resolutionFor(host.clientWidth, host.clientHeight, devicePixelRatio || 1),
    autoDensity: true,
    antialias: true,
    background: 0x101d1b,
    preference: new URL(window.location.href).searchParams.has('webgpu') ? 'webgpu' : 'webgl',
    powerPreference: 'low-power',
  });
  host.appendChild(app.canvas);
  app.canvas.setAttribute(
    'aria-label',
    'Five distinct jungle animals racing right to left on five marked lanes',
  );
  app.canvas.setAttribute('role', 'img');
  const root = new Container(),
    scene = new Container(),
    world = new Container(),
    parallax = new Parallax(textures),
    camera = new Camera();
  app.stage.addChild(root);
  root.addChild(scene);
  scene.addChild(parallax, world);
  const chalk = new Graphics();
  for (const y of [TRACK_TOP, ...LANES.map((l) => l.floor + 35)])
    chalk
      .moveTo(FINISH_X - 1500, y)
      .lineTo(START_X + 900, y)
      .stroke({ color: 0xe1d6ac, alpha: 0.36, width: 1.5 });
  for (let x = FINISH_X - 1300; x < START_X + 900; x += 280) {
    chalk.rect(x, TRACK_TOP - 9, 4, 16).fill(0xd1c798);
  }
  world.addChild(chalk);
  world.addChild(
    new Graphics()
      .rect(START_X - 3, TRACK_TOP, 6, TRACK_BOTTOM - TRACK_TOP)
      .fill({ color: 0xf3e6c4, alpha: 0.7 }),
  );
  const gate = new FinishGate();
  world.addChild(gate.ground, gate.back);
  const terrain = new Terrain(textures);
  terrain.setChallenge(game.round.challenge, initial, game.round.seed);
  world.addChild(terrain);
  const spriteSheets = await Promise.all(
    ANIMALS.map((a) => {
      const sheet = spriteSheetFor(a.id);
      return sheet ? loadSheet(sheet) : undefined;
    }),
  );
  const rigs = ANIMALS.map((a) => {
    const sheet = spriteSheets[a.id],
      clip = SPRITE_CLIPS[a.id];
    return sheet && clip ? new SpriteRunner(a.id, sheet, clip) : new AnimalRig(a.id, textures);
  });
  const prepareStanding = async (order: readonly AnimalId[]) => {
    const sheets = await Promise.all(
      order.slice(0, 3).map((id) => loadSheet(standingSheetFor(id))),
    );
    Object.assign(textures, ...sheets);
  };
  let crossingReady = false;
  let crossingPromise: Promise<void> | undefined;
  const prepareCrossing = () =>
    (crossingPromise ??= Promise.all(
      ANIMALS.map(async (a) =>
        Object.assign(
          {},
          ...(await Promise.all([
            loadSheet(`${SPRITE_CLIPS[a.id].name}-crossing-sprite`),
            loadSheet(`${SPRITE_CLIPS[a.id].name}-polish-sprite`),
          ])),
        ),
      ),
    ).then((sheets) => {
      crossingReady = true;
      options.onPreviewReady?.();
      rigs.forEach((rig, i) => {
        if (rig instanceof SpriteRunner) rig.setCrossingTextures(sheets[i]);
      });
    }));
  const initialOrder = game.replay?.record.order ?? game.round.order;
  if (initialOrder) await Promise.all([prepareStanding(initialOrder), prepareCrossing()]);
  const particles = LANES.map(() => new ParticlePool(textures['env/leaf'], 18));
  for (const lane of LANES) {
    const group = new Container();
    group.addChild(
      terrain.back[lane.index],
      rigs[lane.index],
      particles[lane.index],
      terrain.front[lane.index],
    );
    world.addChild(group);
  }
  world.addChild(terrain.overlay, gate.front);
  const podium = new Podium(textures);
  scene.addChild(podium);
  const confetti = new ParticlePool(textures['env/leaf'], 60);
  scene.addChild(confetti);
  const snapshot = new Graphics();
  root.addChild(snapshot);
  const debug = new URL(window.location.href).searchParams.has('debug');
  if (debug) root.addChild(new Graphics().circle(200, 100, 35).fill(0xe4efce));
  let width = 1920,
    roundKey = 0,
    challenge = game.round.challenge,
    seed = game.round.seed,
    loadToken = 0,
    podiumOrder = '',
    standingOrder = initialOrder?.join() ?? '',
    time = 0,
    particleClock = 0,
    slowFrames = 0,
    destroyed = false,
    adaptive = 2,
    lastPreviewTime = 0,
    metricsClock = 0;
  let draws = 0,
    previousDraws = 0,
    restoreDraws = () => {};
  if (debug && 'gl' in app.renderer) {
    const gl = app.renderer.gl as WebGL2RenderingContext,
      drawElements = gl.drawElements.bind(gl),
      drawArrays = gl.drawArrays.bind(gl);
    gl.drawElements = (...args: Parameters<typeof drawElements>) => {
      draws++;
      drawElements(...args);
    };
    gl.drawArrays = (...args: Parameters<typeof drawArrays>) => {
      draws++;
      drawArrays(...args);
    };
    restoreDraws = () => {
      gl.drawElements = drawElements;
      gl.drawArrays = drawArrays;
    };
  }
  const resetCamera = () => {
    const active = game.replay?.choreography ?? game.choreography;
    const raceTime = game.replay?.time ?? game.round.raceTime;
    const distances = active
      ? active.curves.map((c) => c.sample(raceTime).x).sort((a, b) => b - a)
      : [0, 0];
    camera.reset(width, ((distances[0] + distances[1]) / 2) * DISTANCE_SCALE);
  };
  const resize = () => {
    if (destroyed) return;
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight),
      geometry = viewportGeometry(w, h);
    width = geometry.visibleWidth;
    app.renderer.resolution = resolutionFor(w, h, Math.min(devicePixelRatio || 1, adaptive));
    app.renderer.resize(w, h);
    root.scale.set(geometry.scale);
    root.position.set(geometry.x, geometry.y);
    const clip = new Graphics().rect(0, 0, width, WORLD_HEIGHT).fill(0xffffff);
    const old = root.mask;
    root.mask = clip;
    root.addChild(clip);
    if (old && old instanceof Graphics) {
      root.removeChild(old);
      old.destroy();
    }
    resetCamera();
    host.dataset.scaleX = String(root.scale.x);
    host.dataset.scaleY = String(root.scale.y);
    host.dataset.visibleWidth = String(width);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const visibility = () => (document.hidden ? app.stop() : app.start());
  document.addEventListener('visibilitychange', visibility);
  visibility();
  app.ticker.add((ticker) => {
    const elapsed = ticker.elapsedMS / 1000,
      delta = Math.min(elapsed, 0.1),
      paused = options.isPaused();
    if (!paused) time += delta;
    options.onFrame(elapsed);
    const preview = options.preview?.();
    const r = game.round,
      replay = game.replay,
      choreography = replay?.choreography ?? game.choreography,
      raceTime = preview?.time ?? replay?.time ?? r.raceTime,
      id = preview?.challenge ?? replay?.record.challenge ?? r.challenge,
      order = replay?.record.order ?? r.order;
    const timeline = !preview && choreography && order ? raceTimeline(choreography, order) : null;
    const phase = preview
      ? 'race'
      : replay
        ? timeline && raceTime >= timeline.podium
          ? 'podium'
          : timeline && raceTime >= timeline.winner
            ? 'result'
            : 'race'
        : r.phase;
    const key = preview ? -1000000 - preview.key : replay ? -replay.record.id : r.id;
    seed = preview ? 42 : (replay?.record.seed ?? r.seed);
    if (key !== roundKey) {
      roundKey = key;
      if (preview)
        camera.reset(width, (1200 + (-0.14 + preview.time / 9.3) * 600) * DISTANCE_SCALE);
      else resetCamera();
      podiumOrder = '';
      seed = preview ? 42 : (replay?.record.seed ?? r.seed);
      particles.forEach((p) => p.reset(seed));
      confetti.reset(seed + 7);
    }
    if (preview && preview.time < lastPreviewTime)
      camera.reset(width, (1200 - 0.14 * 600) * DISTANCE_SCALE);
    lastPreviewTime = preview?.time ?? 0;
    if (id !== challenge || seed !== terrainSeed) {
      challenge = id;
      terrainSeed = seed;
      const token = ++loadToken,
        requestedSeed = seed;
      void loadSheet(`challenge-${id}`)
        .then((sheet) => {
          if (!destroyed && token === loadToken) terrain.setChallenge(id, sheet, requestedSeed);
        })
        .catch(() =>
          options.onError?.('This terrain could not load. Reload to restore its artwork.'),
        );
    }
    const racing = ['race', 'finish', 'result'].includes(phase),
      onPodium = phase === 'podium',
      standingReady = order?.slice(0, 3).every((animal) => !!textures[standingFrameFor(animal)]);
    if (order && order.join() !== standingOrder) {
      standingOrder = order.join();
      // The result is fixed at lock, leaving the race to preload its three podium portraits.
      void prepareStanding(order).catch(() =>
        options.onError?.(
          'The standing animals could not load. Reload to restore the winner artwork.',
        ),
      );
    }
    if ((order || preview) && !crossingPromise)
      void prepareCrossing().catch(() =>
        options.onError?.(
          'The obstacle poses could not load. Reload to restore the crossing animations.',
        ),
      );
    world.visible = !onPodium;
    podium.visible = onPodium && !!standingReady;
    const photoHold =
      !!choreography?.photoFinish &&
      (replay ? replay.snapshotHold > 0 : phase === 'result' && r.elapsed < 0.18);
    const visualDelta = paused || photoHold ? 0 : delta;
    const visualTime = racing ? raceTime : time;
    const motions = rigs.map((_, i) =>
      preview
        ? { x: 1200 + (-0.14 + preview.time / 9.3 - i * 0.012) * 600, speed: 600 / 9.3 }
        : racing && choreography
          ? choreography.curves[i].sample(raceTime)
          : { x: 0, speed: 0 },
    );
    const distances = motions.map((m) => m.x).sort((a, b) => b - a),
      photo =
        !!choreography?.photoFinish &&
        timeline !== null &&
        raceTime > timeline.winner - 0.45 &&
        raceTime < timeline.winner + 0.3;
    if (racing)
      camera.update(
        distances[0] * DISTANCE_SCALE,
        distances[1] * DISTANCE_SCALE,
        visualDelta,
        photo && !options.reducedMotion,
        width,
      );
    world.x = camera.offset;
    scene.scale.set(onPodium ? 1 : camera.zoom);
    scene.pivot.set(width / 2, WORLD_HEIGHT / 2);
    scene.position.set(width / 2, WORLD_HEIGHT / 2);
    parallax.update(camera.offset, visualTime, options.reducedMotion, width);
    particleClock += visualDelta;
    const contacts: Crossing[] = [];
    for (const lane of LANES) {
      const i = lane.index,
        rig = rigs[i],
        motion = motions[i],
        inZone = motion.x >= 1200 && motion.x <= 1800;
      let pose: Pose = !racing ? 'ready' : motion.speed > 0 ? 'run' : 'idle';
      if (i === id && order?.[0] !== i && motion.x > 2580 && motion.x < 2700) pose = 'stumble';
      const nose = START_X - motion.x * DISTANCE_SCALE;
      const crossing = sampleCrossing(
        id,
        nose + rig.footX * lane.scale,
        visualTime,
        options.reducedMotion,
      );
      rig.scale.set(lane.scale);
      if (rig instanceof SpriteRunner) rig.setCrossing(crossing);
      rig.animate(
        visualTime,
        visualDelta,
        motion.speed * DISTANCE_SCALE,
        pose,
        id,
        options.reducedMotion,
      );
      rig.position.set(nose - rig.noseOffset(), lane.floor + crossing.offsetY);
      contacts[i] = crossing;
      rig.marker.visible = false;
      if (
        particleClock > 0.09 &&
        racing &&
        motion.speed > 0 &&
        !options.reducedMotion &&
        ['run', 'approach', 'climb', 'recover', 'land'].includes(crossing.stage)
      )
        particles[i].spawn(
          rig.x + rig.footX,
          lane.floor,
          inZone && id === 1 ? 0x745238 : 0xc3ae82,
          inZone && id === 1 ? 'mud' : 'dust',
        );
      particles[i].update(visualDelta);
    }
    terrain.update(
      visualTime,
      rigs.map((rig, i) => ({
        x: START_X - motions[i].x * DISTANCE_SCALE,
        y: rig.y,
        crossing: contacts[i],
        grip: rig instanceof SpriteRunner ? rig.gripPoint() : undefined,
      })),
      options.reducedMotion,
    );
    gate.update(
      timeline && raceTime >= timeline.winner ? raceTime - timeline.winner : null,
      options.reducedMotion,
    );
    if (onPodium && order && standingReady) {
      if (order.join() !== podiumOrder) {
        podium.show(order);
        podiumOrder = order.join();
      }
      podium.x = width / 2;
      podium.update(
        replay && timeline ? raceTime - timeline.podium : r.elapsed,
        options.reducedMotion,
      );
      if (particleClock > 0.09 && !options.reducedMotion)
        for (let i = 0; i < 3; i++)
          confetti.spawn(
            width / 2 - 400 + ((time * 137 + i * 283) % 800),
            0,
            [0xc4df78, 0xeac862, 0xa792d9][i],
            'confetti',
          );
    }
    confetti.update(visualDelta);
    if (particleClock > 0.09) particleClock = 0;
    snapshot.clear();
    const since = timeline ? raceTime - timeline.winner : -1;
    if (choreography?.photoFinish && since >= 0 && since < 0.2 && !options.reducedMotion) {
      snapshot
        .rect(0, 0, width, WORLD_HEIGHT)
        .fill({ color: 0xffffff, alpha: 0.7 * (1 - since / 0.2) });
      snapshot
        .moveTo(FINISH_X + camera.offset, TRACK_TOP)
        .lineTo(FINISH_X + camera.offset, TRACK_BOTTOM)
        .stroke({ color: 0xfff3dc, width: 2 });
    }
    if (!paused && ticker.elapsedMS > 20 && ticker.elapsedMS < 100) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 120 && app.renderer.resolution > 1) {
      adaptive = Math.max(1, app.renderer.resolution * 0.8);
      resize();
      slowFrames = 0;
    }
    previousDraws = draws;
    draws = 0;
    metricsClock += delta;
    if (debug && metricsClock > 0.5) {
      options.onMetrics?.({
        drawCalls: previousDraws,
        frameMS: ticker.elapsedMS,
        resolution: app.renderer.resolution,
      });
      metricsClock = 0;
    }
    if (debug)
      host.dataset.crossings = JSON.stringify(
        rigs.map((rig, i) => ({
          ...contacts[i],
          animal: i,
          x: rig.x,
          y: rig.y,
          floor: LANES[i].floor,
          spriteWidth: rig instanceof SpriteRunner ? rig.sprite.width * rig.scale.x : undefined,
          spriteHeight: rig instanceof SpriteRunner ? rig.sprite.height * rig.scale.y : undefined,
          frame: rig instanceof SpriteRunner ? rig.frameKey : 'procedural',
          grip: rig instanceof SpriteRunner ? rig.gripPoint() : undefined,
        })),
      );
    host.dataset.phase = preview ? 'preview' : phase;
    host.dataset.challenge = String(terrain.challengeId);
    host.dataset.crossingReady = String(crossingReady);
    host.dataset.floatingLogs = JSON.stringify(
      terrain.floatingLogs.map((log) => ({ x: log.x, y: log.y, visible: log.visible })),
    );
    host.dataset.hillMounds = String(terrain.hillMounds);
    host.dataset.podiumFits = String(
      !onPodium || (podium.getBounds().minY >= 0 && podium.getBounds().maxY <= host.clientHeight),
    );
  });
  let terrainSeed = seed;
  return () => {
    destroyed = true;
    loadToken++;
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    restoreDraws();
    app.destroy(true, { children: true, texture: false, textureSource: false });
  };
}
