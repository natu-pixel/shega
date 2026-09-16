"use client";

/**
 * SCENE 2 — ETFC MMA CAGE (scroll 0.26 → 0.44)
 *
 * Zone: octagonal cage centered at (0, -34). Open gates on the +z and +x
 * sides preserve the existing camera entry and corridor exit.
 *
 * The fighters are the real rigged Sketchfab model (public/fighter.glb).
 * It contains TWO fighters in one animated scene, rendered once.
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { journeyModelUrl } from "@/lib/journey-models";
import { useSceneModel } from "../scene-assets";
import { Fighter } from "../people";
import { random } from "../camera-path";
import { useModelExists } from "../model-slot";
import { EtfcArena } from "./etfc-arena";
import { FIGHTER_GROUNDING, fighterGroundOffset } from "./etfc-fighter-grounding";
import { useNearbyAnimation } from "../use-nearby-animation";

const FIGHTER_URL = "/fighter.glb";
const FIGHTER_HEIGHT = 1.82;
const CENTER: [number, number, number] = [0, 0, -34];
const CAGE_RADIUS = 5.6;
const CAGE_FLOOR = 0.3;
const CAGE_HEIGHT = 2.35;
const CAGE_POSTS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return [Math.cos(angle) * CAGE_RADIUS, Math.sin(angle) * CAGE_RADIUS] as const;
});

type CageSection = { width: number; center: number };

function ChainLinkPanel({ width, material }: { width: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const panel = new THREE.PlaneGeometry(width, CAGE_HEIGHT - 0.16);
    const uv = panel.getAttribute("uv");
    // Scale UVs, not the shared texture, so narrow gate panels retain wire size.
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * width / 0.21, uv.getY(i) * (CAGE_HEIGHT - 0.16) / 0.3);
    }
    return panel;
  }, [width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} />;
}

function MmaCageStructure() {
  const resources = useMemo(() => {
    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const diagonal = Math.min(Math.abs(x - y), Math.abs(x + y - (size - 1)));
        const coverage = Math.max(0, Math.min(1, 2.1 - diagonal));
        const index = (y * size + x) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = Math.round(coverage * 255);
        pixels[index + 3] = 255;
      }
    }
    const meshTexture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    meshTexture.wrapS = meshTexture.wrapT = THREE.RepeatWrapping;
    meshTexture.magFilter = THREE.LinearFilter;
    meshTexture.minFilter = THREE.LinearMipmapLinearFilter;
    meshTexture.generateMipmaps = true;
    meshTexture.anisotropy = 4;
    meshTexture.needsUpdate = true;
    const fence = new THREE.MeshStandardMaterial({
      color: "#505552", metalness: 0.48, roughness: 0.58,
      alphaMap: meshTexture, alphaTest: 0.18, alphaToCoverage: true, side: THREE.DoubleSide,
    });
    const weaveSize = 64;
    const weavePixels = new Uint8Array(weaveSize * weaveSize * 4);
    for (let y = 0; y < weaveSize; y++) for (let x = 0; x < weaveSize; x++) {
      const index = (y * weaveSize + x) * 4;
      const value = 128 + (x % 4 < 2 ? 13 : -13) + (y % 4 < 2 ? 9 : -9);
      weavePixels[index] = weavePixels[index + 1] = weavePixels[index + 2] = value;
      weavePixels[index + 3] = 255;
    }
    const weave = new THREE.DataTexture(weavePixels, weaveSize, weaveSize, THREE.RGBAFormat);
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(80, 80);
    weave.magFilter = THREE.LinearFilter;
    weave.minFilter = THREE.LinearMipmapLinearFilter;
    weave.generateMipmaps = true;
    weave.needsUpdate = true;
    const padding = new THREE.MeshStandardMaterial({ color: "#171b1e", roughness: 0.87, metalness: 0.02, bumpMap: weave, bumpScale: 0.001 });
    const redPadding = padding.clone();
    redPadding.color.set("#913c34");
    const bluePadding = padding.clone();
    bluePadding.color.set("#345879");
    const steel = new THREE.MeshStandardMaterial({ color: "#343b3b", roughness: 0.43, metalness: 0.7 });
    const apron = new THREE.MeshStandardMaterial({ color: "#171b1d", roughness: 0.94 });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ETFC fight canvas requires a 2D canvas context.");
    ctx.fillStyle = "#acada3";
    ctx.fillRect(0, 0, 1024, 1024);
    const wear = ctx.createRadialGradient(512, 512, 170, 512, 512, 550);
    wear.addColorStop(0, "rgba(120,116,101,0.09)");
    wear.addColorStop(0.72, "rgba(130,124,109,0.02)");
    wear.addColorStop(1, "rgba(56,62,57,0.18)");
    ctx.fillStyle = wear;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 800; i++) {
      ctx.strokeStyle = `rgba(48,54,51,${0.012 + random(i + 80) * 0.025})`;
      ctx.lineWidth = 0.5 + random(i + 900) * 1.5;
      ctx.beginPath();
      const x = 130 + random(i + 830) * 764, y = 130 + random(i + 1640) * 764;
      ctx.ellipse(x, y, 2 + random(i + 2800) * 8, 1.2, random(i + 4500) * Math.PI, 0, Math.PI);
      ctx.stroke();
    }
    ctx.strokeStyle = "#343d3d";
    ctx.lineWidth = 15;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const angle = i * Math.PI / 4;
      const x = 512 + Math.sin(angle) * 445;
      const y = 512 + Math.cos(angle) * 445;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#d5d3c5";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const [x, color] of [[68, "#8b3c35"], [956, "#345b7b"]] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, 486);
      ctx.lineTo(x < 512 ? x + 58 : x - 58, 512);
      ctx.lineTo(x, 538);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#283032";
    ctx.font = "900 126px Arial, sans-serif";
    ctx.fillText("ETFC", 512, 480);
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText("MIXED MARTIAL ARTS", 512, 565);
    ctx.fillStyle = "#8b3c35";
    ctx.fillRect(394, 596, 236, 8);
    for (const y of [174, 846]) {
      ctx.fillStyle = "#333b3c";
      ctx.fillRect(415, y - 24, 194, 48);
      ctx.fillStyle = "#dddcca";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText("ETFC", 512, y);
    }
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: canvasTexture, roughness: 0.97, bumpMap: weave, bumpScale: 0.0025 });
    return { meshTexture, weave, canvasTexture, fence, padding, redPadding, bluePadding, steel, apron, mat };
  }, []);
  useEffect(() => () => {
    Object.values(resources).forEach((resource) => resource.dispose());
  }, [resources]);

  return (
    <group position={CENTER} name="etfc-octagonal-mma-cage">
      <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 8, 0]} material={resources.apron} receiveShadow>
        <cylinderGeometry args={[6.28, 6.4, 0.26, 8]} />
      </mesh>
      <mesh position={[0, 0.255, 0]} rotation={[0, Math.PI / 8, 0]} material={resources.padding} receiveShadow>
        <cylinderGeometry args={[6.25, 6.25, 0.025, 8]} />
      </mesh>
      <mesh position={[0, 0.269, 0]} rotation={[0, Math.PI / 8, 0]} material={resources.mat} receiveShadow>
        <cylinderGeometry args={[5.96, 5.96, 0.042, 8]} />
      </mesh>

      {CAGE_POSTS.map(([x, z], i) => (
        <group key={`post-${i}`} position={[x, CAGE_FLOOR, z]}>
          <mesh position={[0, CAGE_HEIGHT / 2, 0]} material={i === 3 ? resources.redPadding : i === 7 ? resources.bluePadding : resources.padding} castShadow>
            <cylinderGeometry args={[0.115, 0.13, CAGE_HEIGHT + 0.09, 16]} />
          </mesh>
          <mesh position={[0, 0.026, 0]} material={resources.steel}>
            <cylinderGeometry args={[0.2, 0.2, 0.052, 8]} />
          </mesh>
          {[0.36, 1.12, 1.88].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={resources.steel}>
              <cylinderGeometry args={[0.133, 0.133, 0.025, 16]} />
            </mesh>
          ))}
          {(i === 3 || i === 7) && (
            <mesh position={[-x * 0.019, 1.15, -z * 0.019]} rotation={[0, -Math.atan2(z, x), 0]} material={i === 3 ? resources.redPadding : resources.bluePadding}>
              <boxGeometry args={[0.1, 1.68, 0.25]} />
            </mesh>
          )}
        </group>
      ))}

      {CAGE_POSTS.map(([x, z], i) => {
        const next = CAGE_POSTS[(i + 1) % 8];
        const dx = next[0] - x, dz = next[1] - z;
        const width = Math.hypot(dx, dz);
        // Local +x points along each fence. These openings follow the unchanged route.
        const gate = i === 1 ? { center: -0.7, width: 2.6 } : i === 7 ? { center: 0.55, width: 2.8 } : null;
        const sections: CageSection[] = gate ? [
          { width: width / 2 + gate.center - gate.width / 2, center: (-width / 2 + gate.center - gate.width / 2) / 2 },
          { width: width / 2 - gate.center - gate.width / 2, center: (width / 2 + gate.center + gate.width / 2) / 2 },
        ] : [{ width, center: 0 }];
        return (
          <group key={`panel-${i}`} position={[(x + next[0]) / 2, CAGE_FLOOR, (z + next[1]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]} name={gate ? `cage-open-${i === 1 ? "entrance" : "exit"}` : "cage-fence"}>
            <mesh position={[0, CAGE_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]} material={resources.padding} castShadow>
              <cylinderGeometry args={[0.082, 0.082, width, 12]} />
            </mesh>
            {sections.map((section, j) => (
              <group key={j} position={[section.center, 0, 0]}>
                <group position={[0, CAGE_HEIGHT / 2, 0]}>
                  <ChainLinkPanel width={section.width} material={resources.fence} />
                </group>
                <mesh position={[0, 0.055, 0]} rotation={[0, 0, Math.PI / 2]} material={resources.padding}>
                  <cylinderGeometry args={[0.065, 0.065, section.width, 12]} />
                </mesh>
              </group>
            ))}
            {gate && [gate.center - gate.width / 2, gate.center + gate.width / 2].map((edge, j) => (
              <group key={j} position={[edge, 0, 0]}>
                <mesh position={[0, CAGE_HEIGHT / 2, 0]} material={resources.padding} castShadow>
                  <cylinderGeometry args={[0.072, 0.072, CAGE_HEIGHT, 12]} />
                </mesh>
                {[0.42, 1.85].map((y) => (
                  <mesh key={y} position={[0, y, 0.07]} material={resources.steel}>
                    <boxGeometry args={[0.12, 0.1, 0.09]} />
                  </mesh>
                ))}
              </group>
            ))}
            {gate && (
              <group position={[gate.center + gate.width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} name="outward-open-cage-door">
                <group position={[(gate.width - 0.12) / 2, CAGE_HEIGHT / 2, 0]}>
                  <ChainLinkPanel width={gate.width - 0.12} material={resources.fence} />
                </group>
                {[0.07, CAGE_HEIGHT - 0.07].map((y) => (
                  <mesh key={y} position={[(gate.width - 0.12) / 2, y, 0]} rotation={[0, 0, Math.PI / 2]} material={resources.padding}>
                    <cylinderGeometry args={[0.045, 0.045, gate.width - 0.12, 10]} />
                  </mesh>
                ))}
                <mesh position={[gate.width - 0.12, CAGE_HEIGHT / 2, 0]} material={resources.padding}>
                  <cylinderGeometry args={[0.045, 0.045, CAGE_HEIGHT - 0.14, 10]} />
                </mesh>
                <mesh position={[gate.width - 0.19, 1.15, 0.05]} material={resources.steel}>
                  <boxGeometry args={[0.15, 0.06, 0.07]} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
      {[0, 1].map((step) => (
        <group key={step}>
          <mesh position={[6.15 + step * 0.38, 0.1 - step * 0.035, 0.55]} material={resources.apron} receiveShadow>
            <boxGeometry args={[0.42, 0.2 - step * 0.07, 2.8]} />
          </mesh>
          <mesh position={[6.3 + step * 0.38, 0.204 - step * 0.07, 0.55]} material={resources.steel}>
            <boxGeometry args={[0.045, 0.008, 2.72]} />
          </mesh>
          <mesh position={[0.7, 0.1 - step * 0.035, 6.15 + step * 0.38]} material={resources.apron} receiveShadow>
            <boxGeometry args={[2.6, 0.2 - step * 0.07, 0.42]} />
          </mesh>
          <mesh position={[0.7, 0.204 - step * 0.07, 6.3 + step * 0.38]} material={resources.steel}>
            <boxGeometry args={[2.52, 0.008, 0.045]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The fighter glb already contains TWO rigged, animated fighters (a Mixamo rig
 * and a Biped rig) sparring in one "Take 001" clip. Render ONE clone — cloning
 * twice is what produced the 4-fighter duplicate.
 */
