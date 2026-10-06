import {
  AgXToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { pixelRatio, TIERS, type QualityTier } from './quality';

export function createStage(host: HTMLElement, tier: QualityTier) {
  const renderer = new WebGLRenderer({
    antialias: TIERS[tier].antialias,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = tier !== 'low';
  renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  scene.background = new Color('#9FD3E6');
  scene.fog = new FogExp2('#8FB8A8', 0.014);
  const camera = new PerspectiveCamera(30, 1, 0.1, 240);
  const sun = new DirectionalLight('#FFF0D0', 3.0);
  sun.castShadow = tier !== 'low';
  sun.shadow.mapSize.setScalar(TIERS[tier].shadowSize || 512);
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
    near: 1,
    far: 80,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target, new HemisphereLight('#DCEFF2', '#6A7040', 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'V3 development preview: lion blockout and greybox course');
  host.appendChild(canvas);
  let resolutionScale = 1;
  const resize = () => {
    const width = Math.max(1, host.clientWidth),
      height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(pixelRatio(tier, window.devicePixelRatio || 1, resolutionScale));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  return {
    renderer,
    scene,
    camera,
    followSun(x: number) {
      sun.position.set(x - 12, 24, 10);
      sun.target.position.set(x, 0, 0);
      sun.target.updateMatrixWorld();
    },
    resolution(scale: number) {
      resolutionScale = scale;
      resize();
    },
    dispose() {
      observer.disconnect();
      sun.shadow.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
