import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { armsSwing, solvePose, type FigurePose, type Frame, type Side, type Skeleton } from "./rig";

/** Which palette slot a vertex takes its color from; see `figureMaterial.ts`. */
export const Part = {
  skin: 0,
  hair: 1,
  eye: 2,
  top: 3,
  bottom: 4,
  shoe: 5,
  white: 6,
  accent: 7,
  gold: 8,
  stocking: 9,
} as const;
type PartId = (typeof Part)[keyof typeof Part];

/** Which joint a vertex turns about in the vertex shader (walking, the sign of the cross). */
export const Joint = { none: 0, legLeft: 1, legRight: 2, armLeft: 3, armRight: 4, forearmRight: 5 } as const;
type JointId = (typeof Joint)[keyof typeof Joint];

export type Build = "man" | "woman" | "boy" | "girl" | "priest" | "deacon" | "server";
export type Hair = "short" | "long" | "bun" | "scarf";
export type Detail = "full" | "lite";

export type FigureSpec = { build: Build; hair: Hair; beard: boolean };

export function frameFor(build: Build): Frame {
  return build === "boy" || build === "girl" ? "child" : "adult";
}

export function specKey(spec: FigureSpec, pose: FigurePose, detail: Detail): string {
  return `${spec.build}:${spec.hair}:${spec.beard ? "b" : ""}:${pose}:${detail}`;
}

type Tag = { part: PartId; joint: JointId; pivot: Vector3; elbow?: Vector3 };

const up = new Vector3(0, 1, 0);
const origin = new Vector3();

class Parts {
  readonly list: BufferGeometry[] = [];
  constructor(readonly detail: Detail) {}

  get radial(): number {
    return this.detail === "full" ? 9 : 6;
  }

  add(geometry: BufferGeometry, tag: Tag): void {
    geometry.deleteAttribute("uv");
    const count = geometry.getAttribute("position").count;
    const ids = new Float32Array(count * 2);
    const pivot = new Float32Array(count * 3);
    const elbow = new Float32Array(count * 3);
    const bend = tag.elbow ?? tag.pivot;
    for (let index = 0; index < count; index += 1) {
      ids[index * 2] = tag.part;
      ids[index * 2 + 1] = tag.joint;
      tag.pivot.toArray(pivot, index * 3);
      bend.toArray(elbow, index * 3);
    }
    geometry.setAttribute("aTag", new BufferAttribute(ids, 2));
    geometry.setAttribute("aPivot", new BufferAttribute(pivot, 3));
    geometry.setAttribute("aElbow", new BufferAttribute(elbow, 3));
    this.list.push(geometry);
  }

  /** A capsule from `a` to `b`, optionally flattened front to back. */
  limb(a: Vector3, b: Vector3, radius: number, tag: Tag, depth = 1, width = 1): void {
    const span = a.distanceTo(b);
    const geometry = new CapsuleGeometry(radius, Math.max(0.001, span - radius * 2 + radius * 0.6), this.detail === "full" ? 3 : 2, this.radial);
    geometry.scale(width, 1, depth);
    const direction = b.clone().sub(a).normalize();
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction));
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    this.add(geometry, tag);
  }

  /** A tapered tube from `a` to `b`. */
  tube(a: Vector3, b: Vector3, radiusA: number, radiusB: number, tag: Tag, depth = 1, open = false): void {
    const span = a.distanceTo(b);
    const geometry = new CylinderGeometry(radiusA, radiusB, span, this.radial + 3, 1, open);
    geometry.scale(1, 1, depth);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up, a.clone().sub(b).normalize()));
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    this.add(geometry, tag);
  }

  ball(center: Vector3, radius: number, tag: Tag, scale: [number, number, number] = [1, 1, 1], turn?: Quaternion): void {
    const full = this.detail === "full";
    const geometry = new SphereGeometry(radius, full ? 14 : 8, full ? 10 : 6);
    geometry.scale(scale[0], scale[1], scale[2]);
    if (turn) geometry.applyQuaternion(turn);
    geometry.translate(center.x, center.y, center.z);
    this.add(geometry, tag);
  }

  box(center: Vector3, size: [number, number, number], tag: Tag, turn?: Quaternion): void {
    const geometry = new BoxGeometry(size[0], size[1], size[2]);
    if (turn) geometry.applyQuaternion(turn);
    geometry.translate(center.x, center.y, center.z);
    this.add(geometry, tag);
  }

  /** A thin strip laid from `a` to `b`, `width` across, facing `normal`. */
  strip(a: Vector3, b: Vector3, width: number, normal: Vector3, tag: Tag, thickness = 0.012): void {
    const length = a.distanceTo(b);
    const along = b.clone().sub(a).normalize();
    const side = new Vector3().crossVectors(along, normal).normalize();
    const facing = new Vector3().crossVectors(side, along).normalize();
    const basis = new Matrix4().makeBasis(side, along, facing);
    const geometry = new BoxGeometry(width, length, thickness);
    geometry.applyMatrix4(basis);
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    this.add(geometry, tag);
  }

  merged(): BufferGeometry {
    const merged = mergeGeometries(this.list, false);
    for (const geometry of this.list) geometry.dispose();
    if (!merged) throw new Error("figure merge failed");
    merged.computeBoundingSphere();
    return merged;
  }
}

