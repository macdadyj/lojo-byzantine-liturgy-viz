import { describe, expect, it } from "vitest";
import { pewBanks, pewRows } from "./crowdLayout";
import { routeFloorAt } from "./floors";
import { beatIndexAt, processionClock } from "./processionClock";
import {
  buildTimeline,
  followShot,
  greatEntrance,
  littleEntrance,
  pointAt,
  priestAt,
  trainSpan,
  walkSpeed,
  walkerDistance,
  type FloorPoint,
  type Path,
} from "./routes";
import { readerAside } from "./staging";
import { tetrapod, world } from "./world";

type Crossing = { x: number; westward: boolean; at: number };

/** Where a path crosses the line of the iconostas, in walking order. */
function iconostasCrossings(path: Path): Crossing[] {
  const found: Crossing[] = [];
  path.points.forEach((b, index) => {
    const a = path.points[index - 1];
    if (!a) return;
    const [ax, az] = a;
    const [bx, bz] = b;
    if ((az - world.iconZ) * (bz - world.iconZ) >= 0) return;
    const mix = (world.iconZ - az) / (bz - az);
    found.push({ x: ax + (bx - ax) * mix, westward: bz > az, at: path.runs[index - 1] ?? 0 });
  });
  return found;
}

function throughNorthDoor(x: number): boolean {
  return Math.abs(x + world.deaconDoorX) < world.deaconOpeningHalf - 0.3;
}

function throughRoyalDoors(x: number): boolean {
  return Math.abs(x) < 0.85 - 0.3;
}

const columnZ = [-4.6, -0.2, 4.2, 8.6, 13.0];

/** Distance from a person's center to the nearest pew, column, tetrapod, or the altar. */
function clearance([x, z]: FloorPoint): number {
  let best = Infinity;
  for (const bankX of pewBanks) {
    const half = Math.abs(bankX) > 5 ? 1.05 : 1.2;
    for (const row of pewRows) {
      const dx = Math.max(0, Math.abs(x - bankX) - half);
      const dz = Math.max(0, Math.abs(z - row) - 0.55);
      best = Math.min(best, Math.hypot(dx, dz));
    }
  }
  for (const side of [-1, 1]) {
    for (const cz of columnZ) best = Math.min(best, Math.hypot(x - side * world.columnX, z - cz) - 0.58);
  }
  best = Math.min(best, Math.hypot(x - tetrapod[0], z - tetrapod[2]) - 0.5);
  const altarDx = Math.max(0, Math.abs(x - world.altar[0]) - 0.95);
  const altarDz = Math.max(0, Math.abs(z - world.altar[2]) - 0.55);
  return Math.min(best, Math.hypot(altarDx, altarDz));
}

