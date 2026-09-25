import { world } from "./world";

const columnZ = [-4.6, -0.2, 4.2, 8.6, 13.0];
const pewRows = [2.2, 4.6, 7.0, 9.4, 11.8, 14.2];
const pewBanks = [
  { x: -7.15, half: 1.05 },
  { x: -2.2, half: 1.2 },
  { x: 2.2, half: 1.2 },
  { x: 7.15, half: 1.05 },
];

const bodyRadius = 0.32;
const columnReach = 0.58;

export type WalkSpot = {
  x: number;
  z: number;
  floor: number;
};

export type DoorGaps = {
  royal: boolean;
  north: boolean;
  south: boolean;
};

type Blocker = { x: number; z: number; radius: number };

const blockers = new Map<number, Blocker>();
let blockerSerial = 1;

export function nextBlockerId(): number {
  blockerSerial += 1;
  return blockerSerial;
}

export function trackBlocker(id: number, x: number, z: number, radius: number): void {
  blockers.set(id, { x, z, radius });
}

export function releaseBlocker(id: number): void {
  blockers.delete(id);
}

export function resolveWalk(x: number, z: number, doors: DoorGaps): WalkSpot {
  let px = x;
  let pz = z;
  const limitX = world.halfWidth - 0.62;
  const minZ = world.sanctuaryEast + 0.95;
  const maxZ = world.narthexWest - 0.9;
  px = clamp(px, -limitX, limitX);
  pz = clamp(pz, minZ, maxZ);

  for (const side of [-1, 1]) {
    for (const cz of columnZ) {
      const cx = side * world.columnX;
      const dx = px - cx;
      const dz = pz - cz;
      const dist = Math.hypot(dx, dz);
      const min = columnReach + bodyRadius;
      if (dist < min) {
        if (dist <= 0.0001) {
          px = cx + min;
          pz = cz;
        } else {
          px = cx + (dx / dist) * min;
          pz = cz + (dz / dist) * min;
        }
      }
    }
  }

  for (const bank of pewBanks) {
    for (const row of pewRows) {
      const halfZ = 0.4;
      const overlapX = bank.half + bodyRadius - Math.abs(px - bank.x);
      const overlapZ = halfZ + bodyRadius - Math.abs(pz - row);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      if (overlapX < overlapZ) px += (px >= bank.x ? 1 : -1) * overlapX;
      else pz += (pz >= row ? 1 : -1) * overlapZ;
    }
  }

  const wallZ = world.iconZ;
  const wallHalf = 0.34;
  if (Math.abs(pz - wallZ) < wallHalf + bodyRadius) {
    const royal = doors.royal && Math.abs(px) < 0.85;
    const north = doors.north && Math.abs(px + world.deaconDoorX) < 0.55;
    const south = doors.south && Math.abs(px - world.deaconDoorX) < 0.55;
    if (!royal && !north && !south) {
      pz = pz >= wallZ ? wallZ + wallHalf + bodyRadius : wallZ - wallHalf - bodyRadius;
    }
  }

  const altarZ = world.altar[2];
  const overlapX = 0.95 + bodyRadius - Math.abs(px);
  const overlapZ = 0.55 + bodyRadius - Math.abs(pz - altarZ);
  if (overlapX > 0 && overlapZ > 0) {
    if (overlapX < overlapZ) px += (px >= 0 ? 1 : -1) * overlapX;
    else pz += (pz >= altarZ ? 1 : -1) * overlapZ;
  }

  for (const blocker of blockers.values()) {
    const dx = px - blocker.x;
    const dz = pz - blocker.z;
    const dist = Math.hypot(dx, dz);
    const min = blocker.radius + bodyRadius * 0.65;
    if (dist >= min) continue;
    if (dist <= 0.0001) {
      px += min;
    } else {
      px = blocker.x + (dx / dist) * min;
      pz = blocker.z + (dz / dist) * min;
    }
  }

  px = clamp(px, -limitX, limitX);
  pz = clamp(pz, minZ, maxZ);

  let floor = 0;
  if (pz < world.iconZ + 0.2) floor = world.sanctuaryFloor;
  else if (pz < -5.5) floor = world.soleaFloor;
  return { x: px, z: pz, floor };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
