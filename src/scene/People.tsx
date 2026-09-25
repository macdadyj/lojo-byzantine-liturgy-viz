import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  LatheGeometry,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  AnimationClip,
  type Material,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Gesture } from "./gestures";
import type { Vec3 } from "./path";
import type { Quality } from "./quality";
import type { Stance } from "./staging";
import {
  deaconBrocadeTexture,
  priestBrocadeTexture,
  weaveNormalTexture,
  weaveTexture,
} from "./surfaces";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts";
export type Age = "child" | "teen" | "adult" | "elder";
type Gender = "man" | "woman";
type ClipName = "idle" | "walk" | "sit";

const manUrl = `${import.meta.env.BASE_URL}models/man.glb`;
const womanUrl = `${import.meta.env.BASE_URL}models/woman.glb`;

useGLTF.preload(manUrl);
useGLTF.preload(womanUrl);

const phelonionGap = 1.15;
const phelonion = new LatheGeometry(
  [
    new Vector2(0.28, -0.78),
    new Vector2(0.55, -0.22),
    new Vector2(0.48, 0.18),
    new Vector2(0.34, 0.46),
    new Vector2(0.2, 0.64),
  ],
  22,
  phelonionGap / 2,
  Math.PI * 2 - phelonionGap,
);

const sticharion = new LatheGeometry(
  [
    new Vector2(0.2, -0.9),
    new Vector2(0.32, -0.35),
    new Vector2(0.26, 0.16),
    new Vector2(0.2, 0.48),
    new Vector2(0.13, 0.64),
  ],
  18,
);

const coatShape = new LatheGeometry(
  [
    new Vector2(0.18, -0.82),
    new Vector2(0.28, -0.28),
    new Vector2(0.24, 0.18),
    new Vector2(0.19, 0.5),
  ],
  16,
);

const black = new MeshStandardMaterial({ color: "#1a1614", roughness: 0.72 });
const smokeMat = new MeshStandardMaterial({
  color: "#efe6d8",
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  roughness: 1,
});

const cloth = {
  priest: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0.08, side: 2 }),
  deacon: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0.08, side: 2 }),
  reader: new MeshStandardMaterial({ color: "#3c3848", roughness: 0.8, side: 2 }),
  under: new MeshStandardMaterial({ color: "#f3efe4", roughness: 0.84, side: 2 }),
  gold: new MeshStandardMaterial({
    color: "#e0b85a",
    roughness: 0.32,
    metalness: 0.72,
    emissive: "#5a3e12",
    emissiveIntensity: 0.18,
  }),
  hair: new MeshStandardMaterial({ color: "#2a211c", roughness: 0.85 }),
  scarf: new MeshStandardMaterial({ color: "#6b4034", roughness: 0.9, side: 2 }),
  book: new MeshStandardMaterial({ color: "#4a2a22", roughness: 0.55, metalness: 0.15 }),
  page: new MeshStandardMaterial({ color: "#f4efe4", roughness: 0.7 }),
};

let dressed = false;

function dressMaterials(): void {
  if (dressed || typeof document === "undefined") return;
  dressed = true;
  const weave = weaveTexture();
  const normal = weaveNormalTexture();
  cloth.priest.map = priestBrocadeTexture();
  cloth.priest.normalMap = normal;
  cloth.priest.normalScale.set(0.45, 0.45);
  cloth.deacon.map = deaconBrocadeTexture();
  cloth.deacon.normalMap = normal;
  cloth.deacon.normalScale.set(0.4, 0.4);
  cloth.under.map = weave;
  cloth.reader.map = weave;
  cloth.scarf.map = weave;
}

const coatMaterials = new Map<string, MeshStandardMaterial>();

function coatMaterial(color: string): MeshStandardMaterial {
  dressMaterials();
  const existing = coatMaterials.get(color);
  if (existing) return existing;
  const material = new MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, side: 2 });
  const weave = weaveTexture();
  material.map = weave;
  material.normalMap = weaveNormalTexture();
  material.normalScale.set(0.35, 0.35);
  coatMaterials.set(color, material);
  return material;
}

const sharedGeometry = new Set<LatheGeometry>([phelonion, sticharion, coatShape]);
const elderSkin = new Color("#c8b8a8");
const hairColors: Record<Age, string> = {
  child: "#4a3424",
  teen: "#24180f",
  adult: "#2a211c",
  elder: "#c4beb4",
};

