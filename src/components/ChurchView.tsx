import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deviceTraits, probeGpu } from "../device";
import { describeError, diagnostics, mark, noteError, report } from "../diagnostics";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep } from "../liturgy/types";
import { iconCards, tourStops, type IconCard } from "../scene/iconCards";
import type { LookMode } from "../scene/LiturgyScene";
import { chooseTier, isLower, nextQuality, type Quality, type TierChoice } from "../scene/quality";
import type { SceneProgress } from "../scene/SceneStage";
import { requestWalk } from "../scene/walkGoal";
import { ErrorBoundary } from "./ErrorBoundary";
import { Joystick } from "./Joystick";
import { SceneFallback } from "./SceneFallback";

function loadSceneStage() {
  return import("../scene/SceneStage").then((module) => {
    mark("sceneChunk");
    return module;
  });
}

const SceneStage = lazy(loadSceneStage);

type ChurchViewProps = {
  step: LiturgyStep;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
  onLookMode?: (mode: LookMode) => void;
  /** Phone layout: fewer, larger controls, with picture settings behind one button. */
  compact?: boolean;
  /** Hidden behind the phone's Text view: stop drawing but keep the church loaded. */
  paused?: boolean;
};

const cast = [
  { label: "Priest", color: "#722433" },
  { label: "Deacon", color: "#e7dcc8" },
  { label: "Reader", color: "#2a2e36" },
  { label: "Choir", color: "#4a3a28" },
  { label: "Faithful", color: "#3d4a62" },
];

const qualities: Quality[] = ["high", "medium", "low"];

/** Frame-rate samples during loading measure texture uploads and shader compiles, not the scene. */
const settleMs = 2500;

type Stage =
  | { kind: "waiting" }
  | { kind: "loading" }
  | { kind: "running" }
  | { kind: "failed"; title: string; detail: string; retry: boolean };

