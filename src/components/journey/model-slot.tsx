"use client";

/**
 * MODEL SLOT — drop-in replacement for procedural placeholder geometry.
 *
 * Put a GLB in public/models (see DOWNLOAD-THESE.txt there) and the real model
 * renders instead of `fallback`. Until the file exists (or if it fails to load),
 * the fallback stays on screen, so the site never breaks.
 *
 * `fitHeight` rescales whatever the artist exported (Sketchfab models come in
 * random units) to the height our world expects, sitting on y = 0.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { journeyModelUrl } from "@/lib/journey-models";
import { trackAssetDerivative, useSceneModel } from "./scene-assets";

type ModelSlotProps = {
  /** Path under /public, e.g. "/models/cage.glb" (unpacked scene.gltf sets also work) */
  url: string;
  /** Target real-world height in meters after auto-scaling. */
  fitHeight: number;
  /** Ground position of the model's center. */
  position?: [number, number, number];
  rotationY?: number;
  /** Rendered instead of the model while it is missing or loading. */
  fallback: React.ReactNode;
  /** Extra tweak applied to every mesh, e.g. tinting a cloned fighter. */
  mutate?: (root: THREE.Object3D) => void;
  /**
   * Split one file into several independently placed characters/props by
   * matching top-level node names, e.g. instances={[{ match: "Body_2", position: [...] }]}.
   * When set, `position`/`rotationY` on the slot itself are ignored.
   */
  instances?: { match: string; position: [number, number, number]; rotationY?: number; mutate?: (root: THREE.Object3D) => void }[];
};

const modelChecks = new Map<string, Promise<boolean>>();

export function useModelExists(url: string) {
  const [exists, setExists] = useState(false);
  useEffect(() => {
    let active = true;
    let check = modelChecks.get(url);
    if (!check) {
      // Do not download a multi-megabyte model once per tree or meat placement
      // merely to check it exists. GLTFLoader owns the shared body download.
      check = fetch(url, { method: "HEAD" }).then((res) => {
        if (!res.ok) console.warn(`Model ${url} is unavailable (${res.status}); showing its placeholder.`);
        return res.ok;
      }, (error: unknown) => {
        console.error(`Could not check model ${url}; showing its placeholder.`, error);
        return false;
      });
      modelChecks.set(url, check);
    }
    check.then((available) => { if (active) setExists(available); });
    return () => { active = false; };
  }, [url]);
  return exists;
}

/** Recenter a (possibly cloned) subtree: uniform scale to fitHeight, base on y=0, centered on x/z. */
function fitToHeight(root: THREE.Object3D, fitHeight: number) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0.0001 || !Number.isFinite(fitHeight) || fitHeight <= 0) throw new Error("Model height must be finite and positive.");
  const scale = fitHeight / size.y;
  root.scale.multiplyScalar(scale);
  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  root.position.sub(new THREE.Vector3(center.x, scaledBox.min.y, center.z));
}

/**
 * Sanitize a loaded material into a plain MeshStandardMaterial. Sketchfab exports
 * sometimes carry shader extensions (KHR_materials_specular, etc.) that fail to
 * compile in some WebGL contexts and take the whole canvas down. Rebuilding as a
 * clean standard material keeps base color + emissive and always renders.
 */
const sanitizedMaterials = new WeakMap<THREE.Material, THREE.Material>();

function sanitizeMaterial(material: THREE.Material): THREE.Material {
  const cached = sanitizedMaterials.get(material);
  if (cached) return cached;
  const src = material as THREE.MeshStandardMaterial;
  const hasAlphaMap = Boolean(src.map || src.alphaMap) && (src.alphaTest ?? 0) > 0;
  const clean = new THREE.MeshStandardMaterial({
    color: src.color ? src.color.clone() : new THREE.Color("#b9bcc4"),
    map: src.map ?? null,
    emissive: src.emissive ? src.emissive.clone() : new THREE.Color("#000000"),
    emissiveMap: src.emissiveMap ?? null,
    emissiveIntensity: src.emissiveIntensity ?? 1,
    roughness: src.roughness ?? 0.7,
    roughnessMap: src.roughnessMap ?? null,
    metalness: src.metalness ?? 0,
    metalnessMap: src.metalnessMap ?? null,
    normalMap: src.normalMap ?? null,
    normalScale: src.normalScale?.clone(),
    aoMap: src.aoMap ?? null,
    aoMapIntensity: src.aoMapIntensity ?? 1,
    transparent: src.transparent === true && (src.opacity ?? 1) < 1,
    opacity: src.opacity ?? 1,
    // Preserve alpha-cutout foliage (acacia leaves, grass cards) — without this
    // leaf textures render as solid blobs. DoubleSide so thin cards read from behind.
    alphaTest: hasAlphaMap ? Math.max(src.alphaTest ?? 0, 0.35) : 0,
    alphaMap: src.alphaMap ?? null,
    side: hasAlphaMap ? THREE.DoubleSide : src.side,
  });
  clean.name = src.name;
  sanitizedMaterials.set(material, clean);
  trackAssetDerivative(material, clean);
  return clean;
}

