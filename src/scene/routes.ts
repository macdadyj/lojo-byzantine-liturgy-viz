import type { RouteId } from "../liturgy/types";
import { tetrapod, world } from "./world";

/** A place on the floor: x (north is −x) and z (east, the altar, is −z). */
export type FloorPoint = [number, number];

export type RouteStop = {
  at: FloorPoint;
  /**
   * What is happening from the moment the first candle reaches this point; shown in the player. At a hold,
   * and at the priest's place at the altar, the moment starts when the priest arrives and the procession stands.
   */
  beat?: string;
  /** Seconds the whole procession stands still with the priest here. */
  hold?: number;
  /** The moment shown when motion is reduced, and in still captures. */
  key?: boolean;
};

export type Shot = { position: [number, number, number]; target: [number, number, number] };

export type Route = {
  id: RouteId;
  stops: RouteStop[];
  /** Where the follow camera settles once the procession is in the sanctuary. */
  endShot: Shot;
  /**
   * From the south side of the solea during the stand at the ambon, so the candles in the Royal Doors are off
   * to one side and the priest and deacon face the lens.
   */
  keyShot: Shot;
};

/** Walking pace at 1× speed, in meters per second: a slow, solemn step. */
export const walkSpeed = 0.8;
/** From the first candle to the priest, who walks last. */
export const trainSpan = 3.15;
/** How far ahead of the first candle the follow camera walks, looking back at the procession. */
export const cameraLead = 3.4;
const cameraHeight = 2.35;

const doorX = -world.deaconDoorX;
/** North side aisle: between the north pews (edge at −3.4) and the columns (clear of them from −4.27). */
const northAisle = -3.85;
/** The walkway between the tetrapod and the first standing row of the faithful. */
export const walkwayZ = -0.35;
/** Behind the last pew, before the narthex. */
const backAisle = 15.6;
/** The priest's last place, before the west side of the altar. */
const priestAtAltar: FloorPoint = [0, -14.05];

/**
 * Past the priest's last place the candles walk on around the north end of the altar, exactly one train
 * length, so the priest stops before the holy table with everyone ahead of him still in the sanctuary.
 */
function aroundTheAltar(): FloorPoint[] {
  const turn: FloorPoint = [-1.5, -14.5];
  const rest = trainSpan - Math.hypot(turn[0] - priestAtAltar[0], turn[1] - priestAtAltar[1]);
  const along = Math.hypot(0.3, 1);
  return [turn, [turn[0] - (0.3 / along) * rest, turn[1] - (1 / along) * rest]];
}

function intoTheSanctuary(atAmbon: string, atAltar: string): RouteStop[] {
  return [
    { at: [0, -5.6], beat: atAmbon, hold: 4, key: true },
    { at: [0, -8.7], beat: "In through the Royal Doors" },
    { at: priestAtAltar, beat: atAltar },
    ...aroundTheAltar().map((at) => ({ at })),
  ];
}

const endShot: Shot = { position: [2.6, 2.3, -11.4], target: [-0.9, 1.3, -14.9] };
const keyShot: Shot = { position: [4.5, 2.4, -8.45], target: [0, 1.05, -6.1] };

/**
 * Little Entrance: from the altar out the north deacon door, down off the solea, across the walkway in front
 * of the people, around the tetrapod, and back up through the Royal Doors.
 */
export const littleEntrance: Route = {
  id: "little-entrance",
  stops: [
    { at: priestAtAltar, beat: "The Gospel is taken up from the altar", hold: 2 },
    { at: [-3.2, -12.9] },
    { at: [-6.4, -10.7] },
    { at: [doorX, -9.9], beat: "Out through the north deacon door" },
    { at: [doorX, -8.3] },
    { at: [northAisle, -6.4] },
    { at: [northAisle, -4.6], beat: "Down from the solea into the nave" },
    { at: [northAisle, walkwayZ], beat: "Across the nave, in front of the people" },
    { at: [1.6, walkwayZ] },
    { at: [1.6, -2.3], beat: "Around the tetrapod to the ambon" },
    { at: [0, -3.3] },
    ...intoTheSanctuary("“Wisdom! Be attentive!” The Gospel is raised before the doors", "The Gospel is laid on the altar"),
  ],
  endShot,
  keyShot,
};

/**
 * Great Entrance: from the prothesis out the north deacon door, down the north aisle among the people, across
 * the back of the nave, up the center aisle, around the tetrapod, and back up through the Royal Doors.
 */
