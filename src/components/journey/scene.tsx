"use client";

/**
 * The journey composer: camera rig, global light/color grade, post effects,
 * and the four scenes. To work on one environment, edit its file in ./scenes.
 * To change the camera flight, edit ./camera-path.ts.
 */

import { Component, lazy, Suspense, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { JourneyStore } from "@/lib/journey";
import { clamp01, daylightAt, nightAt, sampleCamera } from "./camera-path";
import { Dust, GroundMaterial } from "./effects";
import { BermelStage } from "./scenes/bermel-stage";
import { EtfcCage, EtfcLighting } from "./scenes/etfc-cage";
import { ExitCorridor } from "./scenes/exit-corridor";
import { HarerFestival } from "./scenes/harer-festival";
import { createWorldResidency } from "./world-residency";
import { scenePixelRatio } from "./render-budget";
import { motionForJourney, updateJourneyMotion, type JourneyMotion } from "./journey-motion";
import { JourneyMotionContext } from "./use-nearby-animation";
const ScenePostprocessing = lazy(() => import("./scene-postprocessing"));

// Indoor (Bermel/ETFC) grade.
const INDOOR_BG = new THREE.Color("#07080f");
const INDOOR_FOG = new THREE.Color("#0a0b14");
// Day → night timeline keyframes for the festival (golden hour → sunset → blue → night).
const SKY = {
  golden: { bg: new THREE.Color("#e8b568"), fog: new THREE.Color("#d9ab6a"), sun: new THREE.Color("#ffce8d"), hemi: 1.35, sunI: 2.6 },
  sunset: { bg: new THREE.Color("#c97b3e"), fog: new THREE.Color("#b06a3a"), sun: new THREE.Color("#ff9440"), hemi: 0.95, sunI: 1.9 },
  blue: { bg: new THREE.Color("#2a3550"), fog: new THREE.Color("#27304a"), sun: new THREE.Color("#b0623a"), hemi: 0.5, sunI: 0.7 },
  night: { bg: new THREE.Color("#0a0f1e"), fog: new THREE.Color("#0a0e1a"), sun: new THREE.Color("#5a3a5a"), hemi: 0.18, sunI: 0.12 },
};
const _bg = new THREE.Color();
const _fog = new THREE.Color();
const _sun = new THREE.Color();

function Atmosphere({ store }: { store: JourneyStore }) {
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(45, 0, -27);
    return target;
  }, []);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const background = useRef<THREE.Color>(null);
  useFrame(() => {
    const progress = store.getSnapshot();
    const day = daylightAt(progress);
    const night = nightAt(progress);
    const lift = clamp01((progress - 0.9) / 0.1);

    // Pick the festival keyframe by how far into the night we are.
    const a = night < 0.34 ? SKY.golden : night < 0.67 ? SKY.sunset : night < 0.92 ? SKY.blue : SKY.night;
    const b = night < 0.34 ? SKY.sunset : night < 0.67 ? SKY.blue : SKY.night;
    const seg = night < 0.34 ? night / 0.34 : night < 0.67 ? (night - 0.34) / 0.33 : night < 0.92 ? (night - 0.67) / 0.25 : 1;
    const s = seg * seg * (3 - 2 * seg);
    _bg.lerpColors(a.bg, b.bg, s);
    _fog.lerpColors(a.fog, b.fog, s);
    _sun.lerpColors(a.sun, b.sun, s);
    const hemi = a.hemi + (b.hemi - a.hemi) * s;
    const sunI = a.sunI + (b.sunI - a.sunI) * s;

    if (background.current) background.current.lerpColors(INDOOR_BG, _bg, day);
    if (fog.current) {
      fog.current.color.lerpColors(INDOOR_FOG, _fog, day);
      fog.current.near = 12 + day * 14;
      fog.current.far = 95 + day * 60 + lift * 160;
    }
    if (hemisphere.current) hemisphere.current.intensity = 0.25 + day * hemi;
    if (sun.current) {
      sun.current.intensity = day * sunI;
      sun.current.castShadow = day > 0.01;
      sun.current.color.copy(_sun);
      // Sun sinks toward the horizon as night falls.
      sun.current.position.set(80, 34 - night * 26, -48 + night * 10);
    }
    if (ambient.current) ambient.current.intensity = 0.16 + day * (0.25 - night * 0.12);
  });
  return <>
    <fog ref={fog} attach="fog" args={["#0a0b14", 12, 95]} />
    <color ref={background} attach="background" args={["#07080f"]} />
    <ambientLight ref={ambient} intensity={0.16} color="#5f5e78" />
    <hemisphereLight ref={hemisphere} args={["#ffd9a4", "#5c452a", 0.25]} />
    <directionalLight
      ref={sun}
      position={[80, 34, -48]}
      target={sunTarget}
      color="#ffce8d"
      intensity={0}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0005}
      shadow-camera-left={-38}
      shadow-camera-right={38}
      shadow-camera-top={28}
      shadow-camera-bottom={-28}
      shadow-camera-far={140}
    />
    <primitive object={sunTarget} />
  </>;
}

