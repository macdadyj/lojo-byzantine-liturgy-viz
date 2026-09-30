import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { nextBlockerId, releaseBlocker, trackBlocker } from "../collide";
import { raycastFloor } from "../floors";
import type { Gesture } from "../gestures";
import type { Quality } from "../quality";
import type { Stance } from "../staging";
import { FigureCrowd, type Member } from "./Crowd";
import { clergyPerson, motionFor, type ClergyRole } from "./looks";
import { Censer, HeldProp, type Carry } from "./props";
import type { FigurePose } from "./rig";
import { handsFor } from "./shapes";

export type { ClergyRole } from "./looks";
export type { Carry } from "./props";

function clergyPose(role: ClergyRole, stance: Stance, carry: Carry, gesture: Gesture, censing: boolean, elevated: boolean): FigurePose {
  if (stance === "bow") return "bow";
  if (stance === "kneel") return "kneel";
  if (stance === "sit") return "sit";
  switch (carry) {
    case "gifts":
      return elevated ? "elevate" : "carry";
    case "gospel":
      return "carry";
    case "candle":
    case "cross":
      return "candle";
    case "none":
      if (censing) return "censer";
      if (gesture === "cross") return role === "reader" ? "cross" : "pray";
      return role === "reader" ? "standB" : "stand";
    default: {
      const exhaustive: never = carry;
      return exhaustive;
    }
  }
}

const world = new Vector3();

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
  const incense = censing && role === "deacon";
  const pose = clergyPose(role, stance, carry, gesture, incense, elevated);
  const person = useMemo(() => clergyPerson(role), [role]);
  const members = useMemo<Member[]>(
    () => [{ person, pose, position: new Vector3(), rotationY: 0, scale: 1, motion: motionFor(pose, walking) }],
    [person, pose, walking],
  );
  const hands = useMemo(() => handsFor(person.spec.build, pose), [person, pose]);
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const blocker = useRef(0);
  const planted = useRef({ x: Number.NaN, z: Number.NaN, y: Number.NaN });

  useLayoutEffect(() => {
    const id = nextBlockerId();
    blocker.current = id;
    return () => releaseBlocker(id);
  }, []);

  useFrame((state) => {
    const group = outer.current;
    const body = inner.current;
    if (!group || !body) return;
    group.getWorldPosition(world);
    trackBlocker(blocker.current, world.x, world.z, 0.4);
    const last = planted.current;
    if (Math.abs(world.x - last.x) < 0.01 && Math.abs(world.z - last.z) < 0.01 && Math.abs(world.y - last.y) < 0.01) return;
    last.x = world.x;
    last.z = world.z;
    last.y = world.y;
    const floor = raycastFloor(state.scene, world.x, world.z, world.y + 0.5);
    body.position.y = floor - world.y;
    group.userData.soleY = floor;
    group.userData.floorY = floor;
    group.userData.soleX = world.x;
    group.userData.soleZ = world.z;
    group.userData.hipY = floor + (pose === "kneel" ? 0.62 : 0.92);
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <FigureCrowd members={members} shadows={quality !== "low"} detail={quality === "low" ? "lite" : "full"} contactOpacity={0.5} />
        {carry !== "none" ? <HeldProp carry={carry} hands={hands} elevated={elevated} /> : null}
        {incense && quality !== "low" ? <Censer hand={hands.right} /> : null}
      </group>
    </group>
  );
}
