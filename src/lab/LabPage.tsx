import { useEffect, useRef, useState } from "react";
import { steps } from "../liturgy/steps";
import { LiturgyScene } from "../scene/LiturgyScene";
import { cameraFor, type CameraPose } from "../scene/staging";
import { pinHolyBeat } from "../scene/holyBeat";
import type { Quality } from "../scene/quality";
import { bookmarkById, bookmarks } from "./bookmarks";
import {
  getLab,
  lightingPresets,
  setLab,
  setSystem,
  systemNames,
  useLab,
  type LightingPreset,
  type Systems,
} from "./labState";
import { readiness, renderStats } from "./SceneProbes";
import "./lab.css";

const qualities: Quality[] = ["high", "medium", "low"];

export type ShotRequest = {
  step?: string;
  bookmark?: string | null;
  /** Explicit camera, for poking at a spot that has no bookmark yet. */
  pose?: CameraPose | null;
  quality?: Quality;
  lighting?: LightingPreset;
  systems?: Partial<Systems>;
  beat?: "elevation" | "clergy";
  labels?: boolean;
};

declare global {
  interface Window {
    __lab?: {
      list: () => { steps: { id: string; title: string }[]; bookmarks: { id: string; label: string; step: string }[] };
      apply: (request: ShotRequest) => Promise<void>;
      ready: () => boolean;
      stats: () => typeof renderStats;
    };
  }
}

function initialStepIndex(params: URLSearchParams): number {
  const id = params.get("step");
  const found = steps.findIndex((step) => step.id === id);
  return found >= 0 ? found : 0;
}

function isQuality(value: string | null): value is Quality {
  return value === "high" || value === "medium" || value === "low";
}

function waitFrames(count: number): Promise<void> {
  const start = renderStats.frames;
  return new Promise((resolve) => {
    const poll = () => {
      if (renderStats.frames - start >= count) resolve();
      else window.setTimeout(poll, 16);
    };
    poll();
  });
}

async function waitSettled(): Promise<void> {
  await waitFrames(2);
  await new Promise<void>((resolve) => {
    const poll = () => {
      if (readiness.settled) resolve();
      else window.setTimeout(poll, 30);
    };
    poll();
  });
  await document.fonts.ready;
  await waitFrames(2);
}