function CameraRig({ store, active, motion }: { store: JourneyStore; active: boolean; motion: JourneyMotion }) {
  const vectors = useRef({ eye: new THREE.Vector3(), look: new THREE.Vector3(), current: new THREE.Vector3(0, 2.4, 0), ready: false });
  const size = useThree((state) => state.size);
  const framing = Math.max(1, 1.3 / (size.width / size.height));
  useFrame(({ camera }, delta) => {
    const progress = store.getSnapshot();
    const entranceReveal = THREE.MathUtils.smoothstep(progress, 0.51, 0.55)
      * (1 - THREE.MathUtils.smoothstep(progress, 0.60, 0.64));
    const lens = THREE.MathUtils.lerp(71, 55, clamp01((progress - 0.22) / 0.04)) + entranceReveal * 40;
    const fieldOfView = Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(lens / 2)) * framing)));
    // Widen portrait framing without changing the continuous camera route.
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fieldOfView) {
      camera.fov = fieldOfView;
      camera.updateProjectionMatrix();
    }
    const v = vectors.current;
    sampleCamera(progress, v.eye, v.look);
    const moving = v.ready && (camera.position.distanceToSquared(v.eye) >= 0.00000001 || v.current.distanceToSquared(v.look) >= 0.00000001);
    if (!v.ready) {
      camera.position.copy(v.eye);
      v.current.copy(v.look);
      v.ready = true;
    } else {
      const d = Math.min(delta, 0.08);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, v.eye.x, 6.5, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, v.eye.y, 6.5, d);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, v.eye.z, 6.5, d);
      v.current.x = THREE.MathUtils.damp(v.current.x, v.look.x, 6.5, d);
      v.current.y = THREE.MathUtils.damp(v.current.y, v.look.y, 6.5, d);
      v.current.z = THREE.MathUtils.damp(v.current.z, v.look.z, 6.5, d);
    }
    const settled = camera.position.distanceToSquared(v.eye) < 0.00000001 && v.current.distanceToSquared(v.look) < 0.00000001;
    if (settled) {
      camera.position.copy(v.eye);
      v.current.copy(v.look);
    }
    camera.lookAt(v.current);
    updateJourneyMotion(motion, camera, active && moving && !settled, progress, delta);
  }, -1);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error("The Shega journey scene could not start.", error);
    this.props.onFailure("The 3D journey could not start on this device. The full story is below.");
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function RenderBudget({ active, motion, store }: { active: boolean; motion: JourneyMotion; store: JourneyStore }) {
  const invalidate = useThree((state) => state.invalidate);
  const setDpr = useThree((state) => state.setDpr);
  const size = useThree((state) => state.size);
  const initialDpr = useThree((state) => state.viewport.initialDpr);
  useEffect(() => {
    setDpr(scenePixelRatio(size.width, size.height, initialDpr || 1));
  }, [size.width, size.height, initialDpr, setDpr]);
  useEffect(() => {
    if (!active) return;
    const interval = 1000 / 30;
    let nextFrame = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (now >= nextFrame - 0.5) {
        invalidate();
        nextFrame = now + interval;
      }
      frame = motion.moving || store.getSnapshot() !== motion.progress ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (frame) return;
      nextFrame = 0;
      frame = requestAnimationFrame(tick);
    };
    const unsubscribe = store.subscribe(wake);
    wake();
    return () => { unsubscribe(); cancelAnimationFrame(frame); };
  }, [active, motion, store, invalidate]);
  return null;
}

function JourneyWorlds({ store }: { store: JourneyStore }) {
  const residency = useMemo(() => createWorldResidency(store), [store]);
  const zones = useSyncExternalStore(residency.subscribe, residency.getSnapshot, () => 1);
  return <>
    {(zones & 1) !== 0 && <Suspense fallback={null}><BermelStage /></Suspense>}
    {(zones & 2) !== 0 && <Suspense fallback={null}><EtfcCage /></Suspense>}
    <ExitCorridor />
    {(zones & 4) !== 0 && <Suspense fallback={null}><HarerFestival store={store} /></Suspense>}
  </>;
}

function SceneLoadingStatus() {
  const loading = useProgress((state) => state.active);
  return loading ? <p className="journey-loading" role="status">
    Loading 3D details... You can keep exploring or choose Reading view.
  </p> : null;
}

export function JourneyScene({ store, active, onFailure }: { store: JourneyStore; active: boolean; onFailure: (message: string) => void }) {
  const motion = useMemo(() => motionForJourney(store), [store]);
  return (
    <SceneBoundary onFailure={onFailure}>
      <Canvas
        className="journey-canvas"
        frameloop={active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "default" }}
        camera={{ fov: 55, near: 0.1, far: 320, position: [7, 3.1, 9] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; }}
      >
        <JourneyMotionContext.Provider value={motion}>
          <RenderBudget active={active} motion={motion} store={store} />
          <CameraRig store={store} active={active} motion={motion} />
          <Atmosphere store={store} />
          {/* Keep the arena light count stable during the stage-to-crowd turn. */}
          <EtfcLighting />
          <mesh position={[10, -0.05, -20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[260, 200]} /><GroundMaterial color="#131420" /></mesh>
          <JourneyWorlds store={store} />
          <Dust store={store} />
          <Suspense fallback={null}><ScenePostprocessing /></Suspense>
        </JourneyMotionContext.Provider>
      </Canvas>
      <SceneLoadingStatus />
    </SceneBoundary>
  );
}
