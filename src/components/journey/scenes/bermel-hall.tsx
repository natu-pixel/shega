"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { HardwareBatch, Truss } from "../stage-hardware";
import { random } from "../camera-path";

type Point = [number, number, number];

function transform(position: Point, scale: Point, rotation: Point = [0, 0, 0]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
}

function ceilingDrapes() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const ribbon = (from: [number, number], to: [number, number], width: number, drop: number, seed: number) => {
    const dx = to[0] - from[0], dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    const base = positions.length / 3;
    const segments = 40, folds = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const sag = Math.pow(Math.sin(t * Math.PI), 0.8);
      for (let j = 0; j <= folds; j++) {
        const v = j / folds;
        const across = (v - 0.5) * width * (0.18 + sag * 0.82);
        const pleat = Math.cos(v * Math.PI * 6 + t * 1.4 + seed);
        positions.push(
          from[0] + dx * t - dz / length * across,
          8.8 - sag * drop + pleat * 0.055 * sag + across * 0.3,
          from[1] + dz * t + dx / length * across + sag * Math.sin(seed) * 0.25,
        );
        const shade = 0.72 + pleat * 0.13 + Math.sin(v * Math.PI) * 0.15;
        colors.push(shade, shade, shade);
        if (i < segments && j < folds) {
          const a = base + i * (folds + 1) + j, b = a + folds + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
  };
  [3.6, -1.5, -6.6, -11.7, -16.8, -22].forEach((z, i) => {
    ribbon([-14.2, z], [0, z - 1], 1.6, 2.3 + random(i) * 0.5, i);
    ribbon([0, z - 1], [14.2, z + 0.4], 1.5, 2.1 + random(i + 20) * 0.5, i + 1);
    ribbon([-14.2, z - 0.4], [0, z - 1.4], 0.55, 2.75 + random(i) * 0.5, i + 3);
    ribbon([0, z - 1.4], [14.2, z], 0.5, 2.55 + random(i + 20) * 0.5, i + 4);
  });
  for (const x of [-10.5, 10.5]) {
    for (let i = 0; i < 3; i++) ribbon([x, 4 - i * 9.5], [x, 4 - (i + 1) * 9.5], 0.55, 1.4, i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function hallResources() {
  const curtain = new THREE.PlaneGeometry(32, 9.4, 160, 1);
  const vertices = curtain.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) vertices.setZ(i, Math.cos(vertices.getX(i) * 8.5) * 0.09);
  curtain.computeVertexNormals();
  const globe = new THREE.SphereGeometry(0.28, 24, 16);
  const globeVertices = globe.getAttribute("position");
  for (let i = 0; i < globeVertices.count; i++) {
    const rib = 1 + Math.cos(Math.acos(THREE.MathUtils.clamp(globeVertices.getY(i) / 0.28, -1, 1)) * 28) * 0.035;
    globeVertices.setX(i, globeVertices.getX(i) * rib);
    globeVertices.setZ(i, globeVertices.getZ(i) * rib);
  }
  globe.computeVertexNormals();
  const paperPixels = new Uint8Array(2 * 128 * 4);
  for (let y = 0; y < 128; y++) {
    const rib = Math.pow(Math.max(0, Math.cos(y / 128 * Math.PI * 32)), 8);
    const shade = Math.round(242 - rib * 50);
    for (let x = 0; x < 2; x++) paperPixels.set([shade, shade, shade, 255], (y * 2 + x) * 4);
  }
  const paperTexture = new THREE.DataTexture(paperPixels, 2, 128);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.magFilter = THREE.LinearFilter;
  paperTexture.minFilter = THREE.LinearFilter;
  paperTexture.needsUpdate = true;
  return {
    curtain, globe, paperTexture, drapes: ceilingDrapes(),
    tube: new THREE.CylinderGeometry(1, 1, 1, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    black: new THREE.MeshStandardMaterial({ color: "#141413", roughness: 0.96, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: "#444340", metalness: 0.72, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: "#c12e20", emissive: "#601709", emissiveIntensity: 0.24, roughness: 0.85, vertexColors: true, side: THREE.DoubleSide }),
    paper: new THREE.MeshStandardMaterial({ color: "#eee6cd", map: paperTexture, emissive: "#ddd7bc", emissiveMap: paperTexture, emissiveIntensity: 0.65, roughness: 1, toneMapped: false }),
  };
}

export function BermelHall() {
  const resources = useMemo(() => hallResources(), []);
  useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources]);
  const layout = useMemo(() => {
    const globes: THREE.Matrix4[] = [], cords: THREE.Matrix4[] = [], caps: THREE.Matrix4[] = [];
    const fixtures: THREE.Matrix4[] = [], lenses: THREE.Matrix4[] = [], rails: THREE.Matrix4[] = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const seed = row * 5 + col;
        const x = (col - 2) * 5.3 + (row % 2 ? 0.65 : -0.65);
        const z = 1.7 - row * 4.9;
        const y = 5.5 + random(seed + 85) * 1.5;
        globes.push(transform([x, y, z], [1, 1.05, 1]));
        cords.push(transform([x, (9.2 + y + 0.3) / 2, z], [0.007, 9.2 - y - 0.3, 0.007]));
        caps.push(transform([x, y + 0.28, z], [0.065, 0.045, 0.065]));
        caps.push(transform([x, y - 0.28, z], [0.055, 0.025, 0.055]));
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 2.5;
      fixtures.push(transform([x, 7.45, -3.3], [0.21, 0.46, 0.21], [0.45, 0, 0]));
      lenses.push(transform([x, 7.24, -3.4], [0.165, 0.025, 0.165], [0.45, 0, 0]));
    }
    for (const x of [-9.6, -7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2, 9.6]) {
      rails.push(transform([x, 1.02, -4.5], [2.35, 0.045, 0.045]));
      rails.push(transform([x, 0.22, -4.5], [2.35, 0.04, 0.04]));
      for (let i = 0; i < 6; i++) rails.push(transform([x - 1 + i * 0.4, 0.62, -4.5], [0.023, 0.8, 0.023]));
      rails.push(transform([x - 1.15, 0.52, -4.5], [0.05, 1.04, 0.05]));
      rails.push(transform([x - 1.15, 0.025, -4.5], [0.09, 0.05, 0.7]));
    }
    const curtains = [
      transform([0, 4.7, 4.8], [0.9, 1, 1]),
      transform([-14.4, 4.7, -10.3], [0.96, 1, 1], [0, Math.PI / 2, 0]),
      transform([14.4, 4.7, -10.3], [0.96, 1, 1], [0, -Math.PI / 2, 0]),
      transform([-8.9, 4.7, -25.5], [11 / 32, 1, 1]),
      transform([8.9, 4.7, -25.5], [11 / 32, 1, 1]),
      transform([0, 6.9, -25.5], [6.8 / 32, 5 / 9.4, 1]),
    ];
    return { globes, cords, caps, fixtures, lenses, rails, curtains };
  }, []);
  return <group name="bermel-indoor-hall">
    <HardwareBatch geometry={resources.curtain} material={resources.black} matrices={layout.curtains} />
    <mesh position={[0, 9.45, -10.3]} rotation={[Math.PI / 2, 0, 0]} material={resources.black}><planeGeometry args={[29, 31]} /></mesh>
    <mesh name="bermel-red-ceiling-drapes" geometry={resources.drapes} material={resources.red} dispose={null} />
    <group name="bermel-static-lanterns">
      <HardwareBatch geometry={resources.globe} material={resources.paper} matrices={layout.globes} />
      <HardwareBatch geometry={resources.tube} material={resources.black} matrices={layout.cords} />
      <HardwareBatch geometry={resources.tube} material={resources.steel} matrices={layout.caps} />
    </group>
    <Truss position={[0, 7.9, -3.3]} length={24} />
    <HardwareBatch geometry={resources.tube} material={resources.black} matrices={layout.fixtures} />
    <HardwareBatch geometry={resources.tube} material={resources.paper} matrices={layout.lenses} />
    <group name="bermel-front-barrier"><HardwareBatch geometry={resources.box} material={resources.steel} matrices={layout.rails} /></group>
  </group>;
}
