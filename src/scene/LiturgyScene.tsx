import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { Group } from "three";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep, RouteId } from "../liturgy/types";
import { Church } from "./Church";
import { colors } from "./colors";
import { FpsProbe, IconPicker, QualityEffects, StageLook } from "./Effects";
import { censingFor, gestureFor } from "./gestures";
import type { IconCard } from "./iconCards";
import { Clergy, Crowd, type Carry, type CrowdSpot } from "./People";
import { cantorSpot, choirLine, communionLine, dismissalLine, pewBanks, pewRows } from "./crowdLayout";
import { pointBehind, type Vec3 } from "./path";
import { dprFor, type Quality } from "./quality";
import { cameraFor, doorsFor, stagingFor, type Actor, type Stance } from "./staging";
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
let debugCamera: { position: Vec3; target: Vec3 } | null = null;

const processionFocus = {
  active: false,
  x: 0,
  y: 0,
  z: 0,
  fx: 0,
  fz: -1,
};

const roster = [
  { age: "adult", cast: 0 },
  { age: "elder", cast: 10 },
  { age: "child", cast: 1 },
  { age: "teen", cast: 6 },
  { age: "adult", cast: 7 },
  { age: "teen", cast: 8 },
  { age: "child", cast: 9 },
  { age: "elder", cast: 5 },
  { age: "adult", cast: 2 },
  { age: "adult", cast: 3 },
  { age: "adult", cast: 4 },
] as const;

function faithfulSpot(position: Vec3, rotationY: number, index: number): CrowdSpot {
  const person = roster[index % roster.length] ?? roster[0];
  return {
    position,
    rotationY,
    cast: person.cast,
    age: person.age,
    phase: (index % 9) / 9,
  };
}

const pewPeople: CrowdSpot[] = pewRows.flatMap((z, row) =>
  pewBanks.map((x, column) => faithfulSpot([x, 0, z], 0, row * 4 + column)),
);

const choirPeople: CrowdSpot[] = choirLine.map((position, index) => faithfulSpot(position, Math.PI / 2, index + 3));

const cantor: CrowdSpot = faithfulSpot(cantorSpot, Math.PI / 2, 4);

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
  const [clergyReceiving, setClergyReceiving] = useState(false);
  useEffect(() => {
    if (step.id !== "holy-things") {
      setClergyReceiving(false);
      return;
    }
    const started = performance.now();
    setClergyReceiving(false);
    const timer = window.setInterval(() => {
      if (performance.now() - started < 1800) return;
      setClergyReceiving(true);
      window.clearInterval(timer);
    }, 250);
    if (import.meta.env.DEV) {
      const bridge = window.__liturgy ?? {};
      bridge.receiving = false;
      window.__liturgy = bridge;
    }
    return () => window.clearInterval(timer);
  }, [step.id]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.receiving = clergyReceiving;
    window.__liturgy = bridge;
  }, [clergyReceiving]);
  const doors = doorsFor(step.id, clergyReceiving);
  const dim = quality === "low";
  return (
    <Canvas
      dpr={dprFor(quality)}
      camera={{ fov: 42, position: pose.position, near: 0.15, far: 140 }}
      gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
    >
      <color attach="background" args={[dim ? "#b9a48c" : "#8d7358"]} />
      <fog attach="fog" args={[dim ? "#b9a48c" : "#8d7358", dim ? 26 : 18, dim ? 80 : 56]} />
      <hemisphereLight args={["#f0d2a4", "#4a382c", dim ? 0.7 : 0.42]} />
      <ambientLight intensity={dim ? 0.5 : 0.22} color="#f3e0c4" />
      <directionalLight position={[-4, 18, 26]} intensity={1.35} />
      <directionalLight position={[6, 12, -6]} intensity={0.38} />
      <StageLook quality={quality} />
      <FollowCamera pose={pose} enabled={mode === "follow"} reducedMotion={reducedMotion} quality={quality} />
      {mode === "free" ? <Walker enabled doors={doors} headBob={headBob} /> : null}
      <Suspense fallback={null}>
        <Church
          doors={doors}
          showLabels={showLabels}
          quality={quality}
          activeSpaces={activeSpaces}
          selectedSpace={selectedSpace}
          onSelectSpace={onSelectSpace}
        />
        <Cast step={step} reducedMotion={reducedMotion} quality={quality} elevated={step.id === "holy-things" && !clergyReceiving} />
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
  quality,
}: {
  pose: { position: Vec3; target: Vec3 };
  enabled: boolean;
  reducedMotion: boolean;
  quality: Quality;
}) {
  const { camera, scene } = useThree();
  const goalPos = useMemo(() => new Vector3(), []);
  const goalTarget = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const poseKey = `${quality}:${pose.position.join(",")}:${pose.target.join(",")}`;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.setCamera = (position, target) => {
      debugCamera = { position, target };
    };
    bridge.clearCamera = () => {
      debugCamera = null;
    };
    bridge.measureDoors = () => {
      let curtain: number | null = null;
      let curtainWorld: number | null = null;
      let royal: number | null = null;
      const scale = new Vector3();
      scene.traverse((object) => {
        if (object.userData.doorKind === "curtain") {
          object.getWorldScale(scale);
          curtain = object.scale.x;
          curtainWorld = scale.x;
        }
        if (object.userData.doorKind === "royal" && royal === null) royal = object.rotation.y;
      });
      return { curtain, curtainWorld, royal };
    };
    bridge.measureSoles = () => {
      const rows: { x: number; z: number; sole: number; floor: number; gap: number; hip: number }[] = [];
      scene.traverse((object) => {
        if (object.userData.soleY === undefined) return;
        const sole = Number(object.userData.soleY);
        const floor = Number(object.userData.floorY);
        rows.push({
          x: Number(Number(object.userData.soleX).toFixed(2)),
          z: Number(Number(object.userData.soleZ).toFixed(2)),
          sole: Number(sole.toFixed(3)),
          floor: Number(floor.toFixed(3)),
          gap: Number((sole - floor).toFixed(3)),
          hip: Number(Number(object.userData.hipY).toFixed(3)),
        });
      });
      return rows;
    };
    window.__liturgy = bridge;
  }, [scene]);

  useLayoutEffect(() => {
    if (debugCamera || processionFocus.active) return;
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    look.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(look);
  }, [camera, look, pose, poseKey]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (debugCamera) {
      goalPos.set(debugCamera.position[0], debugCamera.position[1], debugCamera.position[2]);
      goalTarget.set(debugCamera.target[0], debugCamera.target[1], debugCamera.target[2]);
    } else if (processionFocus.active) {
      frameProcession(goalPos, goalTarget);
    } else {
      goalPos.set(pose.position[0], pose.position[1], pose.position[2]);
      goalTarget.set(pose.target[0], pose.target[1], pose.target[2]);
    }
    const distance = camera.position.distanceTo(goalPos);
    const blend = reducedMotion || distance > 4 ? 1 : 1 - Math.exp(-delta * 8);
    camera.position.lerp(goalPos, blend);
    look.lerp(goalTarget, blend);
    camera.lookAt(look);
  });

  return null;
}

