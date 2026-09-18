"use client";

import { useEffect, useMemo } from "react";
import { useSceneTexture } from "../scene-assets";
import * as THREE from "three";
import { random } from "../camera-path";
import { FestivalPerson } from "../festival-person";
import { HardwareBatch, Truss } from "../stage-hardware";
import { BermelShow } from "./bermel-show";

const metal = new THREE.MeshStandardMaterial({ color: "#383b40", metalness: 0.85, roughness: 0.32 });
const black = new THREE.MeshStandardMaterial({ color: "#121315", roughness: 0.8 });
const skirt = new THREE.MeshStandardMaterial({ color: "#b9bec6", roughness: 0.55, metalness: 0.25 });
const floorPanel = new THREE.BoxGeometry(1, 1, 1);
const floorFinish = new THREE.MeshStandardMaterial({ color: "#242322", roughness: 0.96 });
const floorPanels = Array.from({ length: 36 }, (_, i) => new THREE.Matrix4().compose(
  new THREE.Vector3(-8.8 + (i % 9 + 0.5) * 17.6 / 9, 0.81, -3.9 + (Math.floor(i / 9) + 0.5) * 1.95),
  new THREE.Quaternion(),
  new THREE.Vector3(17.6 / 9 - 0.016, 0.04, 1.934),
));

// Staggered vertical LED columns behind the DJ, like the supplied festival photo.
type ScreenVariant = "teal" | "white" | "warm";
const LED_COLUMNS: { x: number; width: number; height: number; variant: ScreenVariant }[] = [
  { x: -8.45, width: 2.2, height: 4.9, variant: "teal" },
  { x: -6.0, width: 2.5, height: 6.7, variant: "white" },
  { x: -3.7, width: 2.2, height: 5.5, variant: "warm" },
  { x: -1.55, width: 2.4, height: 7.5, variant: "white" },
  { x: 1.55, width: 2.4, height: 7.1, variant: "teal" },
  { x: 3.7, width: 2.2, height: 5.5, variant: "white" },
  { x: 6.0, width: 2.5, height: 6.7, variant: "warm" },
  { x: 8.45, width: 2.2, height: 4.9, variant: "teal" },
];
const LED_MASTS: { x: number; height: number }[] = [
  { x: -7.15, height: 7.3 }, { x: -4.85, height: 7.6 },
  { x: 4.85, height: 7.6 }, { x: 7.15, height: 7.3 },
];
const mastHeadBody = new THREE.CylinderGeometry(0.085, 0.11, 0.24, 10);
const mastLens = new THREE.CircleGeometry(0.082, 14);
const coolLens = new THREE.MeshBasicMaterial({ color: "#dfe9ff", toneMapped: false });
const mastHeadMatrices: THREE.Matrix4[] = [];
const mastLensMatrices: THREE.Matrix4[] = [];
for (const mast of LED_MASTS) {
  const top = 0.82 + mast.height + 0.3;
  for (const dx of [-0.34, 0.34]) {
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.5, 0, 0));
    mastHeadMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(mast.x + dx, top, 2.9), tilt, new THREE.Vector3(1, 1, 1)));
    mastLensMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(mast.x + dx, top - Math.sin(0.5) * 0.125, 2.9 - Math.cos(0.5) * 0.125),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, Math.PI, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
  }
}

