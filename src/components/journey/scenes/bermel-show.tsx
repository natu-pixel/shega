"use client";

/**
 * BERMEL DJ SHOW — the performers and front-of-stage hardware.
 *
 * Modeled on the supplied concert reference: a clean elevated stage, monitor
 * wedges along the front lip, and one hype MC at the stage edge facing the
 * crowd. The DJ riser and booth live in dj-stage.tsx; this file owns people
 * and loose stage gear. Everything is static, matching the frozen hall.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { FestivalPerson } from "../festival-person";
import { HardwareBatch, Truss } from "../stage-hardware";

type Point = [number, number, number];
const black = new THREE.MeshStandardMaterial({ color: "#181a1e", roughness: 0.78 });
const steel = new THREE.MeshStandardMaterial({ color: "#9dabb5", metalness: 0.8, roughness: 0.28 });
const rubber = new THREE.MeshStandardMaterial({ color: "#08090a", roughness: 0.95 });
const monitorWedge = new THREE.BoxGeometry(0.68, 1, 0.42);
const wedgePositions = monitorWedge.getAttribute("position");
for (let i = 0; i < wedgePositions.count; i++) {
  wedgePositions.setY(i, wedgePositions.getY(i) > 0 ? 0.24 - wedgePositions.getZ(i) * 0.2 / 0.42 : 0);
}
monitorWedge.computeVertexNormals();
const grillePixels = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const shade = Math.hypot(x % 8 - 3.5, y % 8 - 3.5) < 2.5 ? 15 : 85;
  grillePixels.set([shade, shade, shade, 255], (y * 32 + x) * 4);
}
const grilleTexture = new THREE.DataTexture(grillePixels, 32, 32);
grilleTexture.colorSpace = THREE.SRGBColorSpace;
grilleTexture.wrapS = grilleTexture.wrapT = THREE.RepeatWrapping;
grilleTexture.repeat.set(8, 6);
grilleTexture.generateMipmaps = true;
grilleTexture.minFilter = THREE.LinearMipmapLinearFilter;
grilleTexture.magFilter = THREE.LinearFilter;
grilleTexture.needsUpdate = true;
const grille = new THREE.MeshStandardMaterial({ map: grilleTexture, roughness: 0.7, metalness: 0.4 });

function StageCable({ points }: { points: Point[] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  return <mesh material={rubber}><tubeGeometry args={[curve, 24, 0.009, 5, false]} /></mesh>;
}

function Monitor({ position, rotation = 0 }: { position: Point; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]} name="stage-monitor">
    <mesh geometry={monitorWedge} material={black} castShadow />
    <mesh position={[0, 0.244, 0.002]} rotation={[-Math.PI / 2 + Math.atan2(0.2, 0.42), 0, 0]} material={grille}><planeGeometry args={[0.55, 0.31]} /></mesh>
  </group>;
}

/** A handheld wireless microphone, gripped in the raised hand. */
function WirelessMic() {
  return <group rotation={[0.5, 0, -0.35]}>
    <mesh position={[0, 0.055, 0]} material={black}><cylinderGeometry args={[0.016, 0.021, 0.15, 12]} /></mesh>
    <mesh position={[0, 0.148, 0]} material={steel}><sphereGeometry args={[0.03, 16, 12]} /></mesh>
  </group>;
}

const parBody = new THREE.CylinderGeometry(0.085, 0.11, 0.24, 10);
const parYoke = new THREE.BoxGeometry(0.035, 0.2, 0.035);
const lensDisc = new THREE.CircleGeometry(0.082, 14);
const amber = new THREE.MeshBasicMaterial({ color: "#ffb46a", toneMapped: false });
const parMatrices: THREE.Matrix4[] = [];
const yokeMatrices: THREE.Matrix4[] = [];
const lensMatrices: THREE.Matrix4[] = [];
// Four on-stage lighting totems, three amber par heads each, aimed at the crowd.
const TOTEMS: { x: number; z: number }[] = [{ x: -6.9, z: 1.6 }, { x: -3.9, z: 2.35 }, { x: 3.9, z: 2.35 }, { x: 6.9, z: 1.6 }];
for (const totem of TOTEMS) {
  for (let i = 0; i < 3; i++) {
    const y = 2.05 + i * 0.62;
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.34 - i * 0.1, 0, 0));
    parMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(totem.x, y, totem.z - 0.24), tilt, new THREE.Vector3(1, 1, 1)));
    yokeMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(totem.x - 0.13, y, totem.z - 0.2), tilt, new THREE.Vector3(1, 1, 1)));
    yokeMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(totem.x + 0.13, y, totem.z - 0.2), tilt, new THREE.Vector3(1, 1, 1)));
    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.34 - i * 0.1, Math.PI, 0));
    lensMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(totem.x, y - Math.sin(0.34 + i * 0.1) * 0.125, totem.z - 0.24 - Math.cos(0.34 + i * 0.1) * 0.125),
      facing, new THREE.Vector3(1, 1, 1),
    ));
  }
}

