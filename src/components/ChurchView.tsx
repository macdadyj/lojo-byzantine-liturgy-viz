import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep } from "../liturgy/types";
import { iconCards, type IconCard } from "../scene/iconCards";
import { LiturgyScene, type LookMode } from "../scene/LiturgyScene";
import { nextQuality, type Quality } from "../scene/quality";
import { requestWalk, walkStick } from "../scene/walkGoal";
import { tourStops } from "../scene/Frescoes";

type ChurchViewProps = {
  step: LiturgyStep;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

const cast = [
  { label: "Priest", color: "#722433" },
  { label: "Deacon", color: "#1f4a3c" },
  { label: "Reader", color: "#3c3848" },
  { label: "Choir", color: "#4a3a28" },
  { label: "Faithful", color: "#2c3c55" },
];

const qualities: Quality[] = ["high", "medium", "low"];

export function ChurchView({ step, activeSpaces, selectedSpace, onSelectSpace }: ChurchViewProps) {
  const [mode, setMode] = useState<LookMode>("follow");
  const [showLabels, setShowLabels] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quality, setQuality] = useState<Quality>("medium");
  const [pinned, setPinned] = useState(false);
  const [headBob, setHeadBob] = useState(true);
  const [icon, setIcon] = useState<IconCard | null>(null);
  const [tour, setTour] = useState(0);
  const [coarse, setCoarse] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const samples = useRef<number[]>([]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: coarse)");
    const width = window.matchMedia("(max-width: 720px)");
    const sync = () => {
      setReducedMotion(motion.matches);
      setCoarse(pointer.matches);
      setNarrow(width.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    pointer.addEventListener("change", sync);
    width.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      pointer.removeEventListener("change", sync);
      width.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.setMode = setMode;
    bridge.setQuality = (next) => {
      setPinned(false);
      setQuality(next);
    };
    bridge.pinQuality = (next) => {
      setPinned(true);
      setQuality(next);
    };
    bridge.setHeadBob = setHeadBob;
    window.__liturgy = bridge;
  }, []);

  function onFps(fps: number) {
    window.__liturgyFps = fps;
    if (pinned) return;
    samples.current.push(fps);
    if (samples.current.length < 4) return;
    const average = samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length;
    samples.current = [];
    setQuality((current) => nextQuality(current, average));
  }

  function startTour() {
    const stop = tourStops[tour % tourStops.length];
    if (!stop) return;
    setMode("free");
    setIcon(iconCards[stop.id]);
    requestWalk(stop.x, stop.z, stop.yaw, stop.pitch);
    setTour((current) => current + 1);
  }

  return (
    <div className="church-view">
      <LiturgyScene
        step={step}
        mode={mode}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
        showLabels={showLabels}
        reducedMotion={reducedMotion}
        quality={quality}
        headBob={headBob}
        onInspect={setIcon}
        onFps={onFps}
      />
      <LoadGate />
      <div className="view-bar">
        <button type="button" aria-pressed={mode === "follow"} onClick={() => setMode("follow")}>
          Follow liturgy
        </button>
        <button type="button" aria-pressed={mode === "free"} onClick={() => setMode("free")}>
          Free look
        </button>
        <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>
          Labels
        </button>
        {mode === "free" ? (
          <button type="button" onClick={startTour}>
            Icon tour
          </button>
        ) : null}
      </div>
      <div className="quality-bar" role="group" aria-label="Picture quality">
        {qualities.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={quality === level}
            onClick={() => {
              setPinned(true);
              setQuality(level);
            }}
          >
            {labelFor(level)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={!pinned}
          onClick={() => setPinned(false)}
        >
          Auto
        </button>
        {mode === "free" ? (
          <button type="button" aria-pressed={headBob} onClick={() => setHeadBob((current) => !current)}>
            Head bob
          </button>
        ) : null}
      </div>
      {mode === "free" ? (
        <p className="walk-hint">Click the church, then walk with WASD or the arrow keys. Press E on an icon.</p>
      ) : null}
      {icon ? <IconPanel card={icon} onClose={() => setIcon(null)} /> : null}
      {mode === "free" && (coarse || narrow) ? <Joystick /> : null}
      <ul className="cast-key" aria-label="Who is in the church">
        {cast.map((person) => (
          <li key={person.label}>
            <span className="cast-swatch" style={{ background: person.color }} />
            {person.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function labelFor(quality: Quality): string {
  switch (quality) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default: {
      const exhaustive: never = quality;
      return exhaustive;
    }
  }
}

function IconPanel({ card, onClose }: { card: IconCard; onClose: () => void }) {
  return (
    <aside className="icon-panel">
      <button type="button" className="icon-close" onClick={onClose} aria-label="Close icon note">
        Close
      </button>
      <h2>{card.title}</h2>
      <p className="icon-subject">{card.subject}</p>
      <p>{card.text}</p>
      <p className="icon-credit">{card.credit}</p>
    </aside>
  );
}

function Joystick() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="joystick"
      onPointerDown={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = origin.current;
        if (!start) return;
        walkStick.x = Math.min(1, Math.max(-1, (event.clientX - start.x) / 48));
        walkStick.y = Math.min(1, Math.max(-1, (start.y - event.clientY) / 48));
      }}
      onPointerUp={() => {
        origin.current = null;
        walkStick.x = 0;
        walkStick.y = 0;
      }}
    >
      <span>Move</span>
    </div>
  );
}

function LoadGate() {
  const { active, progress } = useProgress();
  const [hold, setHold] = useState(true);
  useEffect(() => {
    if (active || progress < 100) {
      setHold(true);
      return;
    }
    const timer = window.setTimeout(() => setHold(false), 280);
    return () => window.clearTimeout(timer);
  }, [active, progress]);
  if (!hold) return null;
  const width = Math.max(6, Math.min(100, progress));
  return (
    <div className="load-gate" role="status">
      <p>Opening the church</p>
      <div className="load-track" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
