"use client";

import { createContext, useContext, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { animationIsNearby, type JourneyMotion } from "./journey-motion";

export const JourneyMotionContext = createContext<JourneyMotion | null>(null);

export function useNearbyAnimation(
  object: RefObject<THREE.Object3D | null>,
  animate: (time: number, delta: number) => void,
  { kind, distance = 20, radius = 3, startTime = 0, enabled = true }: {
    kind: string;
    distance?: number;
    radius?: number;
    startTime?: number;
    enabled?: boolean;
  },
) {
  const motion = useContext(JourneyMotionContext);
  if (!motion) throw new Error("Journey animations require a motion controller.");
  const state = useRef({ bounds: new THREE.Sphere(), key: "", initialized: false });
  useFrame(({ camera }) => {
    const node = object.current;
    if (!node) return;
    const current = state.current;
    if (current.initialized && (!enabled || !motion.moving)) return;
    node.getWorldPosition(current.bounds.center);
    current.bounds.radius = radius;
    if (!current.initialized) {
      // Retain only a time and stable placement key, never an unloaded model or bitmap.
      current.key = `${kind}:${current.bounds.center.toArray().map((n) => n.toFixed(3)).join(":")}`;
      const time = motion.playback.get(current.key) ?? startTime;
      motion.playback.set(current.key, time);
      animate(time, 0);
      current.initialized = true;
      return;
    }
    if (!enabled || !animationIsNearby(motion, camera, current.bounds, distance)) return;
    for (let parent: THREE.Object3D | null = node; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    const time = (motion.playback.get(current.key) ?? startTime) + motion.delta;
    motion.playback.set(current.key, time);
    animate(time, motion.delta);
  });
}
