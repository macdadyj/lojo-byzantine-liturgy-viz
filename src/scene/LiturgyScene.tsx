import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, ConeGeometry, InstancedMesh, Object3D, TubeGeometry, Vector3 } from "three";
import type { Group } from "three";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep, RouteId } from "../liturgy/types";
import { Church } from "./Church";
import { colors } from "./colors";
import { FpsProbe, IconPicker, StageLook } from "./Effects";
import { cameraFocus } from "./cameraFocus";
import { censingFor, gestureFor } from "./gestures";
import type { IconCard } from "./iconCards";
import { Clergy, type Carry, type ClergyRole } from "./figures/Clergy";
import { Congregants, Faithful } from "./figures/Crowd";
import { cantorSpot, choirLine, communionLine, dismissalLine } from "./crowdLayout";
import type { Vec3 } from "./path";
import { routeFloorAt } from "./floors";
import { setFigureStride } from "./figures/figureMaterial";
import { processionClock, useProcessionMoving } from "./processionClock";
import {
  buildTimeline,
  followShot,
  headingAt,
  pointAt,
  priestAt,
  routeFor,
  walkSpeed,
  walkerDistance,
  type Timeline,
} from "./routes";
import { dprFor, type Quality } from "./quality";
import { holyDebug, publishHolyClock, useHolyBeat } from "./holyBeat";
import { cameraFor, doorsFor, stagingFor, type Actor, type CameraPose, type Stance } from "./staging";
import { dipInMs, dipOutMs, easeGlide, glideSeconds, planMove } from "./cameraMove";
import { Walker } from "./Walker";
import { world } from "./world";
import { Lighting } from "./Lighting";
import { IncenseHaze } from "./lighting/IncenseHaze";
import { useFollowLook } from "./followLook";
import { useLab } from "../lab/labState";
import { LabClock, ReadySignal, StatsProbe } from "../lab/SceneProbes";

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
  /** Phones and tablets: a capped canvas, half-size icon images, and no request for the discrete GPU. */
  handheld?: boolean;
  /** Stops drawing while the church is hidden (the phone's Text view), without unmounting it. */
  paused?: boolean;
  /** Extra probes rendered inside the Canvas (diagnostics, context-loss handling). */
  children?: ReactNode;
};

/** Resolves once the post-processing chunk has arrived, so the lab can wait for it before a screenshot. */
export const postChunk = { loaded: false };
const PostEffects = lazy(() =>
  import("./PostEffects").then((module) => {
    postChunk.loaded = true;
    return module;
  }),
);

let debugCamera: { position: Vec3; target: Vec3 } | null = null;

/** The procession writes its camera shot each frame so Follow liturgy can walk ahead of it. */
const processionShot = {
  active: false,
  position: [0, 0, 0] as Vec3,
  target: [0, 0, 0] as Vec3,
};
/** A scrub or a new step moves the shot further than this at once: cut instead of sweeping across the church. */
const shotCutMeters = 6;

