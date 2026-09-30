import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { smokeTexture } from "../materials/paint";
import { mulberry32 } from "../random";

type Puff = { x: number; y: number; z: number; size: number; spin: number; drift: number; phase: number };

/** Where incense hangs after censing: thick in the sanctuary and before the icon screen, thin over the nave. */
function planPuffs(count: number): Puff[] {
  const random = mulberry32(4242);
  const puffs: Puff[] = [];
  for (let index = 0; index < count; index += 1) {
    const zone = random();
    const inSanctuary = zone < 0.4;
    const beforeScreen = zone >= 0.4 && zone < 0.7;
    const x = (random() - 0.5) * (inSanctuary ? 9 : beforeScreen ? 12 : 16);
    const z = inSanctuary ? -12 - random() * 5 : beforeScreen ? -7.5 + random() * 3 : -4 + random() * 18;
    const y = inSanctuary ? 1.8 + random() * 4 : 2.6 + random() * 6;
    puffs.push({ x, y, z, size: 3 + random() * 4, spin: (random() - 0.5) * 0.04, drift: 0.05 + random() * 0.08, phase: random() * Math.PI * 2 });
  }
  return puffs;
}

const matrix = new Matrix4();
const rotation = new Quaternion();
const scale = new Vector3();
const place = new Vector3();
const forward = new Vector3(0, 0, 1);

/** Camera-facing smoke sheets drawn in one instanced call; they turn slowly and drift upward. */
export function IncenseHaze({ count = 26, opacity = 0.16 }: { count?: number; opacity?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const puffs = useMemo(() => planPuffs(count), [count]);
  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: smokeTexture(),
        color: "#f3e3c8",
        transparent: true,
        opacity,
        depthWrite: false,
        side: DoubleSide,
      }),
    [opacity],
  );
  useLayoutEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = state.clock.elapsedTime;
    const camera = state.camera;
    puffs.forEach((puff, index) => {
      place.set(puff.x + Math.sin(time * 0.05 + puff.phase) * 0.6, puff.y + ((time * puff.drift + puff.phase) % 1.5), puff.z);
      rotation.copy(camera.quaternion);
      rotation.multiply(new Quaternion().setFromAxisAngle(forward, puff.phase + time * puff.spin));
      scale.set(puff.size, puff.size * 0.7, 1);
      matrix.compose(place, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, puffs.length]} frustumCulled={false} renderOrder={6} />;
}