const cache = new Map<string, BufferGeometry>();

/** One merged geometry per look and pose, shared by every instance that wears it. */
export function figureGeometry(spec: FigureSpec, pose: FigurePose, detail: Detail): BufferGeometry {
  const key = specKey(spec, pose, detail);
  const hit = cache.get(key);
  if (hit) return hit;
  const skeleton = solvePose(frameFor(spec.build), pose);
  const parts = new Parts(detail);
  buildFigure(parts, skeleton, spec, pose);
  const geometry = parts.merged();
  cache.set(key, geometry);
  return geometry;
}

function still(part: PartId): Tag {
  return { part, joint: Joint.none, pivot: origin };
}

function clergy(build: Build): boolean {
  return build === "priest" || build === "deacon" || build === "server";
}

function buildFigure(parts: Parts, sk: Skeleton, spec: FigureSpec, pose: FigurePose): void {
  const { build } = spec;
  const robed = clergy(build);
  const skirted = build === "woman" || build === "girl";
  const torsoUp = up.clone().applyQuaternion(sk.torso);
  const body = sk.body;

  legs(parts, sk, robed ? "robe" : skirted ? "skirt" : "trousers");
  torso(parts, sk, torsoUp, spec);
  arms(parts, sk, spec, pose);
  head(parts, sk, spec);

  if (robed) sticharion(parts, sk, build);
  if (build === "priest") {
    phelonion(parts, sk);
    epitrachelion(parts, sk);
  }
  if (build === "deacon") orarion(parts, sk);
  if (build === "man") {
    // Shirt front and tie in the opening of the jacket.
    const front = (drop: number, out: number) =>
      sk.chest.clone().addScaledVector(torsoUp, -drop).add(new Vector3(0, 0, -body.torsoRadius * 0.66 - out).applyQuaternion(sk.torso));
    const vee = new CylinderGeometry(0.075, 0, 0.19, 3, 1);
    vee.scale(1, 1, 0.12);
    vee.applyQuaternion(sk.torso);
    const at = front(0.08, 0.002);
    vee.translate(at.x, at.y, at.z);
    parts.add(vee, still(Part.white));
    parts.box(front(0.1, 0.012), [0.022, 0.14, 0.008], still(Part.accent), sk.torso);
  }
}

type LegStyle = "trousers" | "skirt" | "robe";