const choirSpots = choirLine.map((position) => ({ position, rotationY: Math.PI / 2 }));
const cantorSpots = [{ position: cantorSpot, rotationY: Math.PI / 2 }];
const communionSpots = communionLine.map((position) => ({ position, rotationY: 0 }));
const dismissalSpots = dismissalLine.map((position) => ({ position, rotationY: 0 }));

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
  handheld = false,
  paused = false,
  children,
}: LiturgySceneProps) {
  const pose = cameraFor(step.id);
  const beat = useHolyBeat(step.id);
  const clergyReceiving = beat === "clergy";
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.receiving = clergyReceiving;
    bridge.holy = () => holyDebug();
    window.__liturgy = bridge;
  }, [clergyReceiving]);
  const doors = doorsFor(step.id, clergyReceiving);
  const lab = useLab();
  const { systems } = lab;
  const shadowMaps = systems.shadows && quality !== "low";
  const post = systems.post && quality !== "low";
  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      dpr={dprFor(quality, handheld)}
      shadows={shadowMaps ? "percentage" : false}
      camera={{ fov: 42, position: (lab.camera ?? pose).position, near: 0.15, far: 140 }}
      gl={{
        antialias: quality !== "low",
        powerPreference: handheld ? "default" : "high-performance",
        preserveDrawingBuffer: lab.freezeAt !== null,
      }}
    >
      <LabClock freezeAt={lab.freezeAt} />
      <StatsProbe />
      <Lighting preset={lab.lighting} quality={quality} shadows={shadowMaps} />
      <StageLook quality={quality} />
      <FollowCamera
        pose={lab.camera ?? pose}
        enabled={mode === "follow"}
        reducedMotion={reducedMotion || lab.snap}
        quality={quality}
      />
      {mode === "free" ? <Walker enabled doors={doors} headBob={headBob} /> : null}
      <Suspense fallback={null}>
        <Church
          doors={doors}
          showLabels={showLabels}
          quality={quality}
          activeSpaces={activeSpaces}
          selectedSpace={selectedSpace}
          onSelectSpace={onSelectSpace}
          showArt={systems.icons}
          smallArt={handheld}
        />
        {systems.people ? (
          <Cast
            step={step}
            reducedMotion={reducedMotion}
            frozen={lab.freezeAt !== null}
            quality={quality}
            elevated={step.id === "holy-things" && !clergyReceiving}
            incense={systems.incense}
            seed={lab.seed}
            shadows={shadowMaps && quality === "high"}
          />
        ) : null}
        {systems.incense && quality !== "low" ? <IncenseHaze count={quality === "high" ? 28 : 16} /> : null}
        <ReadySignal waitFor={post ? postChunk : null} />
      </Suspense>
      {post ? (
        <Suspense fallback={null}>
          <PostEffects quality={quality} focus={mode === "follow"} />
        </Suspense>
      ) : null}
      <FpsProbe onFps={onFps} />
      <HolyBeatPump />
      <IconPicker enabled={mode === "free"} onPick={onInspect} />
      {children}
    </Canvas>
  );
}

/** Paints the clergy close on the frame the clock elapses, even if React props are still open. */
function HolyBeatPump() {
  useFrame(() => {
    publishHolyClock(performance.now());
  });
  return null;
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
  const { camera, scene, gl } = useThree();
  const goalPos = useMemo(() => new Vector3(), []);
  const goalTarget = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const poseKey = `${quality}:${pose.position.join(",")}:${pose.target.join(",")}`;
  const shown = useRef<CameraPose | null>(null);
  const glide = useRef<{ from: Vector3; fromLook: Vector3; t: number } | null>(null);
  const veil = useDipVeil(gl.domElement);
  const offset = useFollowLook(gl.domElement, enabled);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.setCamera = (position, target) => {
      debugCamera = { position, target };
    };
    bridge.clearCamera = () => {
      debugCamera = null;
    };
    bridge.cameraAt = () => camera.position.toArray().map((value) => Number(value.toFixed(2)));
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
  }, [camera, scene]);

  // Only a new pose starts a move; mode and reduced motion are read at that moment.
  useLayoutEffect(() => {
    offset.release();
    if (debugCamera || processionShot.active) return;
    const previous = shown.current;
    shown.current = { position: [...pose.position], target: [...pose.target] };
    const cut = () => {
      glide.current = null;
      camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
      look.set(pose.target[0], pose.target[1], pose.target[2]);
      camera.lookAt(look);
      cameraFocus.copy(look);
    };
    const move = previous && enabled ? planMove(previous, pose, reducedMotion) : "snap";
    if (move !== "dip") veil.cancel();
    switch (move) {
      case "snap":
        cut();
        return;
      case "glide":
        glide.current = { from: camera.position.clone(), fromLook: look.clone(), t: 0 };
        return;
      case "dip":
        glide.current = null;
        veil.dip(cut);
        return;
      default: {
        const exhaustive: never = move;
        return exhaustive;
      }
    }
  }, [camera, look, pose, poseKey]);

  useFrame((_, delta) => {
    veil.step(delta);
    if (!enabled) return;
    if (debugCamera) {
      goalPos.set(debugCamera.position[0], debugCamera.position[1], debugCamera.position[2]);
      goalTarget.set(debugCamera.target[0], debugCamera.target[1], debugCamera.target[2]);
    } else if (processionShot.active) {
      goalPos.fromArray(processionShot.position);
      goalTarget.fromArray(processionShot.target);
      const blend = reducedMotion || camera.position.distanceTo(goalPos) > shotCutMeters ? 1 : 1 - Math.exp(-delta * 4);
      camera.position.lerp(goalPos, blend);
      look.lerp(goalTarget, blend);
      camera.lookAt(look);
      cameraFocus.copy(look);
      offset.apply(camera, delta, reducedMotion);
      return;
    } else {
      goalPos.set(pose.position[0], pose.position[1], pose.position[2]);
      goalTarget.set(pose.target[0], pose.target[1], pose.target[2]);
      const moving = glide.current;
      if (moving) {
        moving.t = Math.min(1, moving.t + delta / glideSeconds);
        const eased = easeGlide(moving.t);
        camera.position.lerpVectors(moving.from, goalPos, eased);
        look.lerpVectors(moving.fromLook, goalTarget, eased);
        camera.lookAt(look);
        cameraFocus.copy(look);
        offset.apply(camera, delta, reducedMotion);
        if (moving.t >= 1) glide.current = null;
        return;
      }
    }
    const distance = camera.position.distanceTo(goalPos);
    const blend = reducedMotion || distance > 4 ? 1 : 1 - Math.exp(-delta * 8);
    camera.position.lerp(goalPos, blend);
    look.lerp(goalTarget, blend);
    camera.lookAt(look);
    cameraFocus.copy(look);
    offset.apply(camera, delta, reducedMotion);
  });

  return null;
}