describe("the entrances", () => {
  for (const route of [littleEntrance, greatEntrance]) {
    const timeline = buildTimeline(route);

    it(`${route.id}: goes out the north deacon door and comes back in through the Royal Doors`, () => {
      const crossings = iconostasCrossings(timeline.path);
      expect(crossings).toHaveLength(2);
      const [out, back] = crossings;
      expect(out?.westward).toBe(true);
      expect(throughNorthDoor(out?.x ?? 0)).toBe(true);
      expect(back?.westward).toBe(false);
      expect(throughRoyalDoors(back?.x ?? 99)).toBe(true);
      expect(timeline.path.points[0]?.[1]).toBeLessThan(world.iconZ);
    });

    it(`${route.id}: walks forward only, holds at its stops, and ends with the priest before the altar`, () => {
      let last = -1;
      let holds = 0;
      let wasMoving = true;
      for (let time = 0; time <= timeline.duration + 0.5; time += 0.05) {
        const { distance, moving } = priestAt(timeline, time);
        expect(distance).toBeGreaterThanOrEqual(last - 1e-9);
        if (wasMoving && !moving && time > 0 && time < timeline.duration) holds += 1;
        wasMoving = moving;
        last = distance;
      }
      expect(holds).toBeGreaterThanOrEqual(1);
      expect(last).toBeCloseTo(timeline.finish);
      const [x, z] = pointAt(timeline.path, timeline.finish);
      expect(x).toBeCloseTo(0, 1);
      expect(z).toBeLessThan(-13.5);
      expect(z).toBeGreaterThan(world.altar[2] + 0.55 + 0.3);
      const walking = timeline.segments.filter((segment) => segment.to > segment.from);
      for (const segment of walking) {
        expect((segment.to - segment.from) / (segment.end - segment.start)).toBeCloseTo(walkSpeed);
      }
      expect(timeline.beats.map((beat) => beat.time)).toEqual([...timeline.beats.map((beat) => beat.time)].sort((a, b) => a - b));
      const key = priestAt(timeline, timeline.keyTime + 0.1);
      expect(key.moving).toBe(false);
      const [kx, kz] = pointAt(timeline.path, key.distance);
      expect(Math.hypot(kx - world.ambon[0], kz - world.ambon[2])).toBeLessThan(0.3);
    });

    it(`${route.id}: every walker stays clear of pews, columns, the tetrapod, the altar, and the reader`, () => {
      for (let priest = 0; priest <= timeline.finish; priest += 0.1) {
        for (const back of [0, 1.05, 2.1, trainSpan]) {
          const spot = pointAt(timeline.path, walkerDistance(priest, back));
          expect(clearance(spot)).toBeGreaterThan(0.3);
          const reader = Math.hypot(spot[0] - readerAside.position[0], spot[1] - readerAside.position[2]);
          expect(reader).toBeGreaterThan(0.6);
        }
      }
    });

    it(`${route.id}: the follow camera passes the iconostas only through a door and stays in the church`, () => {
      let previous = followShot(timeline, 0, routeFloorAt).position;
      for (let priest = 0; priest <= timeline.finish; priest += 0.05) {
        const { position } = followShot(timeline, priest, routeFloorAt);
        expect(Math.abs(position[0])).toBeLessThan(world.halfWidth - 0.5);
        expect(position[2]).toBeGreaterThan(world.sanctuaryEast + 0.5);
        expect(position[2]).toBeLessThan(world.naveWest);
        if ((previous[2] - world.iconZ) * (position[2] - world.iconZ) < 0) {
          const x = (previous[0] + position[0]) / 2;
          expect(throughNorthDoor(x) || throughRoyalDoors(x)).toBe(true);
        }
        for (const side of [-1, 1]) {
          for (const cz of columnZ) expect(Math.hypot(position[0] - side * world.columnX, position[2] - cz)).toBeGreaterThan(0.6);
        }
        previous = position;
      }
    });
  }

  it("keeps the Little Entrance at the front of the nave and takes the Great Entrance through it", () => {
    const deepest = (path: Path) => Math.max(...path.points.map((point) => point[1]));
    const little = buildTimeline(littleEntrance);
    const great = buildTimeline(greatEntrance);
    expect(deepest(little.path)).toBeLessThan(1);
    expect(deepest(great.path)).toBeGreaterThan(pewRows[pewRows.length - 1] + 1);
    const centerAisle = great.path.points.filter((point, index) => {
      const next = great.path.points[index + 1];
      return next && point[0] === 0 && next[0] === 0 && point[1] > next[1] + 10;
    });
    expect(centerAisle).toHaveLength(1);
    expect(great.duration).toBeGreaterThan(little.duration);
  });
});

describe("procession player", () => {
  const beats = [
    { label: "a", time: 0 },
    { label: "b", time: 10 },
    { label: "c", time: 20 },
  ];

  it("plays at the chosen speed, stops at the end, and replays from the start", () => {
    processionClock.attach("great-entrance", { duration: 30, beats, time: 0, playing: true });
    processionClock.setSpeed(0.25);
    expect(processionClock.advance(4)).toBeCloseTo(1);
    processionClock.setSpeed(2);
    expect(processionClock.advance(4)).toBeCloseTo(9);
    processionClock.pause();
    expect(processionClock.advance(4)).toBeCloseTo(9);
    processionClock.play();
    processionClock.advance(100);
    expect(processionClock.snapshot().time).toBe(30);
    expect(processionClock.snapshot().playing).toBe(false);
    processionClock.play();
    expect(processionClock.snapshot().time).toBe(0);
    processionClock.setSpeed(1);
    processionClock.detach("great-entrance");
    expect(processionClock.snapshot().route).toBeNull();
  });

  it("steps between beats and scrubs within the procession", () => {
    processionClock.attach("little-entrance", { duration: 30, beats, time: 12, playing: false });
    expect(processionClock.snapshot().beat).toBe(1);
    processionClock.stepBeat(1);
    expect(processionClock.snapshot().time).toBe(20);
    processionClock.stepBeat(-1);
    expect(processionClock.snapshot().time).toBe(10);
    processionClock.stepBeat(-1);
    expect(processionClock.snapshot().time).toBe(0);
    processionClock.seek(99);
    expect(processionClock.snapshot().time).toBe(30);
    processionClock.seek(-5);
    expect(processionClock.snapshot().time).toBe(0);
    expect(beatIndexAt(beats, 19.99)).toBe(1);
    processionClock.detach("little-entrance");
  });
});
