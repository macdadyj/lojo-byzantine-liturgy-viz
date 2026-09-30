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

    it(`${route.id}: names each moment on the move when the first candle gets there`, () => {
      const holds = new Set(route.stops.filter((stop) => stop.hold).map((stop) => stop.beat));
      const moving = timeline.beats.filter((beat) => !holds.has(beat.label) && beat.distance < timeline.finish - 0.01);
      expect(moving.length).toBeGreaterThanOrEqual(3);
      for (const beat of moving) {
        const front = walkerDistance(priestAt(timeline, beat.time).distance, 0);
        expect(front).toBeGreaterThanOrEqual(beat.distance - 0.01);
        const early = walkerDistance(priestAt(timeline, beat.time - 0.5).distance, 0);
        const heldBack = priestAt(timeline, beat.time - 0.05).moving === false;
        expect(early < beat.distance || heldBack).toBe(true);
      }
      const door = timeline.beats.find((beat) => beat.label.startsWith("Out through the north deacon door"));
      const [dx, dz] = pointAt(timeline.path, walkerDistance(priestAt(timeline, door?.time ?? 0).distance, 0));
      expect(Math.hypot(dx + world.deaconDoorX, dz - -9.9)).toBeLessThan(0.05);
      const key = timeline.beats.find((beat) => holds.has(beat.label) && Math.abs(beat.time - timeline.keyTime) < 1e-6);
      expect(key).toBeDefined();
    });

    it(`${route.id}: at the ambon the camera sees the priest and deacon past the candles, even on an upright phone`, () => {
      const priest = priestAt(timeline, timeline.keyTime + 1).distance;
      const { position, target } = followShot(timeline, priest, routeFloorAt);
      const eye: FloorPoint = [position[0], position[2]];
      const look = Math.atan2(target[2] - eye[1], target[0] - eye[0]);
      const bearing = ([x, z]: FloorPoint) => Math.atan2(z - eye[1], x - eye[0]);
      const off = (angle: number) => Math.abs(Math.atan2(Math.sin(angle - look), Math.cos(angle - look)));
      // 42° vertical field of view in a 390 × 740 picture.
      const halfWidth = Math.atan(Math.tan((21 * Math.PI) / 180) * (390 / 740));
      const clergy = [2.1, trainSpan].map((back) => pointAt(timeline.path, walkerDistance(priest, back)));
      const candles = [0, 1.05].map((back) => pointAt(timeline.path, walkerDistance(priest, back)));
      for (const person of clergy) {
        expect(off(bearing(person))).toBeLessThan(halfWidth * 0.8);
        const range = Math.hypot(person[0] - eye[0], person[1] - eye[1]);
        for (const candle of candles) {
          const apart = Math.abs(Math.sin(bearing(candle) - bearing(person))) * Math.hypot(candle[0] - eye[0], candle[1] - eye[1]);
          const nearer = Math.hypot(candle[0] - eye[0], candle[1] - eye[1]) < range;
          expect(!nearer || apart > 0.6).toBe(true);
        }
      }
      expect(position[2]).toBeGreaterThan(world.iconZ + 0.5);
    });

    it(`${route.id}: the follow camera passes the iconostas only through a door and stays in the church`, () => {
      let previous = followShot(timeline, 0, routeFloorAt);
      let cuts = 0;
      for (let priest = 0; priest <= timeline.finish; priest += 0.05) {
        const shot = followShot(timeline, priest, routeFloorAt);
        const { position } = shot;
        expect(Math.abs(position[0])).toBeLessThan(world.halfWidth - 0.5);
        expect(position[2]).toBeGreaterThan(world.sanctuaryEast + 0.5);
        expect(position[2]).toBeLessThan(world.naveWest);
        if (shot.take !== previous.take) cuts += 1;
        else if ((previous.position[2] - world.iconZ) * (position[2] - world.iconZ) < 0) {
          const x = (previous.position[0] + position[0]) / 2;
          expect(throughNorthDoor(x) || throughRoyalDoors(x)).toBe(true);
        }
        for (const side of [-1, 1]) {
          for (const cz of columnZ) expect(Math.hypot(position[0] - side * world.columnX, position[2] - cz)).toBeGreaterThan(0.6);
        }
        previous = shot;
      }
      // One cut, once the priest is back through the Royal Doors, to the shot of the altar.
      expect(cuts).toBe(1);
      expect(previous.position).toEqual(route.endShot.position);
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
