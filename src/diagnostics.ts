import type { Quality } from "./scene/quality";

export type GpuInfo = {
  webgl2: boolean;
  renderer: string | null;
  vendor: string | null;
  maxTextureSize: number | null;
  highpFragment: boolean | null;
  /** Why WebGL2 could not be created, when it could not. */
  failure: string | null;
};

export type RenderInfo = {
  fps: number;
  calls: number;
  triangles: number;
  programs: number;
  textures: number;
  geometries: number;
  /** Drawing buffer in device pixels, and the pixel ratio the canvas actually uses. */
  width: number;
  height: number;
  pixelRatio: number;
};

/**
 * What a phone did while it loaded, in milliseconds since navigation. Written by the app and the 3D chunk,
 * shown by `?debug=1`, and read by `npm run phone` as `window.__boot`.
 */
export type Diagnostics = {
  firstContent: number | null;
  shell: number | null;
  sceneRequested: number | null;
  sceneChunk: number | null;
  firstFrame: number | null;
  sceneReady: number | null;
  tier: Quality | null;
  tierReason: string | null;
  ceiling: Quality | null;
  quality: Quality | null;
  gpu: GpuInfo | null;
  render: RenderInfo | null;
  contextLost: number;
  errors: string[];
};

declare global {
  interface Window {
    __boot?: Diagnostics;
    /** Filled by the inline script in index.html before any bundle runs. */
    __bootErrors?: string[];
    __bootShowError?: (message: string) => void;
    __bootMounted?: () => void;
  }
}

const listeners = new Set<() => void>();

export const diagnostics: Diagnostics = {
  firstContent: null,
  shell: null,
  sceneRequested: null,
  sceneChunk: null,
  firstFrame: null,
  sceneReady: null,
  tier: null,
  tierReason: null,
  ceiling: null,
  quality: null,
  gpu: null,
  render: null,
  contextLost: 0,
  errors: typeof window === "undefined" ? [] : (window.__bootErrors ?? []),
};

if (typeof window !== "undefined") window.__boot = diagnostics;

export function now(): number {
  return Math.round(performance.now());
}

type Milestone = "firstContent" | "shell" | "sceneRequested" | "sceneChunk" | "firstFrame" | "sceneReady";

/** Records a milestone the first time it happens. */
export function mark(name: Milestone): void {
  if (diagnostics[name] !== null) return;
  diagnostics[name] = now();
  notify();
}

export function report(patch: Partial<Diagnostics>): void {
  Object.assign(diagnostics, patch);
  notify();
}

export function noteError(message: string): void {
  const text = message.slice(0, 600);
  if (diagnostics.errors[diagnostics.errors.length - 1] === text) return;
  diagnostics.errors.push(text);
  if (diagnostics.errors.length > 30) diagnostics.errors.shift();
  notify();
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack?.split("\n").slice(0, 4).join("\n") ?? "";
    return stack.includes(error.message) ? stack : `${error.name}: ${error.message}\n${stack}`;
  }
  return String(error);
}

export function subscribeDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

export const debugEnabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";