export function ChurchView({
  step,
  activeSpaces,
  selectedSpace,
  onSelectSpace,
  onLookMode,
  compact = false,
  paused = false,
}: ChurchViewProps) {
  const [mode, setMode] = useState<LookMode>("follow");
  // Place labels crowd each other in a narrow view; phones turn them on from View.
  const [showLabels, setShowLabels] = useState(!compact);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tier, setTier] = useState<TierChoice | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [ceiling, setCeiling] = useState<Quality>("high");
  const [pinned, setPinned] = useState(false);
  const [headBob, setHeadBob] = useState(false);
  const [icon, setIcon] = useState<IconCard | null>(null);
  const [tour, setTour] = useState(0);
  const [touch, setTouch] = useState(false);
  const [handheld, setHandheld] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "waiting" });
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<SceneProgress>({ loaded: 0, total: 0, active: false });
  const [framed, setFramed] = useState(false);
  const [lost, setLost] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [touchedView, setTouchedView] = useState(false);
  const samples = useRef<number[]>([]);
  const settledAt = useRef<number | null>(null);
  // A failed chunk download stays failed inside React.lazy, so each retry gets a fresh loader.
  const Stage = useMemo(() => (attempt === 0 ? SceneStage : lazy(loadSceneStage)), [attempt]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: coarse)");
    const sync = () => {
      setReducedMotion(motion.matches);
      setTouch(pointer.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    pointer.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      pointer.removeEventListener("change", sync);
    };
  }, []);

  // Probe the GPU and pick a tier only after the text has painted, then fetch the 3D chunk.
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled) return;
        const gpu = probeGpu();
        const traits = deviceTraits(gpu);
        const choice = chooseTier(traits, new URLSearchParams(window.location.search).get("quality"));
        report({ gpu, tier: choice.quality, tierReason: choice.reason, ceiling: choice.ceiling, quality: choice.quality });
        setTier(choice);
        setQuality(choice.quality);
        setCeiling(choice.ceiling);
        setHandheld(traits.phone || traits.tablet);
        if (!gpu.webgl2) {
          noteError(`WebGL2 unavailable: ${gpu.failure ?? "unknown reason"}`);
          setStage({
            kind: "failed",
            title: "This browser could not start the 3D church, so here are pictures of it instead.",
            detail: `WebGL2 is not available.\n${gpu.failure ?? ""}\n${navigator.userAgent}`,
            retry: false,
          });
          return;
        }
        mark("sceneRequested");
        setStage({ kind: "loading" });
      }),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    report({ quality });
  }, [quality]);

  useEffect(() => {
    setIcon(null);
  }, [step.id]);

  useEffect(() => {
    onLookMode?.(mode);
  }, [mode, onLookMode]);

  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    root.dataset.expanded = "1";
    const onFullscreen = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      delete root.dataset.expanded;
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [expanded]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.setMode = (next) => {
      setMode(next);
      setIcon(null);
    };
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

  const loading = progress.active || progress.loaded < progress.total;
  useEffect(() => {
    if (framed && !loading && settledAt.current === null) settledAt.current = performance.now();
  }, [framed, loading]);

  function onFps(fps: number) {
    window.__liturgyFps = fps;
    if (pinned || settledAt.current === null || performance.now() - settledAt.current < settleMs) return;
    samples.current.push(fps);
    if (samples.current.length < 4) return;
    const average = samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length;
    samples.current = [];
    const next = nextQuality(quality, average, ceiling);
    if (next === quality) return;
    // Once Auto steps down it does not climb back: each switch recompiles every shader.
    if (isLower(next, quality)) setCeiling(next);
    setQuality(next);
  }

  function chooseMode(next: LookMode) {
    setMode(next);
    setIcon(null);
  }

  function startTour() {
    const stop = tourStops[tour % tourStops.length];
    if (!stop) return;
    setMode("free");
    setIcon(iconCards[stop.id]);
    requestWalk(stop.x, stop.z, stop.yaw, stop.pitch);
    setTour((current) => current + 1);
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const retry = useCallback(() => {
    setQuality("low");
    setCeiling("low");
    setPinned(true);
    setLost(false);
    setFramed(false);
    setProgress({ loaded: 0, total: 0, active: false });
    settledAt.current = null;
    setAttempt((current) => current + 1);
    setStage({ kind: "loading" });
  }, []);

  const showPictures = useCallback((title: string, detail: string) => {
    setStage({ kind: "failed", title, detail, retry: true });
  }, []);

  // A lost context that does not come back within a few seconds is treated as a failure.
  useEffect(() => {
    if (!lost) return;
    const timer = window.setTimeout(
      () =>
        showPictures(
          "The 3D church stopped because the phone reclaimed its graphics memory. Here are pictures instead.",
          `WebGL context lost ${diagnostics.contextLost} time(s) at quality ${quality}.\n${navigator.userAgent}`,
        ),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [lost, quality, showPictures]);

  const walkHint = touch
    ? "Drag the picture to look. Move with the thumb stick."
    : "Drag to look. Walk with WASD. Arrow keys walk here; Home and End change the step. Press E on an icon.";
  const running = stage.kind === "loading" || stage.kind === "running";
  const classes = ["church-view", mode === "free" ? "is-free" : "", expanded ? "is-expanded" : "", compact ? "is-compact" : ""]
    .filter(Boolean)
    .join(" ");

  const qualityButtons = (
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
        onClick={() => {
          setPinned(false);
          if (tier) setCeiling(tier.ceiling);
        }}
      >
        Auto
      </button>
      {mode === "free" ? (
        <button type="button" aria-pressed={headBob} onClick={() => setHeadBob((current) => !current)}>
          Head bob
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={classes}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" && event.target instanceof HTMLCanvasElement) setTouchedView(true);
      }}
    >
      {running && tier ? (
        <ErrorBoundary
          resetKey={attempt}
          fallback={(error, detail) => (
            <FailureReport
              error={error}
              detail={detail}
              onReport={(message) => showPictures("The 3D church hit an error, so here are pictures of it instead.", message)}
            />
          )}
        >
          <Suspense fallback={null}>
            <Stage
              key={attempt}
              step={step}
              mode={mode}
              activeSpaces={activeSpaces}
              selectedSpace={selectedSpace}
              onSelectSpace={onSelectSpace}
              showLabels={showLabels}
              reducedMotion={reducedMotion}
              quality={quality}
              headBob={headBob}
              handheld={handheld}
              paused={paused}
              onInspect={setIcon}
              onFps={onFps}
              onFirstFrame={() => {
                setFramed(true);
                setStage({ kind: "running" });
              }}
              onProgress={setProgress}
              onContextLost={setLost}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {stage.kind === "failed" ? (
        <SceneFallback step={step} title={stage.title} detail={stage.detail} onRetry={stage.retry ? retry : undefined} />
      ) : (
        <LoadGate framed={framed} progress={progress} requested={stage.kind !== "waiting"} />
      )}
      {lost && stage.kind !== "failed" ? (
        <div className="scene-notice" role="alert">
          <p>The 3D view was interrupted. Trying to get it back…</p>
        </div>
      ) : null}
      {stage.kind !== "failed" ? (
        <>
          <div className="view-bar">
            <button type="button" aria-pressed={mode === "follow"} onClick={() => chooseMode("follow")}>
              Follow liturgy
            </button>
            <button type="button" aria-pressed={mode === "free"} onClick={() => chooseMode("free")}>
              Free look
            </button>
            {compact ? null : (
              <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>
                Labels
              </button>
            )}
            {mode === "free" ? (
              <button type="button" onClick={startTour}>
                Icon tour
              </button>
            ) : null}
          </div>
          <div className="corner-bar">
            {/* The phone's 3D view already fills the screen. */}
            {compact ? (
              <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
                View
              </button>
            ) : (
              <button type="button" aria-pressed={expanded} onClick={toggleExpanded} aria-label={expanded ? "Leave full screen" : "Full screen"}>
                {expanded ? "Close" : "Expand"}
              </button>
            )}
          </div>
          {compact ? (
            settingsOpen ? (
              <div className="view-sheet" role="dialog" aria-label="Picture settings">
                <p className="view-sheet-title">Picture quality</p>
                {qualityButtons}
                <div className="quality-bar">
                  <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)}>
                    Labels
                  </button>
                </div>
                <CastKey />
              </div>
            ) : null
          ) : (
            qualityButtons
          )}
          {mode === "free" ? <p className="walk-hint">{walkHint}</p> : null}
          {mode === "follow" && touch && framed && !touchedView ? (
            <p className="walk-hint look-hint">Drag the church to look around. Next turns it back.</p>
          ) : null}
          {icon ? <IconPanel card={icon} onClose={() => setIcon(null)} /> : null}
          {mode === "free" && touch ? <Joystick /> : null}
          {compact ? null : <CastKey />}
        </>
      ) : null}
    </div>
  );
}

/** Records the error once, then shows the pictures in place of the scene. */
function FailureReport({ error, detail, onReport }: { error: unknown; detail: string; onReport: (message: string) => void }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    onReport(`${detail || describeError(error)}\n${navigator.userAgent}`);
  }, [detail, error, onReport]);
  return null;
}

