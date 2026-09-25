import { world } from "./world";
import type { Vec3 } from "./path";

export const stagedStepIds = [
  "gathering",
  "proskomedia",
  "opening",
  "litany-of-peace",
  "antiphons",
  "little-entrance",
  "trisagion",
  "epistle",
  "gospel",
  "homily",
  "before-the-gifts",
  "cherubic",
  "great-entrance",
  "creed",
  "anaphora",
  "epiklesis",
  "theotokos",
  "our-father",
  "holy-things",
  "communion",
  "thanksgiving",
  "dismissal",
] as const;

export type StagedId = (typeof stagedStepIds)[number];

export type Stance = "stand" | "sit" | "bow" | "kneel";

export type DoorState = {
  royal: boolean;
  north: boolean;
  south: boolean;
  curtain: boolean;
};

export type Actor = {
  position: Vec3;
  facing: number;
  stance: Stance;
};

export type Staging = {
  priest: Actor;
  deacon: Actor;
  reader: Actor;
  faithful: Stance;
  communicants: number;
};

export type CameraPose = {
  position: Vec3;
  target: Vec3;
};

const priestAtAltar: Actor = {
  position: [0, world.sanctuaryFloor, -13.8],
  facing: 0,
  stance: "stand",
};
const deaconAtSolea: Actor = {
  position: [-0.7, world.soleaFloor, -6.9],
  facing: 0,
  stance: "stand",
};
const deaconByAltar: Actor = {
  position: [1.35, world.sanctuaryFloor, -13.2],
  facing: 0,
  stance: "stand",
};
const readerAside: Actor = {
  position: [2.3, 0, 4.4],
  facing: 0,
  stance: "stand",
};
const readerAtAmbon: Actor = {
  position: [0.35, world.soleaFloor, -5.45],
  facing: 0,
  stance: "stand",
};
const priestAtProthesis: Actor = {
  position: [-5.7, world.sanctuaryFloor, -14.6],
  facing: Math.PI / 2,
  stance: "stand",
};
const deaconAtProthesis: Actor = {
  position: [-5.3, world.sanctuaryFloor, -13.4],
  facing: Math.PI,
  stance: "stand",
};
const priestAtAmbon: Actor = {
  position: [0, world.soleaFloor, -5.45],
  facing: Math.PI,
  stance: "stand",
};
const deaconFacingPeople: Actor = {
  position: [0.45, world.soleaFloor, -5.2],
  facing: Math.PI,
  stance: "stand",
};

function stage(staging: Staging): Staging {
  return staging;
}

const cameraPoses: Record<StagedId, CameraPose> = {
  gathering: { position: [1.1, 1.72, 18.4], target: [0.15, 1.4, 8.2] },
  proskomedia: { position: [-4.15, 1.7, -13.05], target: [-6.45, 1.2, -14.55] },
  opening: { position: [0.15, 1.66, -7.05], target: [0.05, 1.4, -13.9] },
  "litany-of-peace": { position: [-2.15, 1.7, -4.35], target: [-0.55, 1.42, -9.4] },
  antiphons: { position: [4.15, 4.42, 6.35], target: [8.15, 4.05, 6.05] },
  "little-entrance": { position: [-5.6, 1.68, -5.4], target: [-7.4, 1.35, -9.15] },
  trisagion: { position: [1.35, 1.7, 5.6], target: [-1.8, 1.32, 3.5] },
  epistle: { position: [1.05, 1.6, -3.35], target: [0.28, 1.32, -5.48] },
  gospel: { position: [0.85, 1.58, -2.55], target: [0.4, 1.3, -5.18] },
  homily: { position: [1.45, 1.66, 2.15], target: [0.02, 1.38, -5.42] },
  "before-the-gifts": { position: [2.8, 1.95, 0.6], target: [-0.55, 1.4, -7.1] },
  cherubic: { position: [-3.55, 1.74, -12.55], target: [-6.35, 1.22, -14.55] },
  "great-entrance": { position: [-5.4, 1.68, -4.2], target: [-7.45, 1.35, -9.2] },
  creed: { position: [0.35, 1.74, 6.6], target: [0.05, 1.4, -8.8] },
  anaphora: { position: [1.45, 1.74, -13.05], target: [0.02, 1.32, -15.2] },
  epiklesis: { position: [0.25, 1.68, 3.4], target: [0.02, 1.22, -14.9] },
  theotokos: { position: [1.7, 1.88, -12.35], target: [0.1, 1.65, -17.7] },
  "our-father": { position: [-0.35, 1.7, 8.2], target: [0.2, 1.38, 3.1] },
  "holy-things": { position: [0.12, 1.64, -6.45], target: [0, 1.5, -13.75] },
  communion: { position: [1.15, 1.6, -2.15], target: [0.15, 1.25, -6.15] },
  thanksgiving: { position: [0.7, 1.68, -6.15], target: [0, 1.48, -10.15] },
  dismissal: { position: [1.05, 1.62, -1.85], target: [0.02, 1.28, -5.4] },
};