/** A stacked pair of subwoofer cabinets with grille fronts. */
function SubStack({ position, rotation = 0 }: { position: Point; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    {[0.34, 0.99].map((y) => <group key={y} position={[0, y, 0]}>
      <mesh material={black} castShadow><boxGeometry args={[1.15, 0.62, 0.85]} /></mesh>
      <mesh position={[0, 0, -0.428]} material={grille}><planeGeometry args={[1.0, 0.5]} /></mesh>
    </group>)}
    <mesh position={[0, 1.325, 0]} material={steel}><boxGeometry args={[1.17, 0.025, 0.87]} /></mesh>
  </group>;
}

/** A road/flight case parked at the stage wings. */
function FlightCase({ position, rotation = 0, size = [0.9, 0.72, 0.6] as Point }: { position: Point; rotation?: number; size?: Point }) {
  return <group position={[position[0], position[1] + size[1] / 2 + 0.04, position[2]]} rotation={[0, rotation, 0]}>
    <mesh castShadow><boxGeometry args={size} /><meshStandardMaterial color="#232528" roughness={0.62} metalness={0.18} /></mesh>
    {[-size[1] / 2 + 0.05, 0, size[1] / 2 - 0.05].map((y) => (
      <mesh key={y} position={[0, y, 0]} material={steel}><boxGeometry args={[size[0] + 0.015, 0.028, size[2] + 0.015]} /></mesh>
    ))}
    {[-1, 1].map((side) => <mesh key={side} position={[side * size[0] / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={rubber}><cylinderGeometry args={[0.055, 0.055, 0.02, 12]} /></mesh>)}
  </group>;
}

export function BermelShow() {
  const mcHeight = 1.78;
  return <group name="bermel-dj-show">
    {/* The hype MC at the stage lip, facing the crowd like the reference shot. */}
    <group name="show-mc">
      <FestivalPerson position={[2.1, 0.83, -2.8]} lookAt={[-1.5, -14]} height={mcHeight} variant="red" pose="hands-up" quality="hero">
        {(anchors) => <group position={anchors.rightHand} scale={1 / mcHeight}><WirelessMic /></group>}
      </FestivalPerson>
    </group>
    {/* Two hype dancers flanking the riser keep the stage alive without a band. */}
    <group name="show-dancers">
      <FestivalPerson position={[-3.3, 0.83, -1.7]} lookAt={[1, -13]} height={1.7} variant="kandace" pose="dance" quality="hero" />
      <FestivalPerson position={[4.7, 0.83, -1.0]} lookAt={[-2, -13]} height={1.82} variant="manuel" pose="hands-up" quality="hero" />
    </group>
    {/* On-stage lighting totems — short vertical truss with amber par heads. */}
    {TOTEMS.map((totem) => <group key={totem.x}>
      <Truss position={[totem.x, 2.35, totem.z]} length={3.1} vertical />
      <mesh position={[totem.x, 0.9, totem.z]} material={black}><boxGeometry args={[0.6, 0.14, 0.6]} /></mesh>
    </group>)}
    <HardwareBatch geometry={parBody} material={black} matrices={parMatrices} />
    <HardwareBatch geometry={parYoke} material={steel} matrices={yokeMatrices} />
    <HardwareBatch geometry={lensDisc} material={amber} matrices={lensMatrices} />
    {/* Sub stacks anchor the stage's front corners. */}
    <SubStack position={[-7.7, 0.83, -2.75]} rotation={0.16} />
    <SubStack position={[7.7, 0.83, -2.75]} rotation={-0.16} />
    {/* Road cases parked at the rear wings. */}
    <FlightCase position={[-6.9, 0.83, 2.9]} rotation={0.18} />
    <FlightCase position={[-5.8, 0.83, 3.15]} rotation={-0.07} size={[0.72, 0.95, 0.55]} />
    <FlightCase position={[6.5, 0.83, 3.0]} rotation={-0.2} size={[1.15, 0.6, 0.62]} />
    {/* Monitor wedges along the front edge, angled back at the performers. */}
    <Monitor position={[-6.1, 0.83, -3.4]} rotation={0.5} />
    <Monitor position={[-3.2, 0.83, -3.5]} rotation={0.24} />
    <Monitor position={[-0.3, 0.83, -3.55]} />
    <Monitor position={[2.7, 0.83, -3.5]} rotation={-0.24} />
    <Monitor position={[5.7, 0.83, -3.4]} rotation={-0.5} />
    {/* Loose cabling from the booth toward the side wings. */}
    <StageCable points={[[-1.3, 0.85, 0.5], [-3.4, 0.84, 0.9], [-5.6, 0.85, 1.3], [-7.4, 0.86, 1.7]]} />
    <StageCable points={[[1.3, 0.85, 0.55], [3.2, 0.84, 1.1], [5.4, 0.85, 1.5], [7.3, 0.86, 1.8]]} />
    <StageCable points={[[-0.3, 0.845, -3.35], [-1.7, 0.84, -2.3], [-2.6, 0.845, -0.6], [-2.2, 0.85, 0.7]]} />
    <StageCable points={[[-6.9, 0.85, 1.5], [-6.2, 0.845, 0.3], [-4.6, 0.84, -0.9], [-3.5, 0.845, -1.6]]} />
    <StageCable points={[[6.9, 0.85, 1.45], [6.1, 0.845, 0.2], [5.1, 0.84, -0.7]]} />
  </group>;
}