function legs(parts: Parts, sk: Skeleton, style: LegStyle): void {
  const body = sk.body;
  const sides: Side[] = ["left", "right"];
  const thighsVertical = !sk.seated;
  for (const side of sides) {
    const joint = side === "left" ? Joint.legLeft : Joint.legRight;
    const tag = (part: PartId): Tag => ({ part, joint, pivot: sk.hip[side] });
    const hip = sk.hip[side];
    const knee = sk.knee[side];
    const ankle = sk.ankle[side];
    const thighPart = Part.bottom;
    const shinPart = style === "skirt" ? Part.stocking : Part.bottom;
    const kneeOver = knee.clone().addScaledVector(knee.clone().sub(hip).normalize(), body.limbRadius * 0.9);
    const kneeUnder = knee.clone().addScaledVector(hip.clone().sub(knee).normalize(), body.limbRadius * 0.6);
    const ankleUnder = ankle.clone().add(new Vector3(0, -body.ankle * 0.4, 0));
    if (!(style === "skirt" && thighsVertical)) parts.limb(hip, kneeOver, body.limbRadius * (style === "skirt" ? 1.6 : 1.72), tag(thighPart));
    parts.limb(style === "skirt" ? knee : kneeUnder, ankleUnder, body.limbRadius * (style === "skirt" ? 1.0 : 1.48), tag(shinPart));
    const foot = sk.footDir[side];
    const footLength = body.thigh * 0.5;
    const center = ankle.clone().addScaledVector(foot, footLength * 0.36).add(new Vector3(0, -body.ankle * 0.5, 0));
    if (sk.kneeling) center.y = body.ankle * 0.45;
    const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), foot.clone().setY(sk.kneeling ? 0 : foot.y).normalize());
    parts.box(center, [body.limbRadius * 1.9, body.ankle * 0.95, footLength], tag(Part.shoe), turn);
  }
  if (style === "skirt") {
    const waist = sk.pelvis.clone().add(new Vector3(0, 0.12, 0));
    if (thighsVertical) {
      const hemY = Math.max(0.02, (sk.knee.left.y + sk.knee.right.y) / 2 - body.limbRadius * 1.6);
      parts.tube(waist, new Vector3(0, hemY, sk.kneeling ? 0.04 : 0), body.torsoRadius * 0.98, body.torsoRadius * 1.62, still(Part.bottom), 0.82);
    } else {
      parts.tube(waist, sk.pelvis.clone().add(new Vector3(0, -0.02, 0)), body.torsoRadius * 0.98, body.torsoRadius * 1.15, still(Part.bottom), 0.85);
      const knees = sk.knee.left.clone().add(sk.knee.right).multiplyScalar(0.5);
      parts.box(knees.clone().add(new Vector3(0, -0.07, -body.limbRadius * 1.1)), [body.hipHalf * 2 + body.limbRadius * 3.2, 0.16, 0.03], still(Part.bottom));
    }
  }
}

function torso(parts: Parts, sk: Skeleton, torsoUp: Vector3, spec: FigureSpec): void {
  const body = sk.body;
  const bottom = sk.pelvis.clone().addScaledVector(torsoUp, body.torsoRadius * 0.55);
  const top = sk.chest.clone().addScaledVector(torsoUp, body.torsoRadius * 0.1);
  const robed = clergy(spec.build);
  parts.limb(bottom, top, body.torsoRadius, still(robed && spec.build === "priest" ? Part.bottom : Part.top), 0.66, 1.1);
  const hips = spec.build === "man" || spec.build === "boy" ? Part.top : Part.bottom;
  parts.tube(
    sk.pelvis.clone().addScaledVector(torsoUp, 0.16),
    sk.pelvis.clone().addScaledVector(torsoUp, -0.05),
    body.torsoRadius * 0.96,
    body.torsoRadius * 1.02,
    still(robed ? (spec.build === "priest" ? Part.bottom : Part.top) : hips),
    0.72,
  );
  parts.limb(sk.neck.clone().addScaledVector(torsoUp, -0.03), sk.head, body.limbRadius * 0.85, still(Part.skin));
}

