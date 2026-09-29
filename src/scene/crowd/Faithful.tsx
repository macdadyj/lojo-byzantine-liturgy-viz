import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from "three";
import type { Gesture } from "../gestures";
import type { Quality } from "../quality";
import type { Stance } from "../staging";
import type { Vec3 } from "../path";
import { mulberry32, pick } from "../random";
import { naveFloor, pewBanks, pewRows } from "../crowdLayout";
import { ageScale, type Age } from "../People";
import { bakeFigure, type BakePose } from "./figureBake";
import { ContactShadows, type Contact } from "./ContactShadows";
import { createCrowdMaterial, type CrowdUniforms } from "./crowdMaterial";

/** Sunday clothes only. The pack's hoodie (fantasy hood) and sleeveless dress are not used. */
const casts = [
  { file: "m-suit", woman: false },
  { file: "m-casual", woman: false },
  { file: "w-suit", woman: true },
  { file: "w-formal", woman: true },
  { file: "w-casual", woman: true },
] as const;

function castUrl(file: string): string {
  return `${import.meta.env.BASE_URL}models/cast/${file}.glb`;
}

for (const cast of casts) useGLTF.preload(castUrl(cast.file));

const skinTones = ["#f3d5c0", "#ebc3a4", "#e0b08e", "#d19f7c", "#bb8762", "#9c6a48", "#7a4e33", "#5c3a26"];
const hairColors = ["#2a1f18", "#3a2a1f", "#4f3625", "#6e4f35", "#9a7a52", "#c4a574", "#1a1512", "#5a3a2a"];
const elderHair = ["#a39e96", "#c8c3ba", "#dcd8d0", "#8a847c"];
const tops = ["#262c3d", "#33363c", "#4a3a2e", "#5c2632", "#2f3d33", "#8a6d4d", "#5b5e63", "#d9d0c1", "#3d4b68", "#6c4b5c", "#1f2226", "#7a6a58"];
const bottoms = ["#1f2129", "#2b2c30", "#3b3129", "#4b4e54", "#2c3444", "#56483a"];
const scarves = ["#7a2632", "#9c8766", "#3b4b6b", "#6b5a3a", "#5a2a3a", "#4b3b4b", "#8c6b3b", "#2e4a44"];

export type Person = {
  cast: number;
  age: Age;
  phase: number;
  jitter: number;
  variant: number;
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  scarf: string;
  covered: boolean;
};

function ageFor(roll: number): Age {
  if (roll < 0.1) return "child";
  if (roll < 0.19) return "teen";
  if (roll < 0.36) return "elder";
  return "adult";
}

/** One person's look, fixed by the seed so every load and every screenshot shows the same parish. */
export function makePerson(random: () => number, options: { adult?: boolean } = {}): Person {
  const cast = Math.floor(random() * casts.length) % casts.length;
  const woman = casts[cast]?.woman ?? false;
  const rolled = ageFor(random());
  const age = options.adult && (rolled === "child" || rolled === "teen") ? "adult" : rolled;
  return {
    cast,
    age,
    phase: random(),
    jitter: (random() - 0.5) * 0.3,
    variant: random(),
    skin: pick(skinTones, random),
    hair: age === "elder" ? pick(elderHair, random) : pick(hairColors, random),
    top: pick(tops, random),
    bottom: pick(bottoms, random),
    scarf: pick(scarves, random),
    covered: woman && (age === "elder" || random() < 0.35),
  };
}

export type Member = { person: Person; pose: BakePose; position: Vector3; rotationY: number };

export function poseFor(person: Person, stance: Stance, gesture: Gesture): BakePose {
  switch (stance) {
    case "sit":
      return "sit";
    case "kneel":
      return "kneel";
    case "bow":
      return "bow";
    case "stand":
      if (gesture === "cross" && person.variant < 0.4) return "cross";
      if (person.variant < 0.45) return "stand";
      if (person.variant < 0.7) return "standB";
      return "pray";
    default: {
      const exhaustive: never = stance;
      return exhaustive;
    }
  }
}