export function LabPage() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot") === "1";
  const [index, setIndex] = useState(() => initialStepIndex(params));
  const [quality, setQuality] = useState<Quality>(() => {
    const value = params.get("quality");
    return isQuality(value) ? value : "medium";
  });
  const [bookmark, setBookmark] = useState<string | null>(() => params.get("cam"));
  const [labels, setLabels] = useState(() => params.get("labels") === "1");
  const lab = useLab();
  const step = steps[index] ?? steps[0];
  const stepRef = useRef(index);
  stepRef.current = index;

  useEffect(() => {
    const mark = bookmark ? bookmarkById(bookmark) : undefined;
    setLab({ camera: mark ? mark.pose : null });
  }, [bookmark]);

  useEffect(() => {
    if (step?.id !== "holy-things") return;
    const beat = params.get("beat");
    pinHolyBeat(beat === "clergy" ? "clergy" : "elevation");
    // Only on the first mount; the API pins later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.__lab = {
      list: () => ({
        steps: steps.map((item) => ({ id: item.id, title: item.title })),
        bookmarks: bookmarks.map((item) => ({ id: item.id, label: item.label, step: item.step })),
      }),
      ready: () => readiness.settled,
      stats: () => ({ ...renderStats }),
      apply: async (request) => {
        if (request.quality) setQuality(request.quality);
        if (request.lighting) setLab({ lighting: request.lighting });
        if (request.systems) setLab({ systems: { ...getLab().systems, ...request.systems } });
        if (request.labels !== undefined) setLabels(request.labels);
        if (request.bookmark !== undefined) {
          setBookmark(request.bookmark);
          const mark = request.bookmark ? bookmarkById(request.bookmark) : undefined;
          setLab({ camera: mark ? mark.pose : null });
        }
        if (request.pose !== undefined) setLab({ camera: request.pose });
        const target = request.step ? steps.findIndex((item) => item.id === request.step) : stepRef.current;
        if (target >= 0) setIndex(target);
        await waitFrames(2);
        if (steps[target]?.id === "holy-things") pinHolyBeat(request.beat ?? "elevation");
        await waitSettled();
      },
    };
    return () => {
      delete window.__lab;
    };
  }, []);

  if (!step) return null;
  const scene = (
    <LiturgyScene
      step={step}
      mode="follow"
      showLabels={labels}
      quality={quality}
      headBob={false}
      activeSpaces={step.spaces}
      selectedSpace={step.spaces[0] ?? "nave"}
      onSelectSpace={() => undefined}
      onInspect={() => undefined}
      onFps={() => undefined}
      reducedMotion={false}
    />
  );

  if (shot) return <div className="lab-shot">{scene}</div>;

  const pose = bookmark ? bookmarkById(bookmark)?.pose : cameraFor(step.id);
  return (
    <div className="lab">
      <aside className="lab-panel">
        <header>
          <h1>Scene lab</h1>
          <a href="./">Back to the walkthrough</a>
        </header>
        <section>
          <h2>Quality</h2>
          <div className="lab-row">
            {qualities.map((level) => (
              <button key={level} type="button" aria-pressed={quality === level} onClick={() => setQuality(level)}>
                {level}
              </button>
            ))}
          </div>
          <h2>Lighting</h2>
          <div className="lab-row">
            {lightingPresets.map((preset) => (
              <button key={preset} type="button" aria-pressed={lab.lighting === preset} onClick={() => setLab({ lighting: preset })}>
                {preset}
              </button>
            ))}
          </div>
          <h2>Systems</h2>
          <div className="lab-row">
            {systemNames.map((name) => (
              <button key={name} type="button" aria-pressed={lab.systems[name]} onClick={() => setSystem(name, !lab.systems[name])}>
                {name}
              </button>
            ))}
            <button type="button" aria-pressed={labels} onClick={() => setLabels((on) => !on)}>
              labels
            </button>
          </div>
          <h2>Time</h2>
          <div className="lab-row">
            <button
              type="button"
              aria-pressed={lab.freezeAt !== null}
              onClick={() => setLab({ freezeAt: lab.freezeAt === null ? 4 : null })}
            >
              {lab.freezeAt === null ? "running" : `frozen at ${lab.freezeAt.toFixed(1)} s`}
            </button>
            {lab.freezeAt !== null ? (
              <input
                type="range"
                min={0}
                max={30}
                step={0.1}
                value={lab.freezeAt}
                aria-label="Frozen time"
                onChange={(event) => setLab({ freezeAt: Number(event.target.value) })}
              />
            ) : null}
          </div>
        </section>
        <section>
          <h2>Camera bookmarks</h2>
          <ul className="lab-list">
            <li>
              <button type="button" aria-pressed={bookmark === null} onClick={() => setBookmark(null)}>
                Step camera
              </button>
            </li>
            {bookmarks.map((mark) => (
              <li key={mark.id}>
                <button
                  type="button"
                  aria-pressed={bookmark === mark.id}
                  onClick={() => {
                    setBookmark(mark.id);
                    const found = steps.findIndex((item) => item.id === mark.step);
                    if (found >= 0) setIndex(found);
                  }}
                >
                  {mark.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Steps</h2>
          <ol className="lab-list">
            {steps.map((item, itemIndex) => (
              <li key={item.id}>
                <button type="button" aria-pressed={itemIndex === index} onClick={() => setIndex(itemIndex)}>
                  {itemIndex + 1}. {item.title}
                </button>
              </li>
            ))}
          </ol>
        </section>
        {pose ? (
          <p className="lab-pose">
            camera [{pose.position.join(", ")}] → [{pose.target.join(", ")}]
          </p>
        ) : null}
      </aside>
      <main className="lab-stage">
        {scene}
        <StatsHud />
      </main>
    </div>
  );
}

function StatsHud() {
  const [stats, setStats] = useState(renderStats);
  useEffect(() => {
    const timer = window.setInterval(() => setStats({ ...renderStats }), 250);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <dl className="lab-hud" aria-label="Render statistics">
      <dt>FPS</dt>
      <dd>{stats.fps.toFixed(1)}</dd>
      <dt>ms</dt>
      <dd>{stats.frameMs.toFixed(1)}</dd>
      <dt>Draw calls</dt>
      <dd>{stats.calls}</dd>
      <dt>Triangles</dt>
      <dd>{stats.triangles.toLocaleString()}</dd>
      <dt>Geometries</dt>
      <dd>{stats.geometries}</dd>
      <dt>Textures</dt>
      <dd>{stats.textures}</dd>
    </dl>
  );
}