const worldPoint = new Vector3();

type PersonProps = {
  gender: Gender;
  stance: Stance;
  walking?: boolean;
  role?: ClergyRole;
  carry?: Carry;
  beard?: boolean;
  scarf?: boolean;
  coat?: string;
  age?: Age;
  phase?: number;
  gesture?: Gesture;
  censing?: boolean;
  quality?: Quality;
  important?: boolean;
};

export function ageScale(age: Age): number {
  switch (age) {
    case "child":
      return 0.58;
    case "teen":
      return 0.8;
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
}: {
  role: ClergyRole;
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
  gesture?: Gesture;
  censing?: boolean;
  quality?: Quality;
}) {
  return (
    <Person
      gender="man"
      stance={stance}
      walking={walking}
      role={role}
      carry={carry}
      beard={role !== "reader"}
      gesture={gesture}
      censing={censing && role === "deacon"}
      quality={quality}
      important
    />
  );
}

export type CrowdSpot = {
  position: Vec3;
  rotationY: number;
  color: string;
  woman: boolean;
  age: Age;
  scarf?: boolean;
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
  return (
    <group>
      {spots.map((spot) => (
        <group
          key={spot.position.join(",")}
          position={spot.position}
          rotation={[0, spot.rotationY, 0]}
          scale={ageScale(spot.age)}
        >
          <Person
            gender={spot.woman ? "woman" : "man"}
            stance={stance}
            scarf={spot.scarf ?? spot.woman}
            coat={spot.color}
            age={spot.age}
            phase={spot.phase}
            gesture={gesture}
            quality={quality}
          />
        </group>
      ))}
    </group>
  );
}

