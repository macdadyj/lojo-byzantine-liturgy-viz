import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { Group } from "three";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep, RouteId } from "../liturgy/types";
import { Church } from "./Church";
import { colors } from "./colors";
import { Clergy, Crowd, type CrowdSpot } from "./People";
import { pointOnPath, type Vec3 } from "./path";
import { cameraFor, stagingFor, type Actor, type Stance } from "./staging";
import { greatEntrancePath, littleEntrancePath, world } from "./world";

export type LookMode = "follow" | "free";

type LiturgySceneProps = {
  step: LiturgyStep;
  mode: LookMode;
  showLabels: boolean;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
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

const pewPeople: CrowdSpot[] = pewRows.flatMap((z, row) => [
  { position: [-2.2, 0, z], rotationY: 0, color: colors.faithful[row % colors.faithful.length] ?? colors.faithful[0], woman: row % 2 === 0 },
  { position: [2.2, 0, z], rotationY: 0, color: colors.faithful[(row + 2) % colors.faithful.length] ?? colors.faithful[1], woman: row % 2 === 1 },
  { position: [-7.15, 0, z], rotationY: 0, color: colors.faithful[(row + 1) % colors.faithful.length] ?? colors.faithful[2], woman: row % 3 === 0 },
  { position: [7.15, 0, z], rotationY: 0, color: colors.faithful[(row + 4) % colors.faithful.length] ?? colors.faithful[3], woman: row % 3 === 1 },
]);

const choirPeople: CrowdSpot[] = [4.0, 5.4, 6.8, 8.2].map((z, index) => ({
  position: [8.35, 3.22, z] as Vec3,
  rotationY: Math.PI / 2,
  color: colors.choir,
  woman: index % 2 === 0,
}));

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
  activeSpaces,
  selectedSpace,
  onSelectSpace,
  reducedMotion,
}: LiturgySceneProps) {
  const pose = cameraFor(step.id);
  const doorsOpen = step.route !== undefined || step.spaces.includes("royal-doors");
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 42, position: pose.position, near: 0.15, far: 140 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#d5cbb8"]} />
      <fog attach="fog" args={["#d5cbb8", 28, 78]} />
      <hemisphereLight args={["#fff8ee", "#e7d7c0", 1.45]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[-4, 18, 26]} intensity={1.55} />
      <directionalLight position={[6, 12, -6]} intensity={0.45} />
      <FollowCamera pose={pose} enabled={mode === "follow"} reducedMotion={reducedMotion} />
      <OrbitControls
        makeDefault
        enabled={mode === "free"}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1.4}
        maxDistance={48}
        enablePan
      />
      <Suspense fallback={null}>
        <Church
          doorsOpen={doorsOpen}
          showLabels={showLabels}
          activeSpaces={activeSpaces}
          selectedSpace={selectedSpace}
          onSelectSpace={onSelectSpace}
        />
        <Cast step={step} reducedMotion={reducedMotion} />
      </Suspense>
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

function Cast({ step, reducedMotion }: { step: LiturgyStep; reducedMotion: boolean }) {
  const staging = stagingFor(step.id);
  const route = step.route;
  const choirStance: Stance = staging.faithful === "bow" ? "bow" : step.roles.includes("choir") ? "stand" : "sit";

  return (
    <group>
      {route ? <RouteRibbon route={route} /> : null}
      {route ? (
        <Procession route={route} reducedMotion={reducedMotion} />
      ) : (
        <>
          <Placed actor={staging.priest}>
            <Clergy role="priest" stance={staging.priest.stance} />
          </Placed>
          <Placed actor={staging.deacon}>
            <Clergy role="deacon" stance={staging.deacon.stance} />
          </Placed>
        </>
      )}
      <Placed actor={staging.reader}>
        <Clergy role="reader" stance={staging.reader.stance} />
      </Placed>
      <Crowd spots={pewPeople.slice(staging.communicants)} stance={staging.faithful} />
      <Crowd
        spots={communionQueue.slice(0, staging.communicants).map((position, index) => ({
          position,
          rotationY: 0,
          color: pewPeople[index]?.color ?? colors.faithful[0],
          woman: index % 2 === 0,
        }))}
        stance="stand"
      />
      <Crowd spots={choirPeople} stance={choirStance} />
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

function Procession({ route, reducedMotion }: { route: RouteId; reducedMotion: boolean }) {
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
          <PathWalker points={points} march={march} offset={0} lead reducedMotion={reducedMotion} carry="gospel" role="deacon" />
          <Placed actor={stagingFor("little-entrance").priest}>
            <Clergy role="priest" stance="stand" />
          </Placed>
        </>
      ) : (
        <>
          <PathWalker points={points} march={march} offset={0} lead reducedMotion={reducedMotion} role="deacon" />
          <PathWalker points={points} march={march} offset={0.04} reducedMotion={reducedMotion} carry="gifts" role="priest" />
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
}: {
  points: Vec3[];
  march: RefObject<March>;
  offset: number;
  lead?: boolean;
  reducedMotion: boolean;
  role: "priest" | "deacon";
  carry?: "none" | "gospel" | "gifts";
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
      <Clergy role={role} stance="stand" walking={!reducedMotion} carry={carry} />
    </group>
  );
}
