"use client";

import { Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { trackAssetDerivative, useSceneModel } from "./scene-assets";

// The shared-people builds keep the original geometry but reference one pooled
// set of ten images, so hero + standard decode each texture once, not twice.
export const FESTIVAL_PEOPLE_URL = "/models/shared-people/standard.glb";
export const FESTIVAL_PEOPLE_HERO_URL = "/models/shared-people/hero.glb";
export const FESTIVAL_PEOPLE_FAR_URL = "/models/festival-people-far.glb";
export const FESTIVAL_PERSON_LOD_DISTANCE = 12;
export const FESTIVAL_VARIANTS = [
  "manuel-hands-up",
  "manuel-groove",
  "red-hands-up",
  "red-groove",
  "kandace-hands-up",
  "kandace-groove",
  "manuel-work",
  "manuel-stand",
  "red-stand",
  "kandace-stand",
  "red-work",
  "kandace-work",
] as const;
export const FESTIVAL_DANCE_VARIANTS = FESTIVAL_VARIANTS.slice(0, 6);
export const FESTIVAL_CHARACTERS = ["manuel", "red", "kandace"] as const;

export type FestivalVariant = (typeof FESTIVAL_VARIANTS)[number];
export type FestivalCharacter = (typeof FESTIVAL_CHARACTERS)[number] | "man" | "woman";
export type FestivalPose = "dance" | "hands-up" | "work" | "stand";
export type FestivalSelection = FestivalVariant | FestivalCharacter | number;
export type FestivalPersonAnchors = {
  leftHand: [number, number, number];
  rightHand: [number, number, number];
  head: [number, number, number];
  headTop: [number, number, number];
  chest: [number, number, number];
};
export type FestivalPersonPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};
export type FestivalPersonProps = {
  position?: [number, number, number];
  lookAt?: [number, number];
  rotationY?: number;
  /** Adult standing height in metres, independent of raised hands or bent knees. */
  height?: number;
  /** Numbers select Manuel, Red, Kandace modulo three; exact node names also work. */
  variant?: FestivalSelection;
  pose?: FestivalPose;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Auto selects hero geometry within 12m, standard beyond, without animation. */
  quality?: "auto" | "hero" | "standard";
  /** Attachments use the same one-metre normalized coordinate system. */
  children?: ReactNode | ((anchors: FestivalPersonAnchors) => ReactNode);
  accessories?: Partial<Record<keyof FestivalPersonAnchors, ReactNode>>;
};

const partCache = new WeakMap<THREE.Object3D, Map<FestivalVariant, FestivalPersonPart[]>>();
const materialCache = new WeakMap<THREE.Material, THREE.Material>();

function litCharacterMaterial(source: THREE.Material) {
  const existing = materialCache.get(source);
  if (existing) return existing;
  const hair = source.name === "Hairmat" || source.name === "braid01";
  let material = source;
  if (source instanceof THREE.MeshBasicMaterial) {
    material = new THREE.MeshStandardMaterial({
      name: source.name,
      color: source.color,
      map: source.map,
      roughness: 0.85,
      metalness: 0,
      alphaMap: source.alphaMap,
      opacity: source.opacity,
      transparent: !hair && source.transparent,
      alphaTest: hair ? 0.4 : source.alphaTest,
      side: hair ? THREE.DoubleSide : source.side,
    });
  } else if (hair && source instanceof THREE.MeshStandardMaterial) {
    material = source.clone();
    material.alphaTest = 0.4;
  }
  if (source.name === "Hairmat" && material instanceof THREE.MeshStandardMaterial) material.color.set("#302822");
  if (material !== source) trackAssetDerivative(source, material);
  materialCache.set(source, material);
  return material;
}

export function festivalVariantName(variant: FestivalSelection = 0, pose: FestivalPose = "dance"): FestivalVariant {
  if (typeof variant === "string" && FESTIVAL_VARIANTS.includes(variant as FestivalVariant)) return variant as FestivalVariant;
  let character: (typeof FESTIVAL_CHARACTERS)[number];
  if (typeof variant === "number") {
    if (!Number.isFinite(variant)) throw new Error("Festival character index must be finite.");
    const index = Math.trunc(variant);
    character = FESTIVAL_CHARACTERS[((index % 3) + 3) % 3];
  } else {
    character = variant === "man" ? "manuel" : variant === "woman" ? "red" : variant as (typeof FESTIVAL_CHARACTERS)[number];
  }
  return `${character}-${pose === "dance" ? "groove" : pose}` as FestivalVariant;
}