/** Longest frame the veil advances by, so even a slow device shows a few frames of the fade. */
const veilStepMs = 100;

/**
 * A dark veil over the canvas for dip-to-dark cuts, advanced by the render loop so the cut lands on a dark
 * frame. `dip` fades out, runs `cut` while dark, then fades in.
 */
function useDipVeil(canvas: HTMLCanvasElement) {
  const element = useMemo(() => {
    const veil = document.createElement("div");
    veil.setAttribute("aria-hidden", "true");
    veil.dataset.veil = "dip";
    Object.assign(veil.style, { position: "absolute", inset: "0", background: "#0b0806", opacity: "0", pointerEvents: "none" });
    return veil;
  }, []);
  const state = useRef<{ phase: "out" | "in"; ms: number; cut: () => void } | null>(null);
  useEffect(() => {
    canvas.parentElement?.appendChild(element);
    return () => element.remove();
  }, [canvas, element]);
  return useMemo(
    () => ({
      cancel() {
        state.current = null;
        element.style.opacity = "0";
      },
      dip(cut: () => void) {
        const fading = state.current;
        state.current = { phase: "out", ms: fading?.phase === "in" ? dipOutMs * (1 - fading.ms / dipInMs) : 0, cut };
      },
      step(delta: number) {
        const dip = state.current;
        if (!dip) return;
        dip.ms += Math.min(delta * 1000, veilStepMs);
        if (dip.phase === "out") {
          element.style.opacity = String(Math.min(1, dip.ms / dipOutMs));
          if (dip.ms >= dipOutMs) {
            dip.cut();
            state.current = { phase: "in", ms: 0, cut: dip.cut };
          }
          return;
        }
        const left = 1 - dip.ms / dipInMs;
        element.style.opacity = String(Math.max(0, left * left));
        if (left <= 0) state.current = null;
      },
    }),
    [element],
  );
}

