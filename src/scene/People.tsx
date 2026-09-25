import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  BoxGeometry,
  CylinderGeometry,
  Group,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  AnimationClip,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Gesture } from "./gestures";
import type { Vec3 } from "./path";
import type { Quality } from "./quality";
import type { Stance } from "./staging";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts";
export type Age = "child" | "teen" | "adult" | "elder";

const figures = {
  manYoung: "man-young.glb",
  manElder: "man-elder.glb",
  womanYoung: "woman-young.glb",
  womanAdult: "woman-adult.glb",
  babushka: "babushka.glb",
  girl: "girl.glb",
  boy: "boy.glb",
  priest: "priest.glb",
  deacon: "deacon.glb",
  reader: "reader.glb",
} as const;

type FigureKind = keyof typeof figures;

function modelUrl(kind: FigureKind): string {
  return `${import.meta.env.BASE_URL}models/${figures[kind]}`;
}

for (const kind of Object.keys(figures) as FigureKind[]) {
  useGLTF.preload(modelUrl(kind), false, true);
}

const gold = new MeshStandardMaterial({
  color: "#e0b85a",
  roughness: 0.32,
  metalness: 0.72,
  emissive: "#5a3e12",
  emissiveIntensity: 0.18,
});
const book = new MeshStandardMaterial({ color: "#4a2a22", roughness: 0.55, metalness: 0.15 });
const page = new MeshStandardMaterial({ color: "#f4efe4", roughness: 0.7 });
const smokeMat = new MeshStandardMaterial({
  color: "#efe6d8",
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  roughness: 1,
});

type FigureSource = {
  scene: Group;
  animations: AnimationClip[];
};

function loadFigure(kind: FigureKind): FigureSource {
  const loaded = useGLTF(modelUrl(kind), false, true);
  if (Array.isArray(loaded)) {
    const first = loaded[0];
    if (!first) return { scene: new Group(), animations: [] };
    return first;
  }
  return loaded;
}

function useFigures(): Record<FigureKind, FigureSource> {
  return {
    manYoung: loadFigure("manYoung"),
    manElder: loadFigure("manElder"),
    womanYoung: loadFigure("womanYoung"),
    womanAdult: loadFigure("womanAdult"),
    babushka: loadFigure("babushka"),
    girl: loadFigure("girl"),
    boy: loadFigure("boy"),
    priest: loadFigure("priest"),
    deacon: loadFigure("deacon"),
    reader: loadFigure("reader"),
  };
}

function figureFor(woman: boolean, age: Age, scarf: boolean, index: number): FigureKind {
  if (age === "child") return woman ? "girl" : "boy";
  if (age === "elder") return woman || scarf ? "babushka" : "manElder";
  if (age === "teen") return woman ? "womanYoung" : "manYoung";
  if (woman) return index % 2 === 0 ? "womanYoung" : "womanAdult";
  return "manYoung";
}

export function ageScale(age: Age): number {
  switch (age) {
    case "child":
      return 1;
    case "teen":
      return 0.9;
    case "adult":
      return 1;
    case "elder":
      return 1;
    default: {
      const exhaustive: never = age;
      return exhaustive;
    }
  }
}

