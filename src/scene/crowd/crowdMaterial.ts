import { MeshStandardMaterial, type IUniform } from "three";

export type CrowdUniforms = { uTime: IUniform<number> };

/**
 * Standard PBR material whose base color and roughness come from the vertex's body region
 * and the instance's own skin, hair, and clothing colors. A slow sway keeps a still crowd alive.
 */
export function createCrowdMaterial(uniforms: CrowdUniforms): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float region;
attribute vec3 iSkin;
attribute vec3 iHair;
attribute vec3 iTop;
attribute vec3 iBottom;
attribute vec3 iScarf;
attribute float iPhase;
uniform float uTime;
varying vec3 vTint;
varying float vRough;
varying float vSheen;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float r = region;
vec3 tint = iTop;
float rough = 0.86;
float sheen = 0.0;
if (r < 0.5) { tint = iSkin; rough = 0.52; sheen = 1.0; }
else if (r < 1.5) { tint = iHair; rough = 0.6; }
else if (r < 2.5) { tint = vec3(0.02, 0.018, 0.016); rough = 0.25; }
else if (r < 3.5) { tint = iTop; }
else if (r < 4.5) { tint = iBottom; rough = 0.82; }
else if (r < 5.5) { tint = vec3(0.022, 0.018, 0.016); rough = 0.45; }
else if (r < 6.5) { tint = vec3(0.72, 0.69, 0.64); rough = 0.8; }
else if (r < 7.5) { tint = vec3(0.6, 0.45, 0.22); rough = 0.4; }
else { tint = iScarf; rough = 0.9; }
vTint = tint;
vRough = rough;
vSheen = sheen;
float lift = clamp(transformed.y / 1.7, 0.0, 1.0);
lift *= lift;
transformed.x += sin(uTime * 0.55 + iPhase * 6.2831) * 0.01 * lift;
transformed.z += sin(uTime * 0.41 + iPhase * 4.1) * 0.007 * lift;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vTint;
varying float vRough;
varying float vSheen;`,
      )
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( vTint, opacity );")
      .replace("float roughnessFactor = roughness;", "float roughnessFactor = vRough;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vTint * vec3(0.10, 0.035, 0.025) * vSheen;`,
      );
  };
  material.customProgramCacheKey = () => "crowd-v1";
  return material;
}
