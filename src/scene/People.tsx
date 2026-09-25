import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector2,
  type Group,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GospelBook, HolyGifts } from "./Figures";
import { colors } from "./colors";
import type { Vec3 } from "./path";
import type { Stance } from "./staging";

export type ClergyRole = "priest" | "deacon" | "reader";
export type Carry = "none" | "gospel" | "gifts";

type ClergyProps = {
  role: ClergyRole;
  stance: Stance;
  walking?: boolean;
  carry?: Carry;
};

const skinColor = "#e6c2a2";
const hairColor = "#241c18";
const shoeColor = "#1a1614";

const phelonion = new LatheGeometry(
  [
    new Vector2(0.2, -0.55),
    new Vector2(0.42, -0.2),
    new Vector2(0.36, 0.16),
    new Vector2(0.24, 0.42),
    new Vector2(0.14, 0.5),
  ],
  18,
  Math.PI + 0.55,
  Math.PI * 2 - 1.1,
);

const sticharion = new LatheGeometry(
  [
    new Vector2(0.14, -0.72),
    new Vector2(0.2, -0.3),
    new Vector2(0.18, 0.18),
    new Vector2(0.14, 0.42),
    new Vector2(0.09, 0.5),
  ],
  16,
);

export function Clergy({ role, stance, walking = false, carry = "none" }: ClergyProps) {
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const hipY = stance === "sit" ? 0.5 : 0.92;
  const bow = stance === "bow" ? 0.5 : 0;

  useFrame(({ clock }) => {
    const swing = walking ? Math.sin(clock.elapsedTime * 5.4) * 0.62 : 0;
    const legBase = stance === "sit" ? -1.2 : 0;
    const armBase = carry === "none" ? 0.12 : -0.95;
    const armSwing = walking && carry === "none" ? swing * 0.7 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = legBase + swing;
    if (rightLeg.current) rightLeg.current.rotation.x = legBase - swing;
    if (leftArm.current) leftArm.current.rotation.x = armBase - armSwing;
    if (rightArm.current) rightArm.current.rotation.x = armBase + armSwing;
  });

  return (
    <group position={[0, hipY, 0]}>
      <Leg side={-1} pivot={leftLeg} stance={stance} />
      <Leg side={1} pivot={rightLeg} stance={stance} />
      <group rotation={[bow, 0, 0]}>
        <group scale={stance === "sit" ? [1, 0.55, 1] : [1, 1, 1]} position={[0, stance === "sit" ? 0.12 : 0, 0]}>
          <Vestments role={role} />
        </group>
        <Arm side={-1} pivot={leftArm} />
        <Arm side={1} pivot={rightArm} />
        <Head bearded={role !== "reader"} />
        {carry === "gospel" ? <group position={[0.02, 0.22, -0.42]}><GospelBook /></group> : null}
        {carry === "gifts" ? <group position={[0, 0.18, -0.46]}><HolyGifts /></group> : null}
      </group>
    </group>
  );
}

function Vestments({ role }: { role: ClergyRole }) {
  switch (role) {
    case "priest":
      return (
        <group>
          <mesh geometry={sticharion}>
            <meshStandardMaterial color={colors.cloth} roughness={0.78} />
          </mesh>
          <mesh geometry={phelonion}>
            <meshStandardMaterial color={colors.priest} roughness={0.72} side={2} />
          </mesh>
          <mesh position={[0, -0.05, -0.5]}>
            <boxGeometry args={[0.07, 1.05, 0.02]} />
            <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.35} />
          </mesh>
          <CrossMark position={[0, 0.22, -0.5]} />
          <CrossMark position={[-0.16, -0.12, -0.48]} />
          <CrossMark position={[0.16, -0.12, -0.48]} />
        </group>
      );
    case "deacon":
      return (
        <group>
          <mesh geometry={sticharion}>
            <meshStandardMaterial color={colors.deacon} roughness={0.74} side={2} />
          </mesh>
          <mesh position={[-0.12, 0.05, -0.28]} rotation={[0.15, 0, 0.7]}>
            <boxGeometry args={[0.055, 1.15, 0.018]} />
            <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0.08, -0.15, -0.3]}>
            <boxGeometry args={[0.05, 0.7, 0.016]} />
            <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.35} />
          </mesh>
        </group>
      );
    case "reader":
      return (
        <mesh geometry={sticharion}>
          <meshStandardMaterial color={colors.reader} roughness={0.78} side={2} />
        </mesh>
      );
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

