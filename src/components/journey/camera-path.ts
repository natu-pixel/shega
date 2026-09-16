import * as THREE from "three";

/**
 * THE ONE CONTINUOUS CAMERA ROUTE.
 *
 * World map (x/z ground plan):
 *   Bermel stage .......... around (0, 0), crowd from z = -4 to -24
 *   ETFC cage ............. center (0, -34), radius ~6
 *   Exit corridor ......... x = 8..20 at z = -34
 *   Harer festival ........ x = 22..75, z = -46..-18 (tables ~x 36-46, grill x 52, toast x 57)
 *   Final ascent .......... camera rises above (50, -25)
 *
 * `at` is scroll progress 0..1. Edit these keys to change the camera flight.
 * Each scene file notes which key range flies through it.
 */
export type CameraKey = { at: number; eye: [number, number, number]; look: [number, number, number] };

export const CAMERA_KEYS: CameraKey[] = [
  { at: 0.00, eye: [6.5, 2.7, -7], look: [0, 2.3, 0.8] },
  { at: 0.06, eye: [-6, 2.9, -4.5], look: [0, 2.3, 0.8] },
  { at: 0.12, eye: [-3.6, 2.4, -8], look: [0, 1.9, -20] },
  { at: 0.20, eye: [0, 2.1, -14], look: [0, 1.8, -34] },
  { at: 0.26, eye: [0, 2, -24], look: [0, 1.6, -34] },
  { at: 0.32, eye: [1.5, 1.9, -30.5], look: [-1, 1.5, -35] },
  { at: 0.36, eye: [4.2, 2, -35.5], look: [-1.2, 1.5, -33.8] },
  { at: 0.40, eye: [0, 2.1, -38.6], look: [0, 1.5, -33.5] },
  { at: 0.44, eye: [-3, 2, -31.5], look: [4, 1.6, -34] },
  { at: 0.50, eye: [8.5, 2, -34], look: [20, 1.7, -34] },

  // ── HARER ENA SENGAW — 5 chapters (world: field x=22..80, z=-48..-14) ──
  // Ch1 INTO THE OPEN AIR (0.55-0.65): wide establishing drift into the field.
  { at: 0.55, eye: [16, 2.6, -35], look: [34, 1.6, -30] },
  { at: 0.60, eye: [24, 2.4, -31], look: [40, 1.4, -27] },
  // Ch2 SHARED BETWEEN FRIENDS (0.65-0.74): approach the tere siga gathering (40,-28).
  { at: 0.65, eye: [31, 2.2, -27], look: [40, 1.2, -28] },
  { at: 0.70, eye: [36.5, 1.9, -26.8], look: [41.5, 1.1, -28.5] },
  // Ch3 FIRE & SMOKE (0.74-0.84): lean into the grill (52,-28.5) and pass through smoke.
  { at: 0.74, eye: [43, 2.1, -27.2], look: [52, 1, -28.5] },
  { at: 0.78, eye: [49.5, 1.6, -27.6], look: [52.3, 0.95, -28.4] },
  { at: 0.80, eye: [52.6, 1.9, -25.8], look: [56, 1.3, -27.5] },
  // Ch4 GLASSES UP (0.84-0.90): through the toast (58.5,-26), glasses enter foreground.
  { at: 0.84, eye: [54.5, 2, -24.8], look: [58.3, 1.4, -26.3] },
  { at: 0.88, eye: [57, 2, -23.8], look: [59, 1.5, -26.6] },
  // Ch5 THE REVEAL (0.90-1.00): rise above the whole festival into the night.
  { at: 0.92, eye: [58, 4.5, -18], look: [50, 1, -28] },
  { at: 0.96, eye: [52, 14, -6], look: [46, 0.5, -28] },
  { at: 1.00, eye: [48, 26, 4], look: [44, 0, -28] },
];

export function sampleCamera(progress: number, eye: THREE.Vector3, look: THREE.Vector3) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && progress > CAMERA_KEYS[i + 1].at) i++;
  const a = CAMERA_KEYS[i], b = CAMERA_KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (progress - a.at) / (b.at - a.at)));
  const s = t * t * (3 - 2 * t);
  eye.set(
    a.eye[0] + (b.eye[0] - a.eye[0]) * s,
    a.eye[1] + (b.eye[1] - a.eye[1]) * s,
    a.eye[2] + (b.eye[2] - a.eye[2]) * s,
  );
  look.set(
    a.look[0] + (b.look[0] - a.look[0]) * s,
    a.look[1] + (b.look[1] - a.look[1]) * s,
    a.look[2] + (b.look[2] - a.look[2]) * s,
  );
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Global daylight envelope 0..1. Dark indoor venues (Bermel/ETFC) → golden
 * afternoon as the festival opens, then the day→NIGHT timeline takes over
 * (sunset → blue hour → night) as the camera rises to the final reveal.
 * Rises 0.46→0.58, holds through golden hour, falls 0.78→1.00 into night.
 */
export const daylightAt = (p: number) => clamp01((p - 0.46) / 0.12) * (1 - clamp01((p - 0.78) / 0.2));

/** 0 by day, 1 by the final night reveal — drives the lighting timeline. */
export const nightAt = (p: number) => clamp01((p - 0.72) / 0.24);

/** Deterministic pseudo-random 0..1 shared by all scene files. */
export function random(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
