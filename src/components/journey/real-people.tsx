"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { FestivalPerson, type FestivalPose } from "./festival-person";

export type PersonSpec = {
  position: [number, number, number];
  rotationY?: number;
  lookAt?: [number, number];
  height?: number;
  variant?: number;
  /** Sample the source clip once; guests stay in this pose. */
  timeOffset?: number;
  drink?: "beer" | "glass";
  role?: "chef";
  pose?: FestivalPose;
};

export function Drink({ kind }: { kind: "beer" | "glass" }) {
  const profile = useMemo(() => [
    new THREE.Vector2(0.044, -0.11), new THREE.Vector2(0.047, -0.09),
    new THREE.Vector2(0.047, 0.09), new THREE.Vector2(0.025, 0.135),
    new THREE.Vector2(0.017, 0.18), new THREE.Vector2(0.017, 0.24),
    new THREE.Vector2(0.022, 0.245), new THREE.Vector2(0.022, 0.26),
  ], []);
  if (kind === "beer") return (
    <group>
      <mesh castShadow><latheGeometry args={[profile, 20]} /><meshStandardMaterial color="#49311b" roughness={0.2} metalness={0.12} /></mesh>
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.11, 20, 1, true]} />
        <meshStandardMaterial color="#e4d6b4" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.185, 0]}><cylinderGeometry args={[0.0185, 0.0185, 0.035, 16]} /><meshStandardMaterial color="#bd8e43" metalness={0.45} roughness={0.3} /></mesh>
      <mesh position={[0, 0.258, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.019, 0.003, 6, 16]} /><meshStandardMaterial color="#785023" roughness={0.2} /></mesh>
    </group>
  );
  return (
    <group>
      <mesh><cylinderGeometry args={[0.065, 0.047, 0.22, 20, 1, true]} /><meshStandardMaterial color="#f2e6ca" transparent opacity={0.28} roughness={0.12} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, -0.015, 0]}><cylinderGeometry args={[0.058, 0.044, 0.175, 20]} /><meshStandardMaterial color="#c77f20" roughness={0.24} /></mesh>
      <mesh position={[0, 0.079, 0]}><cylinderGeometry args={[0.06, 0.059, 0.024, 20]} /><meshStandardMaterial color="#f1e5ca" roughness={0.95} /></mesh>
      <mesh position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.065, 0.003, 6, 20]} /><meshStandardMaterial color="#efe8d6" roughness={0.12} /></mesh>
    </group>
  );
}

function PosedGuest({ spec }: { spec: PersonSpec }) {
  const apron = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.065, 0.75); shape.lineTo(0.065, 0.75);
    shape.quadraticCurveTo(0.065, 0.63, 0.12, 0.58);
    shape.lineTo(0.14, 0.34); shape.quadraticCurveTo(0, 0.32, -0.14, 0.34);
    shape.lineTo(-0.12, 0.58); shape.quadraticCurveTo(-0.065, 0.63, -0.065, 0.75);
    return shape;
  }, []);
  const variants = [2, 1, 0, 0, 0, 2];
  const index = spec.variant ?? 0;
  if (!Number.isInteger(index) || index < 0) throw new Error("Festival guest variant must be a non-negative integer.");
  const variant = variants[index % variants.length];
  const height = spec.height ?? 1.75;
  return (
    <FestivalPerson position={spec.position} lookAt={spec.lookAt} rotationY={spec.rotationY}
      variant={variant} height={height} pose={spec.pose ?? (spec.drink || spec.role === "chef" ? "work" : "stand")}>
      {(anchors) => <>
        {spec.drink && <group position={anchors.rightHand} scale={1 / height}><Drink kind={spec.drink} /></group>}
        {spec.role === "chef" && <group name="chef-uniform">
          <mesh position={[anchors.chest[0], 0, anchors.chest[2] + 0.065]} castShadow>
            <shapeGeometry args={[apron]} /><meshStandardMaterial color="#c7b99d" roughness={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[anchors.chest[0], 0.76, anchors.chest[2] + 0.065]}>
            <torusGeometry args={[0.048, 0.007, 6, 16, Math.PI]} /><meshStandardMaterial color="#c7b99d" roughness={1} />
          </mesh>
          <mesh position={[anchors.headTop[0], anchors.headTop[1] + 0.013, anchors.headTop[2]]}>
            <cylinderGeometry args={[0.07, 0.068, 0.075, 20]} /><meshStandardMaterial color="#ece2cf" roughness={0.95} />
          </mesh>
          <group position={anchors.rightHand} scale={1 / height} rotation={[0.9, 0, 0.2]}>
            {[-0.012, 0.012].map((x) => <mesh key={x} position={[x, -0.11, 0]}><boxGeometry args={[0.012, 0.28, 0.018]} /><meshStandardMaterial color="#b8b1a2" metalness={0.85} roughness={0.25} /></mesh>)}
          </group>
        </group>}
      </>}
    </FestivalPerson>
  );
}

export function RealPeople({ specs, fallback }: { specs: PersonSpec[]; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback}>{specs.map((spec, i) => <PosedGuest key={i} spec={spec} />)}</Suspense>;
}
