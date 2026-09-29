import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";

export type RenderStats = {
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  frames: number;
};

export const renderStats: RenderStats = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0, frames: 0 };

/** Holds the R3F clock at a fixed time so every capture sees the same pose, flame, and door. */
export function LabClock({ freezeAt }: { freezeAt: number | null }) {
  const clock = useThree((state) => state.clock);
  useLayoutEffect(() => {
    if (freezeAt === null) return;
    const getDelta = clock.getDelta;
    const getElapsedTime = clock.getElapsedTime;
    clock.elapsedTime = freezeAt;
    clock.getDelta = () => 0;
    clock.getElapsedTime = () => freezeAt;
    return () => {
      clock.getDelta = getDelta;
      clock.getElapsedTime = getElapsedTime;
    };
  }, [clock, freezeAt]);
  return null;
}

/**
 * Totals every pass of the previous frame (the composer renders several).
 * Runs first in the frame, so it reads the finished totals before resetting.
 */
export function StatsProbe() {
  const gl = useThree((state) => state.gl);
  const bucket = useRef({ time: 0, frames: 0, last: performance.now() });
  useLayoutEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);
  useFrame(() => {
    const now = performance.now();
    const b = bucket.current;
    const wall = now - b.last;
    b.last = now;
    b.time += wall;
    b.frames += 1;
    renderStats.frames += 1;
    renderStats.calls = gl.info.render.calls;
    renderStats.triangles = gl.info.render.triangles;
    renderStats.geometries = gl.info.memory.geometries;
    renderStats.textures = gl.info.memory.textures;
    if (b.time >= 500) {
      renderStats.fps = (b.frames * 1000) / b.time;
      renderStats.frameMs = b.time / b.frames;
      b.time = 0;
      b.frames = 0;
    }
    gl.info.reset();
  }, -1000);
  return null;
}

/** Frame count at which loading last finished. Mounted inside Suspense so it only runs once assets exist. */
export const readiness = { loadedAtFrame: -1, settled: false };

export function ReadySignal() {
  const { active, progress } = useProgress();
  const idle = !active && (progress === 100 || progress === 0);
  useFrame(() => {
    if (!idle) {
      readiness.loadedAtFrame = -1;
      readiness.settled = false;
      return;
    }
    if (readiness.loadedAtFrame < 0) readiness.loadedAtFrame = renderStats.frames;
    readiness.settled = renderStats.frames - readiness.loadedAtFrame >= 2;
  });
  return null;
}
