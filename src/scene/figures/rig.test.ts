import { describe, expect, it } from "vitest";
import { crossHand, crossKeys, solvePose, standingHeight, type FigurePose } from "./rig";
import { figureGeometry } from "./shapes";

const poses: FigurePose[] = ["stand", "standB", "pray", "chest", "cross", "bow", "sit", "kneel", "carry", "elevate", "candle", "censer"];

describe("figure rig", () => {
  it("gives adults and children believable heights and head sizes", () => {
    const adult = standingHeight("adult");
    const child = standingHeight("child");
    expect(adult).toBeGreaterThan(1.68);
    expect(adult).toBeLessThan(1.82);
    expect(child).toBeGreaterThan(1.15);
    expect(child).toBeLessThan(1.35);
    // About seven and a half heads for an adult, fewer for a child.
    const adultHeads = adult / (solvePose("adult", "stand").body.headRadius * 2.16);
    const childHeads = child / (solvePose("child", "stand").body.headRadius * 2.16);
    expect(adultHeads).toBeGreaterThan(7);
    expect(adultHeads).toBeLessThan(8.2);
    expect(childHeads).toBeLessThan(adultHeads - 1);
  });

  it.each(poses)("rests %s on the floor", (pose) => {
    const skeleton = solvePose("adult", pose);
    const { body } = skeleton;
    const lowest = Math.min(
      ...(["left", "right"] as const).flatMap((side) => [skeleton.ankle[side].y - body.ankle, skeleton.knee[side].y - body.limbRadius * 1.1]),
    );
    expect(lowest).toBeCloseTo(0, 5);
  });

  it("kneels with the knees at kneeler height, toes on the floor, and the head well below standing", () => {
    const kneeling = solvePose("adult", "kneel");
    expect(kneeling.kneeling).toBe(true);
    expect(kneeling.knee.left.y).toBeGreaterThan(0.14);
    expect(kneeling.knee.left.y).toBeLessThan(0.26);
    expect(kneeling.ankle.left.y - kneeling.body.ankle).toBeCloseTo(0, 5);
    expect(kneeling.head.y).toBeLessThan(solvePose("adult", "stand").head.y - 0.25);
  });

  it.each(["candle", "censer"] as const)("holds the %s out in the right hand, where the prop is drawn", (pose) => {
    const skeleton = solvePose("adult", pose);
    expect(skeleton.hand.right.z).toBeLessThan(-0.15);
    expect(skeleton.hand.right.y).toBeGreaterThan(skeleton.hand.left.y + 0.1);
  });

  it("makes the Byzantine sign of the cross: forehead, breast, right shoulder, then left", () => {
    const skeleton = solvePose("adult", "cross");
    const [, forehead, breast, right, left] = crossKeys.map((key) => crossHand("adult", key));
    if (!forehead || !breast || !right || !left) throw new Error("missing cross keys");
    expect(forehead.distanceTo(skeleton.head)).toBeLessThan(0.2);
    expect(forehead.y).toBeGreaterThan(skeleton.neck.y);
    expect(breast.y).toBeLessThan(skeleton.chest.y);
    expect(breast.y).toBeGreaterThan(skeleton.pelvis.y + 0.2);
    expect(Math.abs(breast.x)).toBeLessThan(0.1);
    expect(right.x).toBeGreaterThan(0.05);
    expect(left.x).toBeLessThan(-0.05);
    for (const point of [forehead, breast, right, left]) expect(point.z).toBeLessThan(0);
  });

  it("builds a merged geometry with the joint and palette attributes the shader reads", () => {
    const geometry = figureGeometry({ build: "priest", hair: "short", beard: true }, "stand", "lite");
    for (const name of ["position", "normal", "aTag", "aPivot", "aElbow"]) expect(geometry.getAttribute(name)).toBeDefined();
    expect(geometry.getAttribute("uv")).toBeUndefined();
    expect(figureGeometry({ build: "priest", hair: "short", beard: true }, "stand", "lite")).toBe(geometry);
  });
});
