import type { SpaceId } from "../liturgy/spaces";
import type { Vec3 } from "./path";

/** East is −Z (the altar). North is −X. Figures face −Z when their facing is 0. */
export const world = {
  halfWidth: 11.5,
  wall: 0.55,
  wallHeight: 12.8,
  vaultCrown: 14.6,
  iconZ: -9.2,
  sanctuaryEast: -18.6,
  naveWest: 16.8,
  narthexWest: 22.8,
  sanctuaryFloor: 0.42,
  soleaFloor: 0.2,
  columnX: 4.85,
  deaconDoorX: 7.55,
  altar: [0, 0.42, -15.4] as Vec3,
  prothesis: [-6.8, 0.42, -14.6] as Vec3,
  ambon: [0, 0.2, -5.6] as Vec3,
};

export const littleEntrancePath: Vec3[] = [
  [-1.1, world.sanctuaryFloor, -12.4],
  [-world.deaconDoorX, world.sanctuaryFloor, world.iconZ],
  [-6.4, 0.02, -4.2],
  [-4.05, 0.02, 3.2],
  [0.15, world.soleaFloor, -5.4],
  [0, world.soleaFloor, -7.8],
  [0.25, world.sanctuaryFloor, -12.8],
];

export const greatEntrancePath: Vec3[] = [
  [-6.4, world.sanctuaryFloor, -14.4],
  [-world.deaconDoorX, world.sanctuaryFloor, world.iconZ],
  [-5.6, 0.02, 0.4],
  [-4.05, 0.02, 5.2],
  [0.2, 0.02, 0.2],
  [0, world.soleaFloor, -7.8],
  [0.2, world.sanctuaryFloor, -15.1],
];

export type FloorPatch = {
  id: SpaceId;
  position: Vec3;
  size: [number, number];
};

export const floorPatches: FloorPatch[] = [
  { id: "narthex", position: [0, 0.03, 19.8], size: [22.4, 5.4] },
  { id: "nave", position: [0, 0.03, 4.2], size: [22.2, 22] },
  { id: "sanctuary", position: [0, 0.44, -13.8], size: [22, 8.6] },
  { id: "solea", position: [0, 0.22, -7.2], size: [14, 3.2] },
  { id: "kliros", position: [8.6, 3.22, 6.2], size: [3.4, 8] },
  { id: "iconostas", position: [0, 0.24, world.iconZ], size: [16, 0.5] },
  { id: "royal-doors", position: [0, 0.26, -8.7], size: [2.2, 0.9] },
  { id: "deacon-door", position: [-world.deaconDoorX, 0.26, -8.7], size: [1.5, 0.9] },
  { id: "deacon-door", position: [world.deaconDoorX, 0.26, -8.7], size: [1.5, 0.9] },
  { id: "altar", position: [0, 0.46, -15.4], size: [2.4, 1.5] },
  { id: "prothesis", position: [-6.8, 0.46, -14.6], size: [2.2, 1.4] },
];

export const spaceLabels: { id: SpaceId; label: string; position: Vec3 }[] = [
  { id: "narthex", label: "Narthex", position: [0, 3.2, 21.2] },
  { id: "nave", label: "Nave", position: [-6.4, 4.2, 10] },
  { id: "kliros", label: "Kliros", position: [8.6, 4.4, 9.6] },
  { id: "solea", label: "Solea", position: [-4.6, 2.4, -7.2] },
  { id: "iconostas", label: "Iconostas", position: [-9.2, 6.5, world.iconZ] },
  { id: "sanctuary", label: "Sanctuary", position: [5.2, 3.4, -12.4] },
  { id: "altar", label: "Altar", position: [0, 2.6, -15.4] },
  { id: "prothesis", label: "Prothesis", position: [-6.8, 2.4, -13.2] },
];
