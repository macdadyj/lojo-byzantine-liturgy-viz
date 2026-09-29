import { Quaternion, Vector3 } from "three";

/**
 * A figure faces −Z with +X on its right and +Y up, so an actor with facing 0 looks at the altar.
 * Everything here is plain numbers: the rig turns a pose into joint positions, and the shape builder
 * hangs primitives on those joints.
 */

export type Frame = "adult" | "child";

export type Proportions = {
  thigh: number;
  shin: number;
  /** Ankle joint above the sole when standing. */
  ankle: number;
  /** Hip joints to the shoulder line. */
  torso: number;
  hipHalf: number;
  shoulderHalf: number;
  upperArm: number;
  forearm: number;
  neck: number;
  headRadius: number;
  torsoRadius: number;
  limbRadius: number;
};

const adult: Proportions = {
  thigh: 0.43,
  shin: 0.42,
  ankle: 0.07,
  torso: 0.5,
  hipHalf: 0.085,
  shoulderHalf: 0.185,
  upperArm: 0.29,
  forearm: 0.25,
  neck: 0.09,
  headRadius: 0.105,
  torsoRadius: 0.165,
  limbRadius: 0.052,
};

/** About 1.25 m tall with a larger head, so a child reads as a child and not a small adult. */
const child: Proportions = {
  thigh: 0.29,
  shin: 0.28,
  ankle: 0.05,
  torso: 0.34,
  hipHalf: 0.065,
  shoulderHalf: 0.135,
  upperArm: 0.2,
  forearm: 0.17,
  neck: 0.06,
  headRadius: 0.098,
  torsoRadius: 0.115,
  limbRadius: 0.04,
};

export function proportionsFor(frame: Frame): Proportions {
  switch (frame) {
    case "adult":
      return adult;
    case "child":
      return child;
    default: {
      const exhaustive: never = frame;
      return exhaustive;
    }
  }
}

export type FigurePose =
  | "stand"
  | "standB"
  | "pray"
  | "chest"
  | "cross"
  | "bow"
  | "sit"
  | "kneel"
  | "carry"
  | "elevate"
  | "candle"
  | "censer";

/** Hip pitch (thigh forward from straight down) and knee bend, in radians. */
type Leg = { hip: number; knee: number; foot: number };
/** Upper arm and forearm directions in the torso frame, for the right arm. The left arm mirrors X. */
type Arm = { upper: [number, number, number]; lower: [number, number, number] };

type PoseDef = {
  lean: number;
  head: number;
  legs: [Leg, Leg];
  arms: [Arm, Arm];
  /** Limbs that swing when the figure walks. Poses that hold something keep their arms still. */
  armSwing: boolean;
};

const straight: Leg = { hip: 0, knee: 0, foot: Math.PI / 2 };
const hanging: Arm = { upper: [0.1, -1, 0.02], lower: [0.04, -1, -0.12] };
const trueHang: Arm = { upper: [0, -1, 0], lower: [0, -1, 0] };

function pose(def: Partial<PoseDef> & { arms: [Arm, Arm] }): PoseDef {
  return { lean: 0, head: 0, legs: [straight, straight], armSwing: false, ...def };
}

/** Right hand over the left, low in front: how many people stand through a long service. */
const foldedLow: Arm = { upper: [0.18, -1, -0.28], lower: [-0.95, 0.12, -0.55] };
const foldedLowLeft: Arm = { upper: [0.2, -1, -0.24], lower: [-0.9, 0.05, -0.6] };
/** Palms together at the breastbone. */
const praying: Arm = { upper: [0.28, -0.9, -0.42], lower: [-0.62, 0.72, -0.5] };
/** Arms crossed on the chest, right over left, hands at the collarbones: the posture at the chalice. */
const crossedRight: Arm = { upper: [0.12, -0.92, -0.5], lower: [-0.86, 0.46, -0.3] };
const crossedLeft: Arm = { upper: [0.14, -0.9, -0.42], lower: [-0.84, 0.5, -0.2] };
/** Both hands forward at chest height, holding the Gospel or the chalice. */
const carrying: Arm = { upper: [0.12, -0.9, -0.42], lower: [-0.3, 0.2, -1] };
/** Lifted high in front of the face: "Holy things for the holy". */
const lifting: Arm = { upper: [0.2, 0.15, -1], lower: [-0.45, 0.85, -0.45] };
/** One hand at the waist, forearm forward, holding a candle upright. */
const holdingCandle: Arm = { upper: [0.14, -1, -0.12], lower: [-0.1, 0.1, -1] };
/** Hand forward and low; the censer hangs from it on its chains. */
const holdingCenser: Arm = { upper: [0.2, -1, -0.35], lower: [0.05, -0.55, -1] };
const seated: Leg = { hip: Math.PI / 2, knee: Math.PI / 2, foot: Math.PI / 2 };
/** Knees on the kneeler (about 17 cm up), shins sloping back to the toes on the floor. */
const kneeling: Leg = { hip: 0.05, knee: 1.27, foot: -0.35 };
const restOnThigh: Arm = { upper: [0.1, -1, -0.2], lower: [-0.05, -0.2, -1] };

