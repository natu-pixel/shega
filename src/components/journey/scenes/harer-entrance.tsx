"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { HardwareBatch } from "../stage-hardware";

type Point = [number, number, number];

const PIER_X = 4.7;
const UP = new THREE.Vector3(0, 1, 0);

function placement(position: Point, scale: Point, rotation: Point = [0, 0, 0]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
}

function span(start: Point, end: Point, radius: number) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  return new THREE.Matrix4().compose(
    a.add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
    new THREE.Vector3(radius, direction.length(), radius),
  );
}

function makeHorns() {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rings = 28;
  const sides = 10;
  const rootColor = new THREE.Color("#69513b");
  const tipColor = new THREE.Color("#ebdbb9");

  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.33, 6.65, 0.04),
      new THREE.Vector3(side * 0.92, 6.64, 0.08),
      new THREE.Vector3(side * 1.58, 6.83, 0.1),
      new THREE.Vector3(side * 1.98, 7.09, 0.04),
      new THREE.Vector3(side * 2.03, 7.3, -0.07),
      new THREE.Vector3(side * 1.9, 7.4, -0.12),
    ]);
    const frames = curve.computeFrenetFrames(rings, false);
    const offset = positions.length / 3;
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings;
      const center = curve.getPointAt(t);
      const radius = 0.225 * Math.pow(1 - t, 0.78);
      const color = rootColor.clone().lerp(tipColor, Math.min(1, t * 2.5));
      for (let edge = 0; edge <= sides; edge++) {
        const angle = edge / sides * Math.PI * 2;
        const point = center.clone()
          .addScaledVector(frames.normals[ring], Math.cos(angle) * radius)
          .addScaledVector(frames.binormals[ring], Math.sin(angle) * radius * 0.84);
        positions.push(point.x, point.y, point.z);
        colors.push(color.r, color.g, color.b);
        if (ring < rings && edge < sides) {
          const a = offset + ring * (sides + 1) + edge;
          const b = a + sides + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeOxEmblem() {
  const outline = new THREE.Shape();
  outline.moveTo(-0.25, 6.12);
  outline.lineTo(-0.38, 6.5);
  outline.lineTo(-0.76, 6.62);
  outline.lineTo(-0.88, 6.81);
  outline.lineTo(-0.43, 6.73);
  outline.lineTo(-0.31, 6.89);
  outline.lineTo(0.31, 6.89);
  outline.lineTo(0.43, 6.73);
  outline.lineTo(0.88, 6.81);
  outline.lineTo(0.76, 6.62);
  outline.lineTo(0.38, 6.5);
  outline.lineTo(0.25, 6.12);
  outline.quadraticCurveTo(0, 6.02, -0.25, 6.12);
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 1,
    curveSegments: 6,
    steps: 1,
  });
  // One material for both carved faces and bevels, not an extra draw per group.
  geometry.clearGroups();
  return geometry;
}

function makeSignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create the Harer entrance sign.");
  context.fillStyle = "#362a20";
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = "#aa8757";
  context.lineWidth = 2;
  context.strokeRect(7, 8, 498, 112);
  context.fillStyle = "#f8e6bc";
  context.textAlign = "center";
  context.textBaseline = "middle";
  // The wide physical board restores the proportions of this compressed atlas.
  context.font = 'bold 92px Georgia, "Times New Roman", serif';
  context.fillText("HARER & SENGAW", 256, 67, 466);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeResources() {
  const texture = makeSignTexture();
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
    pier: new THREE.CylinderGeometry(1, 1.13, 1, 4).rotateY(Math.PI / 4),
    ring: new THREE.TorusGeometry(1, 0.04, 5, 32),
    lanternRoof: new THREE.CylinderGeometry(0.06, 0.24, 0.16, 8),
    plane: new THREE.PlaneGeometry(1, 1),
    horns: makeHorns(),
    ox: makeOxEmblem(),
  };
  const materials = {
    earth: new THREE.MeshStandardMaterial({ color: "#b38a64", roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: "#c5a27a", roughness: 0.96 }),
    wood: new THREE.MeshStandardMaterial({ color: "#715032", roughness: 0.88 }),
    darkWood: new THREE.MeshStandardMaterial({ color: "#433125", roughness: 0.9 }),
    straw: new THREE.MeshStandardMaterial({ color: "#cdb27b", roughness: 1 }),
    russet: new THREE.MeshStandardMaterial({ color: "#8d4d32", roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: "#3c342b", metalness: 0.55, roughness: 0.72 }),
    horn: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68 }),
    glow: new THREE.MeshBasicMaterial({ color: "#ffcc85", toneMapped: false }),
    sign: new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      roughness: 0.94,
      emissive: "#fff1d5",
      emissiveIntensity: 0.08,
    }),
  };
  const piers: THREE.Matrix4[] = [];
  const stones: THREE.Matrix4[] = [];
  const timbers: THREE.Matrix4[] = [
    placement([0, 4.8, 0], [10.5, 0.26, 0.72]),
    placement([0, 5.98, 0], [10.64, 0.2, 0.8]),
  ];
  const posts: THREE.Matrix4[] = [];
  const lashings: THREE.Matrix4[] = [];
  const studs: THREE.Matrix4[] = [];

  for (const side of [-1, 1]) {
    const x = side * PIER_X;
    piers.push(placement([x, 1.87, 0], [0.8, 3.2, 0.77]));
    stones.push(
      placement([x, 0.15, 0], [1.56, 0.3, 1.44]),
      placement([x, 0.36, 0], [1.36, 0.16, 1.25]),
      placement([x, 3.49, 0], [1.22, 0.18, 1.12]),
    );
    for (const z of [-0.28, 0.28]) {
      posts.push(placement([x, 4.72, z], [0.17, 2.48, 0.17]));
      for (const y of [3.66, 3.73, 3.8, 5.67, 5.74, 5.81]) {
        lashings.push(placement([x, y, z], [0.175, 0.175, 0.35], [Math.PI / 2, 0, 0]));
      }
    }
    // Knee braces remain outside the full-height central aperture.
    timbers.push(placement([side * 4.48, 4.08, 0], [0.17, 1.46, 0.24], [0, 0, side * -0.34]));
    for (const y of [4.8, 5.98]) {
      studs.push(placement([x, y, 0.41], [0.065, 0.065, 0.035]));
    }
    studs.push(placement([side * 0.22, 6.61, 0.267], [0.095, 0.026, 0.016], [0, 0, side * 0.14]));
  }

  const sideWood = [placement([0, 3.61, 0.74], [0.11, 0.11, 0.84])];
  const sideMetal: THREE.Matrix4[] = [
    placement([0, 3.43, 1.03], [0.025, 0.32, 0.025]),
    placement([0, 2.65, 1.03], [0.38, 0.065, 0.38]),
    placement([0, 3.22, 1.03], [0.38, 0.055, 0.38]),
  ];
  for (const x of [-0.15, 0.15]) for (const z of [0.88, 1.18]) {
    sideMetal.push(placement([x, 2.94, z], [0.024, 0.56, 0.024]));
  }
  const weave: THREE.Matrix4[] = [];
  const accent: THREE.Matrix4[] = [];
  for (let line = -8; line <= 8; line++) {
    const offset = line * 0.047;
    const length = Math.sqrt(0.423 ** 2 - offset ** 2);
    weave.push(span([-length, 1.6 + offset, 0.665], [length, 1.6 + offset, 0.665], 0.011));
    const target = Math.abs(line) < 3 ? accent : weave;
    target.push(span([offset, 1.6 - length, 0.682], [offset, 1.6 + length, 0.682], 0.01));
  }
  weave.push(
    span([-0.21, 2, 0.64], [0, 2.31, 0.57], 0.014),
    span([0.21, 2, 0.64], [0, 2.31, 0.57], 0.014),
  );
  const sideRings = [0.44, 0.407, 0.15].map((radius) =>
    placement([0, 1.6, 0.7], [radius, radius, radius]),
  );
  const signFaces = [
    placement([0, 5.41, 0.457], [8.16, 0.88, 1]),
    placement([0, 5.41, 0.183], [8.16, 0.88, 1], [0, Math.PI, 0]),
  ];

  return {
    texture, geometries, materials, piers, stones, timbers, posts, lashings, studs,
    sideWood, sideMetal, weave, accent, sideRings, signFaces,
  };
}