function arms(parts: Parts, sk: Skeleton, spec: FigureSpec, pose: FigurePose): void {
  const body = sk.body;
  const swing = armsSwing(pose);
  const gesture = pose === "cross";
  const robed = clergy(spec.build);
  const sleeve = spec.build === "priest" ? Part.bottom : Part.top;
  const sides: Side[] = ["left", "right"];
  for (const side of sides) {
    const shoulder = sk.shoulder[side];
    const elbow = sk.elbow[side];
    const wrist = sk.wrist[side];
    const moving = swing || (gesture && side === "right");
    const upperJoint = !moving ? Joint.none : side === "left" ? Joint.armLeft : Joint.armRight;
    const lowerJoint = !moving ? Joint.none : side === "left" ? Joint.armLeft : gesture ? Joint.forearmRight : Joint.armRight;
    const upperTag = (part: PartId): Tag => ({ part, joint: upperJoint, pivot: shoulder });
    const lowerTag = (part: PartId): Tag => ({ part, joint: lowerJoint, pivot: shoulder, elbow });
    parts.limb(shoulder, elbow.clone().addScaledVector(elbow.clone().sub(shoulder).normalize(), body.limbRadius * 0.4), body.limbRadius * 1.2, upperTag(sleeve));
    if (robed && spec.build !== "priest") {
      // The wide bell sleeve of a sticharion.
      parts.tube(elbow, wrist, body.limbRadius * 1.1, body.limbRadius * 1.9, lowerTag(sleeve), 1, true);
      parts.limb(elbow, wrist, body.limbRadius * 0.9, lowerTag(sleeve));
    } else {
      parts.limb(elbow, wrist, body.limbRadius * 1.06, lowerTag(sleeve));
    }
    if (spec.build === "priest") {
      // Epimanikia: the embroidered cuffs laced over the sticharion sleeves.
      const cuffStart = wrist.clone().lerp(elbow, 0.36);
      parts.tube(cuffStart, wrist, body.limbRadius * 1.25, body.limbRadius * 1.3, lowerTag(Part.top));
      parts.tube(wrist.clone().lerp(elbow, 0.05), wrist, body.limbRadius * 1.34, body.limbRadius * 1.34, lowerTag(Part.gold));
    }
    const hand = sk.hand[side];
    const direction = hand.clone().sub(wrist).normalize();
    parts.ball(hand, body.limbRadius * 0.8, lowerTag(Part.skin), [0.8, 1.2, 0.95], new Quaternion().setFromUnitVectors(up, direction));
  }
}

function head(parts: Parts, sk: Skeleton, spec: FigureSpec): void {
  const r = sk.body.headRadius;
  const turn = sk.headTurn;
  const at = (x: number, y: number, z: number) => sk.head.clone().add(new Vector3(x, y, z).applyQuaternion(turn));
  parts.ball(sk.head, r, still(Part.skin), [0.9, 1.06, 0.98], turn);
  for (const x of [-0.036, 0.036]) parts.ball(at(x * (r / 0.105), r * 0.08, -r * 0.9), r * 0.11, still(Part.eye), [1, 1.2, 0.6], turn);
  parts.ball(at(0, -r * 0.1, -r * 0.95), r * 0.13, still(Part.skin), [0.8, 1.1, 1], turn);

  const cap = (radius: number, reach: number, tilt: number, part: PartId, lift = 0) => {
    const full = parts.detail === "full";
    const geometry = new SphereGeometry(radius, full ? 14 : 8, full ? 8 : 5, 0, Math.PI * 2, 0, Math.PI * reach);
    geometry.scale(0.95, 1.06, 1.02);
    geometry.applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt));
    geometry.translate(0, lift, 0.004);
    geometry.applyQuaternion(turn);
    geometry.translate(sk.head.x, sk.head.y, sk.head.z);
    parts.add(geometry, still(part));
  };

  switch (spec.hair) {
    case "short":
      cap(r * 1.07, 0.56, 0.62, Part.hair, r * 0.02);
      break;
    case "long":
      cap(r * 1.09, 0.58, 0.55, Part.hair, r * 0.02);
      parts.box(at(0, -r * 0.75, r * 0.62), [r * 1.75, r * 2.1, r * 0.55], still(Part.hair), turn);
      break;
    case "bun":
      cap(r * 1.08, 0.57, 0.58, Part.hair, r * 0.02);
      parts.ball(at(0, r * 0.3, r * 1.0), r * 0.42, still(Part.hair), [1, 0.9, 0.85], turn);
      break;
    case "scarf":
      cap(r * 1.17, 0.64, 0.36, Part.accent, r * 0.01);
      parts.box(at(0, -r * 1.05, r * 0.7), [r * 2.0, r * 1.6, r * 0.45], still(Part.accent), turn);
      parts.ball(at(0, -r * 1.02, -r * 0.55), r * 0.26, still(Part.accent), [1.2, 0.8, 0.9], turn);
      break;
    default: {
      const exhaustive: never = spec.hair;
      return exhaustive;
    }
  }
  if (spec.beard) {
    parts.ball(at(0, -r * 0.62, -r * 0.42), r * 0.62, still(Part.hair), [1.15, 0.95, 0.8], turn);
  }
}

