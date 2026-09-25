import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { Group } from "three";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep, RouteId } from "../liturgy/types";
import { Church } from "./Church";
import { colors } from "./colors";
import { FpsProbe, IconPicker, QualityEffects, StageLook } from "./Effects";
import { censingFor, gestureFor } from "./gestures";
import type { IconCard } from "./iconCards";
import { Clergy, Crowd, type CrowdSpot } from "./People";
import { pointOnPath, type Vec3 } from "./path";
import { dprFor, type Quality } from "./quality";
import { cameraFor, stagingFor, type Actor, type Stance } from "./staging";
import { Walker } from "./Walker";
import { greatEntrancePath, littleEntrancePath, world } from "./world";

export type LookMode = "follow" | "free";

type LiturgySceneProps = {
  step: LiturgyStep;
  mode: LookMode;
  showLabels: boolean;
  quality: Quality;
  headBob: boolean;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
  onInspect: (card: IconCard) => void;
  onFps: (fps: number) => void;
  reducedMotion: boolean;
};

/** Lead walker writes this each frame so Follow liturgy can stay in front of a procession. */
const processionFocus = {
  active: false,
  x: 0,
  y: 0,
  z: 0,
  fx: 0,
  fz: -1,
};

const pewRows = [2.2, 4.6, 7.0, 9.4, 11.8, 14.2];

const roster = [
  { age: "adult", woman: false, scarf: false },
  { age: "elder", woman: true, scarf: true },
  { age: "child", woman: true, scarf: false },
  { age: "teen", woman: false, scarf: false },
  { age: "adult", woman: true, scarf: false },
  { age: "teen", woman: true, scarf: false },
  { age: "child", woman: false, scarf: false },
  { age: "elder", woman: false, scarf: false },
] as const;

function faithfulSpot(position: Vec3, rotationY: number, index: number): CrowdSpot {
  const person = roster[index % roster.length] ?? roster[0];
  return {
    position,
    rotationY,
    color: colors.faithful[index % colors.faithful.length] ?? colors.faithful[0],
    woman: person.woman,
    age: person.age,
    scarf: person.scarf,
    phase: (index % 9) / 9,
  };
}

const pewPeople: CrowdSpot[] = pewRows.flatMap((z, row) =>
  [-2.2, 2.2, -7.15, 7.15].map((x, column) => faithfulSpot([x, 0, z], 0, row * 4 + column)),
);

const choirPeople: CrowdSpot[] = [4.0, 5.4, 6.8, 8.2].map((z, index) =>
  faithfulSpot([8.35, 3.22, z], Math.PI / 2, index + 3),
);

const cantor: CrowdSpot = faithfulSpot([8.35, 3.22, 3.15], Math.PI / 2, 4);

const communionQueue: Vec3[] = [
  [-0.55, world.soleaFloor, -4.15],
  [0.6, world.soleaFloor, -4.15],
  [-0.7, world.soleaFloor, -3.25],
  [0.75, world.soleaFloor, -3.25],
];

export function LiturgyScene({
  step,
  mode,
  showLabels,
  quality,
  headBob,
  activeSpaces,
  selectedSpace,
  onSelectSpace,
  onInspect,
  onFps,
  reducedMotion,
}: LiturgySceneProps) {
  const pose = cameraFor(step.id);
  const doorsOpen = step.route !== undefined || step.spaces.includes("royal-doors");
  return (
    <Canvas
      dpr={dprFor(quality)}
      camera={{ fov: 42, position: pose.position, near: 0.15, far: 140 }}
      gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#8d7358"]} />
      <fog attach="fog" args={["#8d7358", 16, 52]} />
      <hemisphereLight args={["#f0d2a4", "#4a382c", 0.36]} />
      <ambientLight intensity={0.16} color="#f3e0c4" />
      <directionalLight position={[-4, 18, 26]} intensity={1.35} />
      <directionalLight position={[6, 12, -6]} intensity={0.38} />
      <StageLook quality={quality} />
      <FollowCamera pose={pose} enabled={mode === "follow"} reducedMotion={reducedMotion} />
      {mode === "free" ? <Walker enabled doorsOpen={doorsOpen} headBob={headBob} /> : null}
      {mode === "follow" ? (
        <OrbitControls
          makeDefault
          enabled={false}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={1.4}
          maxDistance={48}
          enablePan
          keyEvents={false}
        />
      ) : null}
      <Suspense fallback={null}>
        <Church
          doorsOpen={doorsOpen}
          showLabels={showLabels}
          quality={quality}
          activeSpaces={activeSpaces}
          selectedSpace={selectedSpace}
          onSelectSpace={onSelectSpace}
        />
        <Cast step={step} reducedMotion={reducedMotion} quality={quality} />
      </Suspense>
      <QualityEffects quality={quality} />
      <FpsProbe onFps={onFps} />
      <IconPicker enabled={mode === "free"} onPick={onInspect} />
    </Canvas>
  );
}

