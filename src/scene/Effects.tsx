import { Bloom, EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Raycaster, Vector2, Vector3, type Object3D } from "three";
import { cameraFocus } from "./cameraFocus";
import { FocusBlurEffect } from "./focusBlur";
import type { IconCard } from "./iconCards";
import type { Quality } from "./quality";

export function StageLook({ quality }: { quality: Quality }) {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const previous = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = quality === "low" ? 1.18 : 1.1;
    if (quality === "low") return () => {
      gl.toneMapping = previous;
      gl.toneMappingExposure = previousExposure;
    };
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    // A dim reflection so gilding and brocade catch light without flattening the room.
    scene.environmentIntensity = 0.32;
    return () => {
      gl.toneMapping = previous;
      gl.toneMappingExposure = previousExposure;
      scene.environment = null;
      scene.environmentIntensity = 1;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, quality, scene]);
  return null;
}

export function QualityEffects({ quality, focus }: { quality: Quality; focus: boolean }) {
  if (quality === "low") return null;
  return <PictureGrade quality={quality} focus={focus} />;
}

function PictureGrade({ quality, focus }: { quality: "high" | "medium"; focus: boolean }) {
  if (quality === "medium") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur intensity={0.45} />
        <Vignette eskil={false} offset={0.2} darkness={0.5} />
      </EffectComposer>
    );
  }
  const ao = <N8AO halfRes aoSamples={8} denoiseSamples={2} aoRadius={0.85} intensity={1.3} quality="performance" />;
  const bloom = <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur intensity={0.6} />;
  const vignette = <Vignette eskil={false} offset={0.2} darkness={0.5} />;
  // Free walking has no subject to hold in focus, so the lens blur is only on in the guided view.
  return focus ? (
    <EffectComposer multisampling={0}>
      {ao}
      <FocusBlur />
      {bloom}
      {vignette}
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={0}>
      {ao}
      {bloom}
      {vignette}
    </EffectComposer>
  );
}

/**
 * A gentle lens blur that keeps the follow camera's subject sharp and softens what is far behind it or right
 * in front of the lens, like a photograph taken in a dim church.
 */
function FocusBlur() {
  const camera = useThree((state) => state.camera);
  const effect = useMemo(() => new FocusBlurEffect(), []);
  const forward = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(), []);
  useLayoutEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    camera.getWorldDirection(forward);
    effect.focus(Math.max(0.5, offset.copy(cameraFocus).sub(camera.position).dot(forward)));
  });
  return <primitive object={effect} />;
}

export function FpsProbe({ onFps }: { onFps: (fps: number) => void }) {
  const bucket = useRef({ time: 0, frames: 0 });
  useFrame((_, delta) => {
    bucket.current.time += delta;
    bucket.current.frames += 1;
    if (bucket.current.time < 0.5) return;
    onFps(bucket.current.frames / bucket.current.time);
    bucket.current.time = 0;
    bucket.current.frames = 0;
  });
  return null;
}

const raycaster = new Raycaster();
const pointer = new Vector2();

export function IconPicker({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (card: IconCard) => void;
}) {
  const { camera, scene, gl } = useThree();
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffectPick(enabled, () => {
    const element = gl.domElement;
    const pick = (x: number, y: number) => {
      const rect = element.getBoundingClientRect();
      pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const card = findCard(hit.object);
        if (card) {
          onPickRef.current(card);
          return;
        }
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!enabled) return;
      pick(event.clientX, event.clientY);
    };
    const onKey = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (event.key !== "e" && event.key !== "E") return;
      pointer.set(0, 0);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const card = findCard(hit.object);
        if (card) {
          onPickRef.current(card);
          return;
        }
      }
    };
    element.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      element.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  });
  return null;
}

function useEffectPick(enabled: boolean, effect: () => (() => void) | void) {
  const { gl, camera, scene } = useThree();
  useLayoutEffect(() => {
    if (!enabled) return;
    return effect();
    // The picker closes over the live camera and scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, enabled, gl, scene]);
}

function findCard(object: Object3D): IconCard | null {
  let current: Object3D | null = object;
  while (current) {
    const card = current.userData.icon as IconCard | undefined;
    if (card && typeof card.title === "string") return card;
    current = current.parent;
  }
  return null;
}
