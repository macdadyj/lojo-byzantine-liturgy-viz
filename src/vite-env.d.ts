/// <reference types="vite/client" />

type QualityName = "high" | "medium" | "low";

interface LiturgyBridge {
  setMode?: (mode: "follow" | "free") => void;
  setQuality?: (quality: QualityName) => void;
  pinQuality?: (quality: QualityName) => void;
  setHeadBob?: (on: boolean) => void;
  setStep?: (index: number) => void;
  walkTo?: (x: number, z: number, yaw: number, pitch?: number) => void;
}

interface Window {
  __liturgy?: LiturgyBridge;
  __liturgyFps?: number;
}