function FollowCamera({
  pose,
  enabled,
  reducedMotion,
}: {
  pose: { position: Vec3; target: Vec3 };
  enabled: boolean;
  reducedMotion: boolean;
}) {
  const { camera, controls } = useThree();
  const goalPos = useMemo(() => new Vector3(), []);
  const goalTarget = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);

  const snapped = useRef(false);
  useLayoutEffect(() => {
    if (snapped.current) return;
    snapped.current = true;
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    look.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(look);
  }, [camera, look, pose]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (processionFocus.active) {
      frameProcession(goalPos, goalTarget);
    } else {
      goalPos.set(pose.position[0], pose.position[1], pose.position[2]);
      goalTarget.set(pose.target[0], pose.target[1], pose.target[2]);
    }
    const chasing = processionFocus.active && camera.position.distanceTo(goalPos) > 2.8;
    const blend = reducedMotion || chasing ? 1 : 1 - Math.exp(-delta * (processionFocus.active ? 8 : 2.6));
    camera.position.lerp(goalPos, blend);
    look.lerp(goalTarget, blend);
    camera.lookAt(look);
    const orbit = controls as { target?: Vector3 } | null;
    if (orbit?.target) orbit.target.copy(look);
  });

  return null;
}

function frameProcession(goalPos: Vector3, goalTarget: Vector3) {
  const { x, y, z, fx, fz } = processionFocus;
  const ahead = 2.45;
  let cx = x + fx * ahead;
  let cz = z + fz * ahead;
  if (Math.abs(x) < 1.8) {
    cx += -fz * 0.75;
    cz += fx * 0.75;
  }
  [cx, cz] = clearOfPews(cx, cz, x);
  cx = Math.min(10.2, Math.max(-10.2, cx));
  cz = Math.min(world.narthexWest - 1.2, Math.max(world.sanctuaryEast + 1.5, cz));
  goalPos.set(cx, Math.max(1.55, y + 1.6), cz);
  goalTarget.set(x - fx * 0.45, y + 1.22, z - fz * 0.45);
}

const pewCentersX = [-7.15, -2.2, 2.2, 7.15];
const pewCentersZ = [2.2, 4.6, 7.0, 9.4, 11.8, 14.2];

function clearOfPews(x: number, z: number, preferX: number): [number, number] {
  for (const px of pewCentersX) {
    const half = Math.abs(px) < 4 ? 1.35 : 1.2;
    if (Math.abs(x - px) > half) continue;
    for (const pz of pewCentersZ) {
      if (Math.abs(z - pz) > 0.7) continue;
      const aisle = Math.abs(preferX) < 1.5 ? 0 : preferX < 0 ? -4.05 : 4.05;
      return [aisle, z];
    }
  }
  return [x, z];
}

function Cast({ step, reducedMotion, quality }: { step: LiturgyStep; reducedMotion: boolean; quality: Quality }) {
  const staging = stagingFor(step.id);
  const route = step.route;
  const choirStance: Stance = staging.faithful === "bow" ? "bow" : step.roles.includes("choir") ? "stand" : "sit";
  const gesture = gestureFor(step.id);
  const censing = censingFor(step.id);

  return (
    <group>
      {route ? <RouteRibbon route={route} /> : null}
      {route ? (
        <Procession route={route} reducedMotion={reducedMotion} quality={quality} censing={censing} />
      ) : (
        <>
          <Placed actor={staging.priest}>
            <Clergy role="priest" stance={staging.priest.stance} gesture={gesture} quality={quality} />
          </Placed>
          <Placed actor={staging.deacon}>
            <Clergy role="deacon" stance={staging.deacon.stance} gesture={gesture} censing={censing} quality={quality} />
          </Placed>
        </>
      )}
      <Placed actor={staging.reader}>
        <Clergy role="reader" stance={staging.reader.stance} gesture={gesture} quality={quality} />
      </Placed>
      <Placed actor={{ position: [-1.7, world.sanctuaryFloor, -14.7], facing: 0, stance: "stand" }}>
        <Clergy role="reader" stance="stand" quality={quality} />
      </Placed>
      <Placed actor={{ position: [1.85, world.sanctuaryFloor, -14.5], facing: 0, stance: "stand" }}>
        <Clergy role="reader" stance="stand" quality={quality} />
      </Placed>
      <Crowd spots={pewPeople.slice(staging.communicants)} stance={staging.faithful} gesture={gesture} quality={quality} />
      <Crowd
        spots={communionQueue.slice(0, staging.communicants).map((position, index) =>
          faithfulSpot(position, 0, index + 1),
        )}
        stance="stand"
        gesture={gesture}
        quality={quality}
      />
      <Crowd spots={choirPeople} stance={choirStance} gesture={gesture} quality={quality} />
      <Crowd spots={[cantor]} stance="stand" gesture={gesture} quality={quality} />
    </group>
  );
}

