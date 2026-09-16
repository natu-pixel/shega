"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { FestivalCrowdInstances } from "../dance-crowd";
import { HardwareBatch, Truss } from "../stage-hardware";
import { ARENA_BOUNDS, ARENA_CENTER, ARENA_LAYOUT, type ArenaBox, type ArenaVector } from "./arena-layout";
import { ArenaFans } from "./arena-fans";
import { ARENA_CUTOUT_BLOCKS, ARENA_FOREGROUND, ARENA_MIDGROUND } from "./arena-audience-layout";

function boxMatrices(boxes: readonly ArenaBox[]) {
  const rotation = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);
  return boxes.map(({ position, size, rotationY = 0 }) => new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    rotation.setFromAxisAngle(axis, rotationY),
    new THREE.Vector3(...size),
  ));
}

function chairPart(offset: ArenaVector, size: ArenaVector, color?: number): ArenaBox[] {
  return ARENA_LAYOUT.chairs.filter((chair) => color === undefined || chair.color === color).map((chair) => {
    const c = Math.cos(chair.rotationY), s = Math.sin(chair.rotationY);
    return {
      position: [
        chair.position[0] + offset[0] * c + offset[2] * s,
        chair.position[1] + offset[1],
        chair.position[2] - offset[0] * s + offset[2] * c,
      ],
      size,
      rotationY: chair.rotationY,
    };
  });
}

const TABLES: ArenaBox[] = [
  { position: [-6.65, 0.78, -34], size: [0.75, 0.1, 3.4] },
  { position: [-4.8, 0.78, -27.9], size: [2.35, 0.1, 0.68] },
  { position: [4.8, 0.78, -27.9], size: [2.35, 0.1, 0.68] },
  { position: [0, 0.78, -40.3], size: [3.3, 0.1, 0.68] },
];

const SIGN_LABELS = [
  ["ETFC", "MIXED MARTIAL ARTS"],
  ["FIGHT NIGHT", "ETFC"],
  ["ENTRY", "ETFC"],
  ["EXIT", "CONCOURSE"],
  ["01  /  WEST", "GRANDSTAND"],
  ["02  /  NORTH", "GRANDSTAND"],
  ["03  /  EAST", "GRANDSTAND"],
] as const;

type ArenaSign = { position: ArenaVector; rotationY?: number; width: number; height: number; label: number };

const SIGNS: ArenaSign[] = [
  { position: [0, 5.75, -25.73], width: 6.2, height: 1.15, label: 0 },
  { position: [0, 7.65, -54.47], width: 9.3, height: 1.8, label: 1 },
  { position: [-3.9, 3.85, -25.18], width: 0.65, height: 0.42, label: 2 },
  { position: [19.75, 5.35, -34], rotationY: -Math.PI / 2, width: 5.5, height: 1.1, label: 3 },
  { position: [-20.27, 7.55, -40.1], rotationY: Math.PI / 2, width: 8, height: 1, label: 4 },
  { position: [-11.5, 7.65, -54.47], width: 6, height: 0.9, label: 5 },
  { position: [20.27, 7.55, -45.2], rotationY: -Math.PI / 2, width: 7, height: 1, label: 6 },
];

