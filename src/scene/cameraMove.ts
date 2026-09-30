import type { Vec3 } from "./path";
import type { CameraPose } from "./staging";
import { world } from "./world";

/** How the follow camera travels to a new step's pose. */
export type CameraMove = "snap" | "glide" | "dip";

/** Longest straight move that still reads as one continuous shot. */
export const glideLimit = 7;
export const glideSeconds = 1.25;
/** Dip to dark: fade out, cut while dark, fade back in. */
export const dipOutMs = 170;
export const dipInMs = 420;

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Pews fill the nave floor from here westward; a low eye crossing them would clip pew backs and heads. */
const pewEast = -3.4;
const pewEyeFloor = 1.35;

function crossesPews(from: Vec3, to: Vec3): boolean {
  const low = Math.min(from[1], to[1]) < pewEyeFloor;
  const west = Math.max(from[2], to[2]) > pewEast;
  const sideways = Math.abs(from[0] - to[0]) > 1.2;
  return low && west && sideways;
}

/**
 * Glide when the new pose is near and the straight line stays in one room: it must not pass through the
 * iconostas or sweep sideways across the pews at seated eye height. Otherwise dip, which never shows the path.
 */
export function planMove(from: CameraPose, to: CameraPose, reducedMotion: boolean): CameraMove {
  if (reducedMotion) return "snap";
  const moved = distance(from.position, to.position);
  const turned = distance(from.target, to.target);
  if (moved < 0.02 && turned < 0.02) return "snap";
  const iconostas = world.iconZ;
  const sideOf = (z: number) => Math.sign(z - iconostas);
  const sameRoom = sideOf(from.position[2]) === sideOf(to.position[2]);
  if (moved <= glideLimit && sameRoom && !crossesPews(from.position, to.position)) return "glide";
  return "dip";
}

/** Smootherstep: zero velocity and acceleration at both ends. */
export function easeGlide(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}
