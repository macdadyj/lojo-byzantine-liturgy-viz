import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationClip,
  AnimationMixer,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  LinearSRGBColorSpace,
  LoopRepeat,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SkinnedMesh,
  SphereGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { nextBlockerId, releaseBlocker, trackBlocker } from "./collide";
import type { Gesture } from "./gestures";
import { faithfulPlace } from "./crowdLayout";
import { raycastFloor } from "./floors";
import type { Vec3 } from "./path";
import type { Quality } from "./quality";
import type { Stance } from "./staging";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts" | "candle" | "cross";
export type Age = "child" | "teen" | "adult" | "elder";
type ClipName = "idle" | "walk" | "sit" | "kneel";

/** Sunday clothes only: jackets, sweaters, dresses. No work gear, crowns, or costume pieces. */
const castNames = ["m-suit", "m-casual", "m-hoodie", "w-suit", "w-formal", "w-casual"] as const;

const clothPalette = ["#4a5160", "#5c534c", "#3e4842", "#6a5d62", "#4d5156", "#6b5e52", "#3a4250", "#5a564e"];

export type CastName = (typeof castNames)[number];

function modelUrl(file: string): string {
  return `${import.meta.env.BASE_URL}models/cast/${file}.glb`;
}

const animUrl = modelUrl("anims");
const priestUrl = modelUrl("priest");
const deaconUrl = modelUrl("deacon");

for (const name of castNames) useGLTF.preload(modelUrl(name));
useGLTF.preload(animUrl);
useGLTF.preload(priestUrl);
useGLTF.preload(deaconUrl);

const skinTints = ["#e0ac69", "#c68642", "#8d5524", "#f1c27d", "#6b4423", "#a56b43", "#d9a066", "#4a3128"];
const hairTints = ["#2a2118", "#1a120e", "#4a3424", "#6b5344", "#111111", "#c8c2b4", "#3a2418", "#241610"];

const gold = new MeshStandardMaterial({ color: "#d4b06a", roughness: 0.35, metalness: 0.65 });
const book = new MeshStandardMaterial({ color: "#6a242c", roughness: 0.55, metalness: 0.12 });
const page = new MeshStandardMaterial({ color: "#f4efe4", roughness: 0.7 });
const smokeMat = new MeshStandardMaterial({
  color: "#efe6d8",
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  roughness: 1,
});

const scratch = new Vector3();
const parentPoint = new Vector3();
const footPoint = new Vector3();
const scalePoint = new Vector3();
const aimDir = new Vector3();
const basisX = new Vector3();
const basisZ = new Vector3();
const axisX = new Vector3(1, 0, 0);
const axisY = new Vector3(0, 1, 0);
const axisZ = new Vector3(0, 0, 1);
const worldDown = new Vector3(0, -1, 0);
const forwardDir = new Vector3();
const thighDir = new Vector3();
const shinDir = new Vector3();
const quatA = new Quaternion();
const quatB = new Quaternion();
const basis = new Matrix4();

export function ageScale(age: Age): number {
  switch (age) {
    case "child":
      return 0.74;
    case "teen":
      return 0.88;
    case "adult":
      return 1;
    case "elder":
      return 0.96;
    default: {
      const exhaustive: never = age;
      return exhaustive;
    }
  }
}

export function Clergy({
  role,
  stance,
  walking = false,
  carry = "none",
  gesture = "none",
  censing = false,
  quality = "medium",
  elevated = false,
}: {
  role: ClergyRole;
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
  gesture?: Gesture;
  censing?: boolean;
  quality?: Quality;
  elevated?: boolean;
}) {
  const file: CastName | "priest" | "deacon" = role === "priest" ? "priest" : role === "deacon" ? "deacon" : "m-suit";
  return (
    <Person
      file={file}
      stance={stance}
      walking={walking}
      carry={carry}
      gesture={gesture}
      censing={censing && role === "deacon"}
      quality={quality}
      important
      age="adult"
      tint={role === "priest" ? 4 : 1}
      elevated={elevated}
    />
  );
}

export type CrowdSpot = {
  position: Vec3;
  rotationY: number;
  cast: number;
  age: Age;
  phase: number;
};

