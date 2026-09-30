import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef, type ComponentProps } from "react";
import { diagnostics, mark, noteError, report } from "../diagnostics";
import { renderStats } from "../lab/SceneProbes";
import { LiturgyScene } from "./LiturgyScene";

export type SceneProgress = { loaded: number; total: number; active: boolean };

type SceneStageProps = Omit<ComponentProps<typeof LiturgyScene>, "children"> & {
  onFirstFrame: () => void;
  onProgress: (progress: SceneProgress) => void;
  onContextLost: (lost: boolean) => void;
};

/** The whole 3D church, loaded as its own chunk after the page and its text are already on screen. */
export default function SceneStage({ onFirstFrame, onProgress, onContextLost, ...scene }: SceneStageProps) {
  const { active, loaded, total } = useProgress();
  const framed = useRef(false);
  // The church always loads its icons, so "nothing requested yet" is not finished.
  const idle = !active && total > 0 && loaded >= total;
  const idleRef = useRef(idle);
  idleRef.current = idle;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    onProgressRef.current({ loaded, total, active });
    if (framed.current && idle) mark("sceneReady");
  }, [active, idle, loaded, total]);

  return (
    <LiturgyScene {...scene}>
      <FirstFrame
        onFrame={() => {
          framed.current = true;
          if (idleRef.current) mark("sceneReady");
          onFirstFrame();
        }}
      />
      <RenderReport />
      <ContextWatch onChange={onContextLost} />
    </LiturgyScene>
  );
}

/** Fires once, on the first frame that actually reached the screen. */
function FirstFrame({ onFrame }: { onFrame: () => void }) {
  const done = useRef(false);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => {
      mark("firstFrame");
      onFrameRef.current();
    });
  });
  return null;
}

/** Twice a second: frame rate, draw calls, shader programs, textures, and the drawing buffer size. */
function RenderReport() {
  const gl = useThree((state) => state.gl);
  const bucket = useRef({ last: performance.now(), frames: 0 });
  useFrame(() => {
    const b = bucket.current;
    b.frames += 1;
    const now = performance.now();
    if (now - b.last < 500) return;
    report({
      render: {
        fps: Math.round((b.frames * 1000) / (now - b.last)),
        // StatsProbe resets gl.info first thing each frame and keeps the finished totals of the last one.
        calls: renderStats.calls,
        triangles: renderStats.triangles,
        programs: gl.info.programs?.length ?? 0,
        textures: gl.info.memory.textures,
        geometries: gl.info.memory.geometries,
        width: gl.domElement.width,
        height: gl.domElement.height,
        pixelRatio: Number(gl.getPixelRatio().toFixed(2)),
      },
    });
    b.last = now;
    b.frames = 0;
  });
  return null;
}

/** iOS drops WebGL contexts under memory pressure; three.js asks for them back, and the page says what happened. */
function ContextWatch({ onChange }: { onChange: (lost: boolean) => void }) {
  const canvas = useThree((state) => state.gl.domElement);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useLayoutEffect(() => {
    const lost = () => {
      report({ contextLost: diagnostics.contextLost + 1 });
      noteError("WebGL context lost (the GPU or the browser reclaimed it).");
      onChangeRef.current(true);
    };
    const restored = () => onChangeRef.current(false);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [canvas]);
  return null;
}