export function festivalPersonAnchors(scene: THREE.Object3D, variant: FestivalSelection = 0, pose?: FestivalPose): FestivalPersonAnchors {
  const name = festivalVariantName(variant, pose);
  const node = scene.getObjectByName(name);
  if (!node) throw new Error(`Missing static festival pose: ${name}`);
  return node.userData as FestivalPersonAnchors;
}

/** Shared static parts may be passed straight to InstancedMesh; never dispose them per guest. */
export function festivalPersonParts(scene: THREE.Object3D, variant: FestivalSelection = 0, pose?: FestivalPose): FestivalPersonPart[] {
  const name = festivalVariantName(variant, pose);
  const cache = partCache.get(scene) ?? new Map<FestivalVariant, FestivalPersonPart[]>();
  const existing = cache.get(name);
  if (existing) return existing;
  const root = scene.getObjectByName(name);
  if (!root) throw new Error(`Missing static festival pose: ${name}`);
  const parts: FestivalPersonPart[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) parts.push({
      geometry: node.geometry,
      material: Array.isArray(node.material) ? node.material.map(litCharacterMaterial) : litCharacterMaterial(node.material),
    });
  });
  if (!parts.length) throw new Error(`Empty static festival pose: ${name}`);
  cache.set(name, parts);
  partCache.set(scene, cache);
  return parts;
}

function PersonMeshes({ parts, castShadow, receiveShadow }: {
  parts: FestivalPersonPart[];
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  return parts.map((part, index) => (
    <mesh key={index} geometry={part.geometry} material={part.material} castShadow={castShadow} receiveShadow={receiveShadow} dispose={null} />
  ));
}

function PersonLOD({ heroParts, variant, pose, castShadow, receiveShadow }: {
  heroParts: FestivalPersonPart[];
  variant: FestivalSelection;
  pose?: FestivalPose;
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  const { scene } = useSceneModel(FESTIVAL_PEOPLE_URL);
  const standardParts = useMemo(() => festivalPersonParts(scene, variant, pose), [scene, variant, pose]);
  const ref = useRef<THREE.LOD>(null);
  useLayoutEffect(() => {
    const lod = ref.current;
    if (!lod) return;
    const [hero, standard] = lod.children;
    lod.levels.length = 0;
    lod.addLevel(hero, 0);
    lod.addLevel(standard, FESTIVAL_PERSON_LOD_DISTANCE, 0.12);
    return () => { lod.levels.length = 0; };
  }, []);
  // WebGLRenderer updates native LOD visibility; no per-person frame callback,
  // React state, animation mixer, or duplicated accessory subtree is needed.
  return (
    <lOD ref={ref} autoUpdate>
      <group><PersonMeshes parts={heroParts} castShadow={castShadow} receiveShadow={receiveShadow} /></group>
      <group><PersonMeshes parts={standardParts} castShadow={castShadow} receiveShadow={receiveShadow} /></group>
    </lOD>
  );
}

function LoadedFestivalPerson({
  position = [0, 0, 0],
  lookAt,
  rotationY = 0,
  height = 1.75,
  variant = 0,
  pose,
  castShadow = true,
  receiveShadow = true,
  quality = "auto",
  children,
  accessories,
}: FestivalPersonProps) {
  const { scene } = useSceneModel(quality === "standard" ? FESTIVAL_PEOPLE_URL : FESTIVAL_PEOPLE_HERO_URL);
  const parts = useMemo(() => festivalPersonParts(scene, variant, pose), [scene, variant, pose]);
  const anchors = useMemo(() => festivalPersonAnchors(scene, variant, pose), [scene, variant, pose]);
  const yaw = lookAt ? Math.atan2(lookAt[0] - position[0], lookAt[1] - position[2]) : rotationY;
  return (
    <group name={festivalVariantName(variant, pose)} position={position} rotation={[0, yaw, 0]} scale={height}>
      {quality === "auto"
        ? <PersonLOD heroParts={parts} variant={variant} pose={pose} castShadow={castShadow} receiveShadow={receiveShadow} />
        : <PersonMeshes parts={parts} castShadow={castShadow} receiveShadow={receiveShadow} />}
      {typeof children === "function" ? children(anchors) : children}
      {accessories && (Object.keys(accessories) as (keyof FestivalPersonAnchors)[]).map((anchor) => (
        <group key={anchor} position={anchors[anchor]}>{accessories[anchor]}</group>
      ))}
    </group>
  );
}

export function FestivalPerson(props: FestivalPersonProps) {
  return <Suspense fallback={null}><LoadedFestivalPerson {...props} /></Suspense>;
}
