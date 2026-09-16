"use client";

/**
 * SCENE 3 — EXIT CORRIDOR (scroll 0.44 → 0.55)
 *
 * Zone: passage from the cage toward daylight, x = 8 … 20 at z = -34.
 * Walls at z = -31.4 and -36.6 with a ceiling; warm light glows at the far end.
 * The camera flies straight through the middle — keep the passage ≥ 4 units wide.
 */

import * as THREE from "three";
import { RealPeople, type PersonSpec } from "../real-people";

const EXIT_SPECTATORS: PersonSpec[] = [
  { position: [8.8, 0, -32.13], height: 1.73, variant: 0, lookAt: [0, -34], timeOffset: 0.35 },
  { position: [9.35, 0, -35.87], height: 1.8, variant: 2, lookAt: [0, -34], timeOffset: 1 },
  { position: [11.6, 0, -32.13], height: 1.65, variant: 1, lookAt: [0, -34], timeOffset: 1.65 },
  { position: [12.45, 0, -35.87], height: 1.76, variant: 3, lookAt: [0, -34], timeOffset: 0.35 },
];

export function ExitCorridor() {
  return (
    <group>
      {[-31.4, -36.6].map((z) => (
        <mesh key={z} position={[14, 2, z]}><boxGeometry args={[12.5, 4.2, 0.6]} /><meshStandardMaterial color="#191b21" roughness={0.9} /></mesh>
      ))}
      <mesh position={[14, 4.3, -34]}><boxGeometry args={[12.5, 0.4, 5.8]} /><meshStandardMaterial color="#15161c" roughness={0.9} /></mesh>
      <mesh position={[20.4, 2.1, -34]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[5.4, 4.2]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight position={[19, 2.4, -34]} color="#ffbf78" intensity={26} distance={16} decay={2} />
      <RealPeople specs={EXIT_SPECTATORS} />
    </group>
  );
}
