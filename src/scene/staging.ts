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

export type Stance = "stand" | "sit" | "bow";

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
  position: [0, world.sanctuaryFloor, -5.28],
  facing: 0,
  stance: "stand",
};
const deaconAtSolea: Actor = {
  position: [-0.45, world.soleaFloor, -2.25],
  facing: 0,
  stance: "stand",
};
const deaconByAltar: Actor = {
  position: [0.85, world.sanctuaryFloor, -4.85],
  facing: 0,
  stance: "stand",
};
const readerAside: Actor = {
  position: [1.55, 0, 3.35],
  facing: 0,
  stance: "sit",
};
const readerAtAmbon: Actor = {
  position: [0.2, world.soleaFloor, -1.35],
  facing: 0,
  stance: "stand",
};
const priestAtProthesis: Actor = {
  position: [-2.95, world.sanctuaryFloor, -5.75],
  facing: Math.PI / 2,
  stance: "stand",
};
const deaconAtProthesis: Actor = {
  position: [-2.35, world.sanctuaryFloor, -5.15],
  facing: Math.PI,
  stance: "stand",
};
const priestAtAmbon: Actor = {
  position: [0, world.soleaFloor, -1.35],
  facing: Math.PI,
  stance: "stand",
};
const deaconFacingPeople: Actor = {
  position: [0.15, world.soleaFloor, -1.25],
  facing: Math.PI,
  stance: "stand",
};

function stage(staging: Staging): Staging {
  return staging;
}

const cameraPoses: Record<StagedId, CameraPose> = {
  gathering: { position: [0.3, 1.65, 11.4], target: [0, 1.7, -2.2] },
  proskomedia: { position: [-1.1, 1.7, -4.35], target: [-3.4, 1.15, -5.7] },
  opening: { position: [0.15, 1.62, 4.4], target: [0, 1.35, -5.6] },
  "litany-of-peace": { position: [1.8, 1.62, 1.1], target: [-0.3, 1.35, -2.4] },
  antiphons: { position: [-1.6, 1.8, 5.6], target: [3.4, 1.4, 3.6] },
  "little-entrance": { position: [0.35, 3.45, 7.4], target: [-0.4, 1.05, -1.6] },
  trisagion: { position: [0, 1.65, 4.6], target: [0, 2.1, -3] },
  epistle: { position: [2.1, 1.62, 1.15], target: [0.15, 1.35, -1.3] },
  gospel: { position: [2.35, 1.6, 0.55], target: [0, 1.45, -1.25] },
  homily: { position: [1.7, 1.6, 1.8], target: [0, 1.45, -1.3] },
  "before-the-gifts": { position: [0.6, 1.65, 2.6], target: [0, 1.4, -2.5] },
  cherubic: { position: [3.4, 2.5, 5.2], target: [0, 1.4, -3.4] },
  "great-entrance": { position: [-0.15, 3.65, 8.1], target: [-0.5, 1.0, -2] },
  creed: { position: [0.2, 1.65, 5.8], target: [0, 1.5, -4.2] },
  anaphora: { position: [0.35, 1.7, 1.5], target: [0, 1.25, -5.7] },
  epiklesis: { position: [1.35, 2.05, 4.4], target: [0, 1.15, -4.6] },
  theotokos: { position: [2.6, 1.75, 0.2], target: [-0.6, 1.9, -3] },
  "our-father": { position: [0, 1.65, 5.2], target: [0, 1.4, -5] },
  "holy-things": { position: [1.5, 1.7, -3.55], target: [0, 1.2, -5.8] },
  communion: { position: [3.15, 1.75, 0.15], target: [0.2, 1.25, -1.8] },
  thanksgiving: { position: [0.2, 1.65, 2.8], target: [0, 1.4, -3.4] },
  dismissal: { position: [0.15, 1.75, 6.8], target: [0, 1.3, -1.2] },
};

const stagingByStep: Record<StagedId, Staging> = {
  gathering: stage({
    priest: { position: [0.4, world.sanctuaryFloor, -4.4], facing: 0, stance: "stand" },
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
    deacon: { position: [0.7, world.sanctuaryFloor, -4.6], facing: 0, stance: "stand" },
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
    deacon: { position: [-0.8, world.sanctuaryFloor, -4.2], facing: 0, stance: "stand" },
    reader: readerAside,
    faithful: "sit",
    communicants: 0,
  }),
  "little-entrance": stage({
    priest: { position: [0.55, world.sanctuaryFloor, -3.55], facing: Math.PI, stance: "stand" },
    deacon: { position: [-0.7, world.sanctuaryFloor, -4.7], facing: 0, stance: "stand" },
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
    deacon: { position: [-0.85, world.soleaFloor, -2.15], facing: 0, stance: "stand" },
    reader: readerAtAmbon,
    faithful: "sit",
    communicants: 0,
  }),
  gospel: stage({
    priest: { position: [0.4, world.sanctuaryFloor, -3.7], facing: Math.PI, stance: "stand" },
    deacon: deaconFacingPeople,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  homily: stage({
    priest: priestAtAmbon,
    deacon: { position: [0.85, world.soleaFloor, -2.15], facing: Math.PI, stance: "stand" },
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
    priest: priestAtAltar,
    deacon: { position: [-2.2, world.sanctuaryFloor, -4.9], facing: Math.PI / 2, stance: "stand" },
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  "great-entrance": stage({
    priest: { position: [-2.95, world.sanctuaryFloor, -5.75], facing: Math.PI / 2, stance: "stand" },
    deacon: { position: [-3.15, world.sanctuaryFloor, -5.55], facing: 0, stance: "stand" },
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
    deacon: { position: [0.95, world.sanctuaryFloor, -5.05], facing: 0, stance: "bow" },
    reader: { ...readerAside, stance: "bow" },
    faithful: "bow",
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
    priest: { position: [0, world.sanctuaryFloor, -5.15], facing: Math.PI, stance: "stand" },
    deacon: deaconByAltar,
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
  communion: stage({
    priest: { position: [0.15, world.soleaFloor, -2.05], facing: Math.PI, stance: "stand" },
    deacon: { position: [0.85, world.soleaFloor, -2.15], facing: Math.PI, stance: "stand" },
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 4,
  }),
  thanksgiving: stage({
    priest: { position: [0, world.sanctuaryFloor, -3.45], facing: Math.PI, stance: "stand" },
    deacon: deaconByAltar,
    reader: readerAside,
    faithful: "stand",
    communicants: 0,
  }),
  dismissal: stage({
    priest: priestAtAmbon,
    deacon: { position: [0.9, world.soleaFloor, -2.05], facing: Math.PI, stance: "stand" },
    reader: { ...readerAside, stance: "stand" },
    faithful: "stand",
    communicants: 0,
  }),
};

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
