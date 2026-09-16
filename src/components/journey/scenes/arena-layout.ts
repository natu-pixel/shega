import type { CrowdPlacement } from "../dance-crowd";
import { random } from "../camera-path";

export type ArenaVector = [number, number, number];
export type ArenaBox = { position: ArenaVector; size: ArenaVector; rotationY?: number };
export type ArenaRail = { start: ArenaVector; end: ArenaVector; radius: number };
export type ArenaBlock = {
  id: string;
  detail: "far" | "standard";
  placements: CrowdPlacement[];
};

export const ARENA_CENTER: [number, number] = [0, -34];
export const ARENA_BOUNDS = { minX: -20.8, maxX: 20.8, frontZ: -25.2, rearZ: -55, roofY: 10.8 };
export const ARENA_ROWS = 14;
export const ARENA_ROW_RISE = 0.39;
export const ARENA_ROW_DEPTH = 0.7;

const WARDROBE = ["#393d40", "#777366", "#903c38", "#394e68", "#ded7c5", "#4d5c4a", "#8c6e59", "#ae915a"];

function makeArenaLayout() {
  const blocks: ArenaBlock[] = [];
  const tiers: ArenaBox[] = [];
  const steps: ArenaBox[] = [];
  const rails: ArenaRail[] = [];
  const chairs: { position: ArenaVector; rotationY: number; color: number }[] = [];
  let seed = 7200;

  function block(id: string, detail: ArenaBlock["detail"]): ArenaBlock {
    const result: ArenaBlock = { id, detail, placements: [] };
    blocks.push(result);
    return result;
  }

  function fan(group: ArenaBlock, x: number, floor: number, z: number) {
    const n = seed++;
    group.placements.push({
      position: [x, floor + 0.005, z],
      height: 1.64 + random(n + 400) * 0.22,
      variant: n % 6,
      wardrobe: WARDROBE[Math.floor(random(n + 800) * WARDROBE.length)],
    });
    const angle = Math.atan2(-x, -34 - z);
    // Fans stand just ahead of the folded seat; no standing legs through cushions.
    chairs.push({
      position: [x - Math.sin(angle) * 0.29, floor, z - Math.cos(angle) * 0.29],
      rotationY: angle,
      color: n % 5 === 0 ? 1 : 0,
    });
  }

  function rail(start: ArenaVector, end: ArenaVector, radius = 0.026) {
    rails.push({ start, end, radius });
  }

  // Local bowl quadrants are further split by the crowd renderer's spatial cells.
  const left = [block("upper-west-rear", "far"), block("upper-west-front", "far")];
  const right = [block("upper-east-rear", "far"), block("upper-east-front", "far")];

  for (let row = 0; row < ARENA_ROWS; row++) {
    const floor = 0.36 + row * ARENA_ROW_RISE;
    const x = 9.85 + row * ARENA_ROW_DEPTH;
    const rearZ = -43.6 - row * ARENA_ROW_DEPTH;
    const sideRearZ = rearZ + 0.35;
    for (const [start, end] of [[-52.8, -46.3], [-45, -37.9], [-36.6, -26.5]]) {
      const clippedStart = Math.max(start, sideRearZ);
      if (end > clippedStart) tiers.push({ position: [-x, floor / 2, (clippedStart + end) / 2], size: [0.7, floor, end - clippedStart] });
    }
    for (const [start, end] of [[-52.8, -46.3], [-45, -38.8], [-29.9, -26.5]]) {
      const clippedStart = Math.max(start, sideRearZ);
      if (end > clippedStart) tiers.push({ position: [x, floor / 2, (clippedStart + end) / 2], size: [0.7, floor, end - clippedStart] });
    }
    for (const side of [-1, 1]) {
      const width = 8.825 + row * 0.7;
      tiers.push({ position: [side * (0.65 + width / 2), floor / 2, rearZ], size: [width, floor, 0.7] });
    }
    for (let col = 0; col < 37; col++) {
      const z = -52.3 + col * 0.7;
      if (z < sideRearZ + 0.2) continue;
      if (Math.abs(z + 45.65) < 0.68 || Math.abs(z + 37.25) < 0.68) continue;
      fan(left[z < -38.8 ? 0 : 1], -x + 0.18, floor, z);
    }
    for (let col = 0; col < 20; col++) {
      const z = -52.3 + col * 0.7;
      if (z < sideRearZ + 0.2) continue;
      if (Math.abs(z + 45.65) < 0.68) continue;
      fan(right[0], x - 0.18, floor, z);
    }
    for (let col = 0; col < 4; col++) {
      fan(right[1], x - 0.18, floor, -29.2 + col * 0.7);
    }
    for (let col = 0; col < 27 + row * 2; col++) {
      const rearX = -9.1 - row * 0.7 + col * 0.7;
      if (Math.abs(rearX) < 0.8) continue;
      fan(rearX < 0 ? left[0] : right[0], rearX, floor, rearZ + 0.18);
    }

    // Half-rise treads run over the grandstand risers in the empty cross-aisles.
    for (const [side, z] of [[-1, -45.65], [-1, -37.25], [1, -45.65]]) {
      if (z < sideRearZ + 0.65) continue;
      for (let half = 0; half < 2; half++) {
        const height = floor - ARENA_ROW_RISE / 2 + half * ARENA_ROW_RISE / 2;
        steps.push({ position: [side * (x - 0.175 + half * 0.35), height / 2 + 0.012, z], size: [0.35, height + 0.024, 1.3] });
      }
    }
    for (let half = 0; half < 2; half++) {
      const height = floor - ARENA_ROW_RISE / 2 + half * ARENA_ROW_RISE / 2;
      steps.push({ position: [0, height / 2 + 0.012, rearZ + 0.175 - half * 0.35], size: [1.3, height + 0.024, 0.35] });
    }
  }

  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      const floor = 0.28 + row * 0.35;
      const z = -27.15 + row * 0.85;
      tiers.push({ position: [side * 6.4, floor / 2, z], size: [5.6, floor, 0.85] });
      for (let col = 0; col < 8; col++) fan(side < 0 ? left[1] : right[1], side * (4 + col * 0.7), floor, z - 0.12);
    }
  }

  const ringsideWest = block("ringside-west", "standard");
  const ringsideEast = block("ringside-east", "standard");
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 18; col++) fan(ringsideWest, -7.3 - row * 0.95, 0.02, -40.2 + col * 0.7);
    for (let col = 0; col < 4; col++) fan(ringsideEast, 7.3 + row * 0.95, 0.02, -40.2 + col * 0.7);
    for (let col = 0; col < 3; col++) fan(ringsideEast, 7.3 + row * 0.95, 0.02, -29.5 + col * 0.7);
    for (let col = 0; col < 18; col++) {
      const x = -6 + col * 0.7;
      fan(x < 0 ? ringsideWest : ringsideEast, x, 0.02, -41.1 - row * 0.95);
    }
  }

  // Continuous aisle handrails with occasional supports, not per-seat geometry.
  for (const [side, z] of [[-1, -45.65], [-1, -37.25], [1, -45.65]]) {
    const firstRow = z < -43 ? 5 : 0;
    rail([side * (9.5 + firstRow * 0.7), 1.26 + firstRow * 0.39, z], [side * 19.4, 6.78, z]);
    for (let row = firstRow; row < ARENA_ROWS; row += 3) {
      const x = side * (9.85 + row * 0.7);
      const floor = 0.36 + row * 0.39;
      rail([x, floor, z], [x, floor + 1.1, z], 0.022);
    }
  }
  rail([0, 1.25, -43.25], [0, 6.78, -53.15]);
  for (let row = 0; row < ARENA_ROWS; row += 3) {
    const floor = 0.36 + row * 0.39;
    rail([0, floor, -43.6 - row * 0.7], [0, floor + 1.1, -43.6 - row * 0.7], 0.022);
  }

  const barriers: [ArenaVector, ArenaVector][] = [
    [[-8.9, 0, -42.7], [-8.9, 0, -28]],
    [[-8.9, 0, -42.7], [8.9, 0, -42.7]],
    [[8.9, 0, -42.7], [8.9, 0, -38.2]],
    [[8.9, 0, -29.7], [8.9, 0, -28]],
  ];
  for (const [start, end] of barriers) {
    for (const y of [0.32, 1.08]) rail([start[0], y, start[2]], [end[0], y, end[2]], 0.033);
    const count = Math.ceil(Math.hypot(end[0] - start[0], end[2] - start[2]) / 1.05);
    for (let i = 0; i <= count; i++) {
      const x = start[0] + (end[0] - start[0]) * i / count;
      const z = start[2] + (end[2] - start[2]) * i / count;
      rail([x, 0.06, z], [x, 1.1, z], 0.025);
    }
  }

  const walls: ArenaBox[] = [
    { position: [-20.55, 5.4, -40.1], size: [0.5, 10.8, 29.8] },
    { position: [0, 5.4, -54.75], size: [41.6, 10.8, 0.5] },
    { position: [20.55, 5.4, -46.5], size: [0.5, 10.8, 17] },
    { position: [20.55, 5.4, -27.6], size: [0.5, 10.8, 4.8] },
    { position: [20.55, 7.75, -34], size: [0.5, 6.1, 8] },
    { position: [-12.1, 5.4, -25.45], size: [17.4, 10.8, 0.5] },
    { position: [12.1, 5.4, -25.45], size: [17.4, 10.8, 0.5] },
    { position: [0, 8.5, -25.45], size: [6.8, 4.6, 0.5] },
  ];
  const columns: ArenaBox[] = [];
  for (const x of [-20.05, 20.05]) {
    for (const z of [-53.8, -46.4, -38.3, -29.6, -26]) {
      columns.push({ position: [x, 5.2, z], size: [0.38, 10.4, 0.38] });
    }
  }

  return { blocks, tiers, steps, rails, chairs, walls, columns };
}

export const ARENA_LAYOUT = makeArenaLayout();
export const ARENA_FAN_COUNT = ARENA_LAYOUT.blocks.reduce((total, block) => total + block.placements.length, 0);
