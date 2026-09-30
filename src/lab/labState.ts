import { useSyncExternalStore } from "react";
import type { CameraPose } from "../scene/staging";

export type LightingPreset = "liturgy" | "morning" | "evening" | "flat";

export const lightingPresets: readonly LightingPreset[] = ["liturgy", "morning", "evening", "flat"];

export type Systems = {
  people: boolean;
  icons: boolean;
  incense: boolean;
  post: boolean;
  shadows: boolean;
};

export type SystemName = keyof Systems;

export const systemNames: readonly SystemName[] = ["people", "icons", "incense", "post", "shadows"];

export type LabState = {
  lighting: LightingPreset;
  systems: Systems;
  /** Clock frozen at this many seconds; null lets time run. */
  freezeAt: number | null;
  /** Camera bookmark that overrides the step's own pose. */
  camera: CameraPose | null;
  /** Jump straight to the camera goal instead of easing. */
  snap: boolean;
  seed: number;
};

const defaults: LabState = {
  lighting: "liturgy",
  systems: { people: true, icons: true, incense: true, post: true, shadows: true },
  freezeAt: null,
  camera: null,
  snap: false,
  seed: 1,
};

let state: LabState = parseLabParams(typeof window === "undefined" ? "" : window.location.search);
const listeners = new Set<() => void>();

export function parseLabParams(search: string): LabState {
  const params = new URLSearchParams(search);
  const lighting = params.get("light");
  const freeze = params.get("freeze");
  const seed = Number(params.get("seed") ?? defaults.seed);
  const systems = { ...defaults.systems };
  for (const name of systemNames) {
    const value = params.get(name);
    if (value === "0") systems[name] = false;
    if (value === "1") systems[name] = true;
  }
  return {
    ...defaults,
    lighting: isLighting(lighting) ? lighting : defaults.lighting,
    systems,
    freezeAt: freeze === null ? null : Number(freeze) || 0,
    snap: params.get("snap") === "1" || freeze !== null,
    seed: Number.isFinite(seed) ? seed : defaults.seed,
  };
}

function isLighting(value: string | null): value is LightingPreset {
  return value !== null && (lightingPresets as readonly string[]).includes(value);
}

export function getLab(): LabState {
  return state;
}

export function setLab(patch: Partial<LabState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function setSystem(name: SystemName, on: boolean): void {
  setLab({ systems: { ...state.systems, [name]: on } });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLab(): LabState {
  return useSyncExternalStore(subscribe, getLab, getLab);
}
