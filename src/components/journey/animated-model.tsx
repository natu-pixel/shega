"use client";

/**
 * ANIMATED MODEL — load any GLB that carries an animation clip and play it.
 * Used for Sketchfab downloads: dancer, guitarist, drummer, fighters, etc.
 * Auto-scales to fitHeight, grounds on y=0, runs an AnimationMixer.
 * Renders `fallback` while the file is missing/loading so the site never breaks.
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useModelExists } from "./model-slot";
import { journeyModelUrl } from "@/lib/journey-models";
import { useSceneModel } from "./scene-assets";
import { useNearbyAnimation } from "./use-nearby-animation";

function groundTo(root: THREE.Object3D, height: number) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0.0001) throw new Error("The animated model has no measurable height.");
  const scale = height / size.y;
  root.scale.multiplyScalar(scale);
  const b2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  b2.getCenter(center);
  root.position.sub(new THREE.Vector3(center.x, b2.min.y, center.z));
}

function Inner({ url, fitHeight, timeOffset = 0, clipIndex = 0, paused = false }: { url: string; fitHeight: number; timeOffset?: number; clipIndex?: number; paused?: boolean }) {
  const animated = useRef<THREE.Group>(null);
  const { scene, animations } = useSceneModel(url);
  const { model, mixer, clip, actor } = useMemo(() => {
    if (!Number.isFinite(fitHeight) || fitHeight <= 0) throw new Error("Animated model height must be positive.");
    if (!Number.isInteger(clipIndex) || !animations[clipIndex]) throw new Error(`Animation ${clipIndex} is missing from ${url}.`);
    if (!Number.isFinite(timeOffset) || timeOffset < 0) throw new Error("Animation offset must be finite and non-negative.");
    const root = SkeletonUtils.clone(scene);
    const junk: THREE.Object3D[] = [];
    root.traverse((n) => {
      if (n instanceof THREE.Camera || n instanceof THREE.Light) junk.push(n);
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        n.frustumCulled = false;
      }
    });
    junk.forEach((n) => n.parent?.remove(n));
    const clip = animations[clipIndex];
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixer.setTime(timeOffset);
    root.updateMatrixWorld(true);
    root.traverse((node) => { if (node instanceof THREE.SkinnedMesh) node.computeBoundingBox(); });
    // Normalize the performed pose, not the export's T-pose, outside animation tracks.
    const model = new THREE.Group();
    model.add(root);
    groundTo(model, fitHeight);
    return { model, mixer, clip, actor: root };
  }, [scene, animations, fitHeight, clipIndex, timeOffset, url]);

  useEffect(() => {
    mixer.clipAction(clip).reset().play();
    mixer.setTime(timeOffset);
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(actor);
      actor.traverse((node) => { if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose(); });
    };
  }, [mixer, actor, clip, timeOffset]);

  useNearbyAnimation(animated, (time, delta) => {
    if (delta === 0) mixer.setTime(time);
    else mixer.update(delta);
  }, { kind: `model:${url}:${clipIndex}:${timeOffset}`, distance: 18, radius: fitHeight, startTime: timeOffset, enabled: !paused });
  return <primitive ref={animated} object={model} dispose={null} />;
}

export function AnimatedModel({ url, fitHeight, position = [0, 0, 0], rotationY = 0, timeOffset = 0, clipIndex = 0, paused = false, fallback }: {
  url: string;
  fitHeight: number;
  position?: [number, number, number];
  rotationY?: number;
  timeOffset?: number;
  clipIndex?: number;
  paused?: boolean;
  fallback?: React.ReactNode;
}) {
  const resolvedUrl = journeyModelUrl(url);
  const exists = useModelExists(resolvedUrl);
  const inner = exists ? (
    <Suspense fallback={<>{fallback}</>}>
      <Inner url={resolvedUrl} fitHeight={fitHeight} timeOffset={timeOffset} clipIndex={clipIndex} paused={paused} />
    </Suspense>
  ) : (
    <>{fallback}</>
  );
  return <group position={position} rotation={[0, rotationY, 0]}>{inner}</group>;
}
