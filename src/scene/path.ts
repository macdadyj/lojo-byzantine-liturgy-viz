export type Vec3 = [number, number, number];

export function pointOnPath(points: readonly Vec3[], t: number): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return points[0];
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const from = points[index];
  const to = points[index + 1];
  if (!from || !to) return points[0];
  return [
    from[0] + (to[0] - from[0]) * mix,
    from[1] + (to[1] - from[1]) * mix,
    from[2] + (to[2] - from[2]) * mix,
  ];
}

/** A point `meters` back toward the start of the path from parameter t. */
export function pointBehind(points: readonly Vec3[], t: number, meters: number): Vec3 {
  const here = pointOnPath(points, t);
  if (meters <= 0 || points.length < 2) return here;
  let remaining = meters;
  let cursor = Math.min(1, Math.max(0, t));
  let previous = here;
  for (let step = 0; step < 48 && remaining > 0.001; step += 1) {
    const nextCursor = Math.max(0, cursor - 0.012);
    const sample = pointOnPath(points, nextCursor);
    const span = Math.hypot(sample[0] - previous[0], sample[1] - previous[1], sample[2] - previous[2]);
    if (span >= remaining || nextCursor === 0) {
      const mix = span <= 0.0001 ? 1 : Math.min(1, remaining / span);
      return [
        previous[0] + (sample[0] - previous[0]) * mix,
        previous[1] + (sample[1] - previous[1]) * mix,
        previous[2] + (sample[2] - previous[2]) * mix,
      ];
    }
    remaining -= span;
    previous = sample;
    cursor = nextCursor;
  }
  return previous;
}