function RealFighters({ url }: { url: string }) {
  const { scene, animations } = useSceneModel(url);
  const groundedPair = useRef<THREE.Group>(null);
  const playback = useRef<THREE.AnimationAction | null>(null);
  const { root, mixer, materials } = useMemo(() => {
    const root = SkeletonUtils.clone(scene);
    // The source display plinth is not part of either fighter and would cover
    // our canvas. Removing it also prevents its underside skewing foot height.
    root.getObjectByName("Cylinder001__0")?.removeFromParent();
    const materials = new Map<THREE.Material, THREE.Material>();
    const cloneMaterial = (source: THREE.Material) => {
      const existing = materials.get(source);
      if (existing) return existing;
      const owned = source.clone();
      // Keep every source PBR map, UV transform and side setting. Geometry and
      // textures still belong to the GLTF cache, not this animated clone.
      if (owned instanceof THREE.MeshStandardMaterial) {
        owned.roughness = Math.max(0.66, owned.roughness);
        owned.metalness = Math.min(0.04, owned.metalness);
      }
      materials.set(source, owned);
      return owned;
    };
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
      }
    });

    // Scale so the TALLER of the two fighters is ~1.82m, and center the PAIR
    // (not just one) on the ring, grounded at y=0.
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (!Number.isFinite(size.y) || size.y <= 0.0001) throw new Error("ETFC fighter model has invalid bounds.");
    const scale = FIGHTER_HEIGHT / size.y;
    root.scale.multiplyScalar(scale);
    const scaled = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    scaled.getCenter(center);
    root.position.sub(new THREE.Vector3(center.x, scaled.min.y, center.z));

    const mixer = new THREE.AnimationMixer(root);
    const clip = animations[0];
    if (clip && (
      Math.abs(clip.duration - FIGHTER_GROUNDING.duration) > 0.0001
      || Math.abs(size.y - FIGHTER_GROUNDING.sourceHeight) > 0.001
    )) {
      throw new Error("ETFC fighter asset changed; regenerate its baked ground-contact profile.");
    }
    return { root, mixer, materials };
  }, [scene, animations]);

  useEffect(() => {
    const action = animations[0] ? mixer.clipAction(animations[0]) : null;
    playback.current = action;
    action?.play();
    return () => {
      playback.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      materials.forEach((material) => material.dispose());
      root.traverse((node) => {
        if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
      });
    };
  }, [animations, materials, mixer, root]);

  useNearbyAnimation(groundedPair, (time, delta) => {
    if (delta === 0) mixer.setTime(time);
    else mixer.update(delta);
    if (groundedPair.current) groundedPair.current.position.y = 0.29 + fighterGroundOffset(playback.current?.time ?? 0, FIGHTER_HEIGHT);
  }, { kind: "etfc-fighters", distance: 22, radius: 3 });

  // Sit the pair inside the ring, feet on the canvas (ring top is y≈0.29).
  return (
    <group ref={groundedPair} name="etfc-animated-fighters" position={[0, 0.29, CENTER[2]]}>
      <primitive object={root} dispose={null} />
    </group>
  );
}

