import { Bloom, EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { ACESFilmicToneMapping, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Raycaster, Vector2, type Object3D } from "three";
import type { IconCard } from "./iconCards";
import type { Quality } from "./quality";

export function StageLook({ quality }: { quality: Quality }) {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const previous = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = quality === "low" ? 1.18 : 1.0;
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

export function QualityEffects({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  return <PictureGrade quality={quality} />;
}

function PictureGrade({ quality }: { quality: "high" | "medium" }) {
  if (quality === "medium") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur intensity={0.4} />
        <Vignette eskil={false} offset={0.2} darkness={0.5} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes aoSamples={8} denoiseSamples={2} aoRadius={0.85} intensity={1.3} quality="performance" />
      <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur intensity={0.55} />
      <Vignette eskil={false} offset={0.2} darkness={0.5} />
    </EffectComposer>
  );
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
