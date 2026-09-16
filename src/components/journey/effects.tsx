"use client";

/**
 * Shared atmosphere helpers: smoke sprites, flickering fire, floating dust,
 * and the procedural ground material. Usable from any scene file.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { daylightAt, random } from "./camera-path";
import type { JourneyStore } from "@/lib/journey";
import { useNearbyAnimation } from "./use-nearby-animation";

export function useGlowTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create the festival glow texture.");
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
    gradient.addColorStop(0, "rgba(255,255,255,.85)");
    gradient.addColorStop(0.45, "rgba(255,255,255,.28)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function Smoke({ position, color = "#8a8794", count = 7, rise = 2.2, size = 2.4, seed = 0 }: {
  position: [number, number, number];
  color?: string;
  count?: number;
  rise?: number;
  size?: number;
  seed?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create the festival smoke texture.");
    for (let i = 0; i < 42; i++) {
      const a = random(i + 400) * Math.PI * 2;
      const r = Math.sqrt(random(i + 600)) * 29;
      const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
      const gradient = context.createRadialGradient(x, y, 0, x, y, 19 + random(i) * 14);
      gradient.addColorStop(0, "rgba(255,255,255,0.16)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const group = useRef<THREE.Group>(null);
  useNearbyAnimation(group, (elapsed) => {
    if (!group.current) return;
    const time = elapsed * 0.35;
    group.current.children.forEach((sprite, i) => {
      const phase = (time + random(seed + i) * 3 + i * 0.45) % 3;
      sprite.position.y = phase * rise * 0.5;
      sprite.position.x = phase * 0.24 + Math.sin(time * 0.8 + i * 2 + seed) * 0.25 * phase;
      sprite.position.z = Math.sin(i * 2.4 + seed) * 0.24 * phase;
      const s = size * (0.4 + phase * 0.5);
      sprite.scale.set(s, s, s);
      (sprite as THREE.Sprite).material.opacity = 0.22 * Math.sin(Math.PI * phase / 3);
      (sprite as THREE.Sprite).material.rotation = random(seed + i + 60) * 6 + time * 0.08;
    });
  }, { kind: `smoke:${seed}`, radius: rise * 2 + size, distance: 22 });
  return (
    <group ref={group} position={position}>
      {Array.from({ length: count }, (_, i) => (
        <sprite key={i}>
          <spriteMaterial map={texture} color={color} transparent depthWrite={false} opacity={0.2} />
        </sprite>
      ))}
    </group>
  );
}

const flameVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const flameFragment = `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 p = vec2(vUv.x * 5.0 + uSeed, vUv.y * 3.2 - uTime * 1.8);
    float n = noise(p) * 0.65 + noise(p * 2.1) * 0.25 + noise(p * 4.2) * 0.1;
    float x = abs(vUv.x - 0.5) * 2.0;
    float taper = 1.0 - pow(vUv.y, 0.7);
    float body = taper - x + (n - 0.5) * 0.8;
    float edge = smoothstep(0.0, 0.2, body);
    float alpha = edge * smoothstep(0.0, 0.07, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
    float core = smoothstep(0.1, 0.75, body) * (1.0 - vUv.y);
    vec3 color = mix(vec3(1.6, 0.12, 0.012), vec3(2.4, 1.25, 0.25), core);
    gl_FragColor = vec4(color, alpha * 0.72);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Crossed translucent flame sheets, with individual rising embers above a fuel bed. */
export function FlameBed({ position, width = 0.7, depth = 0.6, height = 0.9, seed = 0 }: {
  position: [number, number, number]; width?: number; depth?: number; height?: number; seed?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const sparks = useRef<THREE.Points>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSeed: { value: seed } }), [seed]);
  const positions = useMemo(() => new Float32Array(28 * 3), []);
  const glow = useGlowTexture();
  useNearbyAnimation(group, (t) => {
    if (material.current) material.current.uniforms.uTime.value = t;
    if (sparks.current) {
      const attribute = sparks.current.geometry.getAttribute("position");
      for (let i = 0; i < attribute.count; i++) {
        const phase = (t * (0.19 + random(i + seed) * 0.15) + random(i + 60)) % 1;
        attribute.setXYZ(i,
          (random(i + 80) - 0.5) * width + phase * phase * 0.25,
          phase * height * 2.2,
          (random(i + 100) - 0.5) * depth);
      }
      attribute.needsUpdate = true;
    }
  }, { kind: `flame:${seed}`, radius: Math.max(width, depth, height * 2), distance: 22 });
  return <group ref={group} name="journey-flame-bed" position={position}>
    <mesh position={[0, height * 0.5, 0]}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={flameVertex} fragmentShader={flameFragment} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    {[-0.65, 0.65].map((angle) => (
      <mesh key={angle} position={[0, height * 0.4, 0]} rotation={[0, angle, 0]}>
        <planeGeometry args={[Math.min(width, depth * 1.5), height * 0.8]} />
        <shaderMaterial uniforms={uniforms} vertexShader={flameVertex} fragmentShader={flameFragment} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    ))}
    <points ref={sparks} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial map={glow} color="#ffba61" size={0.024} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  </group>;
}

