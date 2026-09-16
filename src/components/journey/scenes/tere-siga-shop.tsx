"use client";

import { useEffect, useMemo } from "react";
import { useSceneTexture } from "../scene-assets";
import * as THREE from "three";
import { RealPeople } from "../real-people";

const steel = new THREE.MeshStandardMaterial({ color: "#a1a3a0", roughness: 0.33, metalness: 0.8 });
const timber = new THREE.MeshStandardMaterial({ color: "#70462d", roughness: 0.9 });

function useBeefTexture() {
  return useSceneTexture("/images/tere-siga-beef.png");
}

function beefGeometry(shape: THREE.Shape, depth: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 3, steps: 1,
    bevelSize: 0.025, bevelThickness: 0.018, curveSegments: 20,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const vertices = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  for (let i = 0; i < vertices.count; i++) {
    uv.setXY(i, (vertices.getX(i) - box.min.x) / (box.max.x - box.min.x),
      (vertices.getY(i) - box.min.y) / (box.max.y - box.min.y));
  }
  return geometry;
}

function HangingBeef({ variation }: { variation: number }) {
  const map = useBeefTexture();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.1, 0.56);
    shape.bezierCurveTo(-0.28, 0.44, -0.31, 0.25, -0.24, 0.08);
    shape.bezierCurveTo(-0.35, -0.1, -0.18, -0.24, -0.21, -0.42);
    shape.bezierCurveTo(-0.17, -0.71, 0.08, -0.68, 0.13, -0.46);
    shape.bezierCurveTo(0.31, -0.34, 0.32, -0.05, 0.25, 0.11);
    shape.bezierCurveTo(0.36, 0.3, 0.22, 0.5, 0.07, 0.56);
    shape.closePath();
    return beefGeometry(shape, 0.15);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0, -0.56, -0.08]} rotation={[0, variation * 0.11, variation * 0.045]} scale={[1 + variation * 0.08, 1, 1]} castShadow receiveShadow>
    <meshStandardMaterial attach="material-0" map={map} bumpMap={map} bumpScale={0.003} roughness={0.5} color="#d2c7bd" />
    <meshStandardMaterial attach="material-1" color="#bc8d43" roughness={0.58} />
  </mesh>;
}

export function RawBeef({ position, scale = [1, 1, 1], rotation = 0 }: {
  position: [number, number, number]; scale?: [number, number, number]; rotation?: number;
}) {
  const map = useBeefTexture();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, -0.14);
    shape.bezierCurveTo(-0.4, 0.06, -0.22, 0.26, 0.02, 0.24);
    shape.bezierCurveTo(0.22, 0.23, 0.4, 0.08, 0.28, -0.12);
    shape.bezierCurveTo(0.12, -0.27, -0.18, -0.28, -0.3, -0.14);
    return beefGeometry(shape, 0.085);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={position} scale={scale} rotation={[0, rotation, 0]}>
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial attach="material-0" map={map} bumpMap={map} bumpScale={0.002} color="#d7c8bb" roughness={0.5} />
      <meshStandardMaterial attach="material-1" color="#812b2c" roughness={0.53} />
    </mesh>
  </group>;
}

function ShopSign() {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 160;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create the tere siga shop sign.");
    context.fillStyle = "#6d171c"; context.fillRect(0, 0, 1024, 160);
    context.strokeStyle = "#d5ae67"; context.lineWidth = 4; context.strokeRect(12, 12, 1000, 136);
    context.fillStyle = "#f4e9d2"; context.textAlign = "center";
    context.font = "bold 64px Georgia"; context.fillText("TERE SIGA", 512, 80);
    context.font = "22px Arial"; context.fillText("FRESH CUTS  /  SHARED THE ETHIOPIAN WAY", 512, 120);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return <mesh position={[0, 2.75, 0.45]}><planeGeometry args={[4.4, 4.4 * 160 / 1024]} /><meshBasicMaterial map={map} /></mesh>;
}