/** Seated hip height of the baked sit pose; children sit on the same seat with feet off the floor. */
const seatLift = 0.46;
const sitBack = 0.06;

type Seat = { x: number; z: number; person: Person };

/** Three or four people per pew with a few seats empty. */
function planPews(seed: number): Seat[] {
  const random = mulberry32(seed * 7919 + 17);
  const seats: Seat[] = [];
  for (const z of pewRows) {
    for (const bankX of pewBanks) {
      const wide = Math.abs(bankX) < 4;
      const width = wide ? 2.4 : 2.1;
      const count = wide ? 4 : 3;
      const pitch = width / count;
      for (let seat = 0; seat < count; seat += 1) {
        if (random() < 0.2) continue;
        const person = makePerson(random);
        seats.push({ x: bankX - width / 2 + pitch * (seat + 0.5) + (random() - 0.5) * 0.08, z, person });
      }
    }
  }
  return seats;
}

function pewMember(seat: Seat, stance: Stance, gesture: Gesture): Member {
  const { person } = seat;
  const pose = poseFor(person, stance, gesture);
  const scale = memberScale(person);
  const turn = pose === "sit" || pose === "kneel" ? person.jitter * 0.25 : person.jitter;
  switch (pose) {
    case "sit":
      return { person, pose, rotationY: turn, position: new Vector3(seat.x, naveFloor + seatLift * (1 - scale), seat.z + sitBack) };
    case "kneel":
      return { person, pose, rotationY: turn, position: new Vector3(seat.x, naveFloor, seat.z - 1.05) };
    case "stand":
    case "standB":
    case "pray":
    case "chest":
    case "cross":
    case "bow":
      return { person, pose, rotationY: turn, position: new Vector3(seat.x, naveFloor, seat.z - 0.62) };
    default: {
      const exhaustive: never = pose;
      return exhaustive;
    }
  }
}

function memberScale(person: Person): number {
  return ageScale(person.age) * (1 + person.jitter * 0.12);
}

export function Faithful({
  stance,
  gesture,
  quality,
  seed,
  skip,
  shadows,
}: {
  stance: Stance;
  gesture: Gesture;
  quality: Quality;
  seed: number;
  /** Front-row people who have gone forward (communion, antidoron). */
  skip: number;
  shadows: boolean;
}) {
  const seats = useMemo(() => planPews(seed), [seed]);
  const members = useMemo(() => {
    const byFront = [...seats].sort((a, b) => a.z - b.z || a.x - b.x);
    const gone = new Set(byFront.filter((seat) => Math.abs(seat.x) < 4).slice(0, skip));
    return seats
      .filter((seat, index) => !gone.has(seat) && (quality !== "low" || (index * 0.618) % 1 < 0.55))
      .map((seat) => pewMember(seat, stance, gesture));
  }, [gesture, quality, seats, skip, stance]);
  return <BakedCrowd members={members} shadows={shadows} />;
}

/** People standing at given spots (choir, cantor, communion line), with looks drawn from their own seed. */
export function Congregants({
  spots,
  stance,
  gesture,
  seed,
  shadows,
  pose,
}: {
  spots: readonly { position: Vec3; rotationY: number }[];
  /** Everyone in the same posture, e.g. arms crossed in the communion line. */
  pose?: BakePose;
  stance: Stance;
  gesture: Gesture;
  seed: number;
  shadows: boolean;
}) {
  const members = useMemo(() => {
    const random = mulberry32(seed);
    return spots.map((spot) => {
      const person = makePerson(random, { adult: true });
      return {
        person,
        pose: pose ?? poseFor(person, stance, gesture),
        position: new Vector3(spot.position[0], spot.position[1], spot.position[2]),
        rotationY: spot.rotationY + person.jitter * 0.3,
      };
    });
  }, [gesture, pose, seed, spots, stance]);
  return <BakedCrowd members={members} shadows={shadows} />;
}

