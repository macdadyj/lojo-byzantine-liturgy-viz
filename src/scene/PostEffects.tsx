import { Bloom, EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import { Vector3 } from "three";
import { cameraFocus } from "./cameraFocus";
import { FocusBlurEffect } from "./focusBlur";
import type { Quality } from "./quality";

/** Loaded on demand from LiturgyScene, so the Low tier (every phone) never downloads `postprocessing`. */
export default function QualityEffects({ quality, focus }: { quality: Quality; focus: boolean }) {
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