export function EtfcLighting() {
  const spotTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, 0, CENTER[2]);
    return target;
  }, []);
  return <>
    <spotLight position={[0, 6.7, CENTER[2]]} target={spotTarget} angle={0.72} penumbra={0.65} color="#e8e5df" intensity={95} distance={18} decay={1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
    <primitive object={spotTarget} />
    <pointLight position={[-12, 7.8, -39]} color="#8196b8" intensity={52} distance={25} decay={2} />
    <pointLight position={[12, 7.8, -45]} color="#8196b8" intensity={46} distance={25} decay={2} />
    <pointLight position={[0, 8.2, -28]} color="#b6b2b0" intensity={30} distance={20} decay={2} />
  </>;
}

export function EtfcCage() {
  const fighterUrl = journeyModelUrl(FIGHTER_URL);
  const hasModel = useModelExists(fighterUrl);

  return (
    <group>
      <EtfcArena />
      <MmaCageStructure />

      {/* The fighters — real animated model, or placeholders until it loads */}
      {hasModel ? (
        <Suspense
          fallback={
            <group>
              <Fighter position={[-1.05, 0.29, CENTER[2]]} seed={2} />
              <Fighter position={[1.05, 0.29, CENTER[2]]} mirror seed={7} />
            </group>
          }
        >
          <RealFighters url={fighterUrl} />
        </Suspense>
      ) : (
        <group>
          <Fighter position={[-1.05, 0.29, CENTER[2]]} seed={2} />
          <Fighter position={[1.05, 0.29, CENTER[2]]} mirror seed={7} />
        </group>
      )}

    </group>
  );
}
