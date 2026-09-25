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
  stance: "sit",
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
  gathering: { position: [0.4, 2.3, 19.2], target: [0, 5.2, -8] },
  proskomedia: { position: [-2.2, 2.1, -11.6], target: [-6.2, 1.5, -14.6] },
  opening: { position: [0.2, 1.75, 7.5], target: [0, 2.2, -14.5] },
  "litany-of-peace": { position: [3.4, 1.8, 0.4], target: [-0.6, 1.7, -6.8] },
  antiphons: { position: [-2.4, 2.6, 9.2], target: [7.2, 3.6, 6] },
  "little-entrance": { position: [1.2, 1.65, 1.5], target: [-4.0, 1.1, 2.4] },
  trisagion: { position: [0.15, 2.15, -1.6], target: [0, 3.4, -9.2] },
  epistle: { position: [3.6, 1.8, -1.2], target: [0.3, 1.6, -5.4] },
  gospel: { position: [4.2, 1.85, -2.2], target: [0.2, 1.7, -5.2] },
  homily: { position: [3.2, 1.85, 0.6], target: [0, 1.7, -5.4] },
  "before-the-gifts": { position: [1.1, 1.9, 3.4], target: [0, 2, -8] },
  cherubic: { position: [6.2, 4.2, 8.4], target: [0, 2.4, -9] },
  "great-entrance": { position: [1.6, 1.55, 3.4], target: [-3.5, 1.15, 2.6] },
  creed: { position: [0.3, 2.1, 9.5], target: [0, 2.6, -12] },
  anaphora: { position: [0.5, 2.3, 2.2], target: [0, 1.8, -15] },
  epiklesis: { position: [2.6, 3.4, 5.2], target: [0, 1.6, -14.2] },
  theotokos: { position: [5.4, 2.8, 1.2], target: [-1.2, 3.6, -9.2] },
  "our-father": { position: [0, 2.1, 8.6], target: [0, 2.2, -13] },
  "holy-things": { position: [2.8, 2.3, -11.2], target: [0, 1.7, -15.2] },
  communion: { position: [5.6, 2.4, -2.4], target: [0.3, 1.5, -6.2] },
  thanksgiving: { position: [0.3, 1.9, 4.2], target: [0, 2.2, -9] },
  dismissal: { position: [0.2, 2.4, 12.5], target: [0, 1.7, -5.4] },
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
    priest: priestAtAltar,
    deacon: { position: [-4.2, world.sanctuaryFloor, -13.2], facing: Math.PI / 2, stance: "stand" },
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
    deacon: { position: [1.5, world.sanctuaryFloor, -13.4], facing: 0, stance: "bow" },
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
    communicants: 4,
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