export function Crowd({
  spots,
  stance,
  gesture = "none",
  quality = "medium",
}: {
  spots: readonly CrowdSpot[];
  stance: Stance;
  gesture?: Gesture;
  quality?: Quality;
}) {
  if (spots.length === 0) return null;
  const limit = quality === "high" ? spots.length : quality === "medium" ? Math.min(spots.length, 14) : Math.min(spots.length, 8);
  const shown = spots.slice(0, limit);
  return (
    <group>
      {shown.map((spot) => {
        const file = castNames[spot.cast % castNames.length] ?? "m-suit";
        const short = spot.age === "child" || spot.age === "teen";
        const personStance = stance === "sit" && short ? "stand" : stance;
        const placed = spot.position[1] === 0 ? faithfulPlace(spot.position[0], spot.position[2], personStance) : spot.position;
        return (
          <group
            key={`${spot.position.join(",")}-${spot.cast}`}
            position={placed}
            rotation={[0, spot.rotationY, 0]}
            scale={ageScale(spot.age)}
          >
            <Person
              file={file}
              stance={personStance}
              age={spot.age}
              phase={spot.phase}
              gesture={gesture}
              quality={quality}
              tint={spot.cast}
            />
          </group>
        );
      })}
    </group>
  );
}

function Person({
  file,
  stance,
  walking = false,
  carry = "none",
  age = "adult",
  phase = 0,
  gesture = "none",
  censing = false,
  quality = "medium",
  important = false,
  tint = 0,
  elevated = false,
}: {
  file: CastName | "priest" | "deacon";
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
  age?: Age;
  phase?: number;
  gesture?: Gesture;
  censing?: boolean;
  quality?: Quality;
  important?: boolean;
  tint?: number;
  elevated?: boolean;
}) {
  const body = useGLTF(modelUrl(file));
  const anim = useGLTF(animUrl);
  const clone = useMemo(() => cloneSkeleton(body.scene), [body.scene]);
  const mixer = useMemo(() => new AnimationMixer(clone), [clone]);
  const clips = useMemo(() => prepareClips(anim.animations), [anim.animations]);
  const clipName: ClipName = walking ? "walk" : stance === "sit" ? "sit" : stance === "kneel" ? "kneel" : "idle";
  const clip = clips.get(clipName) ?? clips.get("idle");
  const root = useRef<Group>(null);
  const accum = useRef(0);
  const blocker = useRef(0);

  useLayoutEffect(() => {
    const created = tintFigure(clone, tint, age, file !== "priest" && file !== "deacon");
    const dressed = file.startsWith("w-") ? sundayLayers(clone, tint) : [];
    const added = attachProps(clone, { carry, censing: censing && quality !== "low", elevated });
    const head = clone.getObjectByName("Head");
    if (head) head.scale.setScalar(headScaleFor(age));
    return () => {
      for (const material of created) material.dispose();
      const dressMaterial = dressed[0] instanceof Mesh ? dressed[0].material : null;
      for (const object of dressed) {
        object.removeFromParent();
        if (object instanceof Mesh) object.geometry.dispose();
      }
      if (dressMaterial instanceof MeshStandardMaterial) dressMaterial.dispose();
      for (const object of added) {
        object.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry.dispose();
            const material = child.material;
            if (material instanceof MeshStandardMaterial && material !== gold && material !== book && material !== page) {
              material.dispose();
            }
          }
        });
        object.removeFromParent();
      }
    };
  }, [age, carry, censing, clone, elevated, file, quality, tint]);

  useLayoutEffect(() => {
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    if (!walking && clip.duration > 0) {
      action.time = phase * clip.duration;
      action.timeScale = 0.7 + (Math.abs(tint) % 5) * 0.07 + phase * 0.28;
    }
    mixer.update(0.001);
  }, [clip, mixer, phase, tint, walking]);

  useLayoutEffect(() => {
    const id = nextBlockerId();
    blocker.current = id;
    return () => releaseBlocker(id);
  }, []);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    group.getWorldPosition(scratch);
    trackBlocker(blocker.current, scratch.x, scratch.z, age === "child" ? 0.28 : 0.4);
    const distance = state.camera.position.distanceTo(scratch);
    const far = !important && distance > (quality === "low" ? 11 : 16);
    if (far) {
      accum.current += delta;
      if (accum.current < 0.2) return;
      mixer.update(accum.current);
      accum.current = 0;
    } else {
      mixer.update(walking ? delta : delta * 0.55);
    }
    if (!walking) poseLegs(clone, group, stance);
    plantFeet(group, clone, state.scene);
    if (far) return;
    const time = state.clock.elapsedTime + phase * 6;
    if (stance === "bow") {
      const torso = clone.getObjectByName("Torso");
      if (torso) torso.rotation.x = 0.55;
    }
    if (gesture === "cross") applyCross(clone, (time % 2.8) / 2.8);
    const censer = clone.userData.censer as Group | undefined;
    if (censer) {
      censer.rotation.z = Math.sin(time * 2.4) * 0.55;
      censer.children.forEach((child, index) => {
        if (!(child instanceof Mesh) || child.userData.puff === undefined) return;
        const puff = Number(child.userData.puff);
        child.position.y = 0.22 + ((time * 0.35 + puff) % 1) * 0.45;
        const material = child.material as MeshStandardMaterial;
        material.opacity = 0.08 + (1 - ((time * 0.35 + puff) % 1)) * 0.2;
        child.position.x = Math.sin(time * 1.4 + index) * 0.04;
      });
    }
  });

  return (
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <primitive object={clone} />
    </group>
  );
}