/** Waist to ankle: the long tunic every server, deacon and priest wears. */
function sticharion(parts: Parts, sk: Skeleton, build: Build): void {
  const body = sk.body;
  const main = build === "priest" ? Part.bottom : Part.top;
  const waist = new Vector3(0, sk.pelvis.y + 0.18, 0);
  const hem = new Vector3(0, 0.035, 0.01);
  parts.tube(waist, hem, body.torsoRadius * 1.02, body.torsoRadius * 1.9, still(main), 0.82);
  if (build !== "priest") {
    parts.tube(hem.clone().add(new Vector3(0, 0.085, 0)), hem, body.torsoRadius * 1.82, body.torsoRadius * 1.92, still(Part.accent), 0.83, true);
    // A cross on the back between the shoulders.
    const back = sk.chest.clone().add(new Vector3(0, -0.12, body.torsoRadius * 0.7).applyQuaternion(sk.torso));
    parts.box(back, [0.035, 0.17, 0.012], still(Part.accent), sk.torso);
    parts.box(back.clone().add(new Vector3(0, 0.035, 0).applyQuaternion(sk.torso)), [0.12, 0.035, 0.012], still(Part.accent), sk.torso);
  }
}

/**
 * Greek-cut phelonion: a bell from the shoulders, long at the back, cut up at the front so the hands are
 * free, with a galloon border at the hem and a cross between the shoulder blades.
 */
function phelonion(parts: Parts, sk: Skeleton): void {
  const shoulderY = sk.chest.y - sk.pelvis.y;
  // Heights above the pelvis and radii, top to bottom.
  const profile: [number, number][] = [
    [shoulderY + 0.085, 0.085],
    [shoulderY + 0.035, 0.19],
    [shoulderY - 0.04, 0.265],
    [shoulderY - 0.2, 0.3],
    [shoulderY - 0.5, 0.33],
    [shoulderY - 0.85, 0.365],
    [-sk.pelvis.y, 0.39],
  ];
  const radiusAt = (h: number) => {
    for (let index = 1; index < profile.length; index += 1) {
      const a = profile[index - 1];
      const b = profile[index];
      if (!a || !b) continue;
      if (h >= b[0]) return a[1] + ((a[0] - h) / (a[0] - b[0])) * (b[1] - a[1]);
    }
    return profile[profile.length - 1]?.[1] ?? 0.39;
  };
  const top = profile[0]?.[0] ?? shoulderY;
  const backHem = -sk.pelvis.y + 0.3;
  const frontHem = shoulderY - 0.36;
  const hemAt = (theta: number) => backHem + (frontHem - backHem) * Math.pow(Math.max(0, Math.cos(theta)), 1.4);
  const columns = parts.detail === "full" ? 36 : 22;
  const rows = parts.detail === "full" ? 16 : 9;
  const depth = 0.84;

  const shell = (inset: number, from: number, to: number, grow: number, flip: boolean, part: PartId) => {
    const positions: number[] = [];
    const index: number[] = [];
    for (let column = 0; column <= columns; column += 1) {
      const theta = (column / columns) * Math.PI * 2;
      const hem = hemAt(theta);
      for (let row = 0; row <= rows; row += 1) {
        const f = from + (to - from) * (row / rows);
        const h = top + (hem - top) * f;
        const radius = radiusAt(h) * inset + grow;
        positions.push(Math.sin(theta) * radius, h, -Math.cos(theta) * radius * depth);
      }
    }
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const a = column * (rows + 1) + row;
        const b = a + rows + 1;
        if (flip) index.push(a, a + 1, b, b, a + 1, b + 1);
        else index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    geometry.applyQuaternion(sk.torso);
    geometry.translate(sk.pelvis.x, sk.pelvis.y, sk.pelvis.z);
    parts.add(geometry, still(part));
  };
  shell(1, 0, 1, 0, false, Part.top);
  shell(0.97, 0, 1, 0, true, Part.top);
  shell(1, 0.93, 1, 0.006, false, Part.accent);
  shell(1, 0, 0.05, 0.004, false, Part.accent);

  const toWorld = (x: number, h: number, z: number) => new Vector3(x, h, z).applyQuaternion(sk.torso).add(sk.pelvis);
  const crossH = shoulderY - 0.24;
  const backZ = radiusAt(crossH) * depth + 0.008;
  parts.box(toWorld(0, crossH, backZ), [0.05, 0.3, 0.012], still(Part.accent), sk.torso);
  parts.box(toWorld(0, crossH + 0.06, backZ), [0.2, 0.05, 0.012], still(Part.accent), sk.torso);
  parts.box(toWorld(0, crossH, backZ + 0.004), [0.02, 0.26, 0.012], still(Part.gold), sk.torso);
  parts.box(toWorld(0, crossH + 0.06, backZ + 0.004), [0.17, 0.02, 0.012], still(Part.gold), sk.torso);
}

