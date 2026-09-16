import * as THREE from "three";
import { sampleCamera } from "../camera-path";
import type { CrowdPlacement } from "../dance-crowd";
import { ARENA_LAYOUT } from "./arena-layout";

// Include the approach and exit, not only the close-ups inside the cage.
const route = Array.from({ length: 576 }, (_, index) => {
  const eye = new THREE.Vector3();
  sampleCamera(0.075 + index * 0.001, eye, new THREE.Vector3());
  return eye;
});

function nearCamera(guest: CrowdPlacement) {
  const chest = new THREE.Vector3(...guest.position);
  chest.y += guest.height * 0.6;
  return route.some((eye) => eye.distanceToSquared(chest) < 7.05 * 7.05);
}

export const ARENA_FOREGROUND: CrowdPlacement[] = [];
export const ARENA_CUTOUT_BLOCKS = ARENA_LAYOUT.blocks.flatMap((block) => {
  const cutouts: CrowdPlacement[] = [];
  for (const guest of block.placements) {
    if (block.detail === "standard" || nearCamera(guest)) ARENA_FOREGROUND.push(guest);
    else cutouts.push(guest);
  }
  return cutouts.length ? [{ id: block.id, placements: cutouts }] : [];
});
