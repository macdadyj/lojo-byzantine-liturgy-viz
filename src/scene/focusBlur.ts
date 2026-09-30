import { Effect, EffectAttribute } from "postprocessing";
import { Uniform } from "three";

const fragment = /* glsl */ `
uniform float focusDistance;
uniform float farStart;
uniform float farFull;
uniform float nearFull;
uniform float maxBlur;

float blurAmount(const in float viewDistance) {
  float far = smoothstep(farStart, farFull, viewDistance - focusDistance);
  float near = 1.0 - smoothstep(nearFull, nearFull * 2.5, viewDistance);
  return max(far, near);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float here = -getViewZ(depth);
  float blur = blurAmount(here);
  if (blur < 0.02) {
    outputColor = inputColor;
    return;
  }
  vec2 radius = texelSize * maxBlur * blur;
  vec3 sum = inputColor.rgb;
  float weight = 1.0;
  // A golden-angle spiral of taps; a sharp subject in front does not bleed into the soft background behind it.
  for (int i = 1; i < 16; i++) {
    float t = float(i) / 16.0;
    float angle = float(i) * 2.39996;
    vec2 at = uv + vec2(cos(angle), sin(angle)) * sqrt(t) * radius;
    float there = -getViewZ(readDepth(at));
    float w = there < here ? blurAmount(there) : 1.0;
    sum += texture2D(inputBuffer, at).rgb * w;
    weight += w;
  }
  outputColor = vec4(sum / weight, inputColor.a);
}
`;

/**
 * Depth of field in one gather pass: the point the camera looks at stays sharp, the far end of the room
 * softens gradually, and anything right against the lens goes soft. Distances are metres along the view axis.
 */
export class FocusBlurEffect extends Effect {
  constructor() {
    super("FocusBlurEffect", fragment, {
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["focusDistance", new Uniform(10)],
        ["farStart", new Uniform(6)],
        ["farFull", new Uniform(30)],
        ["nearFull", new Uniform(0.8)],
        ["maxBlur", new Uniform(7)],
      ]),
    });
  }

  focus(distance: number): void {
    const set = (name: string, value: number) => {
      const uniform = this.uniforms.get(name);
      if (uniform) uniform.value = value;
    };
    set("focusDistance", distance);
    set("farStart", Math.max(4, distance * 0.45));
    set("farFull", Math.max(20, distance * 2.2));
    set("nearFull", Math.min(1.2, distance * 0.2));
  }
}