/** The priest's stole, seen in the front opening of the phelonion down to the hem of the sticharion. */
function epitrachelion(parts: Parts, sk: Skeleton): void {
  const body = sk.body;
  const topPoint = sk.chest.clone().add(new Vector3(0, -0.02, -body.torsoRadius * 0.7).applyQuaternion(sk.torso));
  const bottom = new Vector3(0, 0.13, -body.torsoRadius * 1.62);
  const normal = new Vector3(0, 0, -1);
  parts.strip(topPoint, bottom, 0.15, normal, still(Part.top), 0.014);
  for (const t of [0.72, 0.9]) {
    const at = topPoint.clone().lerp(bottom, t).add(new Vector3(0, 0, -0.009));
    parts.strip(at.clone().add(new Vector3(0, 0.012, 0)), at.clone().add(new Vector3(0, -0.012, 0)), 0.155, normal, still(Part.gold), 0.006);
  }
  const fringe = bottom.clone().add(new Vector3(0, -0.03, -0.004));
  parts.box(fringe, [0.15, 0.05, 0.012], still(Part.gold));
}

/** The deacon's orarion: a long band over the left shoulder, hanging front and back, with small crosses. */
function orarion(parts: Parts, sk: Skeleton): void {
  const body = sk.body;
  const shoulder = sk.shoulder.left;
  const x = shoulder.x * 0.6;
  const chestZ = body.torsoRadius * 0.66 + 0.012;
  const waistY = sk.pelvis.y + 0.18;
  const upper = (h: number, z: number) => new Vector3(x, h, z).applyQuaternion(sk.torso).add(new Vector3(sk.pelvis.x, sk.pelvis.y, sk.pelvis.z));
  // The band follows the chest, then the flare of the sticharion to just above the hem.
  const skirtZ = (y: number) => {
    const t = (waistY - y) / (waistY - 0.035);
    return body.torsoRadius * (1.02 + (1.9 - 1.02) * t) * 0.82 + 0.012;
  };
  const shoulderH = sk.chest.y - sk.pelvis.y + 0.07;
  const path = (sign: number) => [
    upper(shoulderH, sign * body.torsoRadius * 0.45),
    upper(shoulderH - 0.08, sign * chestZ),
    upper(0.18, sign * chestZ),
    new Vector3(x, 0.55, sign * skirtZ(0.55)),
    new Vector3(x, 0.28, sign * skirtZ(0.28)),
  ];
  const width = 0.085;
  for (const sign of [-1, 1]) {
    const points = path(sign);
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      if (a && b) parts.strip(a, b, width, new Vector3(0, 0, sign), still(Part.accent), 0.016);
    }
  }
  parts.box(upper(shoulderH + 0.008, 0), [width, 0.02, body.torsoRadius * 0.95], still(Part.accent), sk.torso);
  const front = path(-1);
  for (const [a, b, t] of [[1, 2, 0.35], [2, 3, 0.5], [3, 4, 0.6]] as const) {
    const at = front[a]?.clone().lerp(front[b] ?? origin, t).add(new Vector3(0, 0, -0.011));
    if (!at) continue;
    parts.box(at, [0.014, 0.055, 0.006], still(Part.gold));
    parts.box(at.clone().add(new Vector3(0, 0.008, 0)), [0.045, 0.014, 0.006], still(Part.gold));
  }
}

/** Hand positions in figure space, for props held by clergy and servers. */
export function handsFor(build: Build, pose: FigurePose): { left: Vector3; right: Vector3; between: Vector3 } {
  const skeleton = solvePose(frameFor(build), pose);
  const left = skeleton.hand.left.clone();
  const right = skeleton.hand.right.clone();
  return { left, right, between: left.clone().add(right).multiplyScalar(0.5) };
}
