"use client";

/**
 * SCENE 4 — HARER ENA SENGAW FESTIVAL (scroll 0.55 → 1.00)
 *
 * One connected outdoor world (x = 22 … 80, z = -48 … -14). The camera walks a
 * single line through it, in five chapters (see camera-path.ts):
 *   Ch1 0.55-0.65  INTO THE OPEN AIR  — wide establishing drift
 *   Ch2 0.65-0.74  SHARED BETWEEN FRIENDS — the tere siga gathering  (40, -28)
 *   Ch3 0.74-0.84  FIRE & SMOKE — the grill hero shot, pass through smoke (52, -28.5)
 *   Ch4 0.84-0.90  GLASSES UP — the toast, glasses in the foreground (58.5, -26)
 *   Ch5 0.90-1.00  THE REVEAL — rise above the whole festival into the night
 * Keep the walking line (z ≈ -35 → -24) free of obstacles; the camera hugs the
 * grill and the toast closely.
 *
 * Production note (the doc you shared): replace these procedural placeholders
 * with optimized GLBs per SHEGA_WEB — environment.glb / tere-siga.glb /
 * grill.glb / celebration.glb / characters.glb. Camera chapters won't change.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nightAt, random } from "../camera-path";
import type { JourneyStore } from "@/lib/journey";
import { Person } from "../people";
import { Drink, RealPeople } from "../real-people";
import { facingTarget } from "../posed-people";
import { ModelSlot } from "../model-slot";
import { Fire, FlameBed, GrassTuft, GroundMaterial, Lantern, Rocks, Smoke } from "../effects";
import { RawBeef, TereSigaShop } from "./tere-siga-shop";
import { useNearbyAnimation } from "../use-nearby-animation";
import { HarerEntrance } from "./harer-entrance";

/* Shared materials */
const woodMat = new THREE.MeshStandardMaterial({ color: "#7d5a33", roughness: 0.85 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: "#4a3520", roughness: 0.95 });
const mitmitaMat = new THREE.MeshStandardMaterial({ color: "#a8321f", roughness: 0.8 });

/** Tere siga — a shared platter with injera, raw meat, and a mitmita dish. */
function TereSigaPlatter({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const injeraTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create the injera surface texture.");
    context.fillStyle = "#c7baa0";
    context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const x = random(i + 800) * 256, y = random(i + 3200) * 256;
      const r = 0.4 + random(i + 6000) * 1.6;
      context.fillStyle = i % 3 ? "#a5977d" : "#e0d3b7";
      context.beginPath();
      context.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
      context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => injeraTexture.dispose(), [injeraTexture]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* low table */}
      <mesh position={[0, 0.81, 0]} receiveShadow><cylinderGeometry args={[1.15, 1.15, 0.08, 40]} /><primitive object={woodMat} attach="material" /></mesh>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.16, 0.24, 0.8, 12]} /><primitive object={darkWoodMat} attach="material" /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.48, 0.54, 0.12, 20]} /><primitive object={darkWoodMat} attach="material" /></mesh>
      <mesh position={[0, 0.865, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.02, 0.022, 8, 48]} /><meshStandardMaterial color="#a5a397" metalness={0.85} roughness={0.35} /></mesh>
      {/* injera base */}
      <mesh position={[0, 0.86, 0]} receiveShadow><cylinderGeometry args={[1.0, 1.0, 0.03, 40]} /><meshStandardMaterial map={injeraTexture} bumpMap={injeraTexture} bumpScale={0.008} roughness={0.95} /></mesh>
      {/* raw meat pieces */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <RawBeef key={i} position={[Math.cos(a) * 0.55, 0.89, Math.sin(a) * 0.55]} rotation={a} scale={[0.5, 0.7, 0.5]} />
        );
      })}
      {/* central mitmita / awaze dish */}
      <mesh position={[0, 0.93, 0]}><cylinderGeometry args={[0.22, 0.17, 0.1, 24]} /><primitive object={darkWoodMat} attach="material" /></mesh>
      <mesh position={[0, 0.978, 0]}><cylinderGeometry args={[0.195, 0.195, 0.012, 24]} /><primitive object={mitmitaMat} attach="material" /></mesh>
    </group>
  );
}

