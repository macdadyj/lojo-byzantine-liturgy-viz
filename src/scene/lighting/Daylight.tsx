import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Object3D,
  Vector3,
  type DirectionalLight,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { domeZ, clerestoryZ, world } from "../world";

export type Vec3 = [number, number, number];

/** South clerestory openings: centre height and size, matching the glass planes in Church. */
const windowY = 10.3;
const windowW = 1.15;
const windowH = 2.1;
const maskTop = 13.1;
const drumRadius = 3.6;
const drumBottom = 11.4;
const drumWindows = 8;

function box(width: number, height: number, depth: number, x: number, y: number, z: number): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(x, y, z);
  return geometry;
}

/**
 * An invisible shell that only casts shadows: roof, the sun-facing walls, and the dome drum, with holes
 * where the windows are. The painted walls do not cast, so sunlight reaches the floor only through glass.
 */
function maskGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const east = world.sanctuaryEast - 0.4;
  const west = world.narthexWest + 0.4;
  const length = west - east;
  const midZ = (east + west) / 2;
  const x = world.halfWidth + 0.35;
  const thick = 0.3;
  // South wall below and above the clerestory band.
  const bandBottom = windowY - windowH / 2;
  const bandTop = windowY + windowH / 2;
  parts.push(box(thick, bandBottom + 0.3, length, x, (bandBottom - 0.3) / 2, midZ));
  parts.push(box(thick, maskTop - bandTop, length, x, (maskTop + bandTop) / 2, midZ));
  // Piers between windows.
  const edges = [east, ...clerestoryZ.flatMap((z) => [z - windowW / 2, z + windowW / 2]), west];
  for (let i = 0; i < edges.length; i += 2) {
    const from = edges[i] ?? east;
    const to = edges[i + 1] ?? west;
    if (to - from > 0.01) parts.push(box(thick, windowH, to - from, x, windowY, (from + to) / 2));
  }
  // East wall and roof, with the roof open over the dome drum.
  parts.push(box(world.halfWidth * 2 + 1.2, maskTop, thick, 0, maskTop / 2, east));
  const roofY = maskTop + 0.15;
  const holeFrom = domeZ - drumRadius;
  const holeTo = domeZ + drumRadius;
  const span = world.halfWidth * 2 + 1.2;
  parts.push(box(span, 0.3, holeFrom - east, 0, roofY, (east + holeFrom) / 2));
  parts.push(box(span, 0.3, west - holeTo, 0, roofY, (holeTo + west) / 2));
  const side = (span - drumRadius * 2) / 2;
  parts.push(box(side, 0.3, holeTo - holeFrom, -(drumRadius + side / 2), roofY, domeZ));
  parts.push(box(side, 0.3, holeTo - holeFrom, drumRadius + side / 2, roofY, domeZ));
  // Dome drum: panels between its eight windows, and a cap.
  const panel = (2 * Math.PI * drumRadius) / drumWindows - 0.7;
  for (let index = 0; index < drumWindows; index += 1) {
    const angle = ((index + 0.5) / drumWindows) * Math.PI * 2;
    const geometry = new BoxGeometry(panel, maskTop + 0.3 - drumBottom, 0.2);
    geometry.rotateY(-angle + Math.PI / 2);
    geometry.translate(Math.cos(angle) * drumRadius, (maskTop + 0.3 + drumBottom) / 2, domeZ + Math.sin(angle) * drumRadius);
    parts.push(geometry);
  }
  parts.push(box(drumRadius * 2 + 0.4, 0.3, drumRadius * 2 + 0.4, 0, maskTop + 0.45, domeZ));
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  for (const part of parts) part.dispose();
  return merged ?? new BufferGeometry();
}

const invisible = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });

function SunMask() {
  const geometry = useMemo(() => maskGeometry(), []);
  return <mesh geometry={geometry} material={invisible} castShadow frustumCulled={false} />;
}

let beamFade: CanvasTexture | null = null;

