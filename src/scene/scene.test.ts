import { describe, expect, it } from "vitest";
import { steps } from "../liturgy/steps";
import { spaceList } from "../liturgy/spaces";
import { clampLookPitchAt, lookPitchMin, minEyeHeight, resolveWalk, standingEye } from "./collide";
import { beatAfter, holyCloseMs, noteHolyStep, pinHolyBeat, publishHolyClock, resetHolyBeat, getHolyBeat } from "./holyBeat";
import { censingFor, gestureFor } from "./gestures";
import { closestPair, communionLine, dismissalLine, faithfulPlace } from "./crowdLayout";
import { floorTopAt } from "./floors";
import { headingAt, makePath, pointAt, walkwayZ } from "./routes";
import { nextQuality } from "./quality";
import { cameraFor, doorsFor, isStagedId, stagedStepIds, stagingFor } from "./staging";
import { easeGlide, planMove } from "./cameraMove";
import { floorPatches, tetrapod, world } from "./world";

describe("3D liturgy staging", () => {
  it("stages and frames every liturgy step", () => {
    expect([...stagedStepIds].sort()).toEqual(steps.map((step) => step.id).sort());
    for (const step of steps) {
      expect(isStagedId(step.id)).toBe(true);
      const camera = cameraFor(step.id);
      const staging = stagingFor(step.id);
      expect(camera.position).toHaveLength(3);
      expect(camera.target).toHaveLength(3);
      expect(staging.priest.position[1]).toBeGreaterThanOrEqual(0);
      expect(staging.communicants).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every church place a floor patch", () => {
    const patched = new Set(floorPatches.map((patch) => patch.id));
    for (const space of spaceList) {
      expect(patched.has(space.id)).toBe(true);
    }
  });

  it("keeps a walkway between the tetrapod and the people, with the reader beside it on the north", () => {
    const frontRow = faithfulPlace(-2.2, 2.2, "stand")[2];
    expect(frontRow - tetrapod[2]).toBeGreaterThan(2);
    expect(walkwayZ).toBeGreaterThan(tetrapod[2] + 0.8);
    expect(walkwayZ).toBeLessThan(frontRow - 0.8);
    const [rx, , rz] = stagingFor("litany-of-peace").reader.position;
    expect(rx).toBeLessThan(-1.2);
    expect(rz).toBeGreaterThan(walkwayZ + 0.6);
    expect(rz).toBeLessThan(frontRow);
    const kept = resolveWalk(tetrapod[0], tetrapod[2] + 0.2, { royal: false, north: false, south: false });
    expect(Math.hypot(kept.x - tetrapod[0], kept.z - tetrapod[2])).toBeGreaterThan(0.6);
  });

  it("frames clergy-action steps toward the people who are acting", () => {
    for (const id of ["gospel", "communion", "homily", "dismissal"] as const) {
      const camera = cameraFor(id);
      expect(camera.position[2]).toBeGreaterThan(camera.target[2]);
      expect(camera.target[2]).toBeLessThan(-4);
    }
    for (const id of ["little-entrance", "great-entrance"] as const) {
      const camera = cameraFor(id);
      expect(camera.target[0]).toBeLessThan(-2);
      expect(camera.position[0]).toBeLessThan(-2);
    }
    const epiklesis = cameraFor("epiklesis");
    expect(epiklesis.target[2]).toBeLessThan(-12);
    expect(epiklesis.position[2]).toBeGreaterThan(0);
    expect(stagingFor("epiklesis").faithful).toBe("kneel");
    expect(doorsFor("proskomedia").royal).toBe(false);
    expect(doorsFor("proskomedia").curtain).toBe(false);
    expect(doorsFor("opening").royal).toBe(true);
    expect(doorsFor("opening").curtain).toBe(true);
    expect(doorsFor("little-entrance").north).toBe(true);
    expect(doorsFor("little-entrance").south).toBe(false);
    expect(doorsFor("holy-things", true).curtain).toBe(false);
    expect(doorsFor("anaphora").royal).toBe(true);
  });

  it("places a walker by meters walked along a path", () => {
    const path = makePath([
      [0, 0],
      [0, 10],
      [4, 10],
    ]);
    expect(path.length).toBeCloseTo(14);
    expect(pointAt(path, 5)).toEqual([0, 5]);
    expect(pointAt(path, 12)).toEqual([2, 10]);
    expect(pointAt(path, 99)).toEqual([4, 10]);
    expect(pointAt(makePath([]), 3)).toEqual([0, 0]);
    expect(headingAt(path, 5)).toEqual([0, 1]);
  });

  it("stands the faithful on the floor, off the pews, and apart", () => {
    expect(closestPair(communionLine)).toBeGreaterThan(0.85);
    expect(closestPair(dismissalLine)).toBeGreaterThan(0.85);
    for (const spot of [...communionLine, ...dismissalLine]) {
      expect(spot[1]).toBeGreaterThan(0);
      expect(spot[1]).toBeLessThanOrEqual(world.soleaFloor);
    }
    const standing = faithfulPlace(-2.2, 4.6, "stand");
    expect(standing[1]).toBeCloseTo(0.02);
    expect(standing[2]).toBeLessThan(4.6 - 0.9);
    const sitting = faithfulPlace(2.2, 7, "sit");
    expect(sitting[2]).toBeCloseTo(7);
    const kneeling = faithfulPlace(-2.2, 2.2, "kneel");
    expect(kneeling[2]).toBeGreaterThan(1.4);
    expect(floorTopAt(0, 8)).toBeCloseTo(0.06);
    expect(floorTopAt(0, -14)).toBeCloseTo(0.42);
    expect(floorTopAt(0, -7)).toBeCloseTo(0.2);
    expect(floorTopAt(8.8, 6)).toBeCloseTo(3.23);
    expect(world.deaconOpeningHalf).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps a walking person out of walls, pews, and a closed iconostas", () => {
    const shut = { royal: false, north: false, south: false };
    const outside = resolveWalk(40, 40, shut);
    expect(outside.x).toBeLessThan(world.halfWidth);
    expect(outside.z).toBeLessThan(world.narthexWest);
    const pew = resolveWalk(-2.2, 4.6, shut);
    expect(Math.hypot(pew.x + 2.2, pew.z - 4.6)).toBeGreaterThan(0.6);
    const blocked = resolveWalk(0, world.iconZ, shut);
    expect(Math.abs(blocked.z - world.iconZ)).toBeGreaterThan(0.4);
    const through = resolveWalk(0, world.iconZ, { royal: true, north: false, south: false });
    expect(Math.abs(through.z - world.iconZ)).toBeLessThan(0.5);
    const paintedDoor = resolveWalk(-world.deaconDoorX, world.iconZ, shut);
    expect(Math.abs(paintedDoor.z - world.iconZ)).toBeGreaterThan(0.4);
    const northDoor = resolveWalk(-world.deaconDoorX, world.iconZ, { royal: false, north: true, south: false });
    expect(Math.abs(northDoor.z - world.iconZ)).toBeLessThan(0.5);
    const wideNorth = resolveWalk(-world.deaconDoorX + world.deaconOpeningHalf - 0.15, world.iconZ, {
      royal: false,
      north: true,
      south: false,
    });
    expect(Math.abs(wideNorth.z - world.iconZ)).toBeLessThan(0.5);
    const column = resolveWalk(world.columnX, 4.2, shut);
    expect(Math.hypot(column.x - world.columnX, column.z - 4.2)).toBeGreaterThan(0.7);
  });

  it("keeps the Holy Things close when the step is noted again", () => {
    resetHolyBeat();
    noteHolyStep("holy-things", 1000);
    noteHolyStep("holy-things", 9000);
    expect(beatAfter(1000 + 400)).toBe("elevation");
    expect(beatAfter(1000 + holyCloseMs)).toBe("clergy");
    publishHolyClock(1000 + 400);
    expect(getHolyBeat()).toBe("elevation");
    publishHolyClock(1000 + 4500);
    expect(getHolyBeat()).toBe("clergy");
    pinHolyBeat("elevation");
    expect(beatAfter(1000 + 9000)).toBe("elevation");
    pinHolyBeat("clergy");
    expect(beatAfter(1000 + 100)).toBe("clergy");
    noteHolyStep("communion", 12000);
    expect(beatAfter(12000)).toBe("off");
    noteHolyStep("holy-things", 13000);
    expect(beatAfter(13000)).toBe("elevation");
    resetHolyBeat();
  });

  it("keeps a free look above the pews", () => {
    expect(clampLookPitchAt(-1.2, 0, 8)).toBe(lookPitchMin);
    expect(clampLookPitchAt(1.15, 0, 8)).toBeLessThanOrEqual(0.85);
    expect(clampLookPitchAt(-1.2, -2.2, 4.6)).toBe(-0.48);
    expect(clampLookPitchAt(-0.62, 0.4, 7.4)).toBeCloseTo(-0.62);
    expect(standingEye(0)).toBeGreaterThan(minEyeHeight);
    expect(standingEye(0)).toBeGreaterThan(0.5);
    expect(standingEye(-1)).toBe(minEyeHeight);
  });

  it("marks the cross and the censer on the steps that call for them", () => {
    expect(gestureFor("trisagion")).toBe("cross");
    expect(gestureFor("creed")).toBe("cross");
    expect(gestureFor("epiklesis")).toBe("cross");
    expect(gestureFor("gospel")).toBe("none");
    expect(censingFor("great-entrance")).toBe(true);
    expect(censingFor("cherubic")).toBe(true);
    expect(censingFor("litany-of-peace")).toBe(false);
    expect(nextQuality("high", 20)).toBe("medium");
    expect(nextQuality("medium", 18)).toBe("low");
    expect(nextQuality("low", 60)).toBe("medium");
    expect(nextQuality("medium", 40)).toBe("medium");
  });
});

describe("follow camera moves", () => {
  it("snaps under reduced motion and when nothing moves", () => {
    const pose = cameraFor("gathering");
    expect(planMove(pose, cameraFor("gospel"), true)).toBe("snap");
    expect(planMove(pose, pose, false)).toBe("snap");
  });

  it("never glides through the iconostas", () => {
    for (const from of steps) {
      for (const to of steps) {
        const a = cameraFor(from.id);
        const b = cameraFor(to.id);
        if (planMove(a, b, false) !== "glide") continue;
        expect(Math.sign(a.position[2] - world.iconZ)).toBe(Math.sign(b.position[2] - world.iconZ));
      }
    }
  });

  it("glides between some neighbouring steps and dips on long cuts", () => {
    const moves = steps.slice(1).map((step, index) => planMove(cameraFor(steps[index]?.id ?? step.id), cameraFor(step.id), false));
    expect(moves).toContain("glide");
    const far = { position: [0, 1.7, 15] as [number, number, number], target: [0, 1.5, 0] as [number, number, number] };
    expect(planMove(far, { position: [0, 1.7, -14], target: [0, 1.4, -16] }, false)).toBe("dip");
  });

  it("eases from rest to rest", () => {
    expect(easeGlide(0)).toBe(0);
    expect(easeGlide(1)).toBe(1);
    expect(easeGlide(0.5)).toBeCloseTo(0.5);
    expect(easeGlide(0.01)).toBeLessThan(0.001);
  });
});
