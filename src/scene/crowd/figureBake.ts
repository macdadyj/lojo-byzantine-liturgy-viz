import {
  AnimationClip,
  AnimationMixer,
  BufferGeometry,
  Float32BufferAttribute,
  Box3,
  Group,
  Matrix3,
  Mesh,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { aimLocalY, poseLegs } from "./pose";

/** Figure poses baked into static meshes. */
export type BakePose = "stand" | "standB" | "pray" | "chest" | "cross" | "bow" | "sit" | "kneel";

/** Region codes written per vertex; the crowd shader tints each one from the instance's colors. */
export const Region = {
  skin: 0,
  hair: 1,
  eye: 2,
  top: 3,
  bottom: 4,
  shoe: 5,
  shirt: 6,
  accent: 7,
  scarf: 8,
} as const;

type RegionCode = (typeof Region)[keyof typeof Region];

const legBones = new Set(["UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "Hips"]);
const footBones = new Set(["FootL", "FootR", "PTL", "PTR"]);
/** Bare skin on these bones is painted as long sleeves or a closed neckline: Sunday dress, not summer wear. */
const coveredBones = new Set(["ShoulderL", "ShoulderR", "UpperArmL", "UpperArmR", "LowerArmL", "LowerArmR", "Chest", "Torso", "Abdomen", "Body"]);

function materialRegion(material: Material): RegionCode | null {
  const name = material.name.toLowerCase();
  if (name.includes("skin")) return Region.skin;
  if (name.includes("hair") || name.includes("brow") || name.includes("moustache") || name.includes("beard")) return Region.hair;
  if (name.includes("eye")) return Region.eye;
  if (name === "white") return Region.shirt;
  if (name.includes("gold") || name.includes("metal")) return Region.accent;
  return null;
}

const skinned = new Vector3();
const offset = new Vector3();
const normalMatrix = new Matrix3();

function clipAt(animations: AnimationClip[], names: string[]): AnimationClip | undefined {
  const found = animations.find((clip) => names.some((name) => clip.name === name || clip.name.startsWith(`${name}_`)));
  if (!found) return undefined;
  return new AnimationClip(found.name, found.duration, found.tracks.filter((track) => !track.name.startsWith("Root.position")));
}

function poseArms(clone: Object3D, pose: BakePose): void {
  const torso = clone.getObjectByName("Torso");
  const head = clone.getObjectByName("Head");
  if (pose === "bow") {
    if (torso) torso.rotation.x += 0.32;
    if (head) head.rotation.x += 0.28;
  }
  if (pose === "standB" && head) head.rotation.x += 0.12;
  if (pose !== "pray" && pose !== "chest" && pose !== "cross" && pose !== "bow") return;
  clone.updateMatrixWorld(true);
  const sides: ("L" | "R")[] = pose === "cross" ? ["R"] : ["L", "R"];
  for (const side of sides) {
    const upper = clone.getObjectByName(`UpperArm${side}`);
    const lower = clone.getObjectByName(`LowerArm${side}`);
    const wrist = clone.getObjectByName(`Wrist${side}`);
    const sign = side === "L" ? 1 : -1;
    // The figure faces +Z here, so its right hand is on −X and "inward" is +X for the right arm.
    const inward = -sign;
    if (pose === "cross") {
      if (upper) aimLocalY(upper, new Vector3(0.3 * inward, -0.6, 0.72));
      if (lower) aimLocalY(lower, new Vector3(0.32 * inward, 0.94, -0.12));
    } else if (pose === "chest") {
      // Arms crossed on the breast, right over left, as the faithful approach the chalice.
      // Forearms stay nearly level so the hands land on the opposite collarbone, not above the shoulder.
      const over = side === "R" ? 0.06 : 0;
      if (upper) aimLocalY(upper, new Vector3(0.05 * inward, -0.85, 0.5 + over));
      if (lower) aimLocalY(lower, new Vector3(0.7 * inward, 0.35, 0.35 + over));
      if (wrist) aimLocalY(wrist, new Vector3(0.6 * inward, 0.35, -0.7));
    } else {
      // Hands clasped low in front.
      if (upper) aimLocalY(upper, new Vector3(0.12 * inward, -0.97, 0.2));
      if (lower) aimLocalY(lower, new Vector3(0.78 * inward, -0.45, 0.42));
      if (wrist) aimLocalY(wrist, new Vector3(0.75 * inward, -0.5, 0.3));
    }
  }
}

function dominantBone(mesh: SkinnedMesh, vertex: number): string {
  const index = mesh.geometry.getAttribute("skinIndex");
  const weight = mesh.geometry.getAttribute("skinWeight");
  let best = 0;
  let bestBone = -1;
  for (let slot = 0; slot < index.itemSize; slot += 1) {
    const w = weight.getComponent(vertex, slot);
    if (w > best) {
      best = w;
      bestBone = index.getComponent(vertex, slot);
    }
  }
  return mesh.skeleton.bones[bestBone]?.name.replaceAll(".", "") ?? "";
}

export type BakedFigure = {
  geometry: BufferGeometry;
  height: number;
};

/**
 * Poses a clothed CC0 figure and freezes it into one static geometry with a `region` attribute.
 * The figure faces −Z (east) with its soles (or knees, kneeling) at y = 0.
 */
export function bakeFigure(
  scene: Object3D,
  animations: AnimationClip[],
  pose: BakePose,
  options: { scarf: boolean; headScale: number },
): BakedFigure {
  const clone = cloneSkeleton(scene);
  const root = new Group();
  root.add(clone);
  const mixer = new AnimationMixer(clone);
  const clipName = pose === "sit" ? ["sit"] : pose === "kneel" ? ["kneel"] : ["Idle_Neutral", "idle", "Idle"];
  const clip = clipAt(animations, clipName);
  if (clip) {
    const action = mixer.clipAction(clip);
    action.play();
    action.time = pose === "standB" ? clip.duration * 0.5 : 0;
    mixer.update(0);
  }
  root.updateMatrixWorld(true);
  poseLegs(clone, root, pose === "sit" ? "sit" : pose === "kneel" ? "kneel" : "stand");
  poseArms(clone, pose);
  const headBone = clone.getObjectByName("Head");
  if (headBone) headBone.scale.setScalar(options.headScale);
  root.updateMatrixWorld(true);

  const positions: number[] = [];
  const normals: number[] = [];
  const regions: number[] = [];
  const headBox = new Box3();

  clone.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const geometry = child.geometry as BufferGeometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const index = geometry.getIndex();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const groups = geometry.groups.length > 0 ? geometry.groups : [{ start: 0, count: index ? index.count : position.count, materialIndex: 0 }];
    const isSkinned = child instanceof SkinnedMesh;
    normalMatrix.getNormalMatrix(child.matrixWorld);
    const fixed = child.userData.region as RegionCode | undefined;
    const transformPoint = (vertex: number, out: Vector3) => {
      if (isSkinned) child.getVertexPosition(vertex, out);
      else out.fromBufferAttribute(position, vertex);
      return out.applyMatrix4(child.matrixWorld);
    };
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0];
      const byMaterial = fixed ?? (material ? materialRegion(material) : null);
      for (let i = group.start; i < group.start + group.count; i += 1) {
        const vertex = index ? index.getX(i) : i;
        transformPoint(vertex, skinned);
        positions.push(skinned.x, skinned.y, skinned.z);
        if (isSkinned) {
          // Skinned normal: transform a point nudged along the bind normal and take the difference.
          const base = skinned.clone();
          const bind = new Vector3().fromBufferAttribute(position, vertex);
          const n = new Vector3().fromBufferAttribute(normal, vertex);
          const shifted = bind.addScaledVector(n, 0.01);
          const saved = position.getX(vertex);
          const savedY = position.getY(vertex);
          const savedZ = position.getZ(vertex);
          position.setXYZ(vertex, shifted.x, shifted.y, shifted.z);
          child.getVertexPosition(vertex, offset);
          position.setXYZ(vertex, saved, savedY, savedZ);
          offset.applyMatrix4(child.matrixWorld).sub(base).normalize();
          normals.push(offset.x, offset.y, offset.z);
        } else {
          offset.fromBufferAttribute(normal, vertex).applyMatrix3(normalMatrix).normalize();
          normals.push(offset.x, offset.y, offset.z);
        }
        let region: RegionCode = byMaterial ?? Region.top;
        if (byMaterial === null && isSkinned) {
          const bone = dominantBone(child, vertex);
          if (footBones.has(bone)) region = Region.shoe;
          else if (legBones.has(bone)) region = Region.bottom;
          else region = Region.top;
        }
        if (byMaterial === null && material?.name.toLowerCase() === "black") region = Region.shoe;
        if (region === Region.skin && isSkinned) {
          const bone = dominantBone(child, vertex);
          if (coveredBones.has(bone)) region = Region.top;
          else if (legBones.has(bone)) region = Region.bottom;
          else if (footBones.has(bone)) region = Region.shoe;
        }
        regions.push(region);
        if (isSkinned && (region === Region.skin || region === Region.hair) && dominantBone(child, vertex) === "Head") headBox.expandByPoint(skinned);
      }
    }
  });
  if (options.scarf) appendScarf(positions, normals, regions, headBox);

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1] ?? 0;
    const region = regions[i / 3];
    if (pose === "kneel" || region === Region.shoe) minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minY)) minY = 0;
  // Face east (−Z): the source figures face +Z.
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = -(positions[i] ?? 0);
    positions[i + 1] = (positions[i + 1] ?? 0) - minY;
    positions[i + 2] = -(positions[i + 2] ?? 0);
    normals[i] = -(normals[i] ?? 0);
    normals[i + 2] = -(normals[i + 2] ?? 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("region", new Float32BufferAttribute(regions, 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  mixer.stopAllAction();
  return { geometry, height: maxY - minY };
}

/**
 * Headscarf fitted to the measured head (skin and hair on the Head bone): an ellipsoid cap over the
 * crown, sides, and back, open at the face (+Z before the figure is turned east).
 */
function appendScarf(positions: number[], normals: number[], regions: number[], head: Box3): void {
  if (head.isEmpty()) return;
  const center = head.getCenter(new Vector3());
  const size = head.getSize(new Vector3());
  const radius = new Vector3(size.x * 0.58, size.y * 0.56, size.z * 0.6);
  center.y += size.y * 0.06;
  center.z -= size.z * 0.04;
  const open = 1.25;
  const cap = new SphereGeometry(1, 20, 12, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI * 0.68).toNonIndexed();
  const position = cap.getAttribute("position");
  const normal = cap.getAttribute("normal");
  for (let i = 0; i < position.count; i += 1) {
    positions.push(center.x + position.getX(i) * radius.x, center.y + position.getY(i) * radius.y, center.z + position.getZ(i) * radius.z);
    const n = new Vector3(normal.getX(i) / radius.x, normal.getY(i) / radius.y, normal.getZ(i) / radius.z).normalize();
    normals.push(n.x, n.y, n.z);
    regions.push(Region.scarf);
  }
  cap.dispose();
}
