import { MeshStandardMaterial, type IUniform } from "three";
import { crossKeys } from "./rig";

/** Still, walking, or making the sign of the cross; stored per instance in `iLook.z`. */
export const Motion = { still: 0, walk: 1, cross: 2 } as const;
export type MotionId = (typeof Motion)[keyof typeof Motion];

const uniforms: { uTime: IUniform<number>; uStride: IUniform<number> } = { uTime: { value: 0 }, uStride: { value: 0 } };

export function setFigureTime(seconds: number): void {
  uniforms.uTime.value = seconds;
}

/**
 * Walking legs follow distance walked, not the clock, so a paused or slowed procession does not stride in
 * place. One unit is the time a meter takes at 1× speed.
 */
export function setFigureStride(value: number): void {
  uniforms.uStride.value = value;
}

function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

function crossFunction(): string {
  const lines = ["vec3 crossAngles(float t) {"];
  for (let index = 0; index < crossKeys.length - 1; index += 1) {
    const a = crossKeys[index];
    const b = crossKeys[index + 1];
    if (!a || !b) continue;
    const va = `vec3(${glslFloat(a.pitch)}, ${glslFloat(a.across)}, ${glslFloat(a.elbow)})`;
    const vb = `vec3(${glslFloat(b.pitch)}, ${glslFloat(b.across)}, ${glslFloat(b.elbow)})`;
    lines.push(
      `  if (t < ${glslFloat(b.at)}) return mix(${va}, ${vb}, smoothstep(0.0, 1.0, (t - ${glslFloat(a.at)}) / ${glslFloat(b.at - a.at)}));`,
    );
  }
  lines.push("  return vec3(0.0);", "}");
  return lines.join("\n");
}

/**
 * WebGL guarantees only 16 vertex attributes and the instance matrix takes four, so each instance's colors
 * travel as sRGB integers in single floats (exact up to 2^24) and are decoded in the shader.
 */
export function packColor(hex: number): number {
  return hex & 0xffffff;
}

export function packMetals(top: number, accent: number): number {
  const clamp = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 99);
  return clamp(top) * 100 + clamp(accent);
}

let shared: MeshStandardMaterial | null = null;

/**
 * One material for every figure. Each vertex knows its body part and the joint it hangs from; each
 * instance brings its own skin, hair and clothing colors and how it moves. Limbs swing and the right arm
 * signs the cross in the vertex shader, so a whole congregation is a handful of instanced draws.
 */
export function figureMaterial(): MeshStandardMaterial {
  if (shared) return shared;
  const material = new MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uStride = uniforms.uStride;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 aTag;
attribute vec3 aPivot;
attribute vec3 aElbow;
attribute vec4 iPalette;
attribute vec4 iLook;
uniform float uTime;
uniform float uStride;
varying vec3 vTint;
varying float vRough;
varying float vMetal;
vec3 unpackColor(float packed) {
  float r = floor(packed / 65536.0);
  float g = floor((packed - r * 65536.0) / 256.0);
  float b = packed - r * 65536.0 - g * 256.0;
  return pow(vec3(r, g, b) / 255.0, vec3(2.2));
}
mat3 rotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
${crossFunction()}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `float aPart = aTag.x;
float aJoint = aTag.y;
float phase = iLook.y * 6.2831;
int motion = int(iLook.z + 0.5);
float topMetal = floor(iLook.w / 100.0) / 99.0;
float accentMetal = mod(iLook.w, 100.0) / 99.0;
mat3 jointTurn = mat3(1.0);
mat3 elbowTurn = mat3(1.0);
float bob = 0.0;
if (motion == 1) {
  float stride = uStride * 5.2 + phase;
  float swing = sin(stride) * 0.42;
  if (aJoint > 0.5 && aJoint < 1.5) jointTurn = rotX(swing);
  else if (aJoint > 1.5 && aJoint < 2.5) jointTurn = rotX(-swing);
  else if (aJoint > 2.5 && aJoint < 3.5) jointTurn = rotX(-swing * 0.6);
  else if (aJoint > 3.5) jointTurn = rotX(swing * 0.6);
  bob = abs(cos(stride)) * 0.018;
} else if (motion == 2 && aJoint > 3.5) {
  vec3 key = crossAngles(fract(uTime * 0.33 + iLook.y * 2.0));
  jointTurn = rotY(key.y) * rotX(key.x);
  if (aJoint > 4.5) elbowTurn = rotX(key.z);
}
vec3 objectNormal = jointTurn * elbowTurn * vec3(normal);`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
transformed = elbowTurn * (transformed - aElbow) + aElbow;
transformed = jointTurn * (transformed - aPivot) + aPivot;
float sway = clamp((position.y - 0.85) / 0.8, 0.0, 1.0);
transformed.x += sin(uTime * 0.55 + phase) * 0.008 * sway;
transformed.z += sin(uTime * 0.41 + phase * 0.7) * 0.006 * sway;
transformed.y += bob + sin(uTime * 1.3 + phase) * 0.003 * sway;
vec3 tint = unpackColor(iPalette.z);
float rough = 0.82;
float metal = 0.0;
if (aPart < 0.5) { tint = unpackColor(iPalette.x); rough = 0.6; }
else if (aPart < 1.5) { tint = unpackColor(iPalette.y); rough = 0.72; }
else if (aPart < 2.5) { tint = vec3(0.035, 0.028, 0.024); rough = 0.3; }
else if (aPart < 3.5) { metal = topMetal; rough = mix(0.84, 0.4, topMetal * 1.6); }
else if (aPart < 4.5) { tint = unpackColor(iPalette.w); rough = 0.86; }
else if (aPart < 5.5) { tint = vec3(0.04, 0.034, 0.03); rough = 0.45; }
else if (aPart < 6.5) { tint = vec3(0.86, 0.84, 0.8); }
else if (aPart < 7.5) { tint = unpackColor(iLook.x); metal = accentMetal; rough = mix(0.82, 0.42, accentMetal * 1.6); }
else if (aPart < 8.5) { tint = vec3(0.86, 0.66, 0.32); metal = 0.8; rough = 0.3; }
else { tint = mix(unpackColor(iPalette.x), vec3(0.013, 0.008, 0.006), 0.6); rough = 0.5; }
vTint = tint;
vRough = rough;
vMetal = metal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vTint;
varying float vRough;
varying float vMetal;`,
      )
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( vTint, opacity );")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vRough;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vMetal;");
  };
  material.customProgramCacheKey = () => "parish-figure-v1";
  shared = material;
  return material;
}