const poses: Record<FigurePose, PoseDef> = {
  stand: pose({ arms: [hanging, hanging], armSwing: true }),
  standB: pose({ arms: [foldedLow, foldedLowLeft] }),
  pray: pose({ head: 0.12, arms: [praying, praying] }),
  chest: pose({ head: 0.18, arms: [crossedRight, crossedLeft] }),
  cross: pose({ arms: [trueHang, hanging] }),
  bow: pose({ lean: 0.42, head: 0.25, arms: [hanging, hanging] }),
  sit: pose({ legs: [seated, seated], arms: [restOnThigh, restOnThigh] }),
  kneel: pose({ head: 0.1, legs: [kneeling, kneeling], arms: [praying, praying] }),
  carry: pose({ arms: [carrying, carrying] }),
  elevate: pose({ head: -0.15, arms: [lifting, lifting] }),
  candle: pose({ arms: [hanging, holdingCandle] }),
  censer: pose({ arms: [hanging, holdingCenser] }),
};

export function armsSwing(name: FigurePose): boolean {
  return poses[name].armSwing;
}

export type Side = "left" | "right";

export type Skeleton = {
  frame: Frame;
  body: Proportions;
  pelvis: Vector3;
  /** Torso orientation: lean forward about X. */
  torso: Quaternion;
  headTurn: Quaternion;
  chest: Vector3;
  neck: Vector3;
  head: Vector3;
  hip: Record<Side, Vector3>;
  knee: Record<Side, Vector3>;
  ankle: Record<Side, Vector3>;
  footDir: Record<Side, Vector3>;
  shoulder: Record<Side, Vector3>;
  elbow: Record<Side, Vector3>;
  wrist: Record<Side, Vector3>;
  hand: Record<Side, Vector3>;
  seated: boolean;
  kneeling: boolean;
};

const xAxis = new Vector3(1, 0, 0);

function legDirection(angle: number): Vector3 {
  // Rotating straight-down about +X by a positive angle swings it forward, toward −Z.
  return new Vector3(0, -Math.cos(angle), -Math.sin(angle));
}

function armDirection(arm: Arm, side: Side, torso: Quaternion, part: "upper" | "lower"): Vector3 {
  const [x, y, z] = arm[part];
  return new Vector3(side === "right" ? x : -x, y, z).normalize().applyQuaternion(torso);
}

