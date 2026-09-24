import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { Group } from "three";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep, RouteId } from "../liturgy/types";
import { Church } from "./Church";
import { colors } from "./colors";
import { Figure } from "./Figures";
import { pointOnPath, type Vec3 } from "./path";
import { cameraFor, stagingFor, type Actor, type Stance } from "./staging";
import { greatEntrancePath, littleEntrancePath, world } from "./world";

export type LookMode = "follow" | "free";

type LiturgySceneProps = {
  step: LiturgyStep;
  mode: LookMode;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
  reducedMotion: boolean;
};

const pewPeople: { position: Vec3; color: string; scale: number }[] = [
  { position: [-2.28, 0, 2.7], color: colors.faithful[0], scale: 1 },
  { position: [2.28, 0, 2.7], color: colors.faithful[1], scale: 0.96 },
  { position: [-2.28, 0, 4.28], color: colors.faithful[2], scale: 1 },
  { position: [2.28, 0, 4.28], color: colors.faithful[3], scale: 0.92 },
  { position: [-2.28, 0, 5.88], color: colors.faithful[4], scale: 1 },
  { position: [2.28, 0, 5.88], color: colors.faithful[5], scale: 0.98 },
  { position: [-2.28, 0, 7.48], color: colors.faithful[0], scale: 0.86 },
  { position: [2.28, 0, 7.48], color: colors.faithful[2], scale: 1 },
];

const choirSpots: Vec3[] = [
  [3.72, 0.41, 2.85],
  [3.72, 0.41, 3.7],
  [3.72, 0.41, 4.55],
  [3.72, 0.41, 5.35],
];

const communionQueue: Vec3[] = [
  [-0.42, world.soleaFloor, -1.05],
  [0.58, world.soleaFloor, -0.95],
  [-0.55, world.soleaFloor, -0.25],
  [0.7, world.soleaFloor, -0.15],
];

export function LiturgyScene({
  step,
  mode,
  activeSpaces,
  selectedSpace,
  onSelectSpace,
  reducedMotion,
}: LiturgySceneProps) {
  const pose = cameraFor(step.id);
  const doorsOpen = step.route !== undefined || step.spaces.includes("royal-doors");
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ fov: 42, position: pose.position, near: 0.08, far: 80 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#c9d0c8"]} />
      <fog attach="fog" args={["#c9d0c8", 16, 42]} />
      <hemisphereLight args={["#f7f1e6", "#d9cbb6", 0.85]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[7, 14, 8]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={2}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <FollowCamera pose={pose} enabled={mode === "follow"} reducedMotion={reducedMotion} />
      <OrbitControls
        makeDefault
        enabled={mode === "free"}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2.2}
        maxDistance={22}
        enablePan
      />
      <Church
        doorsOpen={doorsOpen}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <Cast step={step} reducedMotion={reducedMotion} />
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
    goalPos.set(pose.position[0], pose.position[1], pose.position[2]);
    goalTarget.set(pose.target[0], pose.target[1], pose.target[2]);
    const blend = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.6);
    camera.position.lerp(goalPos, blend);
    look.lerp(goalTarget, blend);
    camera.lookAt(look);
    const orbit = controls as { target?: Vector3 } | null;
    if (orbit?.target) orbit.target.copy(look);
  });

  return null;
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
            <Figure robe={colors.priest} accent={colors.gold} stance={staging.priest.stance} />
          </Placed>
          <Placed actor={staging.deacon}>
            <Figure robe={colors.deacon} stance={staging.deacon.stance} orarion />
          </Placed>
        </>
      )}
      <Placed actor={staging.reader}>
        <Figure robe={colors.reader} stance={staging.reader.stance} />
      </Placed>
      {pewPeople.map((person, index) => {
        const inQueue = index < staging.communicants;
        const position = inQueue ? communionQueue[index] : person.position;
        if (!position) return null;
        return (
          <group key={person.position.join(",")} position={position} rotation={[0, inQueue ? 0 : 0, 0]}>
            <Figure
              robe={person.color}
              stance={inQueue ? "stand" : staging.faithful}
              scale={person.scale}
            />
          </group>
        );
      })}
      {choirSpots.map((position) => (
        <group key={position.join(",")} position={position} rotation={[0, Math.PI / 2, 0]}>
          <Figure robe={colors.choir} stance={choirStance} scale={0.96} />
        </group>
      ))}
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
  const march = useRef<March>({ t: 0.12, dir: 1 });
  const points = routePoints(route);

  useEffect(() => {
    march.current = { t: 0.08, dir: 1 };
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
          <PathWalker points={points} march={march} offset={0} reducedMotion={reducedMotion} carry="gospel" robe={colors.deacon} orarion />
          <Placed actor={stagingFor("little-entrance").priest}>
            <Figure robe={colors.priest} accent={colors.gold} stance="stand" />
          </Placed>
        </>
      ) : (
        <>
          <PathWalker points={points} march={march} offset={0} reducedMotion={reducedMotion} robe={colors.deacon} orarion />
          <PathWalker
            points={points}
            march={march}
            offset={0.14}
            reducedMotion={reducedMotion}
            carry="gifts"
            robe={colors.priest}
            accent={colors.gold}
          />
        </>
      )}
    </group>
  );
}

function PathWalker({
  points,
  march,
  offset,
  reducedMotion,
  robe,
  accent,
  carry = "none",
  orarion = false,
}: {
  points: Vec3[];
  march: RefObject<March>;
  offset: number;
  reducedMotion: boolean;
  robe: string;
  accent?: string;
  carry?: "none" | "gospel" | "gifts";
  orarion?: boolean;
}) {
  const group = useRef<Group>(null);
  const next = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const body = group.current;
    const state = march.current;
    if (!body || !state) return;
    const travel = reducedMotion ? 0.62 : Math.min(1, Math.max(0, state.t - offset));
    const here = pointOnPath(points, travel);
    const ahead = pointOnPath(points, Math.min(1, travel + 0.02));
    body.position.set(here[0], here[1], here[2]);
    next.set(ahead[0], here[1], ahead[2]);
    if (next.distanceTo(body.position) > 0.02) body.lookAt(next);
  });

  return (
    <group ref={group}>
      <Figure robe={robe} accent={accent} stance="stand" carry={carry} orarion={orarion} />
    </group>
  );
}