function CrossMark({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.1, 0.02, 0.012]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.02, 0.12, 0.012]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Leg({
  side,
  pivot,
  stance,
}: {
  side: -1 | 1;
  pivot: RefObject<Group | null>;
  stance: Stance;
}) {
  const sit = stance === "sit";
  return (
    <group ref={pivot} position={[side * 0.1, 0, 0]}>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.075, 0.065, 0.44, 10]} />
        <meshStandardMaterial color="#2c261f" roughness={0.82} />
      </mesh>
      <group position={[0, -0.44, 0]} rotation={[sit ? 1.35 : 0, 0, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.055, 0.045, 0.4, 10]} />
          <meshStandardMaterial color="#2c261f" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.42, -0.05]}>
          <boxGeometry args={[0.1, 0.06, 0.2]} />
          <meshStandardMaterial color={shoeColor} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Arm({ side, pivot }: { side: -1 | 1; pivot: RefObject<Group | null> }) {
  return (
    <group ref={pivot} position={[side * 0.2, 0.42, -0.28]}>
      <mesh position={[side * 0.06, -0.14, -0.04]} rotation={[0.2, 0, side * 0.35]}>
        <cylinderGeometry args={[0.045, 0.04, 0.28, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.66} />
      </mesh>
      <mesh position={[side * 0.12, -0.36, -0.12]} rotation={[0.35, 0, side * 0.15]}>
        <cylinderGeometry args={[0.038, 0.032, 0.26, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.66} />
      </mesh>
      <mesh position={[side * 0.14, -0.5, -0.18]}>
        <boxGeometry args={[0.07, 0.09, 0.04]} />
        <meshStandardMaterial color={skinColor} roughness={0.64} />
      </mesh>
    </group>
  );
}

function Head({ bearded }: { bearded: boolean }) {
  return (
    <group position={[0, 0.86, -0.02]}>
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh scale={[0.86, 1.05, 0.92]}>
        <sphereGeometry args={[0.115, 16, 14]} />
        <meshStandardMaterial color={skinColor} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.08, 0.03]} scale={[1.02, 0.48, 1.02]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
      {bearded ? (
        <mesh position={[0, -0.08, -0.07]} scale={[0.78, 0.85, 0.48]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} />
        </mesh>
      ) : null}
      <mesh position={[-0.038, 0.02, -0.1]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#f4f1ec" roughness={0.35} />
      </mesh>
      <mesh position={[0.038, 0.02, -0.1]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#f4f1ec" roughness={0.35} />
      </mesh>
      <mesh position={[-0.038, 0.02, -0.112]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshStandardMaterial color="#1c1a18" />
      </mesh>
      <mesh position={[0.038, 0.02, -0.112]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshStandardMaterial color="#1c1a18" />
      </mesh>
      <mesh position={[0, -0.02, -0.11]} rotation={[0.4, 0, 0]} scale={[0.55, 0.8, 0.7]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#d7ae8e" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.055, -0.1]}>
        <boxGeometry args={[0.04, 0.012, 0.012]} />
        <meshStandardMaterial color="#8a5348" roughness={0.5} />
      </mesh>
    </group>
  );
}

export type CrowdSpot = {
  position: Vec3;
  rotationY: number;
  color: string;
  woman: boolean;
};

type CrowdParts = {
  cloth: BufferGeometry;
  skin: BufferGeometry;
  hair: BufferGeometry;
  scarf: BufferGeometry;
  face: BufferGeometry;
};

const crowdCache = new Map<Stance, CrowdParts>();

function partsFor(stance: Stance): CrowdParts {
  const cached = crowdCache.get(stance);
  if (cached) return cached;
  const built = buildCrowd(stance);
  crowdCache.set(stance, built);
  return built;
}

function buildCrowd(stance: Stance): CrowdParts {
  const sit = stance === "sit";
  const bow = stance === "bow" ? 0.5 : 0;
  const cloth: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  const hair: BufferGeometry[] = [];
  const scarf: BufferGeometry[] = [];
  const face: BufferGeometry[] = [];
  const scratch: BufferGeometry[] = [];

  const remember = (geo: BufferGeometry) => {
    scratch.push(geo);
    return geo;
  };

  const upper = (source: BufferGeometry, x: number, y: number, z: number) => {
    const geo = source.clone();
    geo.translate(x, y - 0.95, z);
    geo.rotateX(bow);
    geo.translate(0, 0.95, 0);
    return geo;
  };

  const leg = remember(new CylinderGeometry(0.07, 0.055, 0.4, 8));
  const shin = remember(new CylinderGeometry(0.055, 0.045, 0.38, 8));
  const shoe = remember(new BoxGeometry(0.1, 0.06, 0.18));
  const torso = remember(new BoxGeometry(0.36, 0.5, 0.2));
  const shoulders = remember(new BoxGeometry(0.52, 0.1, 0.18));
  const arm = remember(new CylinderGeometry(0.04, 0.035, 0.42, 8));
  const hand = remember(new SphereGeometry(0.04, 8, 6));
  const head = remember(new SphereGeometry(0.115, 12, 10));
  const neck = remember(new CylinderGeometry(0.04, 0.045, 0.1, 8));
  const hairGeo = remember(new SphereGeometry(0.118, 10, 8));
  const scarfBand = remember(new BoxGeometry(0.28, 0.07, 0.24));
  const scarfTail = remember(new BoxGeometry(0.18, 0.32, 0.05));
  const eye = remember(new SphereGeometry(0.016, 6, 6));
  const nose = remember(new SphereGeometry(0.02, 6, 6));
  const mouth = remember(new BoxGeometry(0.05, 0.012, 0.012));

  for (const side of [-1, 1] as const) {
    if (sit) {
      const thigh = leg.clone();
      thigh.rotateX(-Math.PI / 2);
      thigh.translate(side * 0.1, 0.48, -0.2);
      cloth.push(thigh);
      const lower = shin.clone();
      lower.translate(side * 0.1, 0.26, -0.38);
      cloth.push(lower);
      const foot = shoe.clone();
      foot.translate(side * 0.1, 0.05, -0.34);
      cloth.push(foot);
    } else {
      const full = remember(new CylinderGeometry(0.072, 0.05, 0.84, 8));
      const standing = full.clone();
      standing.translate(side * 0.1, 0.44, 0);
      cloth.push(standing);
      const foot = shoe.clone();
      foot.translate(side * 0.1, 0.04, -0.03);
      cloth.push(foot);
    }
    cloth.push(upper(arm, side * 0.32, 1.12, -0.04));
    skin.push(upper(hand, side * 0.34, 0.86, -0.08));
  }

  cloth.push(upper(torso, 0, 1.16, 0));
  cloth.push(upper(shoulders, 0, 1.38, 0));
  skin.push(upper(neck, 0, 1.5, 0));
  skin.push(upper(head, 0, 1.64, 0));
  const noseGeo = nose.clone();
  noseGeo.scale(0.65, 0.85, 0.8);
  skin.push(upper(noseGeo, 0, 1.62, -0.11));

  const cap = hairGeo.clone();
  cap.scale(1.02, 0.62, 1);
  hair.push(upper(cap, 0, 1.73, 0.02));

  scarf.push(upper(scarfBand, 0, 1.71, 0));
  scarf.push(upper(scarfTail, 0, 1.5, 0.12));

  face.push(upper(eye, -0.04, 1.66, -0.1));
  face.push(upper(eye.clone(), 0.04, 1.66, -0.1));
  face.push(upper(mouth, 0, 1.57, -0.105));

  const merged: CrowdParts = {
    cloth: mergeGeometries(cloth, false) ?? new BufferGeometry(),
    skin: mergeGeometries(skin, false) ?? new BufferGeometry(),
    hair: mergeGeometries(hair, false) ?? new BufferGeometry(),
    scarf: mergeGeometries(scarf, false) ?? new BufferGeometry(),
    face: mergeGeometries(face, false) ?? new BufferGeometry(),
  };

  for (const geo of [...cloth, ...skin, ...hair, ...scarf, ...face, ...scratch]) geo.dispose();
  return merged;
}

type PartKind = "cloth" | "skin" | "hair" | "scarf" | "face";

const partColor: Record<Exclude<PartKind, "cloth">, string> = {
  skin: skinColor,
  hair: hairColor,
  scarf: "#f3efe4",
  face: "#1c1a18",
};

export function Crowd({ spots, stance }: { spots: readonly CrowdSpot[]; stance: Stance }) {
  const parts = useMemo(() => partsFor(stance), [stance]);
  if (spots.length === 0) return null;
  return (
    <group>
      <CrowdPart kind="cloth" geometry={parts.cloth} spots={spots} />
      <CrowdPart kind="skin" geometry={parts.skin} spots={spots} />
      <CrowdPart kind="hair" geometry={parts.hair} spots={spots} />
      <CrowdPart kind="face" geometry={parts.face} spots={spots} />
      <CrowdPart kind="scarf" geometry={parts.scarf} spots={spots} />
    </group>
  );
}

function CrowdPart({
  kind,
  geometry,
  spots,
}: {
  kind: PartKind;
  geometry: BufferGeometry;
  spots: readonly CrowdSpot[];
}) {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(() => {
    const color = kind === "cloth" ? "#ffffff" : partColor[kind];
    return new MeshStandardMaterial({ color, roughness: kind === "scarf" ? 0.85 : 0.72 });
  }, [kind]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const tint = new Color();
    spots.forEach((spot, index) => {
      const hidden = kind === "scarf" && !spot.woman;
      dummy.position.set(spot.position[0], spot.position[1], spot.position[2]);
      dummy.rotation.set(0, spot.rotationY, 0);
      dummy.scale.setScalar(hidden ? 0.0001 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (kind === "cloth") mesh.setColorAt(index, tint.set(spot.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [kind, spots]);

  useLayoutEffect(() => () => material.dispose(), [material]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      frustumCulled={false}
    />
  );
}
