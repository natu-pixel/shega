"use client";

import { useSceneTexture } from "../scene-assets";
import * as THREE from "three";
import { FestivalPerson } from "../festival-person";
import { HardwareBatch, Truss } from "../stage-hardware";
import { BermelBand } from "./bermel-band";

const metal = new THREE.MeshStandardMaterial({ color: "#383b40", metalness: 0.85, roughness: 0.32 });
const black = new THREE.MeshStandardMaterial({ color: "#121315", roughness: 0.8 });
const floorPanel = new THREE.BoxGeometry(1, 1, 1);
const floorFinish = new THREE.MeshStandardMaterial({ color: "#242322", roughness: 0.96 });
const floorPanels = Array.from({ length: 36 }, (_, i) => new THREE.Matrix4().compose(
  new THREE.Vector3(-8.8 + (i % 9 + 0.5) * 17.6 / 9, 0.81, -3.9 + (Math.floor(i / 9) + 0.5) * 1.95),
  new THREE.Quaternion(),
  new THREE.Vector3(17.6 / 9 - 0.016, 0.04, 1.934),
));

function Deck({ x }: { x: number }) {
  return <group position={[x, 1.76, 0.05]}>
    <mesh material={black} castShadow><boxGeometry args={[0.62, 0.08, 0.68]} /></mesh>
    <mesh position={[0, 0.052, 0.05]}><cylinderGeometry args={[0.19, 0.19, 0.025, 32]} /><meshStandardMaterial color="#292b30" metalness={0.7} roughness={0.32} /></mesh>
    <mesh position={[0, 0.068, 0.05]}><cylinderGeometry args={[0.14, 0.14, 0.008, 32]} /><meshStandardMaterial color="#0b0c0e" roughness={0.4} /></mesh>
    <mesh position={[0, 0.057, -0.23]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.22, 0.1]} /><meshBasicMaterial color="#92c9d4" /></mesh>
    {[-0.22, 0.22].map((dx) => <mesh key={dx} position={[dx, 0.055, 0.24]}><cylinderGeometry args={[0.023, 0.023, 0.016, 12]} /><meshStandardMaterial color={dx < 0 ? "#66c68d" : "#ff803d"} emissive={dx < 0 ? "#66c68d" : "#ff803d"} emissiveIntensity={0.6} /></mesh>)}
  </group>;
}

export function DjStage() {
  const artwork = useSceneTexture("/images/bermel-led.png");
  return <group name="bermel-dj-stage">
    <mesh position={[0, 0.4, 0]} material={black} receiveShadow castShadow><boxGeometry args={[17.6, 0.8, 7.8]} /></mesh>
    <group name="bermel-modular-stage-floor"><HardwareBatch geometry={floorPanel} material={floorFinish} matrices={floorPanels} receiveShadow /></group>
    <mesh position={[0, 4.3, 3.25]} material={black}><boxGeometry args={[10.3, 5.3, 0.2]} /></mesh>
    <mesh position={[0, 4.3, 3.13]} rotation={[0, Math.PI, 0]} name="bermel-led-artwork">
      <planeGeometry args={[10, 10 * 212 / 426]} />
      <meshBasicMaterial map={artwork} color="#c5c5c5" toneMapped={false} />
    </mesh>
    <Truss position={[0, 7.25, 2.8]} length={16.8} />
    {[-8.1, 8.1].map((x) => <group key={x}>
      <Truss position={[x, 3.9, 2.8]} length={6.7} vertical />
      <mesh position={[x, 0.9, 2.8]} material={metal}><boxGeometry args={[0.65, 0.14, 0.65]} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[x * 0.94, 2.1 + i * 0.58, 0.65]} rotation={[0.04 * i, 0, 0]}>
          <mesh material={black} castShadow><boxGeometry args={[0.8, 0.53, 0.65]} /></mesh>
          <mesh position={[0, 0, -0.332]}><planeGeometry args={[0.68, 0.4]} /><meshStandardMaterial color="#303136" roughness={0.95} side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
      <mesh position={[x * 0.88, 1.25, -1.7]} material={black}><boxGeometry args={[1.25, 0.9, 1]} /></mesh>
    </group>)}
    <group name="dj-booth">
      <mesh position={[0, 1.25, 0.05]} material={black} castShadow><boxGeometry args={[2.8, 0.85, 1]} /></mesh>
      <mesh position={[0, 1.7, 0.05]} material={metal}><boxGeometry args={[3, 0.06, 1.15]} /></mesh>
      <mesh position={[0, 1.25, -0.46]}><boxGeometry args={[2.65, 0.035, 0.012]} /><meshBasicMaterial color="#f16c2a" toneMapped={false} /></mesh>
      <Deck x={-0.83} /><Deck x={0.83} />
      <mesh position={[0, 1.78, 0.05]} material={black}><boxGeometry args={[0.57, 0.09, 0.67]} /></mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-0.19 + (i % 4) * 0.125, 1.85, -0.16 + Math.floor(i / 4) * 0.12]} material={metal}>
          <cylinderGeometry args={[0.017, 0.017, 0.04, 8]} />
        </mesh>
      ))}
      {[-0.18, -0.06, 0.06, 0.18].map((x) => <mesh key={x} position={[x, 1.838, 0.25]}><boxGeometry args={[0.045, 0.023, 0.055]} /><meshStandardMaterial color="#c8c7be" /></mesh>)}
    </group>
    <FestivalPerson position={[0, 0.83, 0.76]} lookAt={[0, -12]} height={1.85} variant="manuel" pose="work" quality="hero">
      {(anchors) => <group position={[anchors.head[0], anchors.head[1] + (anchors.headTop[1] - anchors.head[1]) * 0.47, anchors.head[2]]} scale={1 / 1.85}>
        <mesh><torusGeometry args={[0.103, 0.008, 8, 20, Math.PI]} /><meshStandardMaterial color="#16181d" roughness={0.65} /></mesh>
        {[-0.103, 0.103].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.047, 0.047, 0.027, 16]} /><meshStandardMaterial color="#20232a" roughness={0.6} /></mesh>)}
      </group>}
    </FestivalPerson>
    <BermelBand />
    <pointLight position={[0, 4.5, -2.6]} color="#ffe5d0" intensity={38} distance={16} decay={2} />
  </group>;
}