/**
 * Original festival gateway, not a reconstruction of a historic monument.
 * Ground is y=0.02; the unobstructed local opening is 7.84m wide by 4.67m high.
 * Local +Z faces the arena, so the world-space camera passes along local -Z.
 */
export function HarerEntrance() {
  const resources = useMemo(() => makeResources(), []);
  const { geometries: geometry, materials: material, texture } = resources;

  useEffect(() => () => {
    texture.dispose();
    Object.values(geometry).forEach((item) => item.dispose());
    Object.values(material).forEach((item) => item.dispose());
  }, [geometry, material, texture]);

  return (
    <group name="harer-entrance" position={[29, 0.02, -28.4]} rotation={[0, -Math.PI / 2, 0]} dispose={null}>
      <group name="harer-entrance-gate">
        <HardwareBatch geometry={geometry.pier} material={material.earth} matrices={resources.piers} />
        <HardwareBatch geometry={geometry.box} material={material.stone} matrices={resources.stones} />
        <HardwareBatch geometry={geometry.box} material={material.wood} matrices={resources.timbers} />
        <HardwareBatch geometry={geometry.cylinder} material={material.wood} matrices={resources.posts} />
        <HardwareBatch geometry={geometry.ring} material={material.straw} matrices={resources.lashings} />
        <HardwareBatch geometry={geometry.box} material={material.iron} matrices={resources.studs} />
      </group>

      <group name="harer-entrance-sign">
        <mesh geometry={geometry.box} material={material.darkWood} position={[0, 5.41, 0.32]} scale={[8.56, 1.1, 0.26]} />
        <HardwareBatch geometry={geometry.plane} material={material.sign} matrices={resources.signFaces} />
      </group>

      <group name="harer-entrance-ox-crown">
        <mesh name="harer-entrance-sculpted-horns" geometry={geometry.horns} material={material.horn} />
        <mesh name="harer-entrance-carved-ox" geometry={geometry.ox} material={material.wood} />
      </group>

      {([-1, 1] as const).map((side) => (
        <group key={side} name={`harer-entrance-side-${side < 0 ? "left" : "right"}`} position={[side * PIER_X, 0, 0]}>
          <group name={`harer-entrance-lantern-${side}`}>
            <HardwareBatch geometry={geometry.box} material={material.wood} matrices={resources.sideWood} />
            <HardwareBatch geometry={geometry.box} material={material.iron} matrices={resources.sideMetal} />
            <mesh geometry={geometry.lanternRoof} material={material.iron} position={[0, 3.32, 1.03]} />
            <mesh geometry={geometry.cylinder} material={material.glow} position={[0, 2.94, 1.03]} scale={[0.137, 0.49, 0.137]} />
          </group>
          <group name={`harer-entrance-woven-accent-${side}`}>
            <mesh geometry={geometry.cylinder} material={material.darkWood} position={[0, 1.6, 0.635]} rotation={[Math.PI / 2, 0, 0]} scale={[0.435, 0.038, 0.435]} />
            <HardwareBatch geometry={geometry.ring} material={material.straw} matrices={resources.sideRings} />
            <HardwareBatch geometry={geometry.cylinder} material={material.straw} matrices={resources.weave} />
            <HardwareBatch geometry={geometry.cylinder} material={material.russet} matrices={resources.accent} />
          </group>
        </group>
      ))}
    </group>
  );
}