function prepareClips(animations: AnimationClip[]): Map<ClipName, AnimationClip> {
  const map = new Map<ClipName, AnimationClip>();
  const aliases: Record<ClipName, string[]> = {
    idle: ["idle", "Idle_Neutral", "Idle"],
    walk: ["walk", "Walk"],
    sit: ["sit"],
    kneel: ["kneel"],
  };
  const names: ClipName[] = ["idle", "walk", "sit", "kneel"];
  for (const name of names) {
    const wanted = aliases[name];
    const found = animations.find((clip) => wanted.some((alias) => clip.name === alias || clip.name.startsWith(`${alias}_`)));
    if (!found) continue;
    const tracks = found.tracks.filter((track) => !track.name.startsWith("Root.position"));
    map.set(name, new AnimationClip(name, found.duration, tracks));
  }
  return map;
}

type SurfaceKind = "skin" | "hair" | "eye" | "shirt" | "shoe" | "accent" | "cloth";

function surfaceKind(label: string): SurfaceKind {
  if (label.includes("skin")) return "skin";
  if (label.includes("hair") || label.includes("eyebrow") || label.includes("brow")) return "hair";
  if (label.includes("eye")) return "eye";
  if (label.includes("white")) return "shirt";
  if (label === "black") return "shoe";
  if (label.includes("gold") || label.includes("metal")) return "accent";
  return "cloth";
}

function headScaleFor(age: Age): number {
  switch (age) {
    case "child":
      return 0.98;
    case "teen":
      return 0.94;
    case "adult":
      return 0.9;
    case "elder":
      return 0.92;
    default: {
      const exhaustive: never = age;
      return exhaustive;
    }
  }
}

function tintFigure(root: Object3D, tint: number, age: Age, sunday: boolean): Material[] {
  const created: Material[] = [];
  const skin = new Color(skinTints[Math.abs(tint) % skinTints.length] ?? "#c68642");
  const hair = new Color(hairTints[Math.abs(tint + 3) % hairTints.length] ?? "#2a2118");
  const cloth = new Color(clothPalette[Math.abs(tint) % clothPalette.length] ?? "#4a5160");
  cloth.lerp(new Color("#6f6a63"), 0.2);
  if (age === "elder") hair.lerp(new Color("#d9d3c7"), 0.72);
  const weave = sunday ? clothWeave() : null;
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = child.material;
    const list = Array.isArray(source) ? source : [source];
    let changed = false;
    const next = list.map((material, index) => {
      if (!(material instanceof MeshStandardMaterial)) return material;
      const label = material.name.toLowerCase();
      const kind = surfaceKind(label);
      const keep = kind === "skin" || kind === "hair" || kind === "eye";
      if (!sunday && !keep) return material;
      const painted = paintSurface(child, material, index, kind, skin, hair, cloth, weave);
      created.push(painted);
      changed = true;
      return painted;
    });
    if (changed) child.material = Array.isArray(source) ? next : (next[0] ?? source);
  });
  return created;
}

