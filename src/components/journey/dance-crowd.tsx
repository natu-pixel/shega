"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { trackAssetDerivative, useSceneModel } from "./scene-assets";
import { random, sampleCamera } from "./camera-path";
import { facingTarget } from "./posed-people";
import { FESTIVAL_DANCE_VARIANTS, FESTIVAL_PEOPLE_FAR_URL, FESTIVAL_PEOPLE_URL, festivalPersonParts, type FestivalVariant } from "./festival-person";

const WARDROBE_COLORS = ["#c96946", "#dfb548", "#409d87", "#547fbb", "#9064a7", "#d67c99", "#e9dec2", "#58734b"];
const BERMEL_POSES: readonly FestivalVariant[] = [
  "manuel-stand", "red-stand", "kandace-stand",
  "manuel-groove", "red-groove", "kandace-groove",
  "manuel-hands-up", "red-hands-up", "kandace-hands-up",
];
const BERMEL_WARDROBE = ["#35404a", "#5b514a", "#b7ac92", "#2f4138", "#71413b", "#73607b", "#596c79", "#bd925e"];

// The Bermel camera flight (progress 0 → 0.31): orbit the stage, then travel
// down the crowd's center line. Guests beyond arm's-length of this whole route
// can never fill the screen, so they render as the decimated far build.
let bermelRoute: THREE.Vector3[] | null = null;
function nearBermelRoute(guest: CrowdPlacement) {
  bermelRoute ??= Array.from({ length: 311 }, (_, index) => {
    const eye = new THREE.Vector3();
    sampleCamera(index * 0.001, eye, new THREE.Vector3());
    return eye;
  });
  const chest = new THREE.Vector3(guest.position[0], guest.position[1] + guest.height * 0.6, guest.position[2]);
  return bermelRoute.some((eye) => eye.distanceToSquared(chest) < 5.5 * 5.5);
}
export type CrowdPlacement = { position: [number, number, number]; height: number; variant: number; wardrobe: string };
type WardrobePart = { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial };
const wardrobeCache = new WeakMap<THREE.BufferGeometry, WeakMap<THREE.Material, WardrobePart>>();

export function crowdPlacements(count: number, center: [number, number], spread: [number, number], seed: number, variants: readonly FestivalVariant[] = FESTIVAL_DANCE_VARIANTS): CrowdPlacement[] {
  if (!variants.length) throw new Error("Crowd placements need at least one pose.");
  const cols = Math.floor(spread[0] / 0.82), rows = Math.floor(spread[1] / 0.88);
  const slots: { position: [number, number, number]; order: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const n = seed + row * cols + col;
      const x = center[0] + (col + 0.5) * spread[0] / cols - spread[0] / 2 + (random(n) - 0.5) * 0.22;
      const z = center[1] + (row + 0.5) * spread[1] / rows - spread[1] / 2 + (random(n + 700) - 0.5) * 0.22;
      slots.push({ position: [x, 0.025, z], order: random(n + 1200) });
    }
  }
  if (slots.length < count) throw new Error(`Crowd area fits ${slots.length} guests, not ${count}.`);
  return slots.sort((a, b) => a.order - b.order).slice(0, count).map((slot, i) => ({
    position: slot.position, height: 1.62 + random(seed + i + 80) * 0.25, variant: i % variants.length,
    wardrobe: WARDROBE_COLORS[Math.floor(random(seed + i + 1900) * WARDROBE_COLORS.length)],
  }));
}