/** Swells just inside the window, fades to nothing by the floor, soft at the sides. */
function beamTexture(): CanvasTexture | null {
  if (beamFade) return beamFade;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const along = ctx.createLinearGradient(0, 0, 0, 128);
  along.addColorStop(0, "rgba(255,255,255,0)");
  along.addColorStop(0.1, "rgba(255,255,255,1)");
  along.addColorStop(0.55, "rgba(255,255,255,0.45)");
  along.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, 64, 128);
  ctx.globalCompositeOperation = "destination-in";
  const across = ctx.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, "rgba(0,0,0,0)");
  across.addColorStop(0.3, "rgba(0,0,0,1)");
  across.addColorStop(0.7, "rgba(0,0,0,1)");
  across.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, 64, 128);
  beamFade = new CanvasTexture(canvas);
  return beamFade;
}

/** A light shaft (clerestory only; drum shafts read as solid slabs from below): the window rectangle swept along the sun ray down to the floor, as two crossed ribbons. */
function beamGeometry(corners: Vector3[], toward: Vector3, floorY: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const center = corners.reduce((sum, corner) => sum.add(corner), new Vector3()).multiplyScalar(1 / corners.length);
  const length = (center.y - floorY) / Math.max(0.2, -toward.y);
  const offset = toward.clone().multiplyScalar(length);
  const ribbons: [Vector3, Vector3][] = [];
  const [a, b, c, d] = corners;
  if (a && b && c && d) {
    // Three ribbons fanned through the window so the shaft reads as a volume from most angles.
    ribbons.push([a.clone().lerp(d, 0.5), b.clone().lerp(c, 0.5)]);
    ribbons.push([a.clone().lerp(b, 0.5), d.clone().lerp(c, 0.5)]);
    ribbons.push([a.clone(), c.clone()]);
  }
  for (const [from, to] of ribbons) {
    const fromEnd = from.clone().add(offset);
    const toEnd = to.clone().add(offset);
    positions.push(...from.toArray(), ...to.toArray(), ...toEnd.toArray(), ...from.toArray(), ...toEnd.toArray(), ...fromEnd.toArray());
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return geometry;
}

function SunBeams({ direction, color, opacity }: { direction: Vec3; color: string; opacity: number }) {
  const key = direction.join(",");
  const geometry = useMemo(() => {
    const direction = key.split(",").map(Number) as Vec3;
    const toward = new Vector3(...direction).normalize().negate();
    const parts: BufferGeometry[] = [];
    if (direction[0] > 0) {
      const x = world.halfWidth - 0.05;
      for (const z of clerestoryZ) {
        const corners = [
          new Vector3(x, windowY + windowH / 2, z - windowW / 2),
          new Vector3(x, windowY + windowH / 2, z + windowW / 2),
          new Vector3(x, windowY - windowH / 2, z + windowW / 2),
          new Vector3(x, windowY - windowH / 2, z - windowW / 2),
        ];
        parts.push(beamGeometry(corners, toward, 0.1));
      }
    }
    const merged = parts.length > 0 ? mergeGeometries(parts) : null;
    for (const part of parts) part.dispose();
    return merged ?? new BufferGeometry();
  }, [key]);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color,
        alphaMap: beamTexture(),
        transparent: true,
        opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    [color, opacity],
  );
  useLayoutEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}

/**
 * Morning sun through the south clerestory and the dome drum. With shadows on, the mask confines it to
 * window-shaped pools; without shadows the caller should keep the sun weak, since it would light everything.
 */
export function Daylight({
  direction,
  color,
  intensity,
  shadows,
  mapSize,
  beams,
}: {
  direction: Vec3;
  color: string;
  intensity: number;
  shadows: boolean;
  mapSize: number;
  beams: number;
}) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const dir = new Vector3(...direction).normalize().multiplyScalar(40);
  const position: Vec3 = [dir.x, dir.y, dir.z + 2];
  useLayoutEffect(() => {
    const sun = light.current;
    if (!sun) return;
    target.position.set(0, 0, 2);
    sun.target = target;
    const camera = sun.shadow.camera;
    camera.left = -26;
    camera.right = 26;
    camera.top = 26;
    camera.bottom = -26;
    camera.near = 5;
    camera.far = 90;
    camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }, [mapSize, target]);
  return (
    <>
      <primitive object={target} />
      <directionalLight ref={light} position={position} intensity={intensity} color={color} castShadow={shadows} />
      {shadows ? <SunMask /> : null}
      {beams > 0 ? <SunBeams direction={direction} color={color} opacity={beams} /> : null}
    </>
  );
}
