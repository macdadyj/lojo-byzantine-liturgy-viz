import { useEffect, useMemo } from "react";
import type { Camera } from "three";
import { touchLook } from "./Walker";

const maxYaw = 1.3;
const maxPitch = 0.6;

export type LookOffset = {
  /** Turns the camera by the finger's offset after the follow camera has aimed it. */
  apply: (camera: Camera, delta: number, reducedMotion: boolean) => void;
  /** Eases the offset back to zero, so a new step is seen as it was framed. */
  release: () => void;
};

/**
 * One finger on the church in Follow liturgy turns the view around the camera without leaving the step;
 * Next (a new pose) turns it back. Mouse drags are ignored, so the desktop behaves as before.
 */
export function useFollowLook(element: HTMLElement, enabled: boolean): LookOffset {
  const state = useMemo(() => ({ yaw: 0, pitch: 0, returning: false, finger: null as { id: number; x: number; y: number } | null }), []);

  useEffect(() => {
    if (!enabled) {
      state.yaw = 0;
      state.pitch = 0;
      return;
    }
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || state.finger) return;
      state.finger = { id: event.pointerId, x: event.clientX, y: event.clientY };
      state.returning = false;
    };
    const onMove = (event: PointerEvent) => {
      const finger = state.finger;
      if (!finger || finger.id !== event.pointerId) return;
      state.yaw = clamp(state.yaw - (event.clientX - finger.x) * touchLook, maxYaw);
      state.pitch = clamp(state.pitch - (event.clientY - finger.y) * touchLook, maxPitch);
      finger.x = event.clientX;
      finger.y = event.clientY;
    };
    const onUp = (event: PointerEvent) => {
      if (state.finger?.id === event.pointerId) state.finger = null;
    };
    element.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      state.finger = null;
    };
  }, [element, enabled, state]);

  return useMemo(
    () => ({
      apply(camera, delta, reducedMotion) {
        if (state.returning && !state.finger) {
          const k = reducedMotion ? 1 : 1 - Math.exp(-delta * 3);
          state.yaw -= state.yaw * k;
          state.pitch -= state.pitch * k;
          if (Math.abs(state.yaw) + Math.abs(state.pitch) < 1e-3) {
            state.yaw = 0;
            state.pitch = 0;
            state.returning = false;
          }
        }
        if (state.yaw === 0 && state.pitch === 0) return;
        camera.rotateY(state.yaw);
        camera.rotateX(state.pitch);
      },
      release() {
        state.returning = true;
      },
    }),
    [state],
  );
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