/** Washed-out live-visual textures for the LED columns: glow, bokeh and beams. */
function useLiveVisuals() {
  const textures = useMemo(() => {
    const palettes: Record<ScreenVariant, { glow: string; beam: string; bokeh: string[] }> = {
      teal: { glow: "#0e3f38", beam: "#7ef2d4", bokeh: ["#b6ffe9", "#63d9c2", "#e9fff8"] },
      white: { glow: "#33352c", beam: "#f2f3da", bokeh: ["#ffffff", "#f0eecb", "#cfd8c9"] },
      warm: { glow: "#3d3113", beam: "#ffd98a", bokeh: ["#ffe9b3", "#ffc46b", "#fff6df"] },
    };
    const entries = {} as Record<ScreenVariant, THREE.CanvasTexture>;
    (Object.keys(palettes) as ScreenVariant[]).forEach((variant, index) => {
      const palette = palettes[variant];
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 320;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The Bermel LED columns need a 2D canvas context.");
      context.fillStyle = "#05080a";
      context.fillRect(0, 0, 160, 320);
      const glow = context.createLinearGradient(0, 320, 0, 0);
      glow.addColorStop(0, palette.beam);
      glow.addColorStop(0.42, palette.glow);
      glow.addColorStop(1, "#04070a");
      context.fillStyle = glow;
      context.fillRect(0, 0, 160, 320);
      // Diagonal light beams rising through the footage.
      for (let i = 0; i < 5; i++) {
        const seed = index * 40 + i;
        context.save();
        context.translate(20 + random(seed) * 120, 320);
        context.rotate(-0.35 + random(seed + 9) * 0.7);
        const beam = context.createLinearGradient(0, 0, 0, -300);
        beam.addColorStop(0, `${palette.beam}88`);
        beam.addColorStop(1, `${palette.beam}00`);
        context.fillStyle = beam;
        context.fillRect(-4 - random(seed + 17) * 5, -300, 8 + random(seed + 17) * 10, 300);
        context.restore();
      }
      // Soft crowd/bokeh blobs, denser toward the bottom.
      for (let i = 0; i < 60; i++) {
        const seed = index * 900 + i;
        const x = random(seed) * 160;
        const y = 320 - Math.pow(random(seed + 3000), 1.6) * 300;
        const radius = 2 + random(seed + 6000) * 9;
        const blob = context.createRadialGradient(x, y, 0, x, y, radius);
        const color = palette.bokeh[i % palette.bokeh.length];
        blob.addColorStop(0, `${color}e6`);
        blob.addColorStop(1, `${color}00`);
        context.fillStyle = blob;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      // Hot core near the base so the panel blooms like real footage.
      const core = context.createRadialGradient(80, 305, 4, 80, 305, 120);
      core.addColorStop(0, "#ffffffee");
      core.addColorStop(1, "#ffffff00");
      context.fillStyle = core;
      context.fillRect(0, 150, 160, 170);
      // Faint LED scanlines.
      context.fillStyle = "rgba(0,0,0,0.16)";
      for (let y = 0; y < 320; y += 4) context.fillRect(0, y, 160, 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      entries[variant] = texture;
    });
    return entries;
  }, []);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);
  return textures;
}

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
  const visuals = useLiveVisuals();
  return <group name="bermel-dj-stage">
    <mesh position={[0, 0.4, 0]} material={black} receiveShadow castShadow><boxGeometry args={[17.6, 0.8, 7.8]} /></mesh>
    {/* bright deck skirt along the front edge, like the reference stage */}
    <mesh position={[0, 0.55, -3.93]} material={skirt}><boxGeometry args={[17.62, 0.42, 0.06]} /></mesh>
    <mesh position={[0, 0.79, -3.92]} material={metal}><boxGeometry args={[17.65, 0.05, 0.1]} /></mesh>
    <group name="bermel-modular-stage-floor"><HardwareBatch geometry={floorPanel} material={floorFinish} matrices={floorPanels} receiveShadow /></group>
    {/* staggered LED columns — a glowing skyline behind the DJ */}
    <group name="bermel-led-columns">
      {LED_COLUMNS.map((column) => <group key={column.x} position={[column.x, 0.82 + column.height / 2, 0]}>
        <mesh position={[0, 0, 3.42]} material={black}><boxGeometry args={[column.width + 0.18, column.height + 0.16, 0.22]} /></mesh>
        <mesh position={[0, 0, 3.3]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[column.width, column.height]} />
          <meshBasicMaterial map={visuals[column.variant]} toneMapped={false} />
        </mesh>
      </group>)}
      {LED_MASTS.map((mast) => <group key={mast.x}>
        <Truss position={[mast.x, 0.82 + mast.height / 2, 3.0]} length={mast.height} vertical />
        <mesh position={[mast.x, 0.9, 3.0]} material={black}><boxGeometry args={[0.72, 0.16, 0.72]} /></mesh>
        <mesh position={[mast.x, 0.82 + mast.height + 0.12, 2.95]} material={metal}><boxGeometry args={[1.05, 0.09, 0.3]} /></mesh>
      </group>)}
      <HardwareBatch geometry={mastHeadBody} material={black} matrices={mastHeadMatrices} />
      <HardwareBatch geometry={mastLens} material={coolLens} matrices={mastLensMatrices} />
    </group>
    {/* the Bermel artwork stays as the hero center screen, in front of the columns */}
    <mesh position={[0, 4.35, 3.06]} material={black}><boxGeometry args={[6.9, 3.72, 0.2]} /></mesh>
    <mesh position={[0, 4.35, 2.94]} rotation={[0, Math.PI, 0]} name="bermel-led-artwork">
      <planeGeometry args={[6.6, 6.6 * 212 / 426]} />
      <meshBasicMaterial map={artwork} color="#c5c5c5" toneMapped={false} />
    </mesh>
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
    {/* The DJ riser — booth and DJ raised front and center, like a real festival stage. */}
    <group position={[0, 0.34, 0]}>
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
    </group>
    {/* riser platform, steel trim and front glow strip */}
    <mesh position={[0, 1.0, 0.42]} material={black} castShadow receiveShadow><boxGeometry args={[4.6, 0.34, 2.5]} /></mesh>
    <mesh position={[0, 1.176, 0.42]} material={metal}><boxGeometry args={[4.7, 0.022, 2.6]} /></mesh>
    <mesh position={[0, 1.02, -0.842]}><boxGeometry args={[4.45, 0.04, 0.012]} /><meshBasicMaterial color="#f16c2a" toneMapped={false} /></mesh>
    <BermelShow />
    <pointLight position={[0, 4.5, -2.6]} color="#ffe5d0" intensity={38} distance={16} decay={2} />
  </group>;
}
