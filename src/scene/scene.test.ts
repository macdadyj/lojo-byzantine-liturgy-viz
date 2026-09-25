import { describe, expect, it } from "vitest";
import { steps } from "../liturgy/steps";
import { spaceList } from "../liturgy/spaces";
import { resolveWalk } from "./collide";
import { censingFor, gestureFor } from "./gestures";
import { pointBehind, pointOnPath } from "./path";
import { closestPair, communionLine, dismissalLine, faithfulPlace } from "./crowdLayout";
import { floorTopAt } from "./floors";
import { nextQuality } from "./quality";
import { cameraFor, doorsFor, isStagedId, stagedStepIds, stagingFor } from "./staging";
import { floorPatches, greatEntrancePath, littleEntrancePath, world } from "./world";

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

  it("routes both entrances out the north door and back toward the altar", () => {
    for (const path of [littleEntrancePath, greatEntrancePath]) {
      expect(path.length).toBeGreaterThanOrEqual(4);
      expect(path.some((point) => point[0] < -3)).toBe(true);
      expect(path[0]?.[2]).toBeLessThan(-4);
    }
    const greatEnd = greatEntrancePath[greatEntrancePath.length - 1];
    expect(greatEnd?.[2]).toBeLessThan(-5);
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

  it("samples the middle of a path between its waypoints", () => {
    const mid = pointOnPath(
      [
        [0, 0, 0],
        [0, 0, 10],
      ],
      0.5,
    );
    expect(mid[2]).toBeCloseTo(5);
    expect(pointOnPath([], 0.4)).toEqual([0, 0, 0]);
    expect(pointBehind([[0, 0, 0], [0, 0, 10]], 1, 4)[2]).toBeCloseTo(6, 0);
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