function paintSurface(
  mesh: Mesh,
  material: MeshStandardMaterial,
  index: number,
  kind: SurfaceKind,
  skin: Color,
  hair: Color,
  cloth: Color,
  weave: ClothWeave | null,
): Material {
  const key = `litBase${index}`;
  const stored = mesh.userData[key] as Color | undefined;
  const base = stored ? stored.clone() : material.color.clone();
  if (!stored) mesh.userData[key] = material.color.clone();
  switch (kind) {
    case "skin":
      return new MeshPhysicalMaterial({
        name: material.name,
        color: base.multiply(skin),
        map: material.map,
        roughness: 0.48,
        metalness: 0,
        sheen: 0.42,
        sheenRoughness: 0.48,
        sheenColor: new Color("#e8b39a"),
        emissive: new Color("#8c3d32"),
        emissiveIntensity: 0.07,
      });
    case "hair":
      return new MeshPhysicalMaterial({
        name: material.name,
        color: base.multiply(hair),
        map: material.map,
        roughness: 0.62,
        metalness: 0.04,
        sheen: 0.35,
        sheenRoughness: 0.4,
        sheenColor: new Color("#4a3428"),
      });
    case "eye": {
      const copy = material.clone();
      copy.roughness = 0.22;
      copy.metalness = 0;
      return copy;
    }
    case "shirt":
      return clothMaterial(material.name, new Color("#cfc6ba"), weave, 0.92);
    case "shoe":
      return clothMaterial(material.name, new Color("#2a2724"), null, 0.58);
    case "accent":
      return new MeshStandardMaterial({
        name: material.name,
        color: "#8a7a5c",
        roughness: 0.48,
        metalness: 0.28,
      });
    case "cloth":
      return clothMaterial(material.name, cloth, weave, 0.88);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

type ClothWeave = { normal: CanvasTexture; rough: CanvasTexture };

let weaveMaps: ClothWeave | null = null;

function clothWeave(): ClothWeave | null {
  if (weaveMaps) return weaveMaps;
  if (typeof document === "undefined") return null;
  const size = 96;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext("2d");
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext("2d");
  if (!normalCtx || !roughCtx) return null;
  const normalImage = normalCtx.createImageData(size, size);
  const roughImage = roughCtx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const warp = x % 4 < 2;
      const weft = y % 4 < 2;
      const pixel = (y * size + x) * 4;
      normalImage.data[pixel] = 128 + (warp ? 14 : -10);
      normalImage.data[pixel + 1] = 128 + (weft ? 10 : -12);
      normalImage.data[pixel + 2] = 246;
      normalImage.data[pixel + 3] = 255;
      const shade = warp === weft ? 214 : 168;
      roughImage.data[pixel] = shade;
      roughImage.data[pixel + 1] = shade;
      roughImage.data[pixel + 2] = shade;
      roughImage.data[pixel + 3] = 255;
    }
  }
  normalCtx.putImageData(normalImage, 0, 0);
  roughCtx.putImageData(roughImage, 0, 0);
  const normal = new CanvasTexture(normalCanvas);
  const rough = new CanvasTexture(roughCanvas);
  for (const texture of [normal, rough]) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(3.5, 3.5);
    texture.colorSpace = LinearSRGBColorSpace;
    texture.needsUpdate = true;
  }
  weaveMaps = { normal, rough };
  return weaveMaps;
}

function clothMaterial(name: string, color: Color, weave: ClothWeave | null, roughness: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness: 0,
    normalMap: weave?.normal ?? null,
    roughnessMap: weave?.rough ?? null,
  });
  if (weave) material.normalScale = new Vector2(1.6, 1.6);
  return material;
}

function sundayLayers(clone: Object3D, tint: number): Object3D[] {
  const added: Object3D[] = [];
  const color = new Color(clothPalette[Math.abs(tint + 2) % clothPalette.length] ?? "#4d5156");
  color.lerp(new Color("#6f6a63"), 0.2);
  const cloth = clothMaterial("sunday", color, clothWeave(), 0.9);
  const head = clone.getObjectByName("Head");
  if (head) {
    const scarf = new Mesh(new SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth);
    scarf.scale.set(1.15, 0.72, 1.2);
    scarf.position.set(0, 0.06, 0.01);
    const tail = new Mesh(new BoxGeometry(0.16, 0.28, 0.04), cloth);
    tail.position.set(0, -0.08, -0.1);
    head.add(scarf, tail);
    added.push(scarf, tail);
  }
  const hips = clone.getObjectByName("Hips");
  if (hips) {
    const skirt = new Mesh(new CylinderGeometry(0.2, 0.34, 0.52, 14, 1, true), cloth);
    skirt.position.set(0, -0.22, 0.02);
    hips.add(skirt);
    added.push(skirt);
  }
  return added;
}

