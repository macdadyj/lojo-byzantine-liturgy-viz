import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, ExtrudeGeometry, InstancedMesh, Matrix4, Shape, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pewBanks, pewRows } from "../crowdLayout";
import { woodTexture } from "../materials/paint";

/** Seat centered on z = 0, backrest to the west (+Z), kneeler for the row behind on the back. */
function pewGeometry(width: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, tilt = 0) => {
    const geometry = new BoxGeometry(w, h, d);
    if (tilt) geometry.rotateX(tilt);
    geometry.translate(x, y, z);
    parts.push(geometry);
  };
  box(width, 0.05, 0.46, 0, 0.44, -0.02);
  box(width, 0.045, 0.06, 0, 0.415, -0.24);
  box(width, 0.5, 0.04, 0, 0.74, 0.22, -0.12);
  box(width + 0.02, 0.05, 0.1, 0, 1.0, 0.25);
  box(width, 0.3, 0.035, 0, 0.3, 0.2);
  box(width, 0.05, 0.16, 0, 0.9, 0.33);
  box(width, 0.07, 0.14, 0, 0.1, 0.72);
  const profile = new Shape();
  profile.moveTo(-0.3, 0);
  profile.lineTo(0.32, 0);
  profile.lineTo(0.32, 0.9);
  profile.quadraticCurveTo(0.34, 1.06, 0.18, 1.08);
  profile.lineTo(0.08, 1.02);
  profile.quadraticCurveTo(-0.06, 0.7, -0.26, 0.6);
  profile.lineTo(-0.3, 0.52);
  profile.closePath();
  for (const side of [-1, 1]) {
    const end = new ExtrudeGeometry(profile, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 6 });
    end.rotateY(-Math.PI / 2);
    end.translate(side * (width / 2) + (side > 0 ? 0.06 : 0), 0, 0);
    parts.push(end.toNonIndexed());
  }
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)), false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("pew geometry merge failed");
  merged.computeVertexNormals();
  return merged;
}

const matrix = new Matrix4();

function PewRow({ width, xs, shadows }: { width: number; xs: readonly number[]; shadows: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => pewGeometry(width), [width]);
  const spots = useMemo(() => pewRows.flatMap((z) => xs.map((x) => [x, z] as const)), [xs]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    spots.forEach(([x, z], index) => {
      matrix.makeTranslation(x, 0.02, z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, spots.length]} castShadow={shadows} receiveShadow={shadows}>
      <meshStandardMaterial map={woodTexture()} color="#b08a68" roughness={0.55} metalness={0} />
    </instancedMesh>
  );
}

export function Pews({ shadows }: { shadows: boolean }) {
  const wide = pewBanks.filter((x) => Math.abs(x) < 4);
  const narrow = pewBanks.filter((x) => Math.abs(x) >= 4);
  return (
    <group>
      <PewRow width={2.4} xs={wide} shadows={shadows} />
      <PewRow width={2.1} xs={narrow} shadows={shadows} />
    </group>
  );
}