export const greatEntrance: Route = {
  id: "great-entrance",
  stops: [
    { at: [-5.3, -14.3], beat: "The gifts are taken up at the prothesis", hold: 2 },
    { at: [-6.3, -12.0] },
    { at: [doorX, -9.9], beat: "Out through the north deacon door" },
    { at: [doorX, -8.3] },
    { at: [northAisle, -6.4] },
    { at: [northAisle, -4.6], beat: "Down the north aisle, among the people" },
    { at: [northAisle, backAisle], beat: "Across the back of the nave" },
    { at: [0, backAisle], beat: "Up the center aisle through the people" },
    { at: [0, 0.3], beat: "Around the tetrapod to the ambon" },
    { at: [-1.6, -0.4] },
    { at: [-1.6, -2.3] },
    { at: [0, -3.3] },
    ...intoTheSanctuary("The commemorations: “May the Lord God remember all of you…”", "The gifts are set on the altar"),
  ],
  endShot,
  keyShot,
};

export function routeFor(id: RouteId): Route {
  switch (id) {
    case "little-entrance":
      return littleEntrance;
    case "great-entrance":
      return greatEntrance;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

/** A polyline with its running length, so a walker can be placed by meters walked. */
export type Path = { points: FloorPoint[]; runs: number[]; length: number };

export function makePath(points: FloorPoint[]): Path {
  const runs = [0];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const previous = runs[index - 1] ?? 0;
    runs.push(a && b ? previous + Math.hypot(b[0] - a[0], b[1] - a[1]) : previous);
  }
  return { points, runs, length: runs[runs.length - 1] ?? 0 };
}

export function pointAt(path: Path, distance: number): FloorPoint {
  const { points, runs } = path;
  const first = points[0];
  if (!first) return [0, 0];
  const d = Math.min(path.length, Math.max(0, distance));
  for (let index = 1; index < points.length; index += 1) {
    const end = runs[index] ?? 0;
    if (d > end && index < points.length - 1) continue;
    const start = runs[index - 1] ?? 0;
    const a = points[index - 1] ?? first;
    const b = points[index] ?? first;
    const mix = end - start <= 1e-6 ? 1 : (d - start) / (end - start);
    return [a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix];
  }
  return first;
}

/** Walking direction around `distance`, looking a little behind and ahead so corners are turned smoothly. */
export function headingAt(path: Path, distance: number, span = 0.3): FloorPoint {
  const from = pointAt(path, distance - span);
  const to = pointAt(path, distance + span);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  return length < 1e-6 ? [0, -1] : [dx / length, dz / length];
}

type Segment = { start: number; end: number; from: number; to: number };
/** A moment in the player: when it starts, and where on the path it happens. */
export type Beat = { label: string; time: number; distance: number };

export type Timeline = {
  route: Route;
  path: Path;
  /** How far the priest walks: the path less the train ahead of him. */
  finish: number;
  duration: number;
  segments: Segment[];
  beats: Beat[];
  keyTime: number;
  /** Where on the path the priest stands for the key moment. */
  keyDistance: number;
};

/** The first time the priest has walked `distance`. */
function timeAtPriest(segments: Segment[], distance: number): number {
  for (const segment of segments) {
    if (segment.to < distance - 1e-6) continue;
    const span = segment.to - segment.from;
    if (span <= 1e-6) return segment.start;
    return segment.start + ((distance - segment.from) / span) * (segment.end - segment.start);
  }
  return segments[segments.length - 1]?.end ?? 0;
}

/**
 * One pass, forward only: the priest walks from the first stop to his place at the altar at `walkSpeed`,
 * and the whole procession stands still for each stop's hold.
 */
export function buildTimeline(route: Route): Timeline {
  const path = makePath(route.stops.map((stop) => stop.at));
  const finish = Math.max(0, path.length - trainSpan);
  const segments: Segment[] = [];
  const standing: { at: number; label?: string; start: number; end: number }[] = [];
  let time = 0;
  let distance = 0;
  let keyTime = 0;
  let keyDistance = 0;
  route.stops.forEach((stop, index) => {
    const at = path.runs[index] ?? 0;
    if (at > finish + 0.01) return;
    const target = Math.min(at, finish);
    if (target > distance) {
      const seconds = (target - distance) / walkSpeed;
      segments.push({ start: time, end: time + seconds, from: distance, to: target });
      time += seconds;
      distance = target;
    }
    if (stop.key) {
      keyTime = time;
      keyDistance = distance;
    }
    if (stop.hold) {
      standing.push({ at, label: stop.beat, start: time, end: time + stop.hold });
      segments.push({ start: time, end: time + stop.hold, from: distance, to: distance });
      time += stop.hold;
    } else if (stop.beat && at >= finish - 0.01) {
      standing.push({ at, label: stop.beat, start: time, end: time });
    }
  });
  if (finish > distance) {
    const seconds = (finish - distance) / walkSpeed;
    segments.push({ start: time, end: time + seconds, from: distance, to: finish });
    time += seconds;
  }
  const beats: Beat[] = [];
  route.stops.forEach((stop, index) => {
    const at = path.runs[index] ?? 0;
    if (!stop.beat || at > path.length + 0.01) return;
    const stand = standing.find((entry) => entry.label === stop.beat && Math.abs(entry.at - at) < 1e-6);
    if (stand) {
      beats.push({ label: stop.beat, time: stand.start, distance: at });
      return;
    }
    // A moment on the move starts when the first candle gets there, but not before the stand behind it is over.
    const lead = timeAtPriest(segments, Math.max(0, at - trainSpan));
    const after = Math.max(0, ...standing.filter((entry) => entry.at < at).map((entry) => entry.end));
    beats.push({ label: stop.beat, time: Math.max(lead, after), distance: at });
  });
  return { route, path, finish, duration: time, segments, beats, keyTime, keyDistance };
}

/** Meters the priest has walked at `time`, and whether the procession is moving then. */
export function priestAt(timeline: Timeline, time: number): { distance: number; moving: boolean } {
  for (const segment of timeline.segments) {
    if (time > segment.end) continue;
    if (time < segment.start) break;
    const span = segment.end - segment.start;
    const mix = span <= 1e-6 ? 1 : (time - segment.start) / span;
    return { distance: segment.from + (segment.to - segment.from) * mix, moving: segment.to > segment.from && time < segment.end };
  }
  return { distance: time <= 0 ? 0 : timeline.finish, moving: false };
}

/** Meters walked by the person `back` meters behind the first candle. */
export function walkerDistance(priest: number, back: number): number {
  return priest + trainSpan - back;
}

/** Floor under a walker: the solea and sanctuary steps, carried across the threshold of each door. */
export type FloorAt = (x: number, z: number) => number;

function smooth(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/** A follow-camera goal; a new `take` is a cut, not a glide. */
export type FollowShot = Shot & { take: number };

function mix3(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [0, 1, 2].map((axis) => (a[axis] ?? 0) + ((b[axis] ?? 0) - (a[axis] ?? 0)) * t) as [number, number, number];
}

/**
 * The follow camera walks the route a few meters ahead of the first candle and looks back at the middle of
 * the procession, so it passes through the same doors and never through a wall. Before it would reach the
 * Royal Doors it steps aside to `keyShot` for the stand at the ambon and watches the procession go in; once
 * the priest is through the doors it cuts to `endShot` and watches them arrive at the altar.
 */
export function followShot(timeline: Timeline, priest: number, floorAt: FloorAt): FollowShot {
  const { path, route, keyDistance } = timeline;
  const front = walkerDistance(priest, 0);
  const lead = pointAt(path, front);
  const last = pointAt(path, priest);
  const mx = (lead[0] + last[0]) / 2;
  const mz = (lead[1] + last[1]) / 2;
  const middle: [number, number, number] = [mx, floorAt(mx, mz) + 1.3, mz];
  if (priest > keyDistance && last[1] < world.iconZ) {
    return { position: [...route.endShot.position], target: middle, take: 1 };
  }
  const aside = smooth((priest - (keyDistance - keyShotFrom)) / keyShotBlend);
  const follow = walkingShot(timeline, front, floorAt);
  return {
    position: mix3(follow, route.keyShot.position, aside),
    target: mix3(middle, route.keyShot.target, aside),
    take: 0,
  };
}

/** Meters before the ambon (for the priest) that the camera starts to step aside, and over how many meters. */
const keyShotFrom = 6.5;
const keyShotBlend = 2.5;

function walkingShot(timeline: Timeline, front: number, floorAt: FloorAt): [number, number, number] {
  const { path, route } = timeline;
  const ahead = front + cameraLead;
  const [ax, pz] = pointAt(path, ahead);
  // In the north aisle it stands a little toward the pews, above the people, so the columns hide less.
  const px = ax + 0.7 * smooth((northAisle + 0.85 - ax) / 0.5) * smooth((pz + 6) / 1.2);
  // Beside the tetrapod it rises to look over the festal icon at the procession coming round it.
  const overIcon = 0.9 * smooth((2.6 - Math.hypot(px - tetrapod[0], pz - tetrapod[2])) / 0.8);
  const eye: [number, number, number] = [px, floorAt(px, pz) + cameraHeight + overIcon, pz];
  return mix3(eye, route.endShot.position, smooth((ahead - path.length) / cameraLead));
}
