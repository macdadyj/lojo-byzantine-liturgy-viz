import type { Vec3 } from "./path";
import type { Stance } from "./staging";
import { world } from "./world";

/** Top of the nave marble. Standing and sitting feet meet this surface. */
export const naveFloor = 0.02;

export const pewRows = [2.2, 4.6, 7.0, 9.4, 11.8, 14.2] as const;
export const pewBanks = [-7.15, -2.2, 2.2, 7.15] as const;

const aisleEast = 1.15;

/**
 * Pew anchors are the seat centers. Sitting stays on that seat, feet toward the altar.
 * Standing, bowing, and kneeling step into the gap east of the pew so bodies miss the wood.
 */
export function faithfulPlace(x: number, z: number, stance: Stance): Vec3 {
  switch (stance) {
    case "sit":
      return [x, naveFloor, z];
    case "stand":
    case "bow":
    case "kneel":
      return [x, naveFloor, z - aisleEast];
    default: {
      const exhaustive: never = stance;
      return exhaustive;
    }
  }
}

/** Two files on the floor, a step back from the priest, facing the chalice. */
export const communionLine: Vec3[] = [
  [-0.7, world.soleaFloor, -5.05],
  [0.75, world.soleaFloor, -5.1],
  [-0.7, naveFloor, -3.75],
  [0.75, naveFloor, -3.8],
  [-0.7, naveFloor, -2.45],
  [0.75, naveFloor, -2.5],
];

/** Center aisle, clear of the priest at the ambon and of the pews. */
export const dismissalLine: Vec3[] = [
  [-0.6, world.soleaFloor, -4.15],
  [0.65, world.soleaFloor, -4.2],
  [-0.6, naveFloor, -2.85],
  [0.65, naveFloor, -2.9],
  [-0.6, naveFloor, -1.55],
];

export const choirLine: Vec3[] = [
  [8.85, 3.23, 4.0],
  [8.85, 3.23, 5.5],
  [8.85, 3.23, 7.0],
  [8.85, 3.23, 8.5],
];

export const cantorSpot: Vec3 = [8.85, 3.23, 2.45];

export function closestPair(points: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (distance < best) best = distance;
    }
  }
  return best;
}