/** The hero grill — charcoal, glowing embers, sizzling meat, sparks, smoke, a grill master. */
function HeroGrill({ position }: { position: [number, number, number] }) {
  const firelight = useRef<THREE.PointLight>(null);
  useNearbyAnimation(firelight, (t) => {
    if (firelight.current) firelight.current.intensity = 3.8 + Math.sin(t * 6) * 0.6 + Math.sin(t * 17) * 0.2;
  }, { kind: "hero-grill-light", radius: 5, distance: 22 });
  const proceduralGrill = (
    <>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[2.6, 0.7, 1.3]} /><meshStandardMaterial color="#26221d" roughness={0.85} /></mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-1.1 + i * 0.44, 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 1.15, 5]} />
          <meshStandardMaterial color="#3a3a40" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </>
  );
  const proceduralMeat = (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.95 + (i % 5) * 0.48, 0.94, -0.28 + Math.floor(i / 5) * 0.55]} rotation={[0, random(i) * 1.4, 0]}>
          <boxGeometry args={[0.34, 0.09, 0.2]} />
          <meshStandardMaterial color={i % 2 ? "#8c4a28" : "#a35b2f"} roughness={0.55} />
        </mesh>
      ))}
    </>
  );
  return (
    <group position={position}>
      {/* real grill model, procedural fallback */}
      <ModelSlot url="/models/grill.glb" fitHeight={0.86} rotationY={Math.PI / 2} fallback={proceduralGrill} />
      {/* The scan is a thin cut: scale by its thickness, not a whole roast's height. */}
      {Array.from({ length: 6 }, (_, i) => (
        <ModelSlot key={i} url="/models/meat.glb" fitHeight={0.048} shadows={false}
          position={[-0.76 + (i % 3) * 0.72, 0.86, -0.28 + Math.floor(i / 3) * 0.54]}
          rotationY={random(i + 90) * Math.PI} fallback={i === 0 ? proceduralMeat : null} />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <mesh key={i} position={[-1.03 + (i % 7) * 0.34, 0.66 + random(i) * 0.045, -0.43 + Math.floor(i / 7) * 0.28]}
          rotation={[random(i), random(i + 40), random(i + 60)]} scale={[0.17, 0.09, 0.13]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={i % 4 ? "#292623" : "#74695a"} emissive="#ba3007" emissiveIntensity={i % 3 ? 0.08 : 0.65} roughness={1} />
        </mesh>
      ))}
      <FlameBed position={[0, 0.68, 0]} width={2.0} depth={0.8} height={0.42} seed={21} />
      <pointLight ref={firelight} position={[0, 1.65, 0]} color="#ff963f" intensity={3.8} distance={8} decay={2} />
      <Smoke position={[0, 0.98, 0]} color="#b5b0a7" count={8} size={1.5} rise={2.1} seed={21} />
      <RealPeople
        specs={[
          { position: [0.2, 0.025, -1.15], lookAt: [0, 0], variant: 2, height: 1.82, role: "chef" },
          { position: [1.8, 0.025, -0.6], lookAt: [0, 0], variant: 2, height: 1.74 },
        ]}
        fallback={
          <>
            <Person position={[0.5, 0, -1.6]} rotation={2.9} warm seed={40} />
            <Person position={[1.8, 0, 0.9]} rotation={-2.1} warm seed={41} scale={0.95} />
          </>
        }
      />
    </group>
  );
}

/** The toast — friends raising bottles/glasses that meet for a clink. */
function Toast({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RealPeople
        specs={[
          { position: [-0.7, 0.025, 0], lookAt: [0.1, 0.25], variant: 0, height: 1.7, timeOffset: 0.4, drink: "beer" },
          { position: [0.85, 0.025, -0.15], lookAt: [0.1, 0.25], variant: 1, height: 1.66, timeOffset: 2.1, drink: "glass" },
          { position: [0.1, 0.025, 1.05], lookAt: [0.1, 0.25], variant: 3, height: 1.78, timeOffset: 3.0, drink: "beer" },
        ]}
        fallback={
          <>
            <Person position={[-0.6, 0, 0]} rotation={1.35} pose="toast" warm seed={50} />
            <Person position={[0.75, 0, -0.15]} rotation={-1.7} pose="toast" warm seed={51} scale={0.96} />
            <Person position={[0.1, 0, 0.95]} rotation={-2.6} pose="sit" warm seed={52} scale={0.9} />
          </>
        }
      />
    </group>
  );
}

