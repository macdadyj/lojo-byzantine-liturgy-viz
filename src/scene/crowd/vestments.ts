import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { brocadeTexture, orphreyTexture } from "../materials/paint";

export type Vestment = "priest" | "deacon" | "server";

/** Figure space: the source figures face +Z, their left hand is on +X, and the soles rest near y = 0. */
type Ring = (angle: number) => [number, number, number];

/**
 * A closed garment surface swept through rings from top to bottom.
 * U runs around the body and V down it; both are scaled so the brocade repeats at cloth size.
 */
function shell(rings: Ring[], segments: number, repeatU: number, repeatV: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const columns = segments + 1;
  rings.forEach((ring, row) => {
    for (let column = 0; column < columns; column += 1) {
      const angle = (column / segments) * Math.PI * 2;
      positions.push(...ring(angle));
      uvs.push((column / segments) * repeatU, 1 - (row / (rings.length - 1)) * repeatV);
    }
  });
  for (let row = 0; row < rings.length - 1; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A flat ribbon through points, facing outward from the body axis. */
function ribbon(points: Vector3[], width: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let length = 0;
  points.forEach((point, index) => {
    const next = points[Math.min(points.length - 1, index + 1)] ?? point;
    const prev = points[Math.max(0, index - 1)] ?? point;
    const along = next.clone().sub(prev).normalize();
    const out = new Vector3(point.x, 0, point.z).normalize();
    const side = new Vector3().crossVectors(along, out).normalize().multiplyScalar(width / 2);
    if (index > 0) length += point.distanceTo(prev);
    positions.push(point.x - side.x, point.y - side.y, point.z - side.z, point.x + side.x, point.y + side.y, point.z + side.z);
    uvs.push(0, length / width, 1, length / width);
    if (index < points.length - 1) {
      const a = index * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Soft vertical folds that deepen toward the hem. */
const fold = (angle: number, t: number, count = 14) => 1 + 0.03 * t * Math.sin(angle * count) + 0.012 * t * Math.sin(angle * count * 2.3 + 1);
/** 0 at the front of the body, 1 at the back. */
const backness = (angle: number) => (1 - Math.cos(angle)) / 2;

type Frame = { neckY: number; shoulderY: number; shoulderX: number; waistY: number };

function measure(clone: Object3D): Frame {
  clone.updateWorldMatrix(true, true);
  const toLocal = new Matrix4().copy(clone.matrixWorld).invert();
  const at = (name: string, fallback: Vector3) => {
    const bone = clone.getObjectByName(name);
    return bone ? bone.getWorldPosition(new Vector3()).applyMatrix4(toLocal) : fallback;
  };
  const head = at("Head", new Vector3(0, 1.5, 0));
  const armL = at("UpperArmL", new Vector3(0.17, 1.4, 0));
  const armR = at("UpperArmR", new Vector3(-0.17, 1.4, 0));
  const hips = at("Hips", new Vector3(0, 0.95, 0));
  return {
    neckY: head.y - 0.02,
    shoulderY: (armL.y + armR.y) / 2 + 0.03,
    shoulderX: Math.abs(armL.x - armR.x) / 2 + 0.05,
    waistY: hips.y + 0.1,
  };
}

/** Moves figure-space geometry into a bone's local space so it follows that bone (bows, breathing). */
function attach(clone: Object3D, boneName: string, mesh: Mesh): Object3D | null {
  const bone = clone.getObjectByName(boneName);
  if (!bone) return null;
  clone.updateWorldMatrix(true, true);
  const toBone = new Matrix4().copy(bone.matrixWorld).invert().multiply(clone.matrixWorld);
  mesh.geometry.applyMatrix4(toBone);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  bone.add(mesh);
  return mesh;
}

function sticharionSkirt(frame: Frame): BufferGeometry {
  const rings: Ring[] = [];
  const count = 7;
  for (let row = 0; row < count; row += 1) {
    const t = row / (count - 1);
    const y = lerp(frame.waistY, 0.05, t);
    const rx = lerp(0.2, 0.32, Math.pow(t, 0.8));
    const rz = lerp(0.17, 0.28, Math.pow(t, 0.8));
    rings.push((angle) => [Math.sin(angle) * rx * fold(angle, t), y, Math.cos(angle) * rz * fold(angle, t) - 0.01]);
  }
  return shell(rings, 32, 5, 4);
}

/** Greek-cut phelonion: stiff collar behind the neck, long at the back, gathered up to the wrists in front. */
function phelonionRings(frame: Frame, hemLift = 0): Ring[] {
  const hem = (angle: number) => lerp(0.98, 0.14, Math.pow(backness(angle), 0.55)) + hemLift;
  const shoulderTop = (angle: number) => frame.shoulderY + 0.01 - 0.05 * Math.abs(Math.sin(angle));
  const shoulderX = frame.shoulderX + 0.05;
  /** Deeper in front so the drape clears the chest. */
  const chestDepth = (angle: number, depth: number) => depth + 0.05 * Math.max(0, Math.cos(angle));
  const rings: Ring[] = [
    (angle) => [Math.sin(angle) * 0.1, frame.neckY + 0.045 * Math.pow(backness(angle), 2), Math.cos(angle) * 0.1 - 0.02],
    (angle) => [Math.sin(angle) * 0.13, frame.neckY - 0.02 + 0.02 * Math.pow(backness(angle), 2), Math.cos(angle) * 0.13 - 0.02],
    (angle) => [Math.sin(angle) * (shoulderX * 0.8), shoulderTop(angle) + 0.03, Math.cos(angle) * chestDepth(angle, 0.19) - 0.02],
    (angle) => [Math.sin(angle) * shoulderX, shoulderTop(angle) - 0.03, Math.cos(angle) * chestDepth(angle, 0.21) - 0.02],
  ];
  const drop = 10;
  for (let row = 1; row <= drop; row += 1) {
    const t = row / drop;
    const flare = Math.pow(t, 0.8);
    rings.push((angle) => {
      const top = shoulderTop(angle) - 0.03;
      const folds = fold(angle, t, 18);
      return [
        Math.sin(angle) * lerp(shoulderX, 0.46, flare) * folds,
        lerp(top, hem(angle), t),
        (Math.cos(angle) * lerp(chestDepth(angle, 0.21), 0.38, flare) - 0.02) * folds,
      ];
    });
  }
  return rings;
}

function phelonion(frame: Frame): { body: BufferGeometry; trim: BufferGeometry } {
  const rings = phelonionRings(frame);
  const last = rings[rings.length - 1];
  const body = shell(rings, 48, 8, 5);
  const trim = last
    ? shell(
        [
          (angle) => {
            const [x, y, z] = last(angle);
            return [x * 0.985, y + 0.07, z * 0.985];
          },
          (angle) => {
            const [x, y, z] = last(angle);
            return [x * 1.006, y, z * 1.006];
          },
        ],
        48,
        24,
        1,
      )
    : new BufferGeometry();
  return { body, trim };
}

/** The embroidered cross on the phelonion's back, laid on the drape. */
function backCross(frame: Frame): BufferGeometry {
  const rings = phelonionRings(frame);
  const surface = (t: number) => {
    const index = Math.min(rings.length - 1, 4 + Math.round(t * 9));
    const ring = rings[index];
    return ring ? ring(Math.PI) : ([0, frame.shoulderY, -0.2] as [number, number, number]);
  };
  const lift = (point: [number, number, number]) => new Vector3(point[0], point[1], point[2] - 0.006);
  const upright = [0.05, 0.2, 0.4, 0.55].map((t) => lift(surface(t)));
  const barY = surface(0.14);
  const bar = [-0.13, -0.04, 0.04, 0.13].map((x) => new Vector3(x, barY[1], barY[2] - 0.004 - Math.abs(x) * 0.12));
  const geometry = mergeRibbons([ribbon(upright, 0.07), ribbonFlat(bar, 0.06)]);
  return geometry;
}

/** A ribbon laid horizontally (for the cross bar), facing −Z. */
function ribbonFlat(points: Vector3[], height: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  points.forEach((point, index) => {
    positions.push(point.x, point.y - height / 2, point.z, point.x, point.y + height / 2, point.z);
    uvs.push(0, index, 1, index);
    if (index < points.length - 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mergeRibbons(parts: BufferGeometry[]): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const part of parts) {
    const position = part.getAttribute("position");
    const uv = part.getAttribute("uv");
    for (let i = 0; i < position.count; i += 1) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      uvs.push(uv.getX(i), uv.getY(i));
    }
    const index = part.getIndex();
    if (index) for (let i = 0; i < index.count; i += 1) indices.push(index.getX(i) + offset);
    offset += position.count;
    part.dispose();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The deacon's orarion over the left shoulder, hanging front and back over the sticharion. */
function orarion(frame: Frame, part: "upper" | "lower"): BufferGeometry {
  const x = frame.shoulderX * 0.55;
  const strand = (front: boolean) => {
    const sign = front ? 1 : -1;
    const points: Vector3[] = [];
    const heights = part === "upper" ? [frame.shoulderY + 0.03, frame.shoulderY - 0.1, frame.waistY + 0.2, frame.waistY] : [frame.waistY, frame.waistY - 0.3, 0.42];
    for (const y of heights) {
      const t = Math.max(0, Math.min(1, (frame.waistY - y) / (frame.waistY - 0.05)));
      const depth = y > frame.waistY ? (y > frame.shoulderY - 0.05 ? 0.1 : 0.155) : lerp(0.135, 0.27, Math.pow(t, 0.8)) * Math.cos(Math.asin(Math.min(0.9, x / lerp(0.18, 0.31, t))));
      points.push(new Vector3(x, y, sign * (depth + 0.012) - 0.01));
    }
    return points;
  };
  return mergeRibbons([ribbon(strand(true), 0.075), ribbon(strand(false), 0.075)]);
}

const cache = new Map<string, Material>();

function vestMaterial(key: string, make: () => Material): Material {
  const hit = cache.get(key);
  if (hit) return hit;
  const material = make();
  cache.set(key, material);
  return material;
}

function brocade(ground: string, figure: string, key: string): Material {
  return vestMaterial(key, () => {
    const map = brocadeTexture(ground, figure);
    return new MeshStandardMaterial({ name: key, map, color: "#ffffff", roughness: 0.46, metalness: 0.42, side: DoubleSide });
  });
}

const vestColors: Record<Vestment, { ground: string; figure: string; plain: string }> = {
  priest: { ground: "#c89b43", figure: "#8a5f22", plain: "#e6d9b8" },
  deacon: { ground: "#cfa652", figure: "#946a2c", plain: "#cfa652" },
  server: { ground: "#e3d3ad", figure: "#b39359", plain: "#e3d3ad" },
};

function plainCloth(color: string): Material {
  return vestMaterial(`plain:${color}`, () => new MeshStandardMaterial({ name: "vest-plain", color: new Color(color), roughness: 0.62, metalness: 0.12 }));
}

function orphrey(): Material {
  return vestMaterial("orphrey", () => new MeshStandardMaterial({ name: "orphrey", map: orphreyTexture(), roughness: 0.42, metalness: 0.45, side: DoubleSide }));
}

/** Materials on the base figure that the vestments replace or hide. */
const hiddenMeshes = new Set(["Kamilavka", "KamilavkaBrim", "Phelonion", "King_Legs"]);
const stoles = new Set(["epitrachelion", "orarion", "cuffl", "cuffr"]);
const bodyCloth = new Set(["suit", "suit.001", "tie", "white", "blue", "metal", "beige", "metal_dark", "darkbrown"]);

const torsoBones = new Set(["ShoulderL", "ShoulderR", "Hips", "Abdomen", "Torso", "Chest", "Body", "Neck", "UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR"]);

function dominantBoneName(mesh: SkinnedMesh, vertex: number): string {
  const index = mesh.geometry.getAttribute("skinIndex");
  const weight = mesh.geometry.getAttribute("skinWeight");
  let best = -1;
  let bone = -1;
  for (let slot = 0; slot < index.itemSize; slot += 1) {
    const w = weight.getComponent(vertex, slot);
    if (w > best) {
      best = w;
      bone = index.getComponent(vertex, slot);
    }
  }
  return mesh.skeleton.bones[bone]?.name.replaceAll(".", "") ?? "";
}

/**
 * Drops the base figure's torso and belt cloth (armor plates, pouches) that the phelonion and sticharion
 * cover but that would poke through them. Skin and sleeves stay.
 */
function trimUnderclothes(mesh: SkinnedMesh): void {
  const source = mesh.geometry;
  const index = source.getIndex();
  if (!index) return;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const geometry = source.clone();
  const kept: number[] = [];
  geometry.clearGroups();
  const groups = source.groups.length > 0 ? source.groups : [{ start: 0, count: index.count, materialIndex: 0 }];
  for (const group of groups) {
    const material = materials[group.materialIndex ?? 0];
    const skin = material?.name.toLowerCase().includes("skin") ?? false;
    const start = kept.length;
    for (let i = group.start; i < group.start + group.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const hidden = !skin && [a, b, c].every((vertex) => torsoBones.has(dominantBoneName(mesh, vertex)));
      if (!hidden) kept.push(a, b, c);
    }
    geometry.addGroup(start, kept.length - start, group.materialIndex ?? 0);
  }
  geometry.setIndex(kept);
  mesh.geometry = geometry;
}

/**
 * Dresses a clergy figure for a Sunday liturgy in gold. Returns the added meshes so the caller can remove them;
 * materials are shared across all clergy and are never disposed here.
 */
export function vestFigure(clone: Object3D, vestment: Vestment): Object3D[] {
  const colors = vestColors[vestment];
  const under = vestment === "priest" ? plainCloth(colors.plain) : brocade(colors.ground, colors.figure, `vest:${vestment}`);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    // Multi-material glTF meshes load as a group of single-material meshes under the node's name.
    const grouped = child.parent !== null && child.parent.children.every((sibling) => sibling instanceof Mesh);
    const node = grouped && child.parent ? child.parent.name : child.name;
    if (hiddenMeshes.has(child.name) || hiddenMeshes.has(node)) {
      child.visible = false;
      return;
    }
    if (node === "King_Body" && child instanceof SkinnedMesh && !child.userData.trimmed) {
      trimUnderclothes(child);
      child.userData.trimmed = true;
    }
    const source = child.material;
    const list = Array.isArray(source) ? source : [source];
    let changed = false;
    const next = list.map((material: Material) => {
      const label = material.name.toLowerCase();
      if (stoles.has(label)) {
        changed = true;
        return plainCloth("#b98a34");
      }
      if (node === "King_Feet") {
        changed = true;
        return plainCloth("#23201d");
      }
      if (!bodyCloth.has(label)) return material;
      changed = true;
      return vestment === "priest" ? plainCloth(colors.plain) : plainCloth(colors.ground);
    });
    if (changed) child.material = Array.isArray(source) ? next : (next[0] ?? source);
  });

  const frame = measure(clone);
  const added: (Object3D | null)[] = [attach(clone, "Hips", new Mesh(sticharionSkirt(frame), under))];
  switch (vestment) {
    case "priest": {
      const cut = phelonion(frame);
      const outer = brocade(colors.ground, colors.figure, "vest:phelonion");
      added.push(attach(clone, "Chest", new Mesh(cut.body, outer)));
      added.push(attach(clone, "Chest", new Mesh(cut.trim, orphrey())));
      added.push(attach(clone, "Chest", new Mesh(backCross(frame), orphrey())));
      break;
    }
    case "deacon":
      added.push(attach(clone, "Chest", new Mesh(orarion(frame, "upper"), orphrey())));
      added.push(attach(clone, "Hips", new Mesh(orarion(frame, "lower"), orphrey())));
      break;
    case "server":
      break;
    default: {
      const exhaustive: never = vestment;
      return exhaustive;
    }
  }
  return added.filter((object): object is Object3D => object !== null);
}