export function Fire({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const light = useRef<THREE.PointLight>(null);
  useNearbyAnimation(light, (t) => {
    const flicker = 0.82 + Math.sin(t * 9 + seed) * 0.11 + Math.sin(t * 23 + seed * 2) * 0.07;
    if (light.current) light.current.intensity = 14 * scale * flicker;
  }, { kind: `fire-light:${seed}`, radius: 5 * scale, distance: 22 });
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = i / 10 * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55]} scale={[0.19, 0.13, 0.16]} rotation={[0, a, 0]} receiveShadow>
          <dodecahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? "#696055" : "#4c4841"} roughness={1} />
        </mesh>;
      })}
      {[0.3, 2.2, 4.1].map((a, i) => (
        <mesh key={a} position={[0, 0.12 + i * 0.035, 0]} rotation={[Math.PI / 2, 0, a]}>
          <cylinderGeometry args={[0.07, 0.095, 0.8, 9]} />
          <meshStandardMaterial color="#282019" emissive="#b83f0e" emissiveIntensity={0.28} roughness={1} />
        </mesh>
      ))}
      <FlameBed position={[0, 0.16, 0]} seed={seed} />
      <pointLight ref={light} position={[0, 0.9, 0]} color="#ff8c3a" intensity={12} distance={14} decay={2} />
      <Smoke position={[0, 0.9, 0]} color="#9a8f80" count={5} size={1.6} seed={seed} />
    </group>
  );
}

export function Dust({ store }: { store: JourneyStore }) {
  const texture = useGlowTexture();
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      array[i * 3] = -15 + random(i) * 95;
      array[i * 3 + 1] = random(i + 500) * 7;
      array[i * 3 + 2] = -48 + random(i + 900) * 55;
    }
    return array;
  }, []);
  useFrame(() => {
    if (!points.current) return;
    points.current.visible = store.getSnapshot() >= 0.26;
    const material = points.current.material as THREE.PointsMaterial;
    material.opacity = 0.24 + daylightAt(store.getSnapshot()) * 0.2;
  });
  useNearbyAnimation(points, (time) => {
    if (points.current) points.current.position.y = Math.sin(time * 0.22) * 0.35;
  }, { kind: "festival-dust", radius: 90, distance: 120 });
  return (
    <points ref={points} visible={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial map={texture} color="#ffe9c4" size={0.09} transparent opacity={0.25} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Low grass tufts that sway in the wind. */
export function GrassTuft({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const group = useRef<THREE.Group>(null);
  useNearbyAnimation(group, (time) => {
    if (group.current) group.current.rotation.z = Math.sin(time * 1.3 + seed) * 0.08;
  }, { kind: `grass:${seed}`, radius: scale, distance: 12 });
  return (
    <group ref={group} position={position} scale={scale}>
      {[-0.12, 0, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.22, 0]} rotation={[0, 0, (i - 1) * 0.22]}>
          <coneGeometry args={[0.05, 0.45, 4]} />
          <meshStandardMaterial color={i % 2 ? "#5a6a33" : "#4c5c2c"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Scattered rocks. */
export function Rocks({ center, count = 8, spread = 20, seed = 0 }: { center: [number, number]; count?: number; spread?: number; seed?: number }) {
  const rocks = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: center[0] + (random(seed + i) - 0.5) * spread,
    z: center[1] + (random(seed + i + 40) - 0.5) * spread,
    s: 0.2 + random(seed + i + 80) * 0.5,
    r: random(seed + i + 120) * Math.PI,
  })), [center, count, spread, seed]);
  return (
    <group>
      {rocks.map((rock, i) => (
        <mesh key={i} position={[rock.x, rock.s * 0.4, rock.z]} rotation={[0, rock.r, 0]} scale={[rock.s, rock.s * 0.7, rock.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 ? "#7a6a52" : "#6b5c46"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** A hanging festival lantern with a warm flicker. */
export function Lantern({ position, seed = 0 }: { position: [number, number, number]; seed?: number }) {
  const light = useRef<THREE.PointLight>(null);
  useNearbyAnimation(light, (time) => {
    if (light.current) light.current.intensity = 6 + Math.sin(time * 5 + seed) * 1.4;
  }, { kind: `lantern:${seed}`, radius: 5, distance: 18 });
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.012, 0.012, 1, 4]} /><meshStandardMaterial color="#2a2a30" /></mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#ffb95e" emissive="#ff9b2e" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#ff9b2e" intensity={6} distance={9} decay={2} />
    </group>
  );
}

export function GroundMaterial({ color }: { color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create the festival ground texture.");
    context.fillStyle = "#8f8f8f";
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3600; i++) {
      const shade = 110 + Math.floor(random(i) * 80);
      context.fillStyle = `rgb(${shade},${shade - 4},${shade - 9})`;
      context.fillRect(Math.floor(random(i + 9000) * 128), Math.floor(random(i + 18000) * 128), 2, 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(26, 16);
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <meshStandardMaterial color={color} map={texture} roughness={1} />;
}
