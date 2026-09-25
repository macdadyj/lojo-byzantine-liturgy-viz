import { useSyncExternalStore } from "react";

/** Elevation holds, then the doors and curtain shut for the clergy. */
export const holyCloseMs = 1800;

export type HolyBeat = "off" | "elevation" | "clergy";

type HolyPin = "elevation" | "clergy" | null;

let enteredAt: number | null = null;
let pin: HolyPin = null;
let snapshot: HolyBeat = "off";
let clockOn = false;
const listeners = new Set<() => void>();

/**
 * The old close lived in a useEffect that set the doors open again and started
 * a new interval whenever that effect was set up. Its cleanup cancelled the
 * interval, so a remount during the same visit never reached the shut beat.
 * This clock arms once per visit. Noting Holy Things again does not move it.
 */
export function noteHolyStep(stepId: string, now: number): void {
  if (stepId !== "holy-things") {
    if (enteredAt === null && pin === null && snapshot === "off") return;
    enteredAt = null;
    pin = null;
    snapshot = "off";
    return;
  }
  if (enteredAt !== null) return;
  enteredAt = now;
  pin = null;
  snapshot = "elevation";
}

export function pinHolyBeat(next: "elevation" | "clergy"): void {
  if (enteredAt === null) enteredAt = performance.now();
  pin = next;
  commit(next);
}

export function publishHolyClock(now: number): void {
  const next = beatAfter(now);
  if (next === snapshot) return;
  commit(next);
}

export function beatAfter(now: number): HolyBeat {
  if (enteredAt === null) return "off";
  if (pin === "elevation" || pin === "clergy") return pin;
  return now - enteredAt >= holyCloseMs ? "clergy" : "elevation";
}

export function holyClosesDoors(): boolean {
  return snapshot === "clergy";
}

export function getHolyBeat(): HolyBeat {
  return snapshot;
}

export function holyDebug(now = performance.now()): {
  enteredAt: number | null;
  pin: HolyPin;
  beat: HolyBeat;
  elapsed: number | null;
} {
  return {
    enteredAt,
    pin,
    beat: snapshot,
    elapsed: enteredAt === null ? null : now - enteredAt,
  };
}

export function subscribeHolyBeat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHolyBeat(stepId: string): HolyBeat {
  noteHolyStep(stepId, performance.now());
  ensureClock();
  return useSyncExternalStore(subscribeHolyBeat, getHolyBeat, getHolyBeat);
}

export function resetHolyBeat(): void {
  enteredAt = null;
  pin = null;
  snapshot = "off";
  listeners.clear();
}

function commit(next: HolyBeat): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function ensureClock(): void {
  if (clockOn || typeof window === "undefined") return;
  clockOn = true;
  window.setInterval(() => publishHolyClock(performance.now()), 200);
}