export function TereSigaShop() {
  return <group position={[43, 0.025, -29.8]} rotation={[0, -Math.PI / 2, 0]} name="ethiopian-raw-meat-shop">
    {[-2.35, 2.35].map((x) => <mesh key={x} position={[x, 1.55, -0.8]} material={timber} castShadow><boxGeometry args={[0.12, 3.1, 0.12]} /></mesh>)}
    <mesh position={[0, 1.18, -1.55]} receiveShadow><boxGeometry args={[4.8, 2.36, 0.12]} /><meshStandardMaterial color="#d0c5af" roughness={0.85} /></mesh>
    {[-1.65, -0.85, 0, 0.85, 1.65].map((x) => <mesh key={x} position={[x, 1.2, -1.48]}><boxGeometry args={[0.018, 2.3, 0.009]} /><meshStandardMaterial color="#a69e8c" roughness={1} /></mesh>)}
    {[0.6, 1.2, 1.8].map((y) => <mesh key={y} position={[0, y, -1.475]}><boxGeometry args={[4.7, 0.018, 0.009]} /><meshStandardMaterial color="#a69e8c" roughness={1} /></mesh>)}
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-2.2 + i * 0.4, 3.03, -0.55]} rotation={[-0.08, 0, 0]} castShadow><boxGeometry args={[0.4, 0.055, 2.7]} /><meshStandardMaterial color={i % 2 ? "#791f21" : "#d7c7a6"} roughness={0.95} side={THREE.DoubleSide} /></mesh>)}
    <ShopSign />
    <mesh position={[0, 0.5, 0.24]}><boxGeometry args={[4.35, 1, 1.1]} /><meshStandardMaterial color="#7a2926" roughness={0.8} /></mesh>
    <mesh position={[0, 1.03, 0.24]} material={steel} receiveShadow><boxGeometry args={[4.55, 0.075, 1.24]} /></mesh>
    <mesh position={[-0.35, 1.115, 0.26]} material={timber} castShadow><boxGeometry args={[1.1, 0.12, 0.7]} /></mesh>
    <RawBeef position={[-0.35, 1.18, 0.25]} scale={[1.25, 1.6, 1.1]} rotation={0.2} />
    {[0, 1, 2].map((i) => <group key={i} position={[0.65 + i * 0.5, 1.09, 0.2]}>
      <mesh material={steel}><boxGeometry args={[0.46, 0.03, 0.75]} /></mesh>
      <RawBeef position={[0, 0.025, 0]} scale={[0.62, 0.85, 0.8]} rotation={i * 0.5} />
    </group>)}
    <group position={[-1.65, 1.08, 0.1]}>
      <mesh material={steel}><boxGeometry args={[0.47, 0.17, 0.44]} /></mesh>
      <mesh position={[0, 0.16, 0]} material={steel}><cylinderGeometry args={[0.24, 0.14, 0.12, 24]} /></mesh>
      <mesh position={[0, 0, 0.226]}><planeGeometry args={[0.2, 0.055]} /><meshBasicMaterial color="#5c8a64" /></mesh>
    </group>
    <group position={[-0.85, 1.19, 0.32]} rotation={[0, -0.35, Math.PI / 2]}>
      <mesh material={steel}><boxGeometry args={[0.18, 0.28, 0.009]} /></mesh>
      <mesh position={[0, -0.22, 0]} material={timber}><boxGeometry args={[0.055, 0.19, 0.045]} /></mesh>
    </group>
    <mesh position={[0, 2.34, -1.1]} material={steel} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 4.2, 12]} /></mesh>
    {[-1.75, -1.12, 1.65].map((x, i) => <group key={x} position={[x, 2.23, -1.05]}>
      <mesh material={steel}><torusGeometry args={[0.08, 0.012, 8, 20, Math.PI * 1.5]} /></mesh>
      <HangingBeef variation={i - 1} />
    </group>)}
    <RealPeople specs={[{ position: [-0.25, 0, -0.6], lookAt: [0, 1.5], variant: 2, height: 1.83, role: "chef" }]} />
    <pointLight position={[0, 2.5, 0]} color="#ffe8c3" intensity={5} distance={7} decay={2} />
  </group>;
}