export function solvePose(frame: Frame, name: FigurePose): Skeleton {
  const body = proportionsFor(frame);
  const def = poses[name];
  const torso = new Quaternion().setFromAxisAngle(xAxis, -def.lean);
  const headTurn = new Quaternion().setFromAxisAngle(xAxis, -(def.lean + def.head));
  const pelvis = new Vector3(0, 0, 0);
  const hip = { left: new Vector3(-body.hipHalf, 0, 0), right: new Vector3(body.hipHalf, 0, 0) };
  const knee = { left: new Vector3(), right: new Vector3() };
  const ankle = { left: new Vector3(), right: new Vector3() };
  const footDir = { left: new Vector3(), right: new Vector3() };
  const sides: Side[] = ["left", "right"];
  sides.forEach((side, index) => {
    const leg = def.legs[index] ?? straight;
    knee[side].copy(hip[side]).addScaledVector(legDirection(leg.hip), body.thigh);
    ankle[side].copy(knee[side]).addScaledVector(legDirection(leg.hip - leg.knee), body.shin);
    footDir[side].copy(legDirection(leg.hip - leg.knee + leg.foot));
  });
  const kneeling = def.legs[0].knee > 1.2 && def.legs[0].hip < 0.5;
  const seated = def.legs[0].hip > 1.2;
  // Lift the pelvis until the lowest sole or knee touches y = 0.
  let lowest = Infinity;
  for (const side of sides) {
    lowest = Math.min(lowest, ankle[side].y - body.ankle, knee[side].y - body.limbRadius * 1.1);
  }
  const lift = -lowest;
  for (const point of [pelvis, hip.left, hip.right, knee.left, knee.right, ankle.left, ankle.right]) point.y += lift;

  const up = new Vector3(0, 1, 0).applyQuaternion(torso);
  const chest = pelvis.clone().addScaledVector(up, body.torso);
  const neck = chest.clone().addScaledVector(up, 0.035);
  const head = neck.clone().addScaledVector(new Vector3(0, 1, 0).applyQuaternion(headTurn), body.neck + body.headRadius * 0.92);
  const shoulder = {
    left: chest.clone().add(new Vector3(-body.shoulderHalf, -0.035, 0).applyQuaternion(torso)),
    right: chest.clone().add(new Vector3(body.shoulderHalf, -0.035, 0).applyQuaternion(torso)),
  };
  const elbow = { left: new Vector3(), right: new Vector3() };
  const wrist = { left: new Vector3(), right: new Vector3() };
  const hand = { left: new Vector3(), right: new Vector3() };
  sides.forEach((side, index) => {
    const arm = def.arms[index] ?? hanging;
    const lower = armDirection(arm, side, torso, "lower");
    elbow[side].copy(shoulder[side]).addScaledVector(armDirection(arm, side, torso, "upper"), body.upperArm);
    wrist[side].copy(elbow[side]).addScaledVector(lower, body.forearm);
    hand[side].copy(wrist[side]).addScaledVector(lower, body.limbRadius * 0.9);
  });
  return { frame, body, pelvis, torso, headTurn, chest, neck, head, hip, knee, ankle, footDir, shoulder, elbow, wrist, hand, seated, kneeling };
}

/** Height of the top of the head when standing, for proportion checks. */
export function standingHeight(frame: Frame): number {
  const skeleton = solvePose(frame, "stand");
  return skeleton.head.y + skeleton.body.headRadius * 1.08;
}

/**
 * Right-arm angles for the Byzantine sign of the cross, applied in the vertex shader to a straight
 * hanging arm: elbow bend and shoulder pitch forward (both about X), then a swing across the body about Y.
 * Forehead, breast, right shoulder, left shoulder, then the hand comes down.
 */
export type CrossKey = { at: number; pitch: number; across: number; elbow: number };

export const crossKeys: readonly CrossKey[] = [
  { at: 0, pitch: 0, across: 0, elbow: 0 },
  { at: 0.14, pitch: 1.64, across: 0.98, elbow: 1.5 },
  { at: 0.3, pitch: 0.02, across: 0.9, elbow: 1.86 },
  { at: 0.44, pitch: 0.36, across: 0.44, elbow: 2.49 },
  { at: 0.58, pitch: 0.7, across: 1.26, elbow: 1.71 },
  { at: 0.74, pitch: 0, across: 0, elbow: 0 },
  { at: 1, pitch: 0, across: 0, elbow: 0 },
];

/** Where the right hand ends up for given cross angles, mirroring the shader's math. */
export function crossHand(frame: Frame, key: Pick<CrossKey, "pitch" | "across" | "elbow">): Vector3 {
  const skeleton = solvePose(frame, "cross");
  const shoulder = skeleton.shoulder.right;
  const elbowRest = skeleton.elbow.right;
  const handRest = skeleton.hand.right;
  const bend = new Quaternion().setFromAxisAngle(xAxis, key.elbow);
  const swing = new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), key.across)
    .multiply(new Quaternion().setFromAxisAngle(xAxis, key.pitch));
  const hand = handRest.clone().sub(elbowRest).applyQuaternion(bend).add(elbowRest);
  return hand.sub(shoulder).applyQuaternion(swing).add(shoulder);
}
