"use client";

/**
 * Shared placeholder people used by every scene.
 * When you build your own 3D characters (GLB from Blender), you can replace
 * any <Person />, <Fighter /> or <Crowd /> in a scene file with your model —
 * see "Use your own 3D" in the README.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { random } from "./camera-path";
import { useNearbyAnimation } from "./use-nearby-animation";

const bodyGeometry = new THREE.CapsuleGeometry(0.17, 0.62, 3, 10);
const headGeometry = new THREE.SphereGeometry(0.14, 12, 10);
const armGeometry = new THREE.CylinderGeometry(0.045, 0.055, 0.55, 6);
const legGeometry = new THREE.CylinderGeometry(0.062, 0.05, 0.56, 6);
const silhouetteMaterial = new THREE.MeshStandardMaterial({ color: "#14151d", roughness: 0.92 });
const skinMaterial = new THREE.MeshStandardMaterial({ color: "#7a4f33", roughness: 0.65 });
const clothMaterials = ["#3d4152", "#5c5347", "#4a5a52", "#6b5747", "#43485e"].map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
);
/* Varied crowd palette — a real festival crowd isn't one dark color. */
const crowdBodyMaterials = [
  "#3d4152", "#5c5347", "#4a5a52", "#6b5747", "#43485e",
  "#7a5a4a", "#2e3d4f", "#6e4a56", "#54604a", "#715d43",
  "#4f4358", "#3a4a44", "#5e5148", "#47525e", "#66503e",
].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
const crowdSkinMaterials = ["#7a4f33", "#8a5a3a", "#6b4429", "#9c6b47", "#5d3d27"].map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
);
const trouserMaterial = new THREE.MeshStandardMaterial({ color: "#2b2823", roughness: 0.95 });

export function Person({ position, rotation = 0, scale = 1, seed = 0, pose = "stand", warm = false }: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  seed?: number;
  pose?: "stand" | "cheer" | "sit" | "toast";
  warm?: boolean;
}) {
  const material = warm ? clothMaterials[Math.floor(random(seed) * clothMaterials.length)] : silhouetteMaterial;
  const head = warm ? skinMaterial : silhouetteMaterial;
  const legs = warm ? trouserMaterial : silhouetteMaterial;
  const sitting = pose === "sit";
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh geometry={bodyGeometry} material={material} position={[0, sitting ? 0.62 : 0.78, 0]} scale={[1, sitting ? 0.72 : 1, 1]} castShadow />
      <mesh geometry={headGeometry} material={head} position={[0, sitting ? 1.12 : 1.36, 0]} castShadow />
      {!sitting && <>
        <mesh geometry={legGeometry} material={legs} position={[-0.09, 0.28, 0]} castShadow />
        <mesh geometry={legGeometry} material={legs} position={[0.09, 0.28, 0]} castShadow />
      </>}
      {sitting && <>
        <mesh geometry={legGeometry} material={legs} position={[-0.09, 0.42, 0.22]} rotation={[1.25, 0, 0]} scale={[1, 0.8, 1]} castShadow />
        <mesh geometry={legGeometry} material={legs} position={[0.09, 0.42, 0.22]} rotation={[1.25, 0, 0]} scale={[1, 0.8, 1]} castShadow />
      </>}
      {pose === "stand" && <>
        <mesh geometry={armGeometry} material={material} position={[-0.25, 1, 0]} rotation={[0, 0, 0.14]} castShadow />
        <mesh geometry={armGeometry} material={material} position={[0.25, 1, 0]} rotation={[0, 0, -0.14]} castShadow />
      </>}
      {pose === "cheer" && <>
        <mesh geometry={armGeometry} material={material} position={[-0.24, 1.28, 0]} rotation={[0, 0, 0.5]} castShadow />
        <mesh geometry={armGeometry} material={material} position={[0.24, 1.28, 0]} rotation={[0, 0, -0.5]} castShadow />
      </>}
      {pose === "toast" && <>
        <mesh geometry={armGeometry} material={material} position={[-0.25, 1, 0]} rotation={[0, 0, 0.14]} castShadow />
        <mesh geometry={armGeometry} material={material} position={[0.26, 1.18, 0.08]} rotation={[0.25, 0, -0.85]} castShadow />
        <mesh position={[0.5, 1.34, 0.14]}>
          <cylinderGeometry args={[0.05, 0.045, 0.15, 8]} />
          <meshStandardMaterial color="#d99a3d" emissive="#c07a1f" emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
      </>}
    </group>
  );
}