function Placed({ actor, children }: { actor: Actor; children: ReactNode }) {
  return (
    <group position={actor.position} rotation={[0, actor.facing, 0]}>
      {children}
    </group>
  );
}

function routePoints(route: RouteId): Vec3[] {
  switch (route) {
    case "little-entrance":
      return littleEntrancePath;
    case "great-entrance":
      return greatEntrancePath;
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

function RouteRibbon({ route }: { route: RouteId }) {
  const points = routePoints(route);
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(
      points.map((point) => new Vector3(point[0], point[1] + 0.05, point[2])),
      false,
      "catmullrom",
      0.2,
    );
    return new TubeGeometry(curve, 80, 0.045, 6, false);
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={colors.runner} roughness={0.4} emissive={colors.runner} emissiveIntensity={0.35} />
    </mesh>
  );
}

type March = { t: number; dir: 1 | -1 };

function Procession({
  route,
  reducedMotion,
  quality,
  censing,
}: {
  route: RouteId;
  reducedMotion: boolean;
  quality: Quality;
  censing: boolean;
}) {
  const march = useRef<March>({ t: 0.42, dir: 1 });
  const points = routePoints(route);

  useEffect(() => {
    march.current = { t: 0.42, dir: 1 };
    return () => {
      processionFocus.active = false;
    };
  }, [route]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const state = march.current;
    state.t += delta * 0.11 * state.dir;
    if (state.t >= 1) {
      state.t = 1;
      state.dir = -1;
    } else if (state.t <= 0) {
      state.t = 0;
      state.dir = 1;
    }
  }, -1);

  return (
    <group>
      {route === "little-entrance" ? (
        <>
          <PathWalker points={points} march={march} offset={0} lead reducedMotion={reducedMotion} carry="gospel" role="deacon" quality={quality} censing={censing} />
          <Placed actor={stagingFor("little-entrance").priest}>
            <Clergy role="priest" stance="stand" quality={quality} />
          </Placed>
        </>
      ) : (
        <>
          <PathWalker points={points} march={march} offset={0} lead reducedMotion={reducedMotion} role="deacon" quality={quality} censing={censing} />
          <PathWalker points={points} march={march} offset={0.04} reducedMotion={reducedMotion} carry="gifts" role="priest" quality={quality} />
        </>
      )}
    </group>
  );
}

function PathWalker({
  points,
  march,
  offset,
  lead = false,
  reducedMotion,
  role,
  carry = "none",
  quality,
  censing = false,
}: {
  points: Vec3[];
  march: RefObject<March>;
  offset: number;
  lead?: boolean;
  reducedMotion: boolean;
  role: "priest" | "deacon";
  carry?: "none" | "gospel" | "gifts";
  quality: Quality;
  censing?: boolean;
}) {
  const group = useRef<Group>(null);
  const next = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const body = group.current;
    const state = march.current;
    if (!body || !state) return;
    const travel = reducedMotion ? 0.62 : Math.min(1, Math.max(0, state.t - offset));
    const here = pointOnPath(points, travel);
    const ahead = pointOnPath(points, Math.min(1, travel + 0.03));
    body.position.set(here[0], here[1], here[2]);
    next.set(ahead[0], here[1], ahead[2]);
    if (next.distanceTo(body.position) > 0.02) body.lookAt(next);
    if (!lead) return;
    const dx = ahead[0] - here[0];
    const dz = ahead[2] - here[2];
    const length = Math.hypot(dx, dz);
    processionFocus.active = true;
    processionFocus.x = here[0];
    processionFocus.y = here[1];
    processionFocus.z = here[2];
    if (length > 0.04) {
      processionFocus.fx = dx / length;
      processionFocus.fz = dz / length;
    }
  }, -1);

  return (
    <group ref={group}>
      <Clergy role={role} stance="stand" walking={!reducedMotion} carry={carry} quality={quality} censing={censing} />
    </group>
  );
}