function makeSignAtlas() {
  const canvas = document.createElement("canvas");
  const scale = 0.5;
  canvas.width = 1024 * scale;
  canvas.height = 2048 * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ETFC arena signage requires a 2D canvas context.");
  context.scale(scale, scale);
  context.fillStyle = "#121719";
  context.fillRect(0, 0, 1024, 2048);
  SIGN_LABELS.forEach(([title, subtitle], index) => {
    const y = index * 256;
    context.fillStyle = index === 3 ? "#57776a" : "#963e37";
    context.fillRect(42, y + 28, 10, 190);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `900 ${title.length > 12 ? 69 : 92}px Arial, sans-serif`;
    context.fillStyle = "#eeeae0";
    context.fillText(title, 532, y + 104);
    context.font = "500 30px Arial, sans-serif";
    context.fillStyle = "#c4c7c5";
    context.fillText(subtitle, 532, y + 179);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Sign({ sign, material, geometry }: { sign: ArenaSign; material: THREE.Material; geometry: THREE.BufferGeometry }) {
  return (
    <mesh
      position={sign.position}
      rotation={[0, sign.rotationY ?? 0, 0]}
      scale={[sign.width, sign.height, 1]}
      geometry={geometry}
      material={material}
    />
  );
}

export function EtfcArena() {
  const resources = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const tube = new THREE.CylinderGeometry(1, 1, 1, 6);
    const signAtlas = makeSignAtlas();
    const signs = SIGN_LABELS.map((_, index) => {
      const plane = new THREE.PlaneGeometry(1, 1);
      const uv = plane.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (index + 1 - uv.getY(i)) / 8);
      return plane;
    });
    const concrete = new THREE.MeshStandardMaterial({ color: "#363a3c", roughness: 0.96 });
    const wall = new THREE.MeshStandardMaterial({ color: "#30373b", roughness: 0.94 });
    const steel = new THREE.MeshStandardMaterial({ color: "#4e5557", metalness: 0.64, roughness: 0.52 });
    const dark = new THREE.MeshStandardMaterial({ color: "#171c20", roughness: 0.88 });
    const chairRed = new THREE.MeshStandardMaterial({ color: "#7a3231", roughness: 0.71 });
    const chairGray = new THREE.MeshStandardMaterial({ color: "#4e5558", roughness: 0.78 });
    const steps = new THREE.MeshStandardMaterial({ color: "#777a72", roughness: 0.9 });
    const roof = new THREE.MeshStandardMaterial({ color: "#212a32", roughness: 0.91, metalness: 0.12 });
    const lamp = new THREE.MeshBasicMaterial({ color: "#b7b4ac" });
    const screen = new THREE.MeshBasicMaterial({ color: "#8dada9", toneMapped: false });
    const sign = new THREE.MeshBasicMaterial({ map: signAtlas, color: "#9faaa9", side: THREE.DoubleSide });
    return { box, tube, signAtlas, signs, concrete, wall, steel, dark, chairRed, chairGray, steps, roof, lamp, screen, sign };
  }, []);

  useEffect(() => () => {
    const { signs, ...disposable } = resources;
    signs.forEach((geometry) => geometry.dispose());
    Object.values(disposable).forEach((resource) => resource.dispose());
  }, [resources]);

  const batches = useMemo(() => {
    const foldedSeats = (color: number) => [
      ...chairPart([0, 0.54, 0], [0.45, 0.31, 0.055], color),
      ...chairPart([0, 0.79, -0.045], [0.45, 0.3, 0.065], color),
    ];
    const frames = [
      ...chairPart([-0.17, 0.35, -0.025], [0.025, 0.66, 0.025]),
      ...chairPart([0.17, 0.35, -0.025], [0.025, 0.66, 0.025]),
    ];
    const ceiling: ArenaBox[] = [];
    const acoustic: ArenaBox[] = [];
    const housings: ArenaBox[] = [];
    const lamps: ArenaBox[] = [];
    for (let i = 0; i < 10; i++) {
      const z = -53.51 + i * 2.98;
      ceiling.push({ position: [0, ARENA_BOUNDS.roofY, z], size: [41.6, 0.18, 2.94] });
      acoustic.push({ position: [-20.24, 7.6, z], size: [0.065, 1.9, 1.6] });
      if (z < -38.2 || z > -29.9) acoustic.push({ position: [20.24, 7.6, z], size: [0.065, 1.9, 1.6] });
    }
    for (const x of [-13.5, 13.5]) for (const z of [-49, -42, -28]) {
      housings.push({ position: [x, 9.92, z], size: [1.65, 0.18, 0.6] });
      lamps.push({ position: [x, 9.818, z], size: [1.42, 0.025, 0.4] });
    }
    for (const x of [-5.7, 0, 5.7]) for (const z of [-39.7, -28.3]) {
      housings.push({ position: [x, 8.38, z], size: [0.46, 0.48, 0.55] });
      lamps.push({ position: [x, 8.129, z], size: [0.32, 0.025, 0.36] });
    }
    for (const x of [-1.3, 1.3]) for (const z of [-35.3, -32.7]) {
      lamps.push({ position: [x, 6.785, z], size: [0.48, 0.025, 0.48] });
    }
    const tableBases = TABLES.flatMap(({ position: [x, , z], size: [w, , d] }) => [
      { position: [x, 0.37, z] as ArenaVector, size: [w - 0.12, 0.7, d - 0.12] as ArenaVector },
    ]);
    const monitors: ArenaBox[] = [];
    const displays: ArenaBox[] = [];
    for (const x of [-5.3, -4.3, 4.3, 5.3, -0.8, 0.8]) {
      const z = Math.abs(x) > 3 ? -27.92 : -40.3;
      monitors.push({ position: [x, 1.02, z], size: [0.42, 0.26, 0.07] });
      displays.push({ position: [x, 1.02, z + 0.039], size: [0.35, 0.19, 0.009] });
    }
    for (const z of [-34.75, -33.25]) {
      monitors.push({ position: [-6.65, 1.02, z], size: [0.07, 0.26, 0.42] });
      displays.push({ position: [-6.69, 1.02, z], size: [0.009, 0.19, 0.35] });
    }
    const cases: ArenaBox[] = [
      { position: [-6.6, 0.32, -36.6], size: [0.65, 0.64, 0.8] },
      { position: [6.8, 0.38, -37.3], size: [0.65, 0.76, 0.8] },
      { position: [-6.75, 0.16, -31.4], size: [0.5, 0.32, 0.6] },
    ];
    const speakerCases: ArenaBox[] = [];
    for (const x of [-7, 7]) for (let i = 0; i < 3; i++) {
      speakerCases.push({ position: [x, 7.2 + i * 0.32, -39.5], size: [0.64, 0.29, 0.55] });
    }
    const up = new THREE.Vector3(0, 1, 0);
    const railMatrices = ARENA_LAYOUT.rails.map(({ start, end, radius }) => {
      const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
      const direction = b.clone().sub(a);
      return new THREE.Matrix4().compose(
        a.add(b).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
        new THREE.Vector3(radius, direction.length(), radius),
      );
    });
    for (const x of [-6.2, 6.2]) for (const [z, anchorZ] of [[-39.7, -38.3], [-28.3, -29.6]]) {
      const lower = new THREE.Vector3(x, 9.06, z), upper = new THREE.Vector3(x, 10.55, anchorZ);
      const direction = upper.clone().sub(lower);
      railMatrices.push(new THREE.Matrix4().compose(
        lower.add(upper).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
        new THREE.Vector3(0.01, direction.length(), 0.01),
      ));
    }
    for (const [x, z] of [[-6.65, -37.5], [3.8, -40.35]]) {
      const rotationY = Math.atan2(-x, -34 - z);
      const facing = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
      cases.push(
        { position: [x, 1.55, z], size: [0.32, 0.25, 0.48], rotationY },
        { position: [x + facing.x * 0.31, 1.55, z + facing.z * 0.31], size: [0.16, 0.16, 0.22], rotationY },
      );
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        const base = new THREE.Vector3(x + Math.sin(angle) * 0.34, 0.015, z + Math.cos(angle) * 0.34);
        const top = new THREE.Vector3(x, 1.43, z);
        const direction = top.clone().sub(base);
        railMatrices.push(new THREE.Matrix4().compose(
          base.add(top).multiplyScalar(0.5),
          new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
          new THREE.Vector3(0.022, direction.length(), 0.022),
        ));
      }
    }
    return {
      tiers: boxMatrices(ARENA_LAYOUT.tiers),
      steps: boxMatrices(ARENA_LAYOUT.steps),
      walls: boxMatrices(ARENA_LAYOUT.walls),
      columns: boxMatrices(ARENA_LAYOUT.columns),
      redSeats: boxMatrices(foldedSeats(0)),
      graySeats: boxMatrices(foldedSeats(1)),
      frames: boxMatrices(frames),
      ceiling: boxMatrices(ceiling),
      acoustic: boxMatrices(acoustic),
      housings: boxMatrices(housings),
      lamps: boxMatrices(lamps),
      tables: boxMatrices(TABLES),
      equipment: boxMatrices([...tableBases, ...monitors, ...cases, ...speakerCases]),
      displays: boxMatrices(displays),
      railMatrices,
    };
  }, []);

  return (
    <group name="etfc-indoor-arena">
      <mesh position={[0, -0.065, -40.1]} receiveShadow>
        <boxGeometry args={[41.6, 0.15, 29.8]} />
        <meshStandardMaterial color="#343a3b" roughness={0.96} />
      </mesh>
      <HardwareBatch geometry={resources.box} material={resources.concrete} matrices={batches.tiers} />
      <HardwareBatch geometry={resources.box} material={resources.steps} matrices={batches.steps} />
      <HardwareBatch geometry={resources.box} material={resources.wall} matrices={batches.walls} />
      <HardwareBatch geometry={resources.box} material={resources.steel} matrices={batches.columns} />
      <HardwareBatch geometry={resources.box} material={resources.chairRed} matrices={batches.redSeats} />
      <HardwareBatch geometry={resources.box} material={resources.chairGray} matrices={batches.graySeats} />
      <HardwareBatch geometry={resources.box} material={resources.steel} matrices={batches.frames} />
      <HardwareBatch geometry={resources.tube} material={resources.steel} matrices={batches.railMatrices} />
      <HardwareBatch geometry={resources.box} material={resources.roof} matrices={batches.ceiling} />
      <HardwareBatch geometry={resources.box} material={resources.dark} matrices={batches.acoustic} />
      <HardwareBatch geometry={resources.box} material={resources.dark} matrices={batches.housings} />
      <HardwareBatch geometry={resources.box} material={resources.lamp} matrices={batches.lamps} />
      <HardwareBatch geometry={resources.box} material={resources.dark} matrices={batches.tables} />
      <HardwareBatch geometry={resources.box} material={resources.dark} matrices={batches.equipment} />
      <HardwareBatch geometry={resources.box} material={resources.screen} matrices={batches.displays} />

      {[-52.8, -46.4, -38.3, -34, -29.6, -26].map((z) => (
        <Truss key={z} position={[0, 10.55, z]} length={40.1} />
      ))}
      {[-19.6, 19.6].map((x) => (
        <group key={x} position={[x, 10.55, -40.1]} rotation={[0, Math.PI / 2, 0]}>
          <Truss position={[0, 0, 0]} length={28.4} />
        </group>
      ))}
      {[-39.7, -28.3].map((z) => <Truss key={z} position={[0, 8.9, z]} length={12.4} />)}
      {[-6.2, 6.2].map((x) => (
        <group key={x} position={[x, 8.9, -34]} rotation={[0, Math.PI / 2, 0]}>
          <Truss position={[0, 0, 0]} length={11.4} />
        </group>
      ))}

      {SIGNS.map((sign, i) => <Sign key={i} sign={sign} material={resources.sign} geometry={resources.signs[sign.label]} />)}
      <group position={[0, 7.5, -34]} name="four-sided-event-display">
        <mesh material={resources.dark}><boxGeometry args={[3.7, 1.4, 3.7]} /></mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, i * Math.PI / 2, 0]}>
            <Sign sign={{ position: [0, 0, 1.86], width: 3.5, height: 1.15, label: 0 }} material={resources.sign} geometry={resources.signs[0]} />
          </group>
        ))}
        {[-1.5, 1.5].map((x) => <mesh key={x} position={[x, 1.8, 0]} material={resources.steel}><cylinderGeometry args={[0.022, 0.022, 2.4, 6]} /></mesh>)}
      </group>

      <Suspense fallback={null}>
        {ARENA_CUTOUT_BLOCKS.map((block) => (
          <group key={block.id} name={`arena-audience-${block.id}`}>
            <ArenaFans placements={block.placements} />
          </group>
        ))}
        <group name="arena-audience-foreground">
          <FestivalCrowdInstances placements={ARENA_FOREGROUND} target={ARENA_CENTER} detail="standard" shadows={false} />
        </group>
        <group name="arena-audience-midground">
          <FestivalCrowdInstances placements={ARENA_MIDGROUND} target={ARENA_CENTER} detail="far" />
        </group>
      </Suspense>
    </group>
  );
}
