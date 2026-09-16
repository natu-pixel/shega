import * as THREE from "three";
import type { JourneyStore } from "@/lib/journey";

export function createJourneyMotion() {
  return {
    moving: false,
    delta: 0,
    progress: -1,
    frustum: new THREE.Frustum(),
    projection: new THREE.Matrix4(),
    playback: new Map<string, number>(),
  };
}

export type JourneyMotion = ReturnType<typeof createJourneyMotion>;
const motions = new WeakMap<JourneyStore, JourneyMotion>();

export function motionForJourney(store: JourneyStore) {
  let motion = motions.get(store);
  if (!motion) {
    motion = createJourneyMotion();
    motions.set(store, motion);
  }
  return motion;
}

export function updateJourneyMotion(motion: JourneyMotion, camera: THREE.Camera, moving: boolean, progress: number, delta: number) {
  motion.moving = moving;
  motion.progress = progress;
  // A demand-rendered frame after a long pause must not advance by that idle time.
  motion.delta = moving ? (delta > 0.2 ? 1 / 30 : Math.min(Math.max(delta, 0), 1 / 15)) : 0;
  camera.updateMatrixWorld();
  motion.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  motion.frustum.setFromProjectionMatrix(motion.projection);
}

export function animationIsNearby(motion: JourneyMotion, camera: THREE.Camera, bounds: THREE.Sphere, distance: number) {
  return motion.moving
    && camera.position.distanceToSquared(bounds.center) <= (distance + bounds.radius) ** 2
    && motion.frustum.intersectsSphere(bounds);
}
