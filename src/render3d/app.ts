import { CapsuleGeometry, CircleGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Game } from '../engine/round';
import type { RenderOptions } from '../render/types';
import { Animal } from './animals/Animal';
import { CameraPath, frameCamera } from './camera';
import { Course, disposeTree } from './course/Course';
import { laneZ, worldX } from './course/profile';
import { toonMaterial } from './materials/toon';
import { FrameStats, type QualityTier } from './quality';
import { createStage } from './stage';

export interface LabState {
  time: number;
  speed: number;
  paused: boolean;
  wireframe: boolean;
  bones: boolean;
  turntable: boolean;
  trails: boolean;
  closeup: boolean;
  clip: 'gallop' | 'idle';
}
export async function createRenderer(
  host: HTMLElement,
  game: Game,
  options: RenderOptions,
  lab?: LabState,
): Promise<() => void> {
  const query = new URL(window.location.href).searchParams;
  const tier: QualityTier =
    query.get('quality') === 'low' ? 'low' : query.get('quality') === 'high' ? 'high' : 'medium';
  const stage = createStage(host, tier);
  const { scene, camera, renderer } = stage;
  let course: Course | undefined, lion: Animal | undefined;
  try {
    // Await both settlements: a rejected load must not orphan the other GPU resource tree.
    const assets = await Promise.allSettled([Course.load(), Animal.load()]);
    if (assets[0].status === 'fulfilled') {
      course = assets[0].value;
      scene.add(course);
    }
    if (assets[1].status === 'fulfilled') {
      lion = assets[1].value;
      scene.add(lion, lion.bones);
    }
    if (!course || !lion)
      throw new Error('V3 assets could not load. Rebuild with npm run assets:3d.');
    return await run(course, lion);
  } catch (error) {
    lion?.dispose();
    disposeTree(scene);
    stage.dispose();
    throw error;
  }

  async function run(course: Course, lion: Animal) {
    const placeholders = new Group();
    // Grey lane proxies establish scale and overlap; these are not the V3 roster.
    if (!lab)
      for (let i = 1; i < 5; i++) {
        const proxy = new Mesh(
          new CapsuleGeometry(0.23, 0.8, 4, 8),
          toonMaterial({ color: '#A0A99B' }),
        );
        proxy.rotation.z = Math.PI / 2;
        proxy.castShadow = true;
        placeholders.add(proxy);
      }
    scene.add(placeholders);
    const contactShadow = new Mesh(
      new CircleGeometry(1, 32),
      new MeshBasicMaterial({
        color: '#243525',
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.scale.set(1.1, 0.38, 1);
    contactShadow.visible = tier === 'low';
    scene.add(contactShadow);
    const stats = new FrameStats();
    const projected = new Vector3();
    let cameraPath: CameraPath | undefined,
      pathSource = game.choreography;
    let last = performance.now(),
      clock = 0,
      frames = 0,
      frame = 0,
      lost = false,
      disposed = false;
    let adaptiveScale = 1,
      slowWindows = 0,
      fastWindows = 0;
    let boneVisible = false,
      wireVisible = false;
    const pose = () => {
      const choreography = game.replay?.choreography ?? game.choreography;
      const raceTime = game.replay?.time ?? game.round.raceTime;
      const running = !!game.replay || ['race', 'finish', 'result'].includes(game.round.phase);
      if (
        choreography &&
        (choreography !== pathSource ||
          !cameraPath ||
          cameraPath.reducedMotion !== options.reducedMotion)
      ) {
        cameraPath = new CameraPath(choreography, options.reducedMotion);
        pathSource = choreography;
      }
      const time = lab?.time ?? (running ? raceTime : game.round.elapsed);
      const x = lab
        ? 68 * 10 + (lab.clip === 'gallop' ? ((time * 15) % 24) * 10 : 0)
        : running && choreography
          ? choreography.curves[0].sample(raceTime).x
          : 0;
      lion.pose(x, time, lab ? 2 : 0, course.profile, lab ? lab.clip === 'gallop' : running);
      for (let i = 0; i < placeholders.children.length; i++) {
        const p = running && choreography ? choreography.curves[i + 1].sample(raceTime).x : 0;
        placeholders.children[i].position.set(
          worldX(p) + 0.6,
          course.profile.sample(p * 0.1, i + 1).height + 0.65,
          laneZ(i + 1),
        );
      }
      contactShadow.position.copy(lion.position);
      contactShadow.position.y += 0.025;
      contactShadow.rotation.y = lion.rotation.z;
      if (lab) lion.trails.visible = lab.trails;
      const target = lab ? worldX(x) : running && cameraPath ? cameraPath.sample(raceTime) : 0;
      const ground = course.profile.sample(-target, 2).height;
      frameCamera(camera, target, ground, lab?.turntable ? time * 0.3 : 0, lab?.closeup);
      stage.followSun(target);
      if (lab && (boneVisible !== lab.bones || wireVisible !== lab.wireframe)) {
        lion.bones.visible = boneVisible = lab.bones;
        lion.wireframe((wireVisible = lab.wireframe));
      }
      lion.getWorldPosition(projected);
      projected.project(camera);
      host.dataset.lionX = String(projected.x);
      host.dataset.raceTime = String(raceTime);
    };
    pose();
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    host.dataset.renderer = '3d';
    host.dataset.quality = tier;
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      host.dataset.context = 'lost';
      options.onError?.('Graphics paused. Restoring the 3D stage…');
    };
    const contextRestored = () => {
      // three.js invalidates GPU state itself; scene geometry retains CPU arrays from cached GLBs.
      void renderer
        .compileAsync(scene, camera)
        .then(() => {
          if (disposed) return;
          lost = false;
          last = performance.now();
          stats.reset();
          host.dataset.context = 'ready';
        })
        .catch(() => options.onError?.('Graphics could not be restored. Reload to retry.'));
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
    host.dataset.context = 'ready';
    const tick = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      const ms = now - last;
      last = now;
      if (lost || document.hidden) return;
      const delta = Math.min(0.05, Math.max(0, ms / 1000));
      if (!options.isPaused()) {
        if (lab) {
          if (!lab.paused) lab.time += delta * lab.speed;
        } else options.onFrame(delta);
      }
      pose();
      renderer.render(scene, camera);
      stats.add(ms);
      clock += delta;
      frames++;
      if (clock >= 1) {
        const percentiles = stats.percentiles();
        options.onMetrics?.({
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          frameMS: (clock * 1000) / frames,
          resolution: renderer.getPixelRatio(),
          ...percentiles,
        });
        // Hysteresis prevents resolution oscillation and ignores one-off warmup frames.
        slowWindows = percentiles.p95 > 22 ? slowWindows + 1 : 0;
        fastWindows = percentiles.p95 < 16 ? fastWindows + 1 : 0;
        if (!lab && slowWindows >= 3 && adaptiveScale > 0.6) {
          adaptiveScale = Math.max(0.6, adaptiveScale - 0.1);
          stage.resolution(adaptiveScale);
          slowWindows = 0;
        }
        if (!lab && fastWindows >= 8 && adaptiveScale < 1) {
          adaptiveScale = Math.min(1, adaptiveScale + 0.1);
          stage.resolution(adaptiveScale);
          fastWindows = 0;
        }
        clock = 0;
        frames = 0;
      }
    };
    last = performance.now();
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestored);
      lion.dispose();
      disposeTree(scene);
      stage.dispose();
      delete host.dataset.renderer;
      delete host.dataset.context;
    };
  }
}