function Person({
  gender,
  stance,
  walking = false,
  role,
  carry = "none",
  beard = false,
  scarf = false,
  coat,
  age = "adult",
  phase = 0,
  gesture = "none",
  censing = false,
  quality = "medium",
  important = false,
}: PersonProps) {
  const man = useGLTF(manUrl);
  const woman = useGLTF(womanUrl);
  const source = gender === "woman" ? woman : man;
  const clone = useMemo(() => cloneSkeleton(source.scene), [source.scene]);
  const mixer = useMemo(() => new AnimationMixer(clone), [clone]);
  const clipName: ClipName = walking ? "walk" : stance === "sit" ? "sit" : "idle";
  const clip = useMemo(() => findClip(source.animations, clipName), [clipName, source.animations]);
  const root = useRef<Group>(null);
  const accum = useRef(0);

  useLayoutEffect(() => {
    dressMaterials();
    const tinted = tintFigure(clone, hairColors[age], age);
    const added = dress(clone, { role, carry, beard, scarf, coat, censing: censing && quality !== "low" });
    return () => {
      for (const material of tinted) material.dispose();
      for (const object of added) {
        object.traverse((child) => {
          if (child instanceof Mesh && !sharedGeometry.has(child.geometry as LatheGeometry)) {
            child.geometry.dispose();
          }
          if (child instanceof Mesh && child.material instanceof MeshStandardMaterial && child.material.opacity < 1) {
            child.material.dispose();
          }
        });
        object.removeFromParent();
      }
    };
  }, [age, beard, carry, censing, clone, coat, quality, role, scarf]);

  useLayoutEffect(() => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    if (!walking) mixer.update(stance === "sit" ? 0.35 : 0.08 + phase * 0.2);
  }, [clip, mixer, phase, stance, walking]);

  useFrame((state, delta) => {
    const body = root.current;
    if (!body) return;
    body.getWorldPosition(worldPoint);
    const distance = state.camera.position.distanceTo(worldPoint);
    const far = !important && distance > (quality === "low" ? 9 : 14);
    if (far) {
      accum.current += delta;
      if (accum.current < 0.16) return;
      mixer.update(accum.current);
      accum.current = 0;
      return;
    }
    mixer.update(walking ? delta : delta * 0.45);
    const time = state.clock.elapsedTime + phase * 6;
    if (stance !== "bow" && !walking) {
      const spine = clone.getObjectByName("spine_01");
      if (spine) spine.rotation.x += Math.sin(time * 1.5) * 0.025;
    }
    if (stance === "bow") {
      const spine = clone.getObjectByName("spine_02");
      if (spine) spine.rotation.x = 0.7;
    }
    if (gesture === "cross") applyCross(clone, (time % 2.8) / 2.8);
    const censer = clone.userData.censer as Group | undefined;
    if (censer) {
      censer.rotation.z = Math.sin(time * 2.5) * 0.65;
      censer.children.forEach((child, index) => {
        if (!(child instanceof Mesh) || child.material === smokeMat) return;
        if (child.userData.puff === undefined) return;
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

function findClip(animations: AnimationClip[], name: ClipName): AnimationClip {
  const clip = animations.find((item) => item.name === name);
  if (!clip) return animations[0] ?? new AnimationClip("idle", 0, []);
  return clip;
}

function tintFigure(root: Object3D, hair: string, age: Age): Material[] {
  const created: Material[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = child.material;
    if (Array.isArray(source) || !(source instanceof MeshStandardMaterial)) return;
    const name = source.name.toLowerCase();
    if (name.includes("hair")) {
      const next = source.clone();
      next.color.set(hair);
      child.material = next;
      created.push(next);
    } else if (age === "elder" && name.includes("superhero")) {
      const next = source.clone();
      next.color.lerp(elderSkin, 0.35);
      child.material = next;
      created.push(next);
    }
  });
  return created;
}

function dress(
  clone: Object3D,
  options: { role?: ClergyRole; carry: Carry; beard: boolean; scarf: boolean; coat?: string; censing: boolean },
): Object3D[] {
  const added: Object3D[] = [];
  const pelvis = clone.getObjectByName("pelvis");
  const head = clone.getObjectByName("Head");
  const spine = clone.getObjectByName("spine_03");
  if (options.role && pelvis) {
    const robe = vestment(options.role);
    pelvis.add(robe);
    added.push(robe);
  } else if (options.coat && pelvis) {
    const garment = new Mesh(coatShape, coatMaterial(options.coat));
    garment.rotation.x = -0.28;
    pelvis.add(garment);
    added.push(garment);
  }
  if (options.beard && head) {
    const beard = new Mesh(new SphereGeometry(0.07, 14, 12), cloth.hair);
    beard.scale.set(1.2, 1.15, 0.72);
    beard.position.set(0, -0.07, 0.08);
    head.add(beard);
    added.push(beard);
    const moustache = new Mesh(new SphereGeometry(0.028, 8, 6), cloth.hair);
    moustache.scale.set(1.6, 0.55, 0.7);
    moustache.position.set(0, -0.02, 0.1);
    head.add(moustache);
    added.push(moustache);
  }
  if (options.scarf && head) {
    const veil = new Mesh(new SphereGeometry(0.14, 14, 10), cloth.scarf);
    veil.scale.set(1.08, 0.7, 1.15);
    veil.position.set(0, 0.02, 0);
    head.add(veil);
    added.push(veil);
  }
  if (options.role === "priest" && head) {
    const hat = new Mesh(new CylinderGeometry(0.09, 0.105, 0.11, 14), black);
    hat.position.set(0, 0.16, 0.01);
    head.add(hat);
    added.push(hat);
  }
  if (options.role === "priest" && spine) {
    const cross = pectoral();
    cross.position.set(0, 0.02, 0.3);
    spine.add(cross);
    added.push(cross);
  }
  if (options.role === "priest" || options.role === "deacon") {
    for (const name of ["lowerarm_l", "lowerarm_r"]) {
      const arm = clone.getObjectByName(name);
      if (!arm) continue;
      const cuff = new Mesh(new BoxGeometry(0.07, 0.045, 0.08), cloth.gold);
      cuff.position.set(0, 0.16, 0);
      arm.add(cuff);
      added.push(cuff);
    }
  }
  if (options.carry !== "none" && spine) {
    const held = options.carry === "gospel" ? gospel() : gifts();
    held.position.set(0.04, -0.05, 0.28);
    spine.add(held);
    added.push(held);
  }
  if (options.censing) {
    const hand = clone.getObjectByName("hand_r") ?? spine;
    if (hand) {
      const censer = makeCenser();
      censer.position.set(0, -0.16, 0.05);
      hand.add(censer);
      clone.userData.censer = censer;
      added.push(censer);
    }
  }
  return added;
}

function vestment(role: ClergyRole): Group {
  const group = new Group();
  group.rotation.x = -0.28;
  switch (role) {
    case "priest":
      group.add(new Mesh(sticharion, cloth.under));
      group.add(new Mesh(phelonion, cloth.priest));
      group.add(strip([0, -0.02, 0.38], [0.1, 1.25, 0.02]));
      group.add(crossMark([0, 0.28, 0.42]));
      group.add(crossMark([-0.2, -0.08, 0.42]));
      group.add(crossMark([0.2, -0.08, 0.42]));
      return group;
    case "deacon":
      group.add(new Mesh(sticharion, cloth.deacon));
      group.add(strip([-0.12, 0.02, 0.36], [0.055, 1.35, 0.02], 0.5));
      group.add(crossMark([-0.16, 0.28, 0.4], 0.7));
      group.add(crossMark([-0.08, -0.05, 0.4], 0.7));
      group.add(crossMark([-0.02, -0.38, 0.4], 0.7));
      return group;
    case "reader":
      group.add(new Mesh(sticharion, cloth.reader));
      return group;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

function strip(position: [number, number, number], size: [number, number, number], tilt = 0): Mesh {
  const panel = new Mesh(new BoxGeometry(size[0], size[1], size[2]), cloth.gold);
  panel.position.set(position[0], position[1], position[2]);
  panel.rotation.z = tilt;
  return panel;
}

function crossMark(position: [number, number, number], scale = 1): Group {
  const group = new Group();
  group.position.set(position[0], position[1], position[2]);
  group.scale.setScalar(scale);
  const horizontal = new Mesh(new BoxGeometry(0.11, 0.02, 0.012), cloth.gold);
  const vertical = new Mesh(new BoxGeometry(0.02, 0.15, 0.012), cloth.gold);
  group.add(horizontal, vertical);
  return group;
}

function pectoral(): Group {
  const group = crossMark([0, 0, 0], 0.85);
  const chain = new Mesh(new BoxGeometry(0.012, 0.18, 0.012), cloth.gold);
  chain.position.y = 0.14;
  group.add(chain);
  return group;
}

function gospel(): Group {
  const group = new Group();
  const cover = new Mesh(new BoxGeometry(0.2, 0.27, 0.05), cloth.book);
  const pages = new Mesh(new BoxGeometry(0.17, 0.23, 0.03), cloth.page);
  const ornament = new Mesh(new BoxGeometry(0.07, 0.09, 0.012), cloth.gold);
  ornament.position.z = 0.028;
  group.add(cover, pages, ornament);
  return group;
}

function gifts(): Group {
  const group = new Group();
  const disk = new Mesh(new CylinderGeometry(0.09, 0.09, 0.02, 12), cloth.gold);
  disk.position.x = -0.1;
  const cup = new Mesh(new CylinderGeometry(0.045, 0.028, 0.12, 10), cloth.gold);
  cup.position.set(0.08, 0.06, 0);
  const foot = new Mesh(new CylinderGeometry(0.04, 0.04, 0.015, 10), cloth.gold);
  foot.position.set(0.08, 0.0, 0);
  group.add(disk, cup, foot);
  return group;
}

function makeCenser(): Group {
  const group = new Group();
  const chain = new Mesh(new CylinderGeometry(0.008, 0.008, 0.28, 6), cloth.gold);
  chain.position.y = 0.12;
  const bowl = new Mesh(new SphereGeometry(0.055, 12, 10), cloth.gold);
  bowl.scale.set(1, 0.7, 1);
  group.add(chain, bowl);
  const puff = new PlaneGeometry(0.22, 0.32);
  for (let index = 0; index < 3; index += 1) {
    const material = smokeMat.clone();
    const cloud = new Mesh(puff, material);
    cloud.userData.puff = index;
    cloud.position.y = 0.25 + index * 0.12;
    group.add(cloud);
  }
  return group;
}

function applyCross(clone: Object3D, t: number): void {
  const upper = clone.getObjectByName("upperarm_r");
  const lower = clone.getObjectByName("lowerarm_r");
  if (!upper || !lower) return;
  const lift = Math.sin(Math.min(1, t * 1.35) * Math.PI);
  upper.rotation.x += -1.15 * lift;
  upper.rotation.z += 0.85 * lift;
  lower.rotation.x += 0.35 * lift;
  lower.rotation.z += 1.05 * lift;
}
