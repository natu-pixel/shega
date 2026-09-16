import * as THREE from "three";
import type { GLTFLoader, GLTFParser } from "three-stdlib";

type SharedTexture = { promise: Promise<THREE.Texture>; users: number };
const textures = new Map<string, SharedTexture>();
const shared = new WeakSet<THREE.Texture>();
const modelReleases = new WeakMap<THREE.Object3D, () => void>();

function disposeTexture(texture: THREE.Texture) {
  texture.dispose();
  if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
}

function acquireTexture(key: string, load: () => Promise<THREE.Texture>) {
  let entry = textures.get(key);
  if (!entry) {
    entry = { users: 0, promise: load().then((texture) => {
      if (!texture) throw new Error(`Could not load shared model texture: ${key}`);
      shared.add(texture);
      return texture;
    }) };
    textures.set(key, entry);
  }
  entry.users++;
  const owned = entry;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    owned.users--;
    if (owned.users !== 0) return;
    if (textures.get(key) === owned) textures.delete(key);
    // The acquisition reports load errors; a failed load has no GPU resource to dispose.
    void owned.promise.then(disposeTexture, () => {});
  };
  return { promise: owned.promise, release };
}

function sharedTexturePlugin(parser: GLTFParser) {
  const acquired = new Map<string, ReturnType<typeof acquireTexture>>();
  const release = () => { acquired.forEach((entry) => entry.release()); acquired.clear(); };
  const parse = parser.parse.bind(parser);
  parser.parse = (onLoad, onError) => parse(onLoad, (error) => {
    release();
    if (onError) onError(error);
    else throw error;
  });
  return {
    name: "SHEGA_shared_model_textures",
    loadTexture(index: number) {
      const key: unknown = parser.json.textures?.[index]?.extras?.shegaSharedTexture;
      if (typeof key !== "string") return null;
      let entry = acquired.get(key);
      if (!entry) {
        entry = acquireTexture(key, () => parser.loadTexture(index));
        acquired.set(key, entry);
      }
      return entry.promise;
    },
    afterRoot(result: { scene: THREE.Group }) {
      if (acquired.size) modelReleases.set(result.scene, release);
      return null;
    },
  };
}

export function configureSharedModelTextures(loader: GLTFLoader) {
  loader.register(sharedTexturePlugin);
}

export function isSharedModelTexture(texture: THREE.Texture) {
  return shared.has(texture);
}

export function releaseSharedModelTextures(scene: THREE.Object3D) {
  modelReleases.get(scene)?.();
  modelReleases.delete(scene);
}
