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
