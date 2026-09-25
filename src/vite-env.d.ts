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
  measureSoles?: () => { x: number; z: number; sole: number; floor: number; gap: number; hip: number }[];
  measureDoors?: () => { curtain: number | null; curtainWorld: number | null; royal: number | null };
  receiving?: boolean;
  marchT?: number;
  walkTo?: (x: number, z: number, yaw: number, pitch?: number) => void;
}

interface Window {
  __liturgy?: LiturgyBridge;
  __liturgyFps?: number;
}