function attachProps(
  clone: Object3D,
  options: { carry: Carry; censing: boolean; elevated: boolean },
): Object3D[] {
  const added: Object3D[] = [];
  const chest = clone.getObjectByName("Chest") ?? clone.getObjectByName("Torso");
  const hand = clone.getObjectByName("WristR") ?? chest;
  const held = propFor(options.carry);
  const anchor = options.carry === "candle" ? hand : chest;
  if (held && anchor) {
    held.position.copy(propOffset(options.carry, options.elevated));
    anchor.add(held);
    added.push(held);
  }
  if (options.censing && hand) {
    const censer = makeCenser();
    censer.position.set(0, -0.18, 0.04);
    hand.add(censer);
    clone.userData.censer = censer;
    added.push(censer);
  }
  return added;
}

function propFor(carry: Carry): Group | null {
  switch (carry) {
    case "none":
      return null;
    case "gospel":
      return gospel();
    case "gifts":
      return gifts();
    case "candle":
      return candle();
    case "cross":
      return handCross();
    default: {
      const exhaustive: never = carry;
      return exhaustive;
    }
  }
}

function propOffset(carry: Carry, elevated: boolean): Vector3 {
  switch (carry) {
    case "none":
      return new Vector3();
    case "gospel":
      return new Vector3(0.02, elevated ? 0.42 : 0.08, 0.24);
    case "gifts":
      return new Vector3(0.0, elevated ? 0.5 : 0.16, 0.36);
    case "candle":
      return new Vector3(0.04, 0.02, 0.08);
    case "cross":
      return new Vector3(0.08, 0.18, 0.32);
    default: {
      const exhaustive: never = carry;
      return exhaustive;
    }
  }
}

function gospel(): Group {
  const group = new Group();
  const cover = new Mesh(new BoxGeometry(0.16, 0.22, 0.04), book);
  const pages = new Mesh(new BoxGeometry(0.13, 0.18, 0.025), page);
  const ornament = new Mesh(new BoxGeometry(0.06, 0.08, 0.01), gold);
  ornament.position.z = 0.024;
  group.add(cover, pages, ornament);
  return group;
}

function gifts(): Group {
  const group = new Group();
  const foot = new Mesh(new CylinderGeometry(0.055, 0.06, 0.018, 12), gold);
  const stem = new Mesh(new CylinderGeometry(0.012, 0.014, 0.14, 10), gold);
  stem.position.y = 0.08;
  const cup = new Mesh(new CylinderGeometry(0.072, 0.034, 0.1, 14), gold);
  cup.position.y = 0.18;
  const bowl = new Mesh(new SphereGeometry(0.028, 10, 8), gold);
  bowl.scale.set(1, 0.45, 1);
  bowl.position.y = 0.2;
  const handle = new Mesh(new CylinderGeometry(0.006, 0.006, 0.22, 8), gold);
  handle.rotation.z = Math.PI / 2.4;
  handle.position.set(0.12, 0.16, 0.02);
  const scoop = new Mesh(new SphereGeometry(0.022, 8, 6), gold);
  scoop.scale.set(1.3, 0.45, 1);
  scoop.position.set(0.2, 0.2, 0.02);
  group.add(foot, stem, cup, bowl, handle, scoop);
  group.scale.setScalar(1.75);
  return group;
}

function candle(): Group {
  const group = new Group();
  const wax = new Mesh(
    new CylinderGeometry(0.02, 0.022, 0.42, 10),
    new MeshStandardMaterial({ color: "#f6f1e4", roughness: 0.62 }),
  );
  wax.position.y = 0.16;
  const flame = new Mesh(
    new SphereGeometry(0.028, 8, 6),
    new MeshStandardMaterial({ color: "#ffb45a", emissive: "#ff8a1e", emissiveIntensity: 1.4, roughness: 0.4 }),
  );
  flame.scale.set(1, 1.5, 1);
  flame.position.y = 0.4;
  group.add(wax, flame);
  return group;
}

