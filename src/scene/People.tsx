import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationClip,
  AnimationMixer,
  BoxGeometry,
  CylinderGeometry,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Color,
  Group,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { nextBlockerId, releaseBlocker, trackBlocker } from "./collide";
import type { Gesture } from "./gestures";
import type { Vec3 } from "./path";
import type { Quality } from "./quality";
import type { Stance } from "./staging";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts";
export type Age = "child" | "teen" | "adult" | "elder";
type ClipName = "idle" | "walk" | "sit" | "kneel";

const castNames = [
  "m-hoodie",
  "m-casual",
  "m-farmer",
  "m-worker",
  "m-suit",
  "m-elder",
  "w-casual",
  "w-formal",
  "w-suit",
  "w-worker",
  "w-dress",
] as const;

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
        const file = castNames[spot.cast % castNames.length] ?? "m-hoodie";
        const forward = stance === "kneel" ? -0.72 : stance === "sit" ? 0.04 : 0;
        return (
          <group
            key={`${spot.position.join(",")}-${spot.cast}`}
            position={[spot.position[0], spot.position[1], spot.position[2] + forward]}
            rotation={[0, spot.rotationY, 0]}
            scale={ageScale(spot.age)}
          >
            <Person
              file={file}
              stance={stance}
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
    const created = tintFigure(clone, tint, age);
    const added = attachProps(clone, { carry, censing: censing && quality !== "low", elevated });
    const head = clone.getObjectByName("Head");
    if (head && age === "child") head.scale.setScalar(1.22);
    return () => {
      for (const material of created) material.dispose();
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
  }, [age, carry, censing, clone, elevated, quality, tint]);

  useLayoutEffect(() => {
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    mixer.update(walking ? 0.2 : 0.05 + phase * 0.4);
  }, [clip, mixer, phase, walking]);

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
      return;
    }
    mixer.update(walking ? delta : delta * 0.55);
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

function tintFigure(root: Object3D, tint: number, age: Age): Material[] {
  const created: Material[] = [];
  const skin = new Color(skinTints[Math.abs(tint) % skinTints.length] ?? "#c68642");
  const hair = new Color(hairTints[Math.abs(tint + 3) % hairTints.length] ?? "#2a2118");
  if (age === "elder") hair.lerp(new Color("#d9d3c7"), 0.72);
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = child.material;
    const list = Array.isArray(source) ? source : [source];
    let changed = false;
    const next = list.map((material) => {
      if (!(material instanceof MeshStandardMaterial)) return material;
      const label = material.name.toLowerCase();
      const touchesSkin = label.includes("skin");
      const touchesHair = label.includes("hair") || label.includes("eyebrow");
      if (!touchesSkin && !touchesHair) return material;
      const copy = material.clone();
      if (touchesSkin) copy.color.multiply(skin);
      if (touchesHair) copy.color.multiply(hair);
      created.push(copy);
      changed = true;
      return copy;
    });
    if (changed) child.material = Array.isArray(source) ? next : (next[0] ?? source);
  });
  return created;
}

function attachProps(
  clone: Object3D,
  options: { carry: Carry; censing: boolean; elevated: boolean },
): Object3D[] {
  const added: Object3D[] = [];
  const chest = clone.getObjectByName("Chest") ?? clone.getObjectByName("Torso");
  if (options.carry !== "none" && chest) {
    const held = options.carry === "gospel" ? gospel() : gifts();
    held.position.set(0.02, options.elevated ? 0.42 : 0.02, 0.22);
    chest.add(held);
    added.push(held);
  }
  if (options.censing) {
    const hand = clone.getObjectByName("Wrist.R") ?? chest;
    if (hand) {
      const censer = makeCenser();
      censer.position.set(0, -0.18, 0.04);
      hand.add(censer);
      clone.userData.censer = censer;
      added.push(censer);
    }
  }
  return added;
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
  const disk = new Mesh(new CylinderGeometry(0.07, 0.07, 0.018, 12), gold);
  disk.position.x = -0.08;
  const cup = new Mesh(new CylinderGeometry(0.038, 0.022, 0.1, 10), gold);
  cup.position.set(0.07, 0.05, 0);
  group.add(disk, cup);
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
  const upper = clone.getObjectByName("UpperArm.R");
  const lower = clone.getObjectByName("LowerArm.R");
  if (!upper || !lower) return;
  const lift = Math.sin(Math.min(1, t * 1.35) * Math.PI);
  upper.rotation.z += 0.9 * lift;
  upper.rotation.x += -0.8 * lift;
  lower.rotation.z += 0.7 * lift;
}
