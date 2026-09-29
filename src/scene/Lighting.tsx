import type { LightingPreset } from "../lab/labState";
import { Daylight, type Vec3 } from "./lighting/Daylight";
import type { Quality } from "./quality";

type Rig = {
  background: string;
  fogNear: number;
  fogFar: number;
  sky: string;
  ground: string;
  hemi: number;
  ambient: number;
  /** Toward the sun, in world space (east is −Z, south is +X). */
  sunDir: Vec3;
  sun: number;
  sunColor: string;
  fill: number;
  /** Opacity of the visible light shafts under the windows. */
  beams: number;
};

/**
 * With shadow maps, the sun only lands in window-shaped pools, so it can be strong while the room stays dim.
 * Without them (low tier, or shadows off) the sun lights every surface, so it is kept weak and the sky fill
 * carries the room instead.
 */
export function rigFor(preset: LightingPreset, quality: Quality, shadows: boolean): Rig {
  const pooled = shadows && quality !== "low";
  switch (preset) {
    case "liturgy":
      return {
        background: pooled ? "#4a3626" : "#8d7358",
        fogNear: pooled ? 16 : 22,
        fogFar: pooled ? 58 : 70,
        sky: "#f0d2a4",
        ground: "#4a382c",
        hemi: pooled ? 0.5 : quality === "low" ? 0.7 : 0.46,
        ambient: pooled ? 0.16 : quality === "low" ? 0.5 : 0.22,
        sunDir: [10, 12, -5],
        sun: pooled ? 6 : 1.2,
        sunColor: "#ffe4bf",
        fill: pooled ? 0.22 : 0.38,
        beams: pooled ? (quality === "high" ? 0.05 : 0.04) : 0.02,
      };
    case "morning":
      return {
        background: "#8f7b62",
        fogNear: 22,
        fogFar: 70,
        sky: "#e6ecf4",
        ground: "#5a4636",
        hemi: pooled ? 0.62 : 0.55,
        ambient: pooled ? 0.22 : 0.28,
        sunDir: [9, 14, -2],
        sun: pooled ? 7.5 : 2.1,
        sunColor: "#fff3e2",
        fill: 0.26,
        beams: pooled ? 0.06 : 0.02,
      };
    case "evening":
      return {
        background: "#2a1d14",
        fogNear: 12,
        fogFar: 42,
        sky: "#c89868",
        ground: "#2a1e16",
        hemi: 0.2,
        ambient: 0.08,
        sunDir: [8, 5, 7],
        sun: pooled ? 4 : 0.35,
        sunColor: "#ff9a5a",
        fill: 0.1,
        beams: pooled ? 0.05 : 0,
      };
    case "flat":
      return {
        background: "#9a9a9a",
        fogNear: 200,
        fogFar: 400,
        sky: "#ffffff",
        ground: "#9a9a9a",
        hemi: 1.1,
        ambient: 0.8,
        sunDir: [4, 18, 26],
        sun: 0.6,
        sunColor: "#ffffff",
        fill: 0.3,
        beams: 0,
      };
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}

export function Lighting({ preset, quality, shadows }: { preset: LightingPreset; quality: Quality; shadows: boolean }) {
  const pooled = shadows && quality !== "low" && preset !== "flat";
  const rig = rigFor(preset, quality, pooled);
  return (
    <>
      <color attach="background" args={[rig.background]} />
      <fog attach="fog" args={[rig.background, rig.fogNear, rig.fogFar]} />
      <hemisphereLight args={[rig.sky, rig.ground, rig.hemi]} />
      <ambientLight intensity={rig.ambient} color="#f3e0c4" />
      <Daylight
        direction={rig.sunDir}
        color={rig.sunColor}
        intensity={rig.sun}
        shadows={pooled}
        mapSize={quality === "high" ? 2048 : 1024}
        beams={rig.beams}
      />
      <directionalLight position={[6, 12, -6]} intensity={rig.fill} />
    </>
  );
}
