import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
/** Keep CPU-side source data for context restore; callers own cloned scene resources. */
const cache = new Map<string, Promise<GLTF>>();
export function loadGLB(name: string) {
  let pending = cache.get(name);
  if (!pending) {
    pending = loader.loadAsync(`${import.meta.env.BASE_URL}assets/3d/${name}.glb`);
    cache.set(name, pending);
    pending.catch(() => cache.delete(name));
  }
  return pending;
}
