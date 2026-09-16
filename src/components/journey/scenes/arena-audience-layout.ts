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

function routeDistanceSquared(guest: CrowdPlacement) {
  const chest = new THREE.Vector3(...guest.position);
  chest.y += guest.height * 0.6;
  let nearest = Infinity;
  for (const eye of route) nearest = Math.min(nearest, eye.distanceToSquared(chest));
  return nearest;
}

// Detail ladder: full 3D within arm's reach of the camera route, the decimated
// far build for the visible middle rows, multi-angle cutouts beyond.
export const ARENA_FOREGROUND: CrowdPlacement[] = [];
export const ARENA_MIDGROUND: CrowdPlacement[] = [];
export const ARENA_CUTOUT_BLOCKS = ARENA_LAYOUT.blocks.flatMap((block) => {
  const cutouts: CrowdPlacement[] = [];
  for (const guest of block.placements) {
    const distance = routeDistanceSquared(guest);
    if (distance < 5.5 * 5.5) ARENA_FOREGROUND.push(guest);
    else if (block.detail === "standard" || distance < 7.05 * 7.05) ARENA_MIDGROUND.push(guest);
    else cutouts.push(guest);
  }
  return cutouts.length ? [{ id: block.id, placements: cutouts }] : [];
});