function frameProcession(goalPos: Vector3, goalTarget: Vector3) {
  const { x, y, z } = processionFocus;
  // Stay on the solea, west of the iconostas. Do not sit in the north doorway.
  const cx = Math.min(1.6, Math.max(-5.4, x + 2.8));
  const cz = Math.min(1.2, Math.max(-6.05, z + 3.6));
  goalPos.set(cx, 1.78, cz);
  goalTarget.set(x, y + 1.2, z);
}

function Cast({
  step,
  reducedMotion,
  quality,
  elevated,
}: {
  step: LiturgyStep;
  reducedMotion: boolean;
  quality: Quality;
  elevated: boolean;
}) {
  const staging = stagingFor(step.id);
  const route = step.route;
  const choirStance: Stance =
    staging.faithful === "bow" || staging.faithful === "kneel" ? staging.faithful : "stand";
  const gesture = gestureFor(step.id);
  const censing = censingFor(step.id);
  if (!route) processionFocus.active = false;
  const carry = priestCarry(step.id, elevated);

  return (
    <group>
      {route ? <RouteRibbon route={route} /> : null}
      {route ? (
        <Procession route={route} reducedMotion={reducedMotion} quality={quality} censing={censing} />
      ) : (
        <>
          <Placed actor={staging.priest}>
            <Clergy
              role="priest"
              stance={staging.priest.stance}
              gesture={gesture}
              quality={quality}
              elevated={elevated}
              carry={carry}
            />
          </Placed>
          <Placed actor={staging.deacon}>
            <Clergy role="deacon" stance={staging.deacon.stance} gesture={gesture} censing={censing} quality={quality} />
          </Placed>
        </>
      )}
      {step.id === "gospel" ? (
        <>
          <Placed actor={{ position: [-0.95, world.soleaFloor, -5.15], facing: Math.PI, stance: "stand" }}>
            <Clergy role="reader" stance="stand" carry="candle" quality={quality} />
          </Placed>
          <Placed actor={{ position: [1.45, world.soleaFloor, -5.2], facing: Math.PI, stance: "stand" }}>
            <Clergy role="reader" stance="stand" carry="candle" quality={quality} />
          </Placed>
        </>
      ) : null}
      {step.id === "communion" ? <ReadableChalice /> : null}
      {step.id === "dismissal" ? <BlessingCross /> : null}
      <Placed actor={staging.reader}>
        <Clergy role="reader" stance={staging.reader.stance} gesture={gesture} quality={quality} />
      </Placed>
      <Placed actor={{ position: [-1.7, world.sanctuaryFloor, -14.7], facing: 0, stance: "stand" }}>
        <Clergy role="reader" stance="stand" quality={quality} />
      </Placed>
      <Placed actor={{ position: [2.7, world.sanctuaryFloor, -14.3], facing: 0, stance: "stand" }}>
        <Clergy role="reader" stance="stand" quality={quality} />
      </Placed>
      <Crowd spots={pewPeople.slice(staging.communicants)} stance={staging.faithful} gesture={gesture} quality={quality} />
      <Approaching active={step.id === "dismissal"}>
        <Crowd
          spots={(step.id === "dismissal" ? dismissalLine : communionLine)
            .slice(0, staging.communicants)
            .map((position, index) => faithfulSpot(position, 0, index + 2))}
          stance="stand"
          gesture={gesture}
          quality={quality}
        />
      </Approaching>
      <Crowd spots={choirPeople} stance={choirStance} gesture={gesture} quality={quality} />
      <Crowd spots={[cantor]} stance="stand" gesture={gesture} quality={quality} />
    </group>
  );
}

