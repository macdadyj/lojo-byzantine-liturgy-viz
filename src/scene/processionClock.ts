import { useSyncExternalStore } from "react";
import type { RouteId } from "../liturgy/types";

export const speeds = [0.25, 0.5, 1, 2] as const;
export type Speed = (typeof speeds)[number];

export type ClockBeat = { label: string; time: number };

export type ProcessionSnapshot = {
  route: RouteId | null;
  time: number;
  duration: number;
  playing: boolean;
  /** Walking right now: playing and not standing at a stop. */
  moving: boolean;
  speed: Speed;
  beats: readonly ClockBeat[];
  beat: number;
};

type Attach = { duration: number; beats: readonly ClockBeat[]; time: number; playing: boolean };

/** The player redraws a few times a second while the procession walks; the scene reads `now()` every frame. */
const publishMs = 90;

const state: ProcessionSnapshot = {
  route: null,
  time: 0,
  duration: 0,
  playing: false,
  moving: false,
  speed: 1,
  beats: [],
  beat: 0,
};
let snapshot: ProcessionSnapshot = { ...state };
let publishedAt = 0;
const listeners = new Set<() => void>();

function publish(): void {
  state.beat = beatIndexAt(state.beats, state.time);
  snapshot = { ...state };
  publishedAt = performance.now();
  for (const listener of listeners) listener();
}

export function beatIndexAt(beats: readonly { time: number }[], time: number): number {
  let found = 0;
  beats.forEach((beat, index) => {
    if (beat.time <= time + 1e-3) found = index;
  });
  return found;
}

function clampTime(time: number): number {
  return Math.min(state.duration, Math.max(0, time));
}

/**
 * Play, pause, speed, and position of the current procession. The scene owns the timeline and attaches it;
 * the player buttons live outside the canvas and drive it through here.
 */
export const processionClock = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  snapshot(): ProcessionSnapshot {
    return snapshot;
  },
  now(): number {
    return state.time;
  },
  attach(route: RouteId, { duration, beats, time, playing }: Attach): void {
    state.route = route;
    state.duration = duration;
    state.beats = beats;
    state.time = Math.min(duration, Math.max(0, time));
    state.playing = playing;
    publish();
  },
  detach(route: RouteId): void {
    if (state.route !== route) return;
    state.route = null;
    state.playing = false;
    state.moving = false;
    state.beats = [];
    publish();
  },
  /** Advances by a frame; returns the new time. */
  advance(seconds: number): number {
    if (!state.playing || state.route === null) return state.time;
    state.time = clampTime(state.time + seconds * state.speed);
    if (state.time >= state.duration) {
      state.playing = false;
      publish();
    } else if (performance.now() - publishedAt >= publishMs) {
      publish();
    }
    return state.time;
  },
  setMoving(moving: boolean): void {
    if (state.moving === moving) return;
    state.moving = moving;
    publish();
  },
  play(): void {
    if (state.time >= state.duration) state.time = 0;
    state.playing = true;
    publish();
  },
  pause(): void {
    state.playing = false;
    publish();
  },
  toggle(): void {
    if (state.playing) processionClock.pause();
    else processionClock.play();
  },
  seek(time: number): void {
    state.time = clampTime(time);
    publish();
  },
  setSpeed(speed: Speed): void {
    state.speed = speed;
    publish();
  },
  /** Back to the start of this beat (or the one before, if already there), or on to the next beat. */
  stepBeat(direction: -1 | 1): void {
    const index = beatIndexAt(state.beats, state.time);
    if (direction === 1) {
      const next = state.beats[index + 1];
      state.time = next ? next.time : state.duration;
    } else {
      const current = state.beats[index];
      const target = current && state.time - current.time > 1 ? current : state.beats[index - 1];
      state.time = target?.time ?? 0;
    }
    publish();
  },
};

export function useProcessionClock(): ProcessionSnapshot {
  return useSyncExternalStore(processionClock.subscribe, processionClock.snapshot);
}

export function useProcessionMoving(): boolean {
  return useSyncExternalStore(processionClock.subscribe, () => snapshot.moving);
}