function GltfModel({ url, fitHeight, mutate }: Pick<ModelSlotProps, "url" | "fitHeight" | "mutate">) {
  const { scene } = useSceneModel(url);
  const prepared = useMemo(() => {
    // Clone so the same file (e.g. one fighter) can be placed twice independently.
    const root = SkeletonUtils.clone(scene);
    const materials = new Map<THREE.Material, THREE.Material>();
    const sharedMaterial = (source: THREE.Material) => {
      let clean = materials.get(source);
      if (!clean) {
        clean = sanitizeMaterial(source);
        if (mutate) {
          clean = clean.clone();
          trackAssetDerivative(source, clean);
        }
        materials.set(source, clean);
      }
      return clean;
    };
    // Strip baked-in cameras/lights from Sketchfab exports — our scene owns lighting.
    const junk: THREE.Object3D[] = [];
    root.traverse((node) => {
      if (node instanceof THREE.Camera || node instanceof THREE.Light) junk.push(node);
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.material = Array.isArray(node.material)
          ? node.material.map(sharedMaterial)
          : sharedMaterial(node.material);
      }
    });
    junk.forEach((node) => node.parent?.remove(node));
    fitToHeight(root, fitHeight);
    mutate?.(root);
    return root;
  }, [scene, fitHeight, mutate]);
  return <primitive object={prepared} dispose={null} />;
}

/** Renders selected top-level nodes of a glTF as separately placed instances. */
function GltfInstances({ url, fitHeight, instances }: Pick<ModelSlotProps, "url" | "fitHeight" | "instances">) {
  const { scene } = useSceneModel(url);
  const groups = useMemo(() => {
    if (!instances) return [];
    const junk: THREE.Object3D[] = [];
    scene.traverse((node) => {
      if ((node as THREE.Camera).isCamera || (node as THREE.Light).isLight) junk.push(node);
    });
    junk.forEach((node) => node.parent?.remove(node));
    const roots: THREE.Object3D[] = [];
    const walk = (node: THREE.Object3D) => {
      if (instances.some((inst) => node.name.includes(inst.match))) roots.push(node);
      else node.children.forEach(walk);
    };
    scene.children.forEach(walk);
    return instances.map((inst, i) => {
      const matches = roots.filter((root) => root.name.includes(inst.match));
      const source = matches[i % Math.max(1, matches.length)] ?? scene;
      const clone = SkeletonUtils.clone(source);
      clone.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      fitToHeight(clone, fitHeight);
      inst.mutate?.(clone);
      return { key: `${inst.match}-${i}`, node: clone, position: inst.position, rotationY: inst.rotationY ?? 0 };
    });
  }, [scene, fitHeight, instances]);
  return (
    <>
      {groups.map((group) => (
        <group key={group.key} position={group.position} rotation={[0, group.rotationY, 0]}>
          <primitive object={group.node} />
        </group>
      ))}
    </>
  );
}

export function ModelSlot({ url, fitHeight, position = [0, 0, 0], rotationY = 0, fallback, mutate, instances }: ModelSlotProps) {
  const resolvedUrl = journeyModelUrl(url);
  const exists = useModelExists(resolvedUrl);
  if (!exists) return <group position={position} rotation={[0, rotationY, 0]}>{fallback}</group>;
  if (instances) {
    return (
      <Suspense fallback={<group position={position} rotation={[0, rotationY, 0]}>{fallback}</group>}>
        <GltfInstances url={resolvedUrl} fitHeight={fitHeight} instances={instances} />
      </Suspense>
    );
  }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Suspense fallback={fallback}>
        <GltfModel url={resolvedUrl} fitHeight={fitHeight} mutate={mutate} />
      </Suspense>
    </group>
  );
}