function Approaching({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [active]);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    if (active) elapsed.current += delta;
    const shift = active && elapsed.current > 3.2 ? Math.min(12, (elapsed.current - 3.2) * 1.4) : 0;
    group.position.z = shift;
  });
  return <group ref={ref}>{children}</group>;
}

function ReadableChalice() {
  return (
    <group position={[0.42, 1.18, -5.55]}>
      <mesh>
        <cylinderGeometry args={[0.09, 0.1, 0.04, 16]} />
        <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.024, 0.18, 12]} />
        <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.16, 0.06, 0.18, 16]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh position={[0.2, 0.22, 0.04]} rotation={[0, 0, Math.PI / 2.5]}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 8]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0.32, 0.28, 0.04]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
    </group>
  );
}

function BlessingCross() {
  return (
    <group position={[0.2, 1.45, -4.55]}>
      <mesh>
        <boxGeometry args={[0.05, 0.72, 0.035]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.22} emissive={colors.gold} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.32, 0.04, 0.03]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.22} emissive={colors.gold} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.16, 0.028, 0.026]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.14, 0.026, 0.024]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.22} />
      </mesh>
    </group>
  );
}

function priestCarry(stepId: string, elevated: boolean): Carry {
  if (stepId === "dismissal") return "cross";
  if (elevated || stepId === "communion") return "gifts";
  return "none";
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
  const march = useRef<March>({ t: 0.62, dir: 1 });
  const points = routePoints(route);

  useEffect(() => {
    march.current = { t: 0.62, dir: 1 };
    return () => {
      processionFocus.active = false;
    };
  }, [route]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const pinned = import.meta.env.DEV ? window.__liturgy?.marchT : undefined;
    if (typeof pinned === "number") {
      march.current.t = Math.min(1, Math.max(0, pinned));
      march.current.dir = 1;
      return;
    }
    const state = march.current;
    state.t += Math.min(delta, 0.05) * 0.22 * state.dir;
    if (state.t >= 1) {
      state.t = 1;
      state.dir = -1;
    } else if (state.t <= 0) {
      state.t = 0;
      state.dir = 1;
    }
  }, -1);

  const gospel = route === "little-entrance";
  return (
    <group>
      <PathWalker points={points} march={march} back={0} reducedMotion={reducedMotion} carry="candle" role="reader" quality={quality} />
      <PathWalker points={points} march={march} back={1.05} reducedMotion={reducedMotion} carry="candle" role="reader" quality={quality} />
      <PathWalker
        points={points}
        march={march}
        back={2.1}
        reducedMotion={reducedMotion}
        carry={gospel ? "gospel" : "none"}
        role="deacon"
        quality={quality}
        censing={censing}
      />
      <PathWalker
        points={points}
        march={march}
        back={3.15}
        lead
        reducedMotion={reducedMotion}
        carry={gospel ? "none" : "gifts"}
        role="priest"
        quality={quality}
      />
    </group>
  );
}

function PathWalker({
  points,
  march,
  back,
  lead = false,
  reducedMotion,
  role,
  carry = "none",
  quality,
  censing = false,
}: {
  points: Vec3[];
  march: RefObject<March>;
  back: number;
  lead?: boolean;
  reducedMotion: boolean;
  role: "priest" | "deacon" | "reader";
  carry?: Carry;
  quality: Quality;
  censing?: boolean;
}) {
  const group = useRef<Group>(null);
  const next = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const body = group.current;
    const state = march.current;
    if (!body || !state) return;
    const travel = reducedMotion ? 0.74 : state.t;
    const here = pointBehind(points, travel, back);
    const ahead = pointBehind(points, Math.min(1, travel + 0.045), back);
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