function CastKey() {
  return (
    <ul className="cast-key" aria-label="Who is in the church">
      {cast.map((person) => (
        <li key={person.label}>
          <span className="cast-swatch" style={{ background: person.color }} />
          {person.label}
        </li>
      ))}
    </ul>
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

/**
 * Covers the view until the first frame is on screen, with what is happening in words: fetching the 3D code,
 * then preparing the church. After that, icon loading is a small pill so the church can be used meanwhile.
 */
function LoadGate({ framed, progress, requested }: { framed: boolean; progress: SceneProgress; requested: boolean }) {
  const textures = progress.total > 0 ? progress.loaded / progress.total : 0;
  const busy = progress.active || progress.loaded < progress.total;
  if (framed) {
    if (!busy) return null;
    return (
      <div className="load-pill" role="status">
        Loading icons {progress.loaded} of {progress.total}
      </div>
    );
  }
  const phase = !requested ? "Opening the church" : progress.total === 0 ? "Downloading the 3D church" : "Preparing the church";
  // Code and first frame are the first half of the bar; icons fill the rest.
  const width = !requested ? 8 : progress.total === 0 ? 30 : 45 + textures * 50;
  return (
    <div className="load-gate" role="status">
      <p>{phase}</p>
      <div className="load-track" aria-hidden="true">
        <span style={{ width: `${Math.round(width)}%` }} />
      </div>
      <p className="load-note">The steps and their words already work.</p>
    </div>
  );
}