function wardrobePart(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): WardrobePart | null {
    if (!(material instanceof THREE.MeshStandardMaterial)) return null;
    const body = material.name === "rp_manuel_animated_001_mat";
    if (!body && material.name !== "f_dress_01" && material.name !== "Topmat") return null;
    const cache = wardrobeCache.get(geometry) ?? new WeakMap<THREE.Material, WardrobePart>();
    const existing = cache.get(material);
    if (existing) return existing;
    const tintedGeometry = geometry.clone();
    const positions = geometry.getAttribute("position");
    const mask = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i), x = Math.abs(positions.getX(i));
      mask[i] = body
        ? THREE.MathUtils.smoothstep(y, 0.49, 0.57)
          * (1 - THREE.MathUtils.smoothstep(y, 0.77, 0.83))
          * (1 - THREE.MathUtils.smoothstep(x, 0.15, 0.22))
        : 1;
    }
    tintedGeometry.setAttribute("wardrobeMask", new THREE.BufferAttribute(mask, 1));
    const tintedMaterial = material.clone();
    tintedMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.protectSkin = { value: body ? 1 : 0 };
      shader.vertexShader = "attribute float wardrobeMask;\nvarying float vWardrobeMask;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWardrobeMask = wardrobeMask;");
      shader.fragmentShader = "uniform float protectSkin;\nvarying float vWardrobeMask;\n" + shader.fragmentShader;
      // Recolor fabric only. Source texture detail survives; faces, hands, hair
      // and the body mesh's warm skin pixels retain their original colours.
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
        vec3 originalSurface = diffuseColor.rgb;
        #include <color_fragment>
        #ifdef USE_COLOR
          float fabricLight = max(originalSurface.r, max(originalSurface.g, originalSurface.b));
          float warmSkin = step(originalSurface.g * 1.18, originalSurface.r) * step(originalSurface.b * 1.12, originalSurface.g);
          float fabricMask = vWardrobeMask * (1.0 - warmSkin * protectSkin);
          diffuseColor.rgb = mix(originalSurface, vColor.rgb * fabricLight * 1.5, fabricMask);
        #endif
      `);
    };
    tintedMaterial.customProgramCacheKey = () => "festival-wardrobe-v1";
    const part = { geometry: tintedGeometry, material: tintedMaterial };
    trackAssetDerivative(geometry, tintedGeometry);
    trackAssetDerivative(material, tintedMaterial);
    cache.set(material, part);
    wardrobeCache.set(geometry, cache);
    return part;
}

function CrowdBatch({ geometry, material, placements, target, shadows }: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  placements: readonly CrowdPlacement[];
  target: [number, number];
  shadows: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [targetX, targetZ] = target;
  const wardrobe = useMemo(() => wardrobePart(geometry, material), [geometry, material]);
  useEffect(() => {
    const mesh = ref.current;
    return () => { mesh?.dispose(); };
  }, [geometry, material, wardrobe, placements.length]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < placements.length; i++) {
      const guest = placements[i];
      dummy.position.fromArray(guest.position);
      dummy.rotation.y = facingTarget(guest.position, [targetX, targetZ]);
      dummy.scale.setScalar(guest.height);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (wardrobe) mesh.setColorAt(i, color.set(guest.wardrobe));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [placements, targetX, targetZ, wardrobe]);
  return <instancedMesh ref={ref} args={[wardrobe?.geometry ?? geometry, wardrobe?.material ?? material, placements.length]} castShadow={shadows} receiveShadow={shadows} dispose={null} />;
}

/** Static custom crowds, batched by pose/material and spatial cells for culling. */
export function FestivalCrowdInstances({ placements, target, detail = "standard", shadows = detail !== "far", variants = FESTIVAL_DANCE_VARIANTS }: {
  placements: readonly CrowdPlacement[];
  target: [number, number];
  detail?: "standard" | "far";
  shadows?: boolean;
  variants?: readonly FestivalVariant[];
}) {
  const { scene } = useSceneModel(detail === "far" ? FESTIVAL_PEOPLE_FAR_URL : FESTIVAL_PEOPLE_URL);
  const batches = useMemo(() => {
    if (!variants.length) throw new Error("Instanced crowds need at least one pose.");
    const groups = new Map<string, { variant: number; placements: CrowdPlacement[] }>();
    for (const guest of placements) {
      if (!Number.isFinite(guest.variant) || !Number.isFinite(guest.height) || guest.height <= 0 || !guest.position.every(Number.isFinite)) {
        throw new Error("Crowd placements need finite coordinates, positive adult height and a finite variant.");
      }
      const variant = ((Math.trunc(guest.variant) % variants.length) + variants.length) % variants.length;
      const [x, y, z] = guest.position;
      const key = `${Math.floor(x / 24)}:${Math.floor(y / 6)}:${Math.floor(z / 24)}:${variant}`;
      const batch = groups.get(key) ?? { variant, placements: [] };
      batch.placements.push(guest);
      groups.set(key, batch);
    }
    return Array.from(groups, ([key, batch]) => ({
      key,
      parts: festivalPersonParts(scene, variants[batch.variant]),
      placements: batch.placements,
    }));
  }, [scene, placements, variants]);
  return <group name={`festival-static-instances-${detail}`}>{batches.map((batch) => (
    <group key={batch.key}>{batch.parts.map((part, i) => (
      <CrowdBatch key={i} {...part} placements={batch.placements} target={target} shadows={shadows} />
    ))}</group>
  ))}</group>;
}

/** Mostly standing spectators, with scattered frozen cheers rather than synchronized poses. */
export function FestivalCrowd({ count = 520, center, spread, seed = 11, target }: {
  count?: number; center: [number, number]; spread: [number, number]; seed?: number; target: [number, number];
}) {
  const [cx, cz] = center, [sx, sz] = spread;
  const placements = useMemo(() => crowdPlacements(count, [cx, cz], [sx, sz], seed, BERMEL_POSES).map((guest, i) => {
    const pose = random(seed + i + 2400);
    const poseGroup = pose < 0.6 ? 0 : pose < 0.85 ? 3 : 6;
    return {
      ...guest,
      variant: poseGroup + i % 3,
      wardrobe: BERMEL_WARDROBE[Math.floor(random(seed + i + 1900) * BERMEL_WARDROBE.length)],
    };
  }), [count, cx, cz, sx, sz, seed]);
  // Guests the camera never gets close to use the far build (~5x fewer
  // triangles); the hall's warm haze hides the difference at that range.
  const { near, distant } = useMemo(() => {
    const near: CrowdPlacement[] = [], distant: CrowdPlacement[] = [];
    for (const guest of placements) (nearBermelRoute(guest) ? near : distant).push(guest);
    return { near, distant };
  }, [placements]);
  return <group name="bermel-static-audience">
    <FestivalCrowdInstances placements={near} target={target} shadows={false} variants={BERMEL_POSES} />
    <FestivalCrowdInstances placements={distant} target={target} detail="far" variants={BERMEL_POSES} />
  </group>;
}