function Cast({
  step,
  reducedMotion,
  frozen,
  quality,
  elevated,
  incense,
  seed,
  shadows,
}: {
  step: LiturgyStep;
  reducedMotion: boolean;
  frozen: boolean;
  quality: Quality;
  elevated: boolean;
  incense: boolean;
  seed: number;
  shadows: boolean;
}) {
  const staging = stagingFor(step.id);
  const route = step.route;
  const choirStance: Stance =
    staging.faithful === "bow" || staging.faithful === "kneel" ? staging.faithful : "stand";
  const gesture = gestureFor(step.id);
  const censing = incense && censingFor(step.id);
  if (!route) processionShot.active = false;
  const carry = priestCarry(step.id, elevated);
  const lineSpots = useMemo(
    () => (step.id === "dismissal" ? dismissalSpots : communionSpots).slice(0, staging.communicants),
    [staging.communicants, step.id],
  );

  return (
    <group>
      {route ? (
        <Procession route={route} reducedMotion={reducedMotion} frozen={frozen} quality={quality} censing={censing} />
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
            <Clergy role="server" stance="stand" carry="candle" quality={quality} />
          </Placed>
          <Placed actor={{ position: [1.45, world.soleaFloor, -5.2], facing: Math.PI, stance: "stand" }}>
            <Clergy role="server" stance="stand" carry="candle" quality={quality} />
          </Placed>
        </>
      ) : null}
      {step.id === "dismissal" ? <BlessingCross /> : null}
      <Placed actor={staging.reader}>
        <Clergy role="reader" stance={staging.reader.stance} gesture={gesture} quality={quality} />
      </Placed>
      {/* The two servers carry the candles in a procession. */}
      {route ? null : (
        <>
          <Placed actor={{ position: [-1.7, world.sanctuaryFloor, -14.7], facing: 0, stance: "stand" }}>
            <Clergy role="server" stance="stand" quality={quality} />
          </Placed>
          <Placed actor={{ position: [2.7, world.sanctuaryFloor, -14.3], facing: 0, stance: "stand" }}>
            <Clergy role="server" stance="stand" quality={quality} />
          </Placed>
        </>
      )}
      <Faithful
        stance={staging.faithful}
        gesture={gesture}
        quality={quality}
        seed={seed}
        skip={staging.communicants}
        shadows={shadows}
      />
      <Approaching active={step.id === "dismissal"}>
        <Congregants
          spots={lineSpots}
          pose={step.id === "communion" ? "chest" : undefined}
          stance="stand"
          gesture={gesture}
          seed={seed + 101}
          shadows={shadows}
          quality={quality}
        />
      </Approaching>
      <Congregants spots={choirSpots} stance={choirStance} gesture={gesture} seed={seed + 202} shadows={shadows} quality={quality} />
      <Congregants spots={cantorSpots} stance="stand" gesture={gesture} seed={seed + 303} shadows={shadows} quality={quality} />
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

/** Samples along the route, so the ribbon follows the steps up onto the solea and into the sanctuary. */
const ribbonStep = 0.3;
const arrowSpacing = 2.4;

function RouteRibbon({ timeline }: { timeline: Timeline }) {
  const { path } = timeline;
  const geometry = useMemo(() => {
    const samples: Vector3[] = [];
    for (let at = 0; at < path.length; at += ribbonStep) {
      const [x, z] = pointAt(path, at);
      samples.push(new Vector3(x, routeFloorAt(x, z) + 0.05, z));
    }
    const [x, z] = pointAt(path, path.length);
    samples.push(new Vector3(x, routeFloorAt(x, z) + 0.05, z));
    const curve = new CatmullRomCurve3(samples, false, "centripetal");
    return new TubeGeometry(curve, samples.length * 2, 0.045, 6, false);
  }, [path]);
  const arrow = useMemo(() => {
    const cone = new ConeGeometry(0.13, 0.34, 3);
    cone.rotateX(Math.PI / 2);
    cone.scale(1, 0.35, 1);
    return cone;
  }, []);
  const arrows = useRef<InstancedMesh>(null);
  const count = Math.max(1, Math.floor(path.length / arrowSpacing));

  useLayoutEffect(() => {
    const mesh = arrows.current;
    if (!mesh) return;
    const place = new Object3D();
    for (let index = 0; index < count; index += 1) {
      const at = (index + 0.5) * arrowSpacing;
      const [x, z] = pointAt(path, at);
      const [hx, hz] = headingAt(path, at, 0.05);
      place.position.set(x, routeFloorAt(x, z) + 0.07, z);
      place.rotation.set(0, Math.atan2(hx, hz), 0);
      place.updateMatrix();
      mesh.setMatrixAt(index, place.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, path]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => arrow.dispose(), [arrow]);

  const material = <meshStandardMaterial color={colors.runner} roughness={0.4} emissive={colors.runner} emissiveIntensity={0.35} />;
  return (
    <group>
      <mesh geometry={geometry}>{material}</mesh>
      <instancedMesh ref={arrows} args={[arrow, undefined, count]} key={count}>
        {material}
      </instancedMesh>
    </group>
  );
}

/** Meters the priest has walked, shared by every walker in the frame. */
type March = { priest: number };

/** Candles first, then the deacon, then the priest, `back` meters behind the first candle. */
function Procession({
  route,
  reducedMotion,
  frozen,
  quality,
  censing,
}: {
  route: RouteId;
  reducedMotion: boolean;
  frozen: boolean;
  quality: Quality;
  censing: boolean;
}) {
  const timeline = useMemo(() => buildTimeline(routeFor(route)), [route]);
  const march = useRef<March>({ priest: 0 });
  const moving = useProcessionMoving();
  // Reduced motion and still captures start paused at the key moment; read when a route begins, not after.
  const still = useRef(reducedMotion || frozen);
  still.current = reducedMotion || frozen;

  useEffect(() => {
    processionClock.attach(route, {
      duration: timeline.duration,
      beats: timeline.beats.map(({ label, time }) => ({ label, time })),
      time: still.current ? timeline.keyTime : 0,
      playing: !still.current,
    });
    return () => {
      processionClock.detach(route);
      processionShot.active = false;
    };
  }, [route, timeline]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.procession = processionClock;
    window.__liturgy = bridge;
  }, []);

  useFrame((_, delta) => {
    const pinned = import.meta.env.DEV ? window.__liturgy?.marchT : undefined;
    const time =
      typeof pinned === "number"
        ? timeline.duration * Math.min(1, Math.max(0, pinned))
        : processionClock.advance(Math.min(delta, 0.25));
    const priest = priestAt(timeline, time);
    march.current.priest = priest.distance;
    processionClock.setMoving(priest.moving && processionClock.snapshot().playing);
    setFigureStride(priest.distance / walkSpeed);
    const shot = followShot(timeline, priest.distance, routeFloorAt);
    processionShot.active = true;
    processionShot.position = shot.position;
    processionShot.target = shot.target;
  }, -2);

  const gospel = route === "little-entrance";
  const walker = { timeline, march, moving, quality };
  return (
    <group>
      <RouteRibbon timeline={timeline} />
      <PathWalker {...walker} back={0} carry="candle" role="server" />
      <PathWalker {...walker} back={1.05} carry="candle" role="server" />
      <PathWalker {...walker} back={2.1} carry={gospel ? "gospel" : "none"} role="deacon" censing={censing} />
      <PathWalker {...walker} back={3.15} carry={gospel ? "none" : "gifts"} role="priest" />
    </group>
  );
}

function PathWalker({
  timeline,
  march,
  back,
  moving,
  role,
  carry = "none",
  quality,
  censing = false,
}: {
  timeline: Timeline;
  march: RefObject<March>;
  back: number;
  moving: boolean;
  role: ClergyRole;
  carry?: Carry;
  quality: Quality;
  censing?: boolean;
}) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const body = group.current;
    const state = march.current;
    if (!body || !state) return;
    const distance = walkerDistance(state.priest, back);
    const [x, z] = pointAt(timeline.path, distance);
    const [hx, hz] = headingAt(timeline.path, distance);
    body.position.set(x, routeFloorAt(x, z), z);
    // A figure faces −Z at rest.
    body.rotation.y = Math.atan2(-hx, -hz);
  }, -1);

  return (
    <group ref={group}>
      <Clergy role={role} stance="stand" walking={moving} carry={carry} quality={quality} censing={censing} />
    </group>
  );
}
