import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { resolveWalk } from "./collide";
import { requestWalk, walkGoal, walkStick } from "./walkGoal";

const EYE = 1.65;

type WalkerProps = {
  enabled: boolean;
  doorsOpen: boolean;
  headBob: boolean;
};

export function Walker({ enabled, doorsOpen, headBob }: WalkerProps) {
  const { camera, gl } = useThree();
  const keys = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
  });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const spot = useRef({ x: 0, z: 8 });
  const bobPhase = useRef(0);
  const dragging = useRef(false);
  const goalToken = useRef(0);
  const goalLeft = useRef(0);
  const doors = useRef(doorsOpen);
  doors.current = doorsOpen;

  useLayoutEffect(() => {
    if (!enabled) return;
    const here = resolveWalk(camera.position.x, camera.position.z, doors.current);
    spot.current = { x: here.x, z: here.z };
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    yaw.current = Math.atan2(-forward.x, -forward.z);
    pitch.current = Math.asin(Math.min(1, Math.max(-1, forward.y)));

    if (!(camera instanceof PerspectiveCamera)) return;
    const previousFov = camera.fov;
    const previousNear = camera.near;
    camera.fov = 62;
    camera.near = 0.08;
    camera.updateProjectionMatrix();

    const previous = document.body.dataset.walk;
    document.body.dataset.walk = "1";

    if (import.meta.env.DEV) {
      const bridge = window.__liturgy ?? {};
      bridge.walkTo = (x, z, nextYaw, nextPitch = 0) => requestWalk(x, z, nextYaw, nextPitch);
      window.__liturgy = bridge;
    }

    const element = gl.domElement;
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const down = event.type === "keydown";
      const key = event.key.toLowerCase();
      if (key === "w" || event.key === "ArrowUp") keys.current.forward = down;
      else if (key === "s" || event.key === "ArrowDown") keys.current.back = down;
      else if (key === "a" || event.key === "ArrowLeft") keys.current.left = down;
      else if (key === "d" || event.key === "ArrowRight") keys.current.right = down;
      else return;
      event.preventDefault();
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging.current = true;
      element.requestPointerLock?.();
    };
    const onUp = () => {
      dragging.current = false;
    };
    const onMove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === element;
      if (!locked && !dragging.current) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current -= event.movementY * 0.0022;
      pitch.current = Math.min(1.15, Math.max(-1.2, pitch.current));
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    element.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    return () => {
      if (previous) document.body.dataset.walk = previous;
      else delete document.body.dataset.walk;
      camera.fov = previousFov;
      camera.near = previousNear;
      camera.updateProjectionMatrix();
      if (document.pointerLockElement === element) document.exitPointerLock?.();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      element.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      keys.current = { forward: false, back: false, left: false, right: false };
    };
  }, [camera, enabled, gl]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (walkGoal.token !== goalToken.current) {
      goalToken.current = walkGoal.token;
      goalLeft.current = 0.85;
    }
    if (goalLeft.current > 0) {
      const step = Math.min(1, delta / goalLeft.current);
      spot.current.x += (walkGoal.x - spot.current.x) * step;
      spot.current.z += (walkGoal.z - spot.current.z) * step;
      yaw.current += (walkGoal.yaw - yaw.current) * step;
      pitch.current += (walkGoal.pitch - pitch.current) * step;
      goalLeft.current = Math.max(0, goalLeft.current - delta);
    } else {
      let forward = 0;
      let strafe = 0;
      if (keys.current.forward) forward += 1;
      if (keys.current.back) forward -= 1;
      if (keys.current.right) strafe += 1;
      if (keys.current.left) strafe -= 1;
      forward += walkStick.y;
      strafe += walkStick.x;
      const speed = 2.35 * delta;
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      const fx = -sin;
      const fz = -cos;
      const rx = cos;
      const rz = -sin;
      const nextX = spot.current.x + (fx * forward + rx * strafe) * speed;
      const nextZ = spot.current.z + (fz * forward + rz * strafe) * speed;
      const resolved = resolveWalk(nextX, nextZ, doors.current);
      spot.current.x = resolved.x;
      spot.current.z = resolved.z;
      const moving = Math.abs(forward) + Math.abs(strafe) > 0.05;
      if (headBob && moving) bobPhase.current += delta * 8;
    }
    const resolved = resolveWalk(spot.current.x, spot.current.z, doors.current);
    spot.current.x = resolved.x;
    spot.current.z = resolved.z;
    const bob = headBob ? Math.sin(bobPhase.current) * 0.035 : 0;
    camera.position.set(resolved.x, resolved.floor + EYE + bob, resolved.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
  });

  return null;
}

function isTyping(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
