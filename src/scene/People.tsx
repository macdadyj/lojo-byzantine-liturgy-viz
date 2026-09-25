import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  AnimationClip,
  type Object3D,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { colors } from "./colors";
import type { Vec3 } from "./path";
import type { Stance } from "./staging";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts";
type Gender = "man" | "woman";
type ClipName = "idle" | "walk" | "sit";

const manUrl = `${import.meta.env.BASE_URL}models/man.glb`;
const womanUrl = `${import.meta.env.BASE_URL}models/woman.glb`;

useGLTF.preload(manUrl);
useGLTF.preload(womanUrl);

/** Gap centered on local +Z, the mesh's face, so the phelonion opens toward the people. */
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
  14,
);

const cloth = {
  priest: new MeshStandardMaterial({ color: colors.priest, roughness: 0.78, side: 2 }),
  deacon: new MeshStandardMaterial({ color: colors.deacon, roughness: 0.78, side: 2 }),
  reader: new MeshStandardMaterial({ color: colors.reader, roughness: 0.8, side: 2 }),
  under: new MeshStandardMaterial({ color: colors.cloth, roughness: 0.84, side: 2 }),
  gold: new MeshStandardMaterial({ color: colors.gold, roughness: 0.4, metalness: 0.45 }),
  hair: new MeshStandardMaterial({ color: "#2a211c", roughness: 0.85 }),
  scarf: new MeshStandardMaterial({ color: "#6b4034", roughness: 0.9, side: 2 }),
  book: new MeshStandardMaterial({ color: "#4a2a22", roughness: 0.55 }),
  page: new MeshStandardMaterial({ color: "#f4efe4", roughness: 0.7 }),
};

const coatMaterials = new Map<string, MeshStandardMaterial>();

function coatMaterial(color: string): MeshStandardMaterial {
  const existing = coatMaterials.get(color);
  if (existing) return existing;
  const material = new MeshStandardMaterial({ color, roughness: 0.86, side: 2 });
  coatMaterials.set(color, material);
  return material;
}

const sharedGeometry = new Set([phelonion, sticharion, coatShape]);

type PersonProps = {
  gender: Gender;
  stance: Stance;
  walking?: boolean;
  role?: ClergyRole;
  carry?: Carry;
  beard?: boolean;
  scarf?: boolean;
  coat?: string;
};

export function Clergy({
  role,
  stance,
  walking = false,
  carry = "none",
}: {
  role: ClergyRole;
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
}) {
  return <Person gender="man" stance={stance} walking={walking} role={role} carry={carry} beard />;
}

export type CrowdSpot = {
  position: Vec3;
  rotationY: number;
  color: string;
  woman: boolean;
};

export function Crowd({ spots, stance }: { spots: readonly CrowdSpot[]; stance: Stance }) {
  if (spots.length === 0) return null;
  return (
    <group>
      {spots.map((spot) => (
        <group key={spot.position.join(",")} position={spot.position} rotation={[0, spot.rotationY, 0]}>
          <Person
            gender={spot.woman ? "woman" : "man"}
            stance={stance}
            scarf={spot.woman}
            coat={spot.color}
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
}: PersonProps) {
  const man = useGLTF(manUrl);
  const woman = useGLTF(womanUrl);
  const source = gender === "woman" ? woman : man;
  const clone = useMemo(() => cloneSkeleton(source.scene), [source.scene]);
  const mixer = useMemo(() => new AnimationMixer(clone), [clone]);
  const clipName: ClipName = walking ? "walk" : stance === "sit" ? "sit" : "idle";
  const clip = useMemo(
    () => findClip(source.animations, clipName),
    [clipName, source.animations],
  );
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    const added = dress(clone, { role, carry, beard, scarf, coat });
    return () => {
      for (const object of added) {
        object.traverse((child) => {
          if (child instanceof Mesh && !sharedGeometry.has(child.geometry)) child.geometry.dispose();
        });
        object.removeFromParent();
      }
    };
  }, [beard, carry, clone, coat, role, scarf]);

  useLayoutEffect(() => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    if (!walking) mixer.update(stance === "sit" ? 0.35 : 0.05);
  }, [clip, mixer, stance, walking]);

  useFrame((_, delta) => {
    if (walking) mixer.update(delta);
    if (stance === "bow") {
      const spine = clone.getObjectByName("spine_02");
      if (spine) spine.rotation.x = 0.7;
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

function dress(
  clone: Object3D,
  options: { role?: ClergyRole; carry: Carry; beard: boolean; scarf: boolean; coat?: string },
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
    const beard = new Mesh(new SphereGeometry(0.055, 12, 10), cloth.hair);
    beard.scale.set(1.15, 0.85, 0.65);
    beard.position.set(0, -0.06, 0.07);
    head.add(beard);
    added.push(beard);
  }
  if (options.scarf && head) {
    const veil = new Mesh(new SphereGeometry(0.13, 12, 10), cloth.scarf);
    veil.scale.set(1.05, 0.62, 1.12);
    veil.position.set(0, 0.04, 0.01);
    head.add(veil);
    added.push(veil);
  }
  if (options.carry !== "none" && spine) {
    const held = options.carry === "gospel" ? gospel() : gifts();
    held.position.set(0.04, -0.05, 0.28);
    spine.add(held);
    added.push(held);
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
      group.add(strip([0, -0.02, 0.36], [0.07, 1.2, 0.02]));
      group.add(cross([0, 0.22, 0.4]));
      group.add(cross([-0.18, -0.12, 0.4]));
      group.add(cross([0.18, -0.12, 0.4]));
      return group;
    case "deacon":
      group.add(new Mesh(sticharion, cloth.deacon));
      group.add(strip([-0.1, 0.05, 0.34], [0.045, 1.25, 0.018], 0.45));
      group.add(strip([0.08, -0.2, 0.34], [0.04, 0.7, 0.016]));
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

function cross(position: [number, number, number]): Group {
  const group = new Group();
  group.position.set(position[0], position[1], position[2]);
  const horizontal = new Mesh(new BoxGeometry(0.1, 0.018, 0.012), cloth.gold);
  const vertical = new Mesh(new BoxGeometry(0.018, 0.13, 0.012), cloth.gold);
  group.add(horizontal, vertical);
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