function handCross(): Group {
  const group = new Group();
  const upright = new Mesh(new BoxGeometry(0.028, 0.28, 0.016), gold);
  const main = new Mesh(new BoxGeometry(0.16, 0.022, 0.016), gold);
  main.position.y = 0.04;
  const title = new Mesh(new BoxGeometry(0.09, 0.016, 0.014), gold);
  title.position.y = 0.1;
  const foot = new Mesh(new BoxGeometry(0.07, 0.014, 0.014), gold);
  foot.position.y = -0.07;
  foot.rotation.z = 0.35;
  group.add(upright, main, title, foot);
  group.scale.setScalar(1.85);
  return group;
}

function makeCenser(): Group {
  const group = new Group();
  const chain = new Mesh(new CylinderGeometry(0.006, 0.006, 0.22, 6), gold);
  chain.position.y = 0.1;
  const bowl = new Mesh(new SphereGeometry(0.045, 10, 8), gold);
  bowl.scale.set(1, 0.7, 1);
  group.add(chain, bowl);
  const puff = new PlaneGeometry(0.18, 0.26);
  for (let index = 0; index < 3; index += 1) {
    const material = smokeMat.clone();
    const cloud = new Mesh(puff, material);
    cloud.userData.puff = index;
    cloud.position.y = 0.22 + index * 0.1;
    group.add(cloud);
  }
  return group;
}

function applyCross(clone: Object3D, t: number): void {
  const upper = clone.getObjectByName("UpperArmR");
  const lower = clone.getObjectByName("LowerArmR");
  if (!upper || !lower) return;
  const lift = Math.sin(Math.min(1, t * 1.35) * Math.PI);
  upper.rotation.z += 1.15 * lift;
  upper.rotation.x += -1.05 * lift;
  lower.rotation.z += 0.85 * lift;
}

function poseLegs(clone: Object3D, facingRoot: Object3D, stance: Stance): void {
  switch (stance) {
    case "stand":
    case "bow":
      return;
    case "sit": {
      facingRoot.updateWorldMatrix(true, false);
      facingRoot.getWorldQuaternion(quatA);
      forwardDir.set(0, 0, 1).applyQuaternion(quatA).normalize();
      thighDir.set(forwardDir.x, -0.05, forwardDir.z).normalize();
      clone.updateMatrixWorld(true);
      for (const side of ["L", "R"] as const) {
        const upper = clone.getObjectByName(`UpperLeg${side}`);
        const lower = clone.getObjectByName(`LowerLeg${side}`);
        if (upper) aimLocalY(upper, thighDir);
        if (lower) aimLocalY(lower, worldDown);
        placeFoot(clone, side, 0.46);
      }
      return;
    }
    case "kneel": {
      const body = clone.getObjectByName("Body");
      if (body) body.position.y = 0.36;
      clone.updateMatrixWorld(true);
      facingRoot.getWorldQuaternion(quatA);
      forwardDir.set(0, 0, 1).applyQuaternion(quatA).normalize();
      thighDir.set(0, -0.92, 0).addScaledVector(forwardDir, 0.35);
      shinDir.set(0, -0.08, 0).addScaledVector(forwardDir, -1);
      for (const side of ["L", "R"] as const) {
        const upper = clone.getObjectByName(`UpperLeg${side}`);
        const lower = clone.getObjectByName(`LowerLeg${side}`);
        if (upper) aimLocalY(upper, thighDir);
        if (lower) aimLocalY(lower, shinDir);
        placeFoot(clone, side, 0.42);
      }
      return;
    }
    default: {
      const exhaustive: never = stance;
      return exhaustive;
    }
  }
}

function aimLocalY(bone: Object3D, direction: Vector3): void {
  const parent = bone.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(quatA);
  const y = footPoint.copy(direction).normalize();
  const helper = Math.abs(y.y) > 0.85 ? axisX : axisY;
  const x = basisX.crossVectors(helper, y);
  if (x.lengthSq() < 1e-8) x.crossVectors(axisZ, y);
  x.normalize();
  const z = basisZ.crossVectors(x, y).normalize();
  quatB.setFromRotationMatrix(basis.makeBasis(x, y, z));
  bone.quaternion.copy(quatA.invert()).multiply(quatB);
  bone.updateMatrixWorld(true);
}

