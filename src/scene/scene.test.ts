import { describe, expect, it } from "vitest";
import { steps } from "../liturgy/steps";
import { spaceList } from "../liturgy/spaces";
import { resolveWalk } from "./collide";
import { censingFor, gestureFor } from "./gestures";
import { pointOnPath } from "./path";
import { nextQuality } from "./quality";
import { cameraFor, isStagedId, stagedStepIds, stagingFor } from "./staging";
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
    expect(epiklesis.position[2]).toBeLessThan(-9);
    expect(epiklesis.target[2]).toBeLessThan(epiklesis.position[2]);
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
  });

  it("keeps a walking person out of walls, pews, and a closed iconostas", () => {
    const outside = resolveWalk(40, 40, false);
    expect(outside.x).toBeLessThan(world.halfWidth);
    expect(outside.z).toBeLessThan(world.narthexWest);
    const pew = resolveWalk(-2.2, 4.6, false);
    expect(Math.hypot(pew.x + 2.2, pew.z - 4.6)).toBeGreaterThan(0.6);
    const blocked = resolveWalk(0, world.iconZ, false);
    expect(Math.abs(blocked.z - world.iconZ)).toBeGreaterThan(0.4);
    const through = resolveWalk(0, world.iconZ, true);
    expect(Math.abs(through.z - world.iconZ)).toBeLessThan(0.5);
    const column = resolveWalk(world.columnX, 4.2, false);
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
