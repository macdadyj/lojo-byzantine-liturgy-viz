import type { SpaceId } from "../liturgy/spaces";
import type { Vec3 } from "./path";

/** East is −Z (the altar). North is −X. Figures face −Z when their facing is 0. */
export const world = {
  halfWidth: 5.35,
  wall: 0.32,
  wallHeight: 5.7,
  iconZ: -3.05,
  sanctuaryEast: -7.55,
  naveWest: 9.15,
  narthexWest: 12.35,
  sanctuaryFloor: 0.24,
  soleaFloor: 0.14,
  altar: [0, 0.24, -5.95] as Vec3,
  prothesis: [-3.65, 0.24, -5.75] as Vec3,
  ambon: [0, 0.14, -1.45] as Vec3,
};

export const littleEntrancePath: Vec3[] = [
  [-0.7, world.sanctuaryFloor, -4.7],
  [-3.55, world.sanctuaryFloor, -3.05],
  [-3.15, 0.02, -1.15],
  [-1.7, 0.02, 1.7],
  [0.05, world.soleaFloor, -1.35],
  [0, world.soleaFloor, -2.55],
  [0.15, world.sanctuaryFloor, -4.15],
];

export const greatEntrancePath: Vec3[] = [
  [-3.15, world.sanctuaryFloor, -5.55],
  [-3.55, world.sanctuaryFloor, -3.05],
  [-2.7, 0.02, 0.2],
  [-1.35, 0.02, 2.5],
  [0.15, 0.02, 0.35],
  [0, world.soleaFloor, -2.55],
  [0.1, world.sanctuaryFloor, -5.35],
];

export type FloorPatch = {
  id: SpaceId;
  position: Vec3;
  size: [number, number];
};

export const floorPatches: FloorPatch[] = [
  { id: "narthex", position: [0, 0.025, 10.75], size: [10.4, 2.9] },
  { id: "nave", position: [0, 0.025, 3.9], size: [10.3, 9.6] },
  { id: "sanctuary", position: [0, 0.255, -5.25], size: [10.2, 4.3] },
  { id: "solea", position: [0, 0.155, -2.2], size: [8.4, 1.55] },
  { id: "kliros", position: [4.15, 0.04, 4.05], size: [2.15, 3.6] },
  { id: "iconostas", position: [0, 0.17, world.iconZ], size: [8.8, 0.42] },
  { id: "royal-doors", position: [0, 0.18, -2.72], size: [1.7, 0.7] },
  { id: "deacon-door", position: [-3.55, 0.18, -2.72], size: [1.15, 0.7] },
  { id: "deacon-door", position: [3.55, 0.18, -2.72], size: [1.15, 0.7] },
  { id: "altar", position: [0, 0.27, -5.95], size: [1.8, 1.15] },
  { id: "prothesis", position: [-3.6, 0.27, -5.75], size: [1.7, 1.05] },
];

export const spaceLabels: { id: SpaceId; label: string; position: Vec3 }[] = [
  { id: "narthex", label: "Narthex", position: [0, 2.4, 11.3] },
  { id: "nave", label: "Nave", position: [-3.6, 2.5, 6.4] },
  { id: "kliros", label: "Kliros", position: [4.15, 2.15, 5.5] },
  { id: "solea", label: "Solea", position: [-2.8, 1.7, -2.15] },
  { id: "iconostas", label: "Iconostas", position: [0, 3.55, world.iconZ] },
  { id: "sanctuary", label: "Sanctuary", position: [2.6, 2.3, -4.6] },
  { id: "altar", label: "Altar", position: [0, 1.85, -5.95] },
  { id: "prothesis", label: "Prothesis", position: [-3.6, 1.7, -5.15] },
];
