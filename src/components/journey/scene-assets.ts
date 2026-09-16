"use client";

import { useLayoutEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { configureSharedModelTextures, isSharedModelTexture, releaseSharedModelTextures } from "./shared-model-textures";

type Disposable = THREE.BufferGeometry | THREE.Material | THREE.Texture;
type Lease = { users: number; timer?: ReturnType<typeof setTimeout> };
const leases = new WeakMap<object, Lease>();
const derivatives = new WeakMap<Disposable, Set<Disposable>>();

export function trackAssetDerivative(source: Disposable, resource: Disposable) {
  const resources = derivatives.get(source) ?? new Set<Disposable>();
  resources.add(resource);
  derivatives.set(source, resources);
}

function disposeResources(resources: Set<Disposable>) {
  const collect = (resource: Disposable) => {
    if (resources.has(resource)) return;
    resources.add(resource);
    derivatives.get(resource)?.forEach(collect);
    derivatives.delete(resource);
    if (resource instanceof THREE.Material) {
      Object.values(resource).forEach((value) => { if (value instanceof THREE.Texture) collect(value); });
    }
  };
  const originals = Array.from(resources);
  resources.clear();
  originals.forEach(collect);
  const images = new Set<ImageBitmap>();
  resources.forEach((resource) => {
    if (resource instanceof THREE.Texture && isSharedModelTexture(resource)) return;
    resource.dispose();
    if (resource instanceof THREE.Texture && typeof ImageBitmap !== "undefined" && resource.image instanceof ImageBitmap) images.add(resource.image);
  });
  images.forEach((image) => image.close());
}

function releaseModel(scene: THREE.Object3D) {
  const resources = new Set<Disposable>();
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    resources.add(node.geometry);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => resources.add(material));
    if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
  });
  disposeResources(resources);
  releaseSharedModelTextures(scene);
}

function useAssetLease(asset: object, release: () => void) {
  useLayoutEffect(() => {
    const lease = leases.get(asset) ?? { users: 0 };
    clearTimeout(lease.timer);
    lease.users++;
    leases.set(asset, lease);
    return () => {
      lease.users--;
      if (lease.users !== 0) return;
      // A short grace period covers Strict Mode replay and shared scene handoffs.
      // Disposal is asset-wide, never per tree, person or instanced crowd part.
      lease.timer = setTimeout(() => {
        if (lease.users !== 0) return;
        release();
        leases.delete(asset);
      }, 1000);
    };
  }, [asset, release]);
}

const modelReleases = new WeakMap<THREE.Object3D, () => void>();
const textureReleases = new WeakMap<THREE.Texture, () => void>();

export function useSceneModel(url: string) {
  const model = useGLTF(url, true, true, configureSharedModelTextures);
  let release = modelReleases.get(model.scene);
  if (!release) {
    release = () => { useGLTF.clear(url); releaseModel(model.scene); };
    modelReleases.set(model.scene, release);
  }
  useAssetLease(model.scene, release);
  return model;
}

export function useSceneTexture(url: string, onLoad?: (texture: THREE.Texture) => void) {
  const texture = useTexture(url, onLoad);
  let release = textureReleases.get(texture);
  if (!release) {
    release = () => { useTexture.clear(url); disposeResources(new Set([texture])); };
    textureReleases.set(texture, release);
  }
  useAssetLease(texture, release);
  return texture;
}
