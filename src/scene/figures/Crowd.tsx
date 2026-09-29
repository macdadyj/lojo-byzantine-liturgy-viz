import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { ContactShadows, type Contact } from "../crowd/ContactShadows";
import { naveFloor, pewBanks, pewRows } from "../crowdLayout";
import type { Gesture } from "../gestures";
import type { Vec3 } from "../path";
import type { Quality } from "../quality";
import { mulberry32 } from "../random";
import type { Stance } from "../staging";
import { figureMaterial, packColor, packMetals, setFigureTime, type MotionId } from "./figureMaterial";
import { makePerson, motionFor, personScale, poseFor, type Person } from "./looks";
import { solvePose, type FigurePose } from "./rig";
import { figureGeometry, frameFor, specKey, type Detail } from "./shapes";

export type Member = {
  person: Person;
  pose: FigurePose;
  position: Vector3;
  rotationY: number;
  scale: number;
  motion: MotionId;
};

type Batch = { key: string; members: Member[]; pose: FigurePose; person: Person };

const seatHip = solvePose("adult", "sit").pelvis.y;
const sitBack = 0.04;
/** The kneeler on the back of the pew in front, where the knees rest. */
const kneelerOffset = -1.66;

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
  const scale = personScale(person);
  const motion = motionFor(pose, false);
  const turn = pose === "sit" || pose === "kneel" ? person.jitter * 0.25 : person.jitter;
  const base = { person, pose, scale, motion, rotationY: turn };
  switch (pose) {
    case "sit": {
      const hip = solvePose(frameFor(person.spec.build), "sit").pelvis.y * scale;
      return { ...base, position: new Vector3(seat.x, naveFloor + seatHip - hip, seat.z + sitBack) };
    }
    case "kneel":
      return { ...base, position: new Vector3(seat.x, naveFloor, seat.z + kneelerOffset) };
    case "stand":
    case "standB":
    case "pray":
    case "chest":
    case "cross":
    case "bow":
    case "carry":
    case "elevate":
    case "candle":
    case "censer":
      return { ...base, position: new Vector3(seat.x, naveFloor, seat.z - 0.62) };
    default: {
      const exhaustive: never = pose;
      return exhaustive;
    }
  }
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
  return <FigureCrowd members={members} shadows={shadows} detail={quality === "low" ? "lite" : "full"} />;
}

/** People standing at given spots (choir, cantor, communion line), with looks drawn from their own seed. */
export function Congregants({
  spots,
  stance,
  gesture,
  seed,
  shadows,
  pose,
  quality,
}: {
  spots: readonly { position: Vec3; rotationY: number }[];
  /** Everyone in the same posture, e.g. arms crossed in the communion line. */
  pose?: FigurePose;
  stance: Stance;
  gesture: Gesture;
  seed: number;
  shadows: boolean;
  quality: Quality;
}) {
  const members = useMemo<Member[]>(() => {
    const random = mulberry32(seed);
    return spots.map((spot) => {
      const person = makePerson(random, { adult: true });
      const chosen = pose ?? poseFor(person, stance, gesture);
      return {
        person,
        pose: chosen,
        scale: personScale(person),
        motion: motionFor(chosen, false),
        position: new Vector3(spot.position[0], spot.position[1], spot.position[2]),
        rotationY: spot.rotationY + person.jitter * 0.3,
      };
    });
  }, [gesture, pose, seed, spots, stance]);
  return <FigureCrowd members={members} shadows={shadows} detail={quality === "low" ? "lite" : "full"} />;
}

/** Every member grouped by look and pose; each group is one instanced draw. */
export function FigureCrowd({
  members,
  shadows,
  detail,
  contactOpacity = 0.42,
}: {
  members: readonly Member[];
  shadows: boolean;
  detail: Detail;
  contactOpacity?: number;
}) {
  const batches = useMemo(() => {
    const map = new Map<string, Batch>();
    for (const member of members) {
      const key = specKey(member.person.spec, member.pose, detail);
      const batch = map.get(key);
      if (batch) batch.members.push(member);
      else map.set(key, { key, members: [member], pose: member.pose, person: member.person });
    }
    return [...map.values()];
  }, [detail, members]);

  useFrame((state) => setFigureTime(state.clock.elapsedTime));

  const contacts = useMemo<Contact[]>(
    () =>
      members.map(({ position, pose, scale }) => ({
        x: position.x,
        y: pose === "sit" ? naveFloor : position.y,
        z: pose === "kneel" ? position.z + 0.22 : position.z,
        radius: 0.27 * scale,
      })),
    [members],
  );

  return (
    <group>
      <ContactShadows contacts={contacts} opacity={contactOpacity} />
      {batches.map((batch) => (
        <FigureBatch key={batch.key} batch={batch} detail={detail} shadows={shadows} />
      ))}
    </group>
  );
}

const matrix = new Matrix4();
const rotation = new Quaternion();
const scaleVec = new Vector3();
const yAxis = new Vector3(0, 1, 0);
const color = new Color();

function FigureBatch({ batch, detail, shadows }: { batch: Batch; detail: Detail; shadows: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const count = batch.members.length;
  const geometry = useMemo(() => {
    const paletteData = new Float32Array(count * 4);
    const lookData = new Float32Array(count * 4);
    const hex = (value: string) => packColor(color.set(value).getHex());
    batch.members.forEach(({ person, motion }, index) => {
      const { palette } = person;
      paletteData.set([hex(palette.skin), hex(palette.hair), hex(palette.top), hex(palette.bottom)], index * 4);
      lookData.set([hex(palette.accent), person.phase, motion, packMetals(palette.topMetal, palette.accentMetal)], index * 4);
    });
    const clone = figureGeometry(batch.person.spec, batch.pose, detail).clone();
    clone.setAttribute("iPalette", new InstancedBufferAttribute(paletteData, 4));
    clone.setAttribute("iLook", new InstancedBufferAttribute(lookData, 4));
    return clone;
  }, [batch, count, detail]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    batch.members.forEach((member, index) => {
      rotation.setFromAxisAngle(yAxis, member.rotationY);
      scaleVec.setScalar(member.scale);
      matrix.compose(member.position, rotation, scaleVec);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [batch]);

  return <instancedMesh ref={ref} args={[geometry, figureMaterial(), count]} castShadow={shadows} receiveShadow />;
}
