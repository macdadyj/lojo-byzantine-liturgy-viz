import { ShaderChunk } from "three";
import { tetrapod, world } from "../world";

type Vec3 = [number, number, number];

/** A small warm light (candle, oil lamp, chandelier) that brightens what is near it but casts no shadow. */
export type Practical = { position: Vec3; color: string; intensity: number; reach: number };

export const chandelierSpots: Vec3[] = [
  [0, 7.4, 11],
  [0, 7.6, 4.5],
  [0, 7.2, -4.2],
  [0, 5.8, -13.4],
];

/** The one before the tetrapod stands on its east side, so the center aisle and the walkway stay clear. */
export const candleStandSpots: Vec3[] = [
  [-1.5, 0, -6.4],
  [1.5, 0, -6.4],
  [0, 0, tetrapod[2] - 0.9],
  [-3.2, 0, 18.6],
];

export const sandTraySpots: Vec3[] = [
  [0.85, 0, tetrapod[2]],
  [-0.85, 0, tetrapod[2]],
  [1.15, 0, -6.15],
  [-1.15, 0, -6.15],
  [-2.3, 0, 20.2],
];

export const lampadaSpots: Vec3[] = [
  [-2.35, 3.55, world.iconZ + 0.72],
  [2.35, 3.55, world.iconZ + 0.72],
  [-4.7, 3.4, world.iconZ + 0.72],
  [4.7, 3.4, world.iconZ + 0.72],
];

const flame = "#ffc48a";

export const practicals: Practical[] = [
  ...chandelierSpots.map((p): Practical => ({ position: [p[0], p[1] - 0.08, p[2]], color: flame, intensity: 2.4, reach: 13 })),
  ...candleStandSpots.map((p): Practical => ({ position: [p[0], 1.12, p[2]], color: flame, intensity: 0.7, reach: 3.4 })),
  ...sandTraySpots.map((p): Practical => ({ position: [p[0], 0.45, p[2]], color: flame, intensity: 0.45, reach: 2.4 })),
  ...lampadaSpots.map((p): Practical => ({ position: [p[0], p[1] - 0.4, p[2]], color: flame, intensity: 0.5, reach: 2.8 })),
];

function linear(hex: string): Vec3 {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => Math.pow(c / 255, 2.2)) as Vec3;
}

const glsl = (values: number[]) => values.map((v) => v.toFixed(4)).join(", ");

type Cluster = { lights: Practical[]; low: Vec3; high: Vec3 };

/**
 * Lights that reach far are tested at every pixel; short-reach candles are grouped by where they stand, and a
 * pixel only visits a group whose box (the lights plus their reach) contains it.
 */
export function clusterPracticals(list: readonly Practical[], span = 7): { wide: Practical[]; clusters: Cluster[] } {
  const wide = list.filter((p) => p.reach > span);
  const near = list.filter((p) => p.reach <= span).sort((a, b) => a.position[2] - b.position[2]);
  const clusters: Cluster[] = [];
  for (const light of near) {
    const last = clusters[clusters.length - 1];
    const first = last?.lights[0];
    if (last && first && light.position[2] - first.position[2] <= span) last.lights.push(light);
    else clusters.push({ lights: [light], low: [0, 0, 0], high: [0, 0, 0] });
  }
  for (const cluster of clusters) {
    for (let axis = 0; axis < 3; axis += 1) {
      cluster.low[axis] = Math.min(...cluster.lights.map((p) => p.position[axis] - p.reach));
      cluster.high[axis] = Math.max(...cluster.lights.map((p) => p.position[axis] + p.reach));
    }
  }
  return { wide, clusters };
}

function loop(name: string, list: readonly Practical[]): string {
  const count = list.length;
  const positions = list.map((p) => `vec3(${glsl(p.position)})`).join(", ");
  const colors = list.map((p) => `vec3(${glsl(linear(p.color).map((c) => c * p.intensity))})`).join(", ");
  const reachSquared = glsl(list.map((p) => p.reach * p.reach));
  return /* glsl */ `
    const vec3 ${name}Position[${count}] = vec3[](${positions});
    const vec3 ${name}Color[${count}] = vec3[](${colors});
    const float ${name}Reach[${count}] = float[](${reachSquared});
    for (int i = 0; i < ${count}; i++) {
      practicalLight += practicalTerm(${name}Position[i] - worldPosition, worldNormal, ${name}Reach[i]) * ${name}Color[i];
    }`;
}

/**
 * The practicals as constant GLSL added to the diffuse light of every lit material. Real point lights cost
 * every fragment of every material, and three.js recompiles every program when their count changes; a baked
 * list never recompiles. Their positions never move, so constants are enough.
 *
 * They belong to the pooled lighting rig (see `rigFor`): only with shadow maps on, where the room is dim
 * enough for a candle to show. The low tier has no shadow maps, lights the room evenly, and skips the loop.
 */
export function practicalChunk(list: readonly Practical[]): string {
  const { wide, clusters } = clusterPracticals(list);
  const groups = clusters
    .map(
      (cluster, index) => `
  if (all(greaterThan(worldPosition, vec3(${glsl(cluster.low)}))) && all(lessThan(worldPosition, vec3(${glsl(cluster.high)})))) {${loop(`practicalNear${index}`, cluster.lights)}
  }`,
    )
    .join("");
  return /* glsl */ `
#if defined( RE_Direct ) && defined( USE_SHADOWMAP )
{
  // Back to world space once per pixel (the view matrix is a rotation and a translation).
  mat3 viewToWorld = transpose(mat3(viewMatrix));
  vec3 worldPosition = viewToWorld * geometryPosition + cameraPosition;
  vec3 worldNormal = viewToWorld * geometryNormal;
  vec3 practicalLight = vec3(0.0);
  {${wide.length > 0 ? loop("practicalWide", wide) : ""}
  }${groups}
  reflectedLight.directDiffuse += practicalLight * BRDF_Lambert(material.diffuseColor);
}
#endif
`;
}

/** Falloff and facing for one practical; declared before main so the loops above can call it. */
const practicalTermSource = /* glsl */ `
float practicalTerm(const in vec3 toLight, const in vec3 normal, const in float reachSquared) {
  float rangeSquared = dot(toLight, toLight);
  if (rangeSquared >= reachSquared) return 0.0;
  float window = 1.0 - rangeSquared / reachSquared;
  // Slightly wrapped so the side of a face or robe turned away from a candle is not cut to black.
  float facing = saturate(dot(normal, toLight) * inversesqrt(rangeSquared) * 0.8 + 0.2);
  return window * window / max(rangeSquared, 0.04) * facing;
}
`;

const marker = "// parish practicals";
if (!ShaderChunk.lights_fragment_end.includes(marker)) {
  ShaderChunk.lights_fragment_end = `${ShaderChunk.lights_fragment_end}\n${marker}\n${practicalChunk(practicals)}`;
  ShaderChunk.lights_pars_begin = `${ShaderChunk.lights_pars_begin}\n${practicalTermSource}`;
}