export function HarerFestival({ store }: { store: JourneyStore }) {
  const sun = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (sun.current) sun.current.opacity = 0.65 * Math.max(0, 1 - nightAt(store.getSnapshot()) * 2.4);
  });
  // Vegetation kept clear of the camera walking line (z ≈ -35..-24, x 22..62).
  const trees = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x: 24 + random(i + 3) * 56,
    z: -48 + random(i + 33) * 36,
    s: 1.4 + random(i + 63) * 1.6,
  })).filter((tree) => tree.z < -38.5 || tree.z > -19 || tree.x > 66), []);
  const grass = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    x: 24 + random(i + 200) * 56,
    z: -48 + random(i + 300) * 36,
    s: 0.7 + random(i + 400) * 0.9,
    seed: i,
  })).filter((g) => g.z < -37 || g.z > -20 || g.x > 64), []);
  const lanterns = useMemo(() => ([
    [36, 2.6, -30], [44, 2.6, -25], [50, 2.7, -31], [56, 2.6, -23], [62, 2.7, -29], [48, 2.5, -20],
  ] as [number, number, number][]), []);

  return (
    <group name="harer-festival-world">
      <group name="harer-entrance-world"><HarerEntrance /></group>
      {/* terrain */}
      <mesh position={[52, 0.02, -27]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 60]} />
        <GroundMaterial color="#8a6b3c" />
      </mesh>
      <mesh position={[98, 12, -46]}><circleGeometry args={[2.4, 32]} /><meshBasicMaterial ref={sun} color="#ffd49a" transparent depthWrite={false} toneMapped={false} /></mesh>

      {/* vegetation + rocks — real acacia trees, procedural fallback */}
      {trees.map((tree, i) => (
        <ModelSlot
          key={i}
          url="/models/acacia-single.glb"
          fitHeight={4.4 * tree.s}
          position={[tree.x, 0, tree.z]}
          rotationY={random(i) * Math.PI * 2}
          fallback={
            <group position={[tree.x, 0, tree.z]} scale={tree.s}>
              <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.09, 0.16, 2.2, 6]} /><meshStandardMaterial color="#4c3a24" roughness={1} /></mesh>
              <mesh position={[0, 2.3, 0]} scale={[1, 0.42, 1]}><sphereGeometry args={[1.5, 10, 8]} /><meshStandardMaterial color={i % 3 === 0 ? "#556233" : "#44502e"} roughness={1} /></mesh>
            </group>
          }
        />
      ))}
      {grass.map((g, i) => <GrassTuft key={i} position={[g.x, 0, g.z]} scale={g.s} seed={g.seed} />)}
      <Rocks center={[34, -40]} count={7} spread={18} seed={5} />
      <Rocks center={[66, -22]} count={6} spread={16} seed={25} />

      {/* hanging lanterns (they carry the night reveal) */}
      {lanterns.map((pos, i) => (
        <group key={i}>
          <Lantern position={pos} seed={i * 3} />
          <mesh position={[pos[0] + 0.38, (pos[1] + 1) / 2, pos[2]]}>
            <cylinderGeometry args={[0.035, 0.055, pos[1] + 1, 10]} /><primitive object={darkWoodMat} attach="material" />
          </mesh>
          <mesh position={[pos[0] + 0.18, pos[1] + 1, pos[2]]}>
            <boxGeometry args={[0.52, 0.055, 0.055]} /><primitive object={darkWoodMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Ch2 — the tere siga gathering (real animated people around the platter) */}
      <TereSigaShop />
      <group position={[40, 0, -28]}>
        <TereSigaPlatter position={[0, 0, 0]} />
        <RealPeople
          specs={Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 + 0.4;
            return {
              position: [Math.cos(a) * 1.7, 0.025, Math.sin(a) * 1.5] as [number, number, number],
              lookAt: [0, 0] as [number, number],
              variant: i % 4,
              height: 1.68 + (i % 3) * 0.06,
              timeOffset: i * 0.9,
            };
          })}
          fallback={Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 + 0.4;
            return <Person key={i} position={[Math.cos(a) * 1.7, 0, Math.sin(a) * 1.4]} rotation={facingTarget([Math.cos(a) * 1.7, 0, Math.sin(a) * 1.4], [0, 0])} pose="sit" warm seed={i + 10} scale={0.94} />;
          })}
        />
      </group>

      {/* extra social tables (middle ground) */}
      {([[46, -33], [35.5, -21]] as const).map(([x, z], t) => (
        <group key={t} position={[x, 0, z]}>
          <mesh position={[0, 0.72, 0]}><boxGeometry args={[2.6, 0.12, 1.5]} /><primitive object={woodMat} attach="material" /></mesh>
          {[[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]].map(([dx, dz], i) => (
            <mesh key={i} position={[dx, 0.36, dz]}><cylinderGeometry args={[0.05, 0.05, 0.72, 6]} /><primitive object={darkWoodMat} attach="material" /></mesh>
          ))}
          <mesh position={[0, 0.82, 0]}><boxGeometry args={[1.1, 0.1, 0.7]} /><meshStandardMaterial color="#8f4438" roughness={0.7} /></mesh>
          <group position={[-0.85, 0.89, 0.25]}><Drink kind="beer" /></group>
          <group position={[0.85, 0.89, -0.25]}><Drink kind="glass" /></group>
          <RealPeople
            specs={Array.from({ length: 4 }, (_, i) => {
              const a = (i / 4) * Math.PI * 2 + t;
              return {
                position: [Math.cos(a) * 1.7, 0.025, Math.sin(a) * 1.25] as [number, number, number],
                lookAt: [0, 0] as [number, number],
                variant: (t * 2 + i) % 4,
                height: 1.66 + (i % 2) * 0.1,
                timeOffset: t + i * 1.1,
              };
            })}
            fallback={Array.from({ length: 4 }, (_, i) => {
              const a = (i / 4) * Math.PI * 2 + t;
              return <Person key={i} position={[Math.cos(a) * 1.5, 0, Math.sin(a) * 1.05]} rotation={facingTarget([Math.cos(a) * 1.5, 0, Math.sin(a) * 1.05], [0, 0])} pose="sit" warm seed={t * 9 + i + 20} scale={0.92} />;
            })}
          />
        </group>
      ))}

      {/* Ch3 — the hero grill */}
      <HeroGrill position={[52, 0, -28.5]} />

      {/* Ch4 — the toast */}
      <Toast position={[58.5, 0, -26]} />

      {/* scattered guests — real animated background crowd */}
      <RealPeople
        specs={Array.from({ length: 14 }, (_, i) => ({
          position: [27 + random(i + 70) * 38, 0.025, i % 2 ? -39 - random(i + 90) * 3 : -20 + random(i + 90) * 3] as [number, number, number],
          rotationY: random(i) * Math.PI * 2,
          variant: i % 4,
          height: 1.62 + random(i + 5) * 0.24,
          timeOffset: random(i + 11) * 6,
        }))}
        fallback={Array.from({ length: 14 }, (_, i) => (
          <Person key={i} position={[27 + random(i + 70) * 38, 0, -42 + random(i + 90) * 26]} rotation={random(i) * Math.PI * 2} warm seed={i + 70} scale={0.88 + random(i + 5) * 0.22} pose={i % 4 === 0 ? "cheer" : "stand"} />
        ))}
      />

      {/* warm fires + light dust for atmosphere */}
      <Fire position={[32, 0, -33]} scale={1.15} seed={4} />
      <Fire position={[47.5, 0, -19.5]} scale={0.9} seed={8} />
      <Fire position={[63, 0, -31]} scale={1.0} seed={12} />
    </group>
  );
}