function clergyKind(role: ClergyRole): FigureKind {
  switch (role) {
    case "priest":
      return "priest";
    case "deacon":
      return "deacon";
    case "reader":
      return "reader";
    default: {
      const exhaustive: never = role;
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
  const library = useFigures();
  return (
    <Person
      source={library[clergyKind(role)]}
      stance={stance}
      walking={walking}
      carry={carry}
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
  const library = useFigures();
  if (spots.length === 0) return null;
  return (
    <group>
      {spots.map((spot, index) => (
        <group
          key={spot.position.join(",")}
          position={spot.position}
          rotation={[0, spot.rotationY, 0]}
          scale={ageScale(spot.age)}
        >
          <Person
            source={library[figureFor(spot.woman, spot.age, spot.scarf ?? false, index)]}
            stance={stance}
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
  source,
  stance,
  walking = false,
  carry = "none",
  phase = 0,
  gesture = "none",
  censing = false,
  quality = "medium",
  important = false,
}: {
  source: FigureSource;
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
  phase?: number;
  gesture?: Gesture;
  censing?: boolean;
  quality?: Quality;
  important?: boolean;
}) {
  const clone = useMemo(() => cloneSkeleton(source.scene), [source.scene]);
  const mixer = useMemo(() => new AnimationMixer(clone), [clone]);
  const clipName = clipFor(walking, stance, gesture);
  const clip = useMemo(() => findClip(source.animations, clipName), [clipName, source.animations]);
  const root = useRef<Group>(null);
  const accum = useRef(0);

  useLayoutEffect(() => {
    const added = propsOn(clone, { carry, censing: censing && quality !== "low" });
    return () => {
      for (const object of added) {
        object.traverse((child) => {
          if (child instanceof Mesh) child.geometry.dispose();
        });
        object.removeFromParent();
      }
      delete clone.userData.censer;
    };
  }, [carry, censing, clone, quality]);

  useLayoutEffect(() => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    mixer.setTime(stance === "sit" ? 0.2 : phase * Math.min(clip.duration, 1.5));
  }, [clip, mixer, phase, stance]);

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
    } else {
      mixer.update(walking ? delta : delta * 0.45);
    }
    if (stance === "sit") dropOntoPew(clone);
    const censer = clone.userData.censer as Group | undefined;
    if (censer) swingCenser(censer, state.clock.elapsedTime + phase * 6);
  });

  return (
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <primitive object={clone} />
    </group>
  );
}

const worldPoint = new Vector3();

function clipFor(walking: boolean, stance: Stance, gesture: Gesture): string {
  if (walking) return "walk";
  switch (gesture) {
    case "cross":
      return "cross";
    case "none":
      break;
    default: {
      const exhaustive: never = gesture;
      return exhaustive;
    }
  }
  switch (stance) {
    case "bow":
      return "bow";
    case "sit":
      return "sit";
    case "stand":
      return "idle";
    default: {
      const exhaustive: never = stance;
      return exhaustive;
    }
  }
}

function findClip(animations: AnimationClip[], name: string): AnimationClip {
  return animations.find((item) => item.name === name) ?? animations[0] ?? new AnimationClip("idle", 0, []);
}

function dropOntoPew(clone: Object3D): void {
  const pelvis = clone.getObjectByName("pelvis");
  if (!pelvis) return;
  pelvis.position.y = -0.42;
}

function propsOn(clone: Object3D, options: { carry: Carry; censing: boolean }): Object3D[] {
  const added: Object3D[] = [];
  const spine = clone.getObjectByName("spine_03");
  if (options.carry !== "none" && spine) {
    const held = options.carry === "gospel" ? gospel() : gifts();
    held.position.set(0.04, -0.02, 0.22);
    spine.add(held);
    added.push(held);
  }
  if (options.censing) {
    const hand = clone.getObjectByName("hand_r") ?? spine;
    if (hand) {
      const censer = makeCenser();
      censer.position.set(0.04, -0.42, 0.16);
      hand.add(censer);
      clone.userData.censer = censer;
      added.push(censer);
    }
  }
  return added;
}

function swingCenser(censer: Group, time: number): void {
  censer.rotation.z = Math.sin(time * 2.5) * 0.65;
  censer.children.forEach((child, index) => {
    if (!(child instanceof Mesh) || child.userData.puff === undefined) return;
    const puff = Number(child.userData.puff);
    child.position.y = 0.22 + ((time * 0.35 + puff) % 1) * 0.45;
    const material = child.material as MeshStandardMaterial;
    material.opacity = 0.08 + (1 - ((time * 0.35 + puff) % 1)) * 0.2;
    child.position.x = Math.sin(time * 1.4 + index) * 0.04;
  });
}

function gospel(): Group {
  const group = new Group();
  const cover = new Mesh(new BoxGeometry(0.16, 0.22, 0.04), book);
  const pages = new Mesh(new BoxGeometry(0.13, 0.18, 0.025), page);
  const ornament = new Mesh(new BoxGeometry(0.05, 0.07, 0.01), gold);
  ornament.position.z = 0.022;
  group.add(cover, pages, ornament);
  return group;
}

function gifts(): Group {
  const group = new Group();
  const disk = new Mesh(new CylinderGeometry(0.07, 0.07, 0.016, 12), gold);
  disk.position.x = -0.08;
  const cup = new Mesh(new CylinderGeometry(0.035, 0.022, 0.1, 10), gold);
  cup.position.set(0.06, 0.05, 0);
  const foot = new Mesh(new CylinderGeometry(0.03, 0.03, 0.012, 10), gold);
  foot.position.set(0.06, 0, 0);
  group.add(disk, cup, foot);
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
    const cloud = new Mesh(puff, smokeMat.clone());
    cloud.userData.puff = index;
    cloud.position.y = 0.22 + index * 0.1;
    group.add(cloud);
  }
  return group;
}