const stagingByStep: Record<StagedId, Staging> = {
  gathering: stage({
    priest: { position: [0.6, world.sanctuaryFloor, -11.6], facing: 0, stance: "stand" },
    deacon: deaconAtProthesis,
    reader: readerAside,
    faithful: "sit",
    communicants: 0,
  }),
  proskomedia: stage({
    priest: priestAtProthesis,
    deacon: deaconAtProthesis,
    reader: readerAside,
    faithful: "sit",
    communicants: 0,
  }),
  opening: stage({
    priest: priestAtAltar,
    deacon: { position: [1.2, world.sanctuaryFloor, -12.2], facing: 0, stance: "stand" },
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  "litany-of-peace": stage({
    priest: priestAtAltar,
    deacon: deaconAtSolea,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  antiphons: stage({
    priest: priestAtAltar,
    deacon: { position: [-1.4, world.sanctuaryFloor, -12.4], facing: 0, stance: "stand" },
    reader: readerAside,
    faithful: "sit",
    communicants: 0,
  }),
  "little-entrance": stage({
    priest: { position: [0.9, world.sanctuaryFloor, -10.6], facing: Math.PI, stance: "stand" },
    deacon: { position: [-1.1, world.sanctuaryFloor, -12.4], facing: 0, stance: "stand" },
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  trisagion: stage({
    priest: priestAtAltar,
    deacon: deaconAtSolea,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  epistle: stage({
    priest: priestAtAltar,
    deacon: { position: [-1.3, world.soleaFloor, -6.6], facing: 0, stance: "stand" },
    reader: readerAtAmbon,
    faithful: "sit",
    communicants: 0,
  }),
  gospel: stage({
    priest: { position: [0.7, world.sanctuaryFloor, -10.8], facing: Math.PI, stance: "stand" },
    deacon: deaconFacingPeople,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  homily: stage({
    priest: priestAtAmbon,
    deacon: { position: [1.15, world.soleaFloor, -5.15], facing: Math.PI, stance: "stand" },
    reader: readerAside,
    faithful: "sit",
    communicants: 0,
  }),
  "before-the-gifts": stage({
    priest: priestAtAltar,
    deacon: deaconAtSolea,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  cherubic: stage({
    priest: priestAtProthesis,
    deacon: deaconAtProthesis,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  "great-entrance": stage({
    priest: { position: [-5.7, world.sanctuaryFloor, -14.6], facing: Math.PI / 2, stance: "stand" },
    deacon: { position: [-6.4, world.sanctuaryFloor, -14.2], facing: 0, stance: "stand" },
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  creed: stage({
    priest: priestAtAltar,
    deacon: deaconAtSolea,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  anaphora: stage({
    priest: priestAtAltar,
    deacon: deaconByAltar,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  epiklesis: stage({
    priest: priestAtAltar,
    deacon: { position: [1.15, world.sanctuaryFloor, -14.15], facing: Math.PI / 2, stance: "bow" },
    reader: { ...readerAside, stance: "kneel" },
    faithful: "kneel",
    communicants: 0,
  }),
  theotokos: stage({
    priest: priestAtAltar,
    deacon: deaconByAltar,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  "our-father": stage({
    priest: priestAtAltar,
    deacon: deaconAtSolea,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  "holy-things": stage({
    priest: { position: [0, world.sanctuaryFloor, -13.5], facing: Math.PI, stance: "stand" },
    deacon: deaconByAltar,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  communion: stage({
    priest: { position: [0.2, world.soleaFloor, -6.3], facing: Math.PI, stance: "stand" },
    deacon: { position: [1.2, world.soleaFloor, -6.5], facing: Math.PI, stance: "stand" },
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 6,
  }),
  thanksgiving: stage({
    priest: { position: [0, world.sanctuaryFloor, -10.4], facing: Math.PI, stance: "stand" },
    deacon: deaconByAltar,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  dismissal: stage({
    priest: priestAtAmbon,
    deacon: { position: [1.35, world.soleaFloor, -6.4], facing: Math.PI, stance: "stand" },
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 5,
  }),
};

const royalOpen: DoorState = { royal: true, north: false, south: false, curtain: true };
const doorsShut: DoorState = { royal: false, north: false, south: false, curtain: false };
const entranceOpen: DoorState = { royal: true, north: true, south: false, curtain: true };

export function doorsFor(id: string, clergyReceiving = false): DoorState {
  if (!isStagedId(id)) return doorsShut;
  switch (id) {
    case "gathering":
    case "proskomedia":
      return doorsShut;
    case "little-entrance":
    case "great-entrance":
      return entranceOpen;
    case "holy-things":
      return clergyReceiving ? doorsShut : royalOpen;
    case "thanksgiving":
      return { royal: true, north: true, south: false, curtain: true };
    case "opening":
    case "litany-of-peace":
    case "antiphons":
    case "trisagion":
    case "epistle":
    case "gospel":
    case "homily":
    case "before-the-gifts":
    case "cherubic":
    case "creed":
    case "anaphora":
    case "epiklesis":
    case "theotokos":
    case "our-father":
    case "communion":
    case "dismissal":
      return royalOpen;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function isStagedId(id: string): id is StagedId {
  return (stagedStepIds as readonly string[]).includes(id);
}

export function cameraFor(id: string): CameraPose {
  if (isStagedId(id)) return cameraPoses[id];
  return cameraPoses.gathering;
}

export function stagingFor(id: string): Staging {
  if (!isStagedId(id)) {
    throw new Error(`No staging for ${id}`);
  }
  return stagingForId(id);
}

function stagingForId(id: StagedId): Staging {
  switch (id) {
    case "gathering":
    case "proskomedia":
    case "opening":
    case "litany-of-peace":
    case "antiphons":
    case "little-entrance":
    case "trisagion":
    case "epistle":
    case "gospel":
    case "homily":
    case "before-the-gifts":
    case "cherubic":
    case "great-entrance":
    case "creed":
    case "anaphora":
    case "epiklesis":
    case "theotokos":
    case "our-father":
    case "holy-things":
    case "communion":
    case "thanksgiving":
    case "dismissal":
      return stagingByStep[id];
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
