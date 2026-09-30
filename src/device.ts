import type { GpuInfo } from "./diagnostics";
import type { DeviceTraits } from "./scene/quality";

/**
 * Asks for a WebGL2 context on a throwaway canvas, reads the GPU name, and releases the context at once
 * (iOS allows only a handful alive). three.js needs WebGL2, so without it the 3D chunk is never downloaded.
 */
export function probeGpu(): GpuInfo {
  const info: GpuInfo = { webgl2: false, renderer: null, vendor: null, maxTextureSize: null, highpFragment: null, failure: null };
  try {
    const canvas = document.createElement("canvas");
    let failure = "";
    canvas.addEventListener("webglcontextcreationerror", (event) => {
      failure = (event as WebGLContextEvent).statusMessage || failure;
    });
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (!gl) {
      info.failure = failure || (typeof WebGL2RenderingContext === "undefined" ? "This browser has no WebGL2." : "WebGL2 is turned off or unavailable.");
      return info;
    }
    info.webgl2 = true;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    info.renderer = String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    info.vendor = String(debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
    info.maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    info.highpFragment = (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? 0) > 0;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch (error) {
    info.failure = error instanceof Error ? error.message : String(error);
  }
  return info;
}

type NavigatorExtras = Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };

export function deviceTraits(gpu: GpuInfo): DeviceTraits {
  const nav = navigator as NavigatorExtras;
  const ua = nav.userAgent;
  const touch = nav.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const iPhone = /iPhone|iPod/.test(ua);
  // iPadOS Safari asks for desktop pages and says "Macintosh"; only the touch points give it away.
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
  const phone = iPhone || nav.userAgentData?.mobile === true || (/Android.+Mobile|Mobile Safari/.test(ua) && touch) || (touch && shortSide < 600);
  return {
    phone,
    tablet: !phone && (iPad || /Android/.test(ua) || (touch && shortSide < 1100 && window.matchMedia("(pointer: coarse)").matches)),
    renderer: gpu.renderer,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
  };
}
