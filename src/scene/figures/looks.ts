import type { Gesture } from "../gestures";
import { pick } from "../random";
import type { Stance } from "../staging";
import { Motion, type MotionId } from "./figureMaterial";
import type { FigurePose } from "./rig";
import type { Build, FigureSpec, Hair } from "./shapes";

export type Age = "child" | "teen" | "adult" | "elder";

export type Palette = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  accent: string;
  /** Metalness of the top and accent parts: gilt vestments shine, wool does not. */
  topMetal: number;
  accentMetal: number;
};

export type Person = {
  spec: FigureSpec;
  age: Age;
  palette: Palette;
  phase: number;
  jitter: number;
  variant: number;
};

const skinTones = ["#f3d5c0", "#ebc3a4", "#e0b08e", "#d19f7c", "#bb8762", "#9c6a48", "#7a4e33", "#5c3a26"];
const hairColors = ["#2a1f18", "#3a2a1f", "#4f3625", "#6e4f35", "#9a7a52", "#c4a574", "#1a1512", "#5a3a2a"];
const elderHair = ["#a39e96", "#c8c3ba", "#dcd8d0", "#8a847c"];
const jackets = ["#262c3d", "#33363c", "#4a3a2e", "#2f3d33", "#5b5e63", "#3d4b68", "#1f2226", "#6a5a4a"];
const blouses = ["#5c2632", "#8a6d4d", "#d9d0c1", "#6c4b5c", "#3d4b68", "#7a6a58", "#2f4a5a", "#a2583f", "#4d6b55", "#8c7a9a"];
const trousers = ["#1f2129", "#2b2c30", "#3b3129", "#4b4e54", "#2c3444"];
const skirts = ["#2a2c38", "#3b3129", "#4b3f4f", "#56483a", "#2c3444", "#5a2a33", "#39443a"];
const ties = ["#5c2632", "#2c3a5c", "#3a3a3a", "#6b5a3a", "#2f4a44"];
const scarves = ["#7a2632", "#9c8766", "#3b4b6b", "#6b5a3a", "#5a2a3a", "#4b3b4b", "#8c6b3b", "#2e4a44", "#d8cfbf"];

function ageFor(roll: number): Age {
  if (roll < 0.1) return "child";
  if (roll < 0.19) return "teen";
  if (roll < 0.36) return "elder";
  return "adult";
}

/** One member of the parish, fixed by the seed so every load and every screenshot shows the same people. */
export function makePerson(random: () => number, options: { adult?: boolean } = {}): Person {
  const woman = random() < 0.52;
  const rolled = ageFor(random());
  const age: Age = options.adult && (rolled === "child" || rolled === "teen") ? "adult" : rolled;
  const child = age === "child";
  const build: Build = child ? (woman ? "girl" : "boy") : woman ? "woman" : "man";
  const covered = woman && !child && (age === "elder" || random() < 0.38);
  const hair: Hair = !woman ? "short" : covered ? "scarf" : random() < 0.5 ? "long" : "bun";
  const beard = build === "man" && random() < (age === "elder" ? 0.45 : 0.2);
  const skin = pick(skinTones, random);
  const hairColor = age === "elder" ? pick(elderHair, random) : pick(hairColors, random);
  const palette: Palette = woman
    ? { skin, hair: hairColor, top: pick(blouses, random), bottom: pick(skirts, random), accent: pick(scarves, random), topMetal: 0, accentMetal: 0 }
    : { skin, hair: hairColor, top: pick(jackets, random), bottom: pick(trousers, random), accent: pick(ties, random), topMetal: 0, accentMetal: 0 };
  return { spec: { build, hair, beard }, age, palette, phase: random(), jitter: (random() - 0.5) * 0.3, variant: random() };
}

/** Uniform scale on top of the frame: teenagers a little shorter, adults varying about ±5%. */
export function personScale(person: Person): number {
  const base = person.age === "teen" ? 0.9 : person.age === "elder" ? 0.97 : 1;
  return base * (1 + person.jitter * 0.12);
}

export function poseFor(person: Person, stance: Stance, gesture: Gesture): FigurePose {
  switch (stance) {
    case "sit":
      return "sit";
    case "kneel":
      return "kneel";
    case "bow":
      return "bow";
    case "stand":
      if (gesture === "cross" && person.variant < 0.45) return "cross";
      if (person.variant < 0.5) return "stand";
      if (person.variant < 0.78) return "standB";
      return "pray";
    default: {
      const exhaustive: never = stance;
      return exhaustive;
    }
  }
}

export function motionFor(pose: FigurePose, walking: boolean): MotionId {
  if (walking) return Motion.walk;
  return pose === "cross" ? Motion.cross : Motion.still;
}

export type ClergyRole = "priest" | "deacon" | "server" | "reader";

const vestmentGold = "#c9a14e";
const vestmentTrim = "#7b2230";

/** Sunday gold for the priest and deacon, a pale sticharion for the servers, a dark suit for the reader. */
export function clergyPerson(role: ClergyRole): Person {
  const common = { age: "adult" as const, jitter: 0, variant: 0.2 };
  switch (role) {
    case "priest":
      return {
        ...common,
        phase: 0.13,
        spec: { build: "priest", hair: "short", beard: true },
        palette: { skin: "#d9a882", hair: "#3a2a1f", top: vestmentGold, bottom: "#efe6d2", accent: vestmentTrim, topMetal: 0.45, accentMetal: 0.1 },
      };
    case "deacon":
      return {
        ...common,
        phase: 0.41,
        spec: { build: "deacon", hair: "short", beard: true },
        palette: { skin: "#e3b896", hair: "#5a3a2a", top: vestmentGold, bottom: "#2b2c30", accent: vestmentTrim, topMetal: 0.4, accentMetal: 0.1 },
      };
    case "server":
      return {
        ...common,
        phase: 0.67,
        spec: { build: "server", hair: "short", beard: false },
        palette: { skin: "#ebc3a4", hair: "#4f3625", top: "#ece2cb", bottom: "#2b2c30", accent: vestmentTrim, topMetal: 0.12, accentMetal: 0.1 },
      };
    case "reader":
      return {
        ...common,
        phase: 0.29,
        spec: { build: "man", hair: "short", beard: true },
        palette: { skin: "#d19f7c", hair: "#2a1f18", top: "#23262e", bottom: "#1f2129", accent: "#5c2632", topMetal: 0, accentMetal: 0 },
      };
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}