const bakeCache = new Map<string, BufferGeometry>();

function headScaleFor(age: Age): number {
  return age === "child" ? 0.92 : age === "teen" ? 0.86 : 0.8;
}

type Batch = { key: string; geometry: BufferGeometry; members: Member[] };

/** One instanced draw per baked figure (cast × pose × head size × scarf). */
export function BakedCrowd({ members, shadows }: { members: readonly Member[]; shadows: boolean }) {
  const gltfs = useGLTF(casts.map((cast) => castUrl(cast.file)));
  const anims = useGLTF(castUrl("anims"));
  const uniforms = useMemo<CrowdUniforms>(() => ({ uTime: { value: 0 } }), []);
  const material = useMemo(() => createCrowdMaterial(uniforms), [uniforms]);
  useEffect(() => () => material.dispose(), [material]);

  const batches = useMemo(() => {
    const map = new Map<string, Batch>();
    for (const member of members) {
      const { person, pose } = member;
      const cast = casts[person.cast];
      const gltf = gltfs[person.cast];
      if (!cast || !gltf) continue;
      const headKey = person.age === "child" ? "c" : person.age === "teen" ? "t" : "a";
      const key = `${cast.file}:${pose}:${headKey}:${person.covered ? "s" : ""}`;
      let batch = map.get(key);
      if (!batch) {
        let geometry = bakeCache.get(key);
        if (!geometry) {
          geometry = bakeFigure(gltf.scene, anims.animations, pose, { scarf: person.covered, headScale: headScaleFor(person.age) }).geometry;
          bakeCache.set(key, geometry);
        }
        batch = { key, geometry, members: [] };
        map.set(key, batch);
      }
      batch.members.push(member);
    }
    return [...map.values()];
  }, [anims.animations, gltfs, members]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  const contacts = useMemo<Contact[]>(
    () =>
      members.map(({ person, pose, position }) => ({
        x: position.x,
        y: pose === "sit" ? naveFloor : position.y,
        z: pose === "kneel" ? position.z + 0.2 : position.z,
        radius: 0.27 * memberScale(person),
      })),
    [members],
  );

  return (
    <group>
      <ContactShadows contacts={contacts} opacity={0.42} />
      {batches.map((batch) => (
        <CrowdBatch key={batch.key} batch={batch} material={material} shadows={shadows} />
      ))}
    </group>
  );
}

const matrix = new Matrix4();
const rotation = new Quaternion();
const scaleVec = new Vector3();
const up = new Vector3(0, 1, 0);
const color = new Color();

function CrowdBatch({ batch, material, shadows }: { batch: Batch; material: Material; shadows: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const count = batch.members.length;
  const geometry = useMemo(() => {
    const make = (size: number) => new InstancedBufferAttribute(new Float32Array(count * size), size);
    const skin = make(3);
    const hair = make(3);
    const top = make(3);
    const bottom = make(3);
    const scarf = make(3);
    const phase = make(1);
    batch.members.forEach(({ person }, index) => {
      color.set(person.skin).toArray(skin.array, index * 3);
      color.set(person.hair).toArray(hair.array, index * 3);
      color.set(person.top).toArray(top.array, index * 3);
      color.set(person.bottom).toArray(bottom.array, index * 3);
      color.set(person.scarf).toArray(scarf.array, index * 3);
      phase.array[index] = person.phase;
    });
    const clone = batch.geometry.clone();
    clone.setAttribute("iSkin", skin);
    clone.setAttribute("iHair", hair);
    clone.setAttribute("iTop", top);
    clone.setAttribute("iBottom", bottom);
    clone.setAttribute("iScarf", scarf);
    clone.setAttribute("iPhase", phase);
    return clone;
  }, [batch, count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    batch.members.forEach((member, index) => {
      rotation.setFromAxisAngle(up, member.rotationY);
      scaleVec.setScalar(memberScale(member.person));
      matrix.compose(member.position, rotation, scaleVec);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [batch]);

  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow={shadows} receiveShadow />;
}
