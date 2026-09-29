import { ShaderChunk } from "three";
import { world } from "../world";

type Vec3 = [number, number, number];

/** A small warm light (candle, oil lamp, chandelier) that brightens what is near it but casts no shadow. */
export type Practical = { position: Vec3; color: string; intensity: number; reach: number };

export const chandelierSpots: Vec3[] = [
  [0, 7.4, 11],
  [0, 7.6, 4.5],
  [0, 7.2, -4.2],
  [0, 5.8, -13.4],
];

export const candleStandSpots: Vec3[] = [
  [-1.5, 0, -6.4],
  [1.5, 0, -6.4],
  [0, 0, 2.4],
  [-3.2, 0, 18.6],
];

export const sandTraySpots: Vec3[] = [
  [0.85, 0, 1.15],
  [-0.85, 0, 1.15],
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

/**
 * The practicals as constant GLSL arrays added to the diffuse light of every lit material. Real point lights
 * cost every fragment of every material, and three.js recompiles every program when their count changes; a
 * baked list costs a short loop and never recompiles. Their positions never move, so constants are enough.
 */
export function practicalChunk(list: readonly Practical[]): string {
  const count = list.length;
  const positions = list.map((p) => `vec3(${glsl(p.position)})`).join(", ");
  const colors = list.map((p) => `vec3(${glsl(linear(p.color).map((c) => c * p.intensity))})`).join(", ");
  const reaches = glsl(list.map((p) => p.reach));
  return /* glsl */ `
#if defined( RE_Direct )
{
  const int PRACTICAL_COUNT = ${count};
  const vec3 practicalPosition[${count}] = vec3[](${positions});
  const vec3 practicalColor[${count}] = vec3[](${colors});
  const float practicalReach[${count}] = float[](${reaches});
  vec3 practicalLight = vec3(0.0);
  for (int i = 0; i < PRACTICAL_COUNT; i++) {
    vec3 toLight = (viewMatrix * vec4(practicalPosition[i], 1.0)).xyz - geometryPosition;
    float range = length(toLight);
    float fade = pow(saturate(1.0 - pow(range / practicalReach[i], 4.0)), 2.0) / max(range * range, 0.04);
    // Slightly wrapped so the side of a face or robe turned away from a candle is not cut to black.
    float facing = saturate(dot(geometryNormal, toLight / max(range, 1e-4)) * 0.8 + 0.2);
    practicalLight += practicalColor[i] * fade * facing;
  }
  reflectedLight.directDiffuse += practicalLight * BRDF_Lambert(material.diffuseColor);
}
#endif
`;
}

const marker = "// parish practicals";
if (!ShaderChunk.lights_fragment_end.includes(marker)) {
  ShaderChunk.lights_fragment_end = `${ShaderChunk.lights_fragment_end}\n${marker}\n${practicalChunk(practicals)}`;
}
