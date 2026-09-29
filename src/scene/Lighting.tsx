import type { LightingPreset } from "../lab/labState";
import type { Quality } from "./quality";

type Rig = {
  background: string;
  fogNear: number;
  fogFar: number;
  sky: string;
  ground: string;
  hemi: number;
  ambient: number;
  sun: number;
  sunColor: string;
  fill: number;
};

export function rigFor(preset: LightingPreset, quality: Quality): Rig {
  const dim = quality === "low";
  switch (preset) {
    case "liturgy":
      return {
        background: dim ? "#b9a48c" : "#8d7358",
        fogNear: dim ? 26 : 18,
        fogFar: dim ? 80 : 56,
        sky: "#f0d2a4",
        ground: "#4a382c",
        hemi: dim ? 0.7 : 0.42,
        ambient: dim ? 0.5 : 0.22,
        sun: 1.35,
        sunColor: "#ffffff",
        fill: 0.38,
      };
    case "morning":
      return {
        background: "#a99478",
        fogNear: 22,
        fogFar: 70,
        sky: "#e6ecf4",
        ground: "#5a4636",
        hemi: 0.55,
        ambient: 0.28,
        sun: 2.1,
        sunColor: "#fff1dc",
        fill: 0.3,
      };
    case "evening":
      return {
        background: "#3a2a1e",
        fogNear: 14,
        fogFar: 44,
        sky: "#c89868",
        ground: "#2a1e16",
        hemi: 0.22,
        ambient: 0.1,
        sun: 0.35,
        sunColor: "#ff9a5a",
        fill: 0.12,
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
        sun: 0.6,
        sunColor: "#ffffff",
        fill: 0.3,
      };
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}

export function Lighting({ preset, quality }: { preset: LightingPreset; quality: Quality }) {
  const rig = rigFor(preset, quality);
  return (
    <>
      <color attach="background" args={[rig.background]} />
      <fog attach="fog" args={[rig.background, rig.fogNear, rig.fogFar]} />
      <hemisphereLight args={[rig.sky, rig.ground, rig.hemi]} />
      <ambientLight intensity={rig.ambient} color="#f3e0c4" />
      <directionalLight position={[-4, 18, 26]} intensity={rig.sun} color={rig.sunColor} />
      <directionalLight position={[6, 12, -6]} intensity={rig.fill} />
    </>
  );
}