function placeFoot(clone: Object3D, side: "L" | "R", length: number): void {
  const lower = clone.getObjectByName(`LowerLeg${side}`);
  const foot = clone.getObjectByName(`Foot${side}`);
  if (!lower || !foot?.parent) return;
  lower.updateMatrixWorld(true);
  lower.getWorldQuaternion(quatB);
  const shin = aimDir.set(0, 1, 0).applyQuaternion(quatB);
  lower.getWorldPosition(footPoint);
  footPoint.addScaledVector(shin, length);
  foot.parent.worldToLocal(footPoint);
  foot.position.copy(footPoint);
}

function footVertexIndices(mesh: SkinnedMesh): number[] {
  const cached = mesh.userData.footVerts as number[] | undefined;
  if (cached) return cached;
  const bones = mesh.skeleton.bones;
  const ids = new Set<number>();
  bones.forEach((bone, index) => {
    const name = bone.name.replaceAll(".", "");
    if (name === "FootL" || name === "FootR") ids.add(index);
  });
  const indexAttr = mesh.geometry.getAttribute("skinIndex");
  const weightAttr = mesh.geometry.getAttribute("skinWeight");
  const found: number[] = [];
  if (indexAttr && weightAttr && ids.size > 0) {
    for (let vertex = 0; vertex < indexAttr.count; vertex += 1) {
      for (let slot = 0; slot < indexAttr.itemSize; slot += 1) {
        const bone = indexAttr.getComponent(vertex, slot);
        const weight = weightAttr.getComponent(vertex, slot);
        if (ids.has(bone) && weight > 0.2) {
          found.push(vertex);
          break;
        }
      }
    }
  }
  mesh.userData.footVerts = found;
  return found;
}

/** Lowest skinned shoe vertex, after the pose. Bind-pose bounds are not the sole. */
function soleWorldY(clone: Object3D): number {
  let minY = Infinity;
  clone.updateWorldMatrix(true, true);
  clone.traverse((child) => {
    if (!(child instanceof SkinnedMesh)) return;
    const verts = footVertexIndices(child);
    const stride = verts.length > 32 ? Math.ceil(verts.length / 32) : 1;
    for (let index = 0; index < verts.length; index += stride) {
      const vertex = verts[index];
      if (vertex === undefined) continue;
      child.getVertexPosition(vertex, footPoint);
      footPoint.applyMatrix4(child.matrixWorld);
      if (footPoint.y < minY) minY = footPoint.y;
    }
  });
  if (Number.isFinite(minY)) return minY;
  for (const name of ["FootL", "FootR", "Foot.L", "Foot.R"]) {
    const foot = clone.getObjectByName(name);
    if (!foot) continue;
    foot.getWorldPosition(footPoint);
    if (footPoint.y < minY) minY = footPoint.y;
  }
  return minY;
}

function plantFeet(root: Group, clone: Object3D, scene: Object3D): void {
  root.updateMatrixWorld(true);
  const foot = clone.getObjectByName("FootL") ?? clone.getObjectByName("Foot.L") ?? clone.getObjectByName("FootR");
  if (foot) foot.getWorldPosition(parentPoint);
  else root.getWorldPosition(parentPoint);
  const minY = soleWorldY(clone);
  if (!Number.isFinite(minY)) return;
  const floorY = raycastFloor(scene, parentPoint.x, parentPoint.z, minY + 0.5);
  root.getWorldScale(scalePoint);
  const scaleY = Math.abs(scalePoint.y) > 0.001 ? scalePoint.y : 1;
  const body = clone.getObjectByName("Body");
  if (body) body.getWorldPosition(scratch);
  const lift = floorY - minY;
  root.position.y += lift / scaleY;
  root.userData.soleY = minY;
  root.userData.floorY = floorY;
  root.userData.soleX = parentPoint.x;
  root.userData.soleZ = parentPoint.z;
  root.userData.hipY = body ? scratch.y + lift : Number.NaN;
}
