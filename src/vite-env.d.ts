/// <reference types="vite/client" />

type QualityName = "high" | "medium" | "low";

interface LiturgyBridge {
  setMode?: (mode: "follow" | "free") => void;
  setQuality?: (quality: QualityName) => void;
  pinQuality?: (quality: QualityName) => void;
  setHeadBob?: (on: boolean) => void;
  setStep?: (index: number) => void;
  setCamera?: (position: [number, number, number], target: [number, number, number]) => void;
  clearCamera?: () => void;
  cameraAt?: () => number[];
  measureSoles?: () => { x: number; z: number; sole: number; floor: number; gap: number; hip: number }[];
  measureDoors?: () => { curtain: number | null; curtainWorld: number | null; royal: number | null };
  receiving?: boolean;
  holy?: () => {
    enteredAt: number | null;
    pin: "elevation" | "clergy" | null;
    beat: "off" | "elevation" | "clergy";
    elapsed: number | null;
  };
  /** Pins the procession to a fraction of its whole timeline. */
  marchT?: number;
  procession?: {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setSpeed: (speed: 0.25 | 0.5 | 1 | 2) => void;
    stepBeat: (direction: -1 | 1) => void;
    now: () => number;
    snapshot: () => {
      route: string | null;
      time: number;
      duration: number;
      playing: boolean;
      moving: boolean;
      speed: number;
      beats: readonly { label: string; time: number }[];
      beat: number;
    };
  };
  walkTo?: (x: number, z: number, yaw: number, pitch?: number) => void;
}

interface Window {
  __liturgy?: LiturgyBridge;
  __liturgyFps?: number;
}