export function Fighter({ position, mirror = false, seed = 0 }: { position: [number, number, number]; mirror?: boolean; seed?: number }) {
  const group = useRef<THREE.Group>(null);
  useNearbyAnimation(group, (time) => {
    if (!group.current) return;
    const t = time * 2.1 + seed;
    group.current.position.y = position[1] + Math.abs(Math.sin(t)) * 0.05;
    group.current.rotation.y = (mirror ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * 0.7) * 0.12;
  }, { kind: `fallback-fighter:${seed}`, radius: 2, distance: 22 });
  const shorts = useMemo(() => new THREE.MeshStandardMaterial({ color: mirror ? "#a23a32" : "#2e4a72", roughness: 0.8 }), [mirror]);
  const glove = useMemo(() => new THREE.MeshStandardMaterial({ color: mirror ? "#c04338" : "#28457a", roughness: 0.45 }), [mirror]);
  return (
    <group ref={group} position={position}>
      <group rotation={[0.14, 0, 0]}>
        <mesh geometry={bodyGeometry} material={skinMaterial} position={[0, 0.82, 0]} scale={[1.25, 1.05, 1.15]} castShadow />
        <mesh material={shorts} position={[0, 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.24, 0.32, 10]} />
        </mesh>
        <mesh geometry={legGeometry} material={skinMaterial} position={[-0.14, 0.28, -0.06]} rotation={[-0.18, 0, 0.08]} castShadow />
        <mesh geometry={legGeometry} material={skinMaterial} position={[0.14, 0.28, 0.1]} rotation={[0.22, 0, -0.08]} castShadow />
        <mesh geometry={headGeometry} material={skinMaterial} position={[0, 1.44, 0.05]} castShadow />
        <mesh geometry={armGeometry} material={skinMaterial} position={[-0.24, 1.12, 0.2]} rotation={[1.2, 0, 0.5]} castShadow />
        <mesh geometry={armGeometry} material={skinMaterial} position={[0.24, 1.05, 0.24]} rotation={[1.35, 0, -0.4]} castShadow />
        <mesh material={glove} position={[-0.3, 1.22, 0.44]} castShadow><sphereGeometry args={[0.11, 10, 8]} /></mesh>
        <mesh material={glove} position={[0.3, 1.1, 0.48]} castShadow><sphereGeometry args={[0.11, 10, 8]} /></mesh>
      </group>
    </group>
  );
}

export function Crowd({ count, center, spread, seed, jumping = 0, warm = false, ring = 0 }: {
  count: number;
  center: [number, number];
  spread: [number, number];
  seed: number;
  jumping?: number;
  warm?: boolean;
  ring?: number;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(() => {
    const items: { x: number; z: number; y: number; s: number; r: number; arm: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      const n = seed + i;
      let x: number, z: number;
      if (ring > 0) {
        const angle = random(n) * Math.PI * 2;
        const radius = ring + random(n + 40) * spread[0];
        x = center[0] + Math.cos(angle) * radius;
        z = center[1] + Math.sin(angle) * radius;
      } else {
        x = center[0] + (random(n) - 0.5) * spread[0];
        z = center[1] + (random(n + 20) - 0.5) * spread[1];
      }
      items.push({ x, z, y: 0, s: 0.85 + random(n + 60) * 0.28, r: random(n + 80) * Math.PI * 2, arm: random(n + 99) > 0.55 });
    }
    return items;
  }, [count, center, spread, seed, ring]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const armCount = layout.filter((p) => p.arm).length;

  const place = (time: number) => {
    if (!bodies.current || !heads.current || !arms.current) return;
    let armIndex = 0;
    layout.forEach((p, i) => {
      const bounce = i < jumping ? Math.max(0, Math.sin(time * 2.6 + i * 1.7)) * 0.22 : 0;
      dummy.position.set(p.x, 0.78 * p.s + bounce, p.z);
      dummy.rotation.set(0, p.r, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.36 * p.s + bounce;
      dummy.updateMatrix();
      heads.current!.setMatrixAt(i, dummy.matrix);
      if (p.arm) {
        dummy.position.set(p.x + 0.2 * p.s, 1.32 * p.s + bounce, p.z);
        dummy.rotation.set(0, p.r, -0.35 - Math.sin(time * 2.2 + i) * 0.1);
        dummy.updateMatrix();
        arms.current!.setMatrixAt(armIndex++, dummy.matrix);
      }
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
    arms.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => place(0));
  useNearbyAnimation(bodies, (time) => { if (jumping > 0) place(time); }, {
    kind: `fallback-crowd:${seed}`, enabled: jumping > 0, radius: Math.max(...spread), distance: 22,
  });

  // White base materials so per-instance colors show through (instanceColor multiplies).
  const crowdBase = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }), []);
  const crowdSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), []);
  const armMat = warm ? clothMaterials[seed % clothMaterials.length] : silhouetteMaterial;
  // Give each crowd body/head its own color so the crowd isn't a uniform mass.
  const bodyColor = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => {
    if (!bodies.current || !heads.current) return;
    layout.forEach((p, i) => {
      const bc = crowdBodyMaterials[Math.floor(random(seed + i * 3 + 1) * crowdBodyMaterials.length)].color;
      const sc = crowdSkinMaterials[Math.floor(random(seed + i * 7 + 2) * crowdSkinMaterials.length)].color;
      bodies.current!.setColorAt(i, bodyColor.copy(bc));
      heads.current!.setColorAt(i, bodyColor.copy(sc));
    });
    if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [layout, seed, bodyColor]);
  return <>
    <instancedMesh ref={bodies} args={[bodyGeometry, crowdBase, count]} />
    <instancedMesh ref={heads} args={[headGeometry, crowdSkin, count]} />
    <instancedMesh ref={arms} args={[armGeometry, armMat, Math.max(1, armCount)]} />
  </>;
}
