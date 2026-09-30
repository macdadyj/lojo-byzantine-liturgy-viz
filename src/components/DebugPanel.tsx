import { useEffect, useReducer, useState } from "react";
import { diagnostics, subscribeDiagnostics, type Diagnostics } from "../diagnostics";

type MemoryInfo = { usedJSHeapSize: number; jsHeapSizeLimit: number };

function ms(value: number | null): string {
  if (value === null) return "–";
  return value < 10000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`;
}

function safeArea(): string {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const text = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map((v) => Number.parseFloat(v) || 0).join(" ");
  probe.remove();
  return text;
}

/** Plain-text report, the same lines the panel shows, for copying into a message. */
export function diagnosticsText(d: Diagnostics): string {
  const gpu = d.gpu;
  const render = d.render;
  const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
  const visual = window.visualViewport;
  const lines = [
    `GPU: ${gpu ? `${gpu.renderer ?? "?"} (${gpu.vendor ?? "?"})` : "not probed yet"}`,
    `WebGL2: ${gpu ? (gpu.webgl2 ? "yes" : `no – ${gpu.failure ?? ""}`) : "?"}  max texture ${gpu?.maxTextureSize ?? "?"}  highp ${gpu?.highpFragment ?? "?"}`,
    `Tier: ${d.tier ?? "?"} (${d.tierReason ?? "?"})  now ${d.quality ?? "?"}  auto ceiling ${d.ceiling ?? "?"}`,
    render
      ? `Frame: ${render.fps} fps  ${render.calls} calls  ${render.triangles.toLocaleString()} tris  ${render.programs} shaders  ${render.textures} textures  ${render.geometries} geometries`
      : "Frame: no 3D frame yet",
    render ? `Canvas: ${render.width}×${render.height} px at ${render.pixelRatio}x (screen ${window.devicePixelRatio}x)` : `Screen: ${window.devicePixelRatio}x`,
    `Viewport: ${window.innerWidth}×${window.innerHeight}  visual ${visual ? `${Math.round(visual.width)}×${Math.round(visual.height)}` : "?"}  safe area ${safeArea()}`,
    `Load: shell ${ms(d.shell)}  3D asked ${ms(d.sceneRequested)}  3D code ${ms(d.sceneChunk)}  first frame ${ms(d.firstFrame)}  icons done ${ms(d.sceneReady)}`,
    `Context lost: ${d.contextLost}${memory ? `  JS heap ${Math.round(memory.usedJSHeapSize / 1048576)} of ${Math.round(memory.jsHeapSizeLimit / 1048576)} MB` : ""}`,
    `Browser: ${navigator.userAgent}`,
    `Errors (${d.errors.length}):`,
    ...(d.errors.length > 0 ? d.errors.map((error) => `  ${error}`) : ["  none"]),
  ];
  return lines.join("\n");
}

/** `?debug=1`: GPU, tier, frame rate, load times and every caught error, on screen for a phone screenshot. */
export function DebugPanel() {
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeDiagnostics(refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const text = diagnosticsText(diagnostics);
  return (
    <aside className={open ? "debug-panel" : "debug-panel is-closed"} aria-label="Diagnostics">
      <div className="debug-head">
        <strong>Debug</strong>
        {diagnostics.errors.length > 0 ? <span className="debug-errors">{diagnostics.errors.length} error(s)</span> : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => setCopied(true));
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? <pre>{text}</pre> : null}
    </aside>
  );
}
