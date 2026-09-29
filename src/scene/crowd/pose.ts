import { Matrix4, Quaternion, Vector3, type Object3D } from "three";

const axisX = new Vector3(1, 0, 0);
const axisY = new Vector3(0, 1, 0);
const axisZ = new Vector3(0, 0, 1);
const worldDown = new Vector3(0, -1, 0);
const quatA = new Quaternion();
const quatB = new Quaternion();
const basis = new Matrix4();
const basisX = new Vector3();
const basisZ = new Vector3();
const yAxis = new Vector3();
const point = new Vector3();
const shin = new Vector3();
const forwardDir = new Vector3();
const thighDir = new Vector3();
const shinDir = new Vector3();

/** Rotates a bone so its local +Y (the direction the bone points) matches a world direction. */
export function aimLocalY(bone: Object3D, direction: Vector3): void {
  const parent = bone.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(quatA);
  const y = yAxis.copy(direction).normalize();
  const helper = Math.abs(y.y) > 0.85 ? axisX : axisY;
  const x = basisX.crossVectors(helper, y);
  if (x.lengthSq() < 1e-8) x.crossVectors(axisZ, y);
  x.normalize();
  const z = basisZ.crossVectors(x, y).normalize();
  quatB.setFromRotationMatrix(basis.makeBasis(x, y, z));
  bone.quaternion.copy(quatA.invert()).multiply(quatB);
  bone.updateMatrixWorld(true);
}

export function placeFoot(clone: Object3D, side: "L" | "R", length: number): void {
  const lower = clone.getObjectByName(`LowerLeg${side}`);
  const foot = clone.getObjectByName(`Foot${side}`);
  if (!lower || !foot?.parent) return;
  lower.updateMatrixWorld(true);
  lower.getWorldQuaternion(quatB);
  shin.set(0, 1, 0).applyQuaternion(quatB);
  lower.getWorldPosition(point);
  point.addScaledVector(shin, length);
  foot.parent.worldToLocal(point);
  foot.position.copy(point);
}

export type LegPose = "stand" | "sit" | "kneel";

/** Seated thighs level and shins down; kneeling thighs down and shins back. `facingRoot` gives the figure's forward. */
export function poseLegs(clone: Object3D, facingRoot: Object3D, pose: LegPose): void {
  if (pose === "stand") return;
  facingRoot.updateWorldMatrix(true, false);
  facingRoot.getWorldQuaternion(quatA);
  forwardDir.set(0, 0, 1).applyQuaternion(quatA).normalize();
  if (pose === "sit") {
    thighDir.set(forwardDir.x, -0.05, forwardDir.z).normalize();
    clone.updateMatrixWorld(true);
    for (const side of ["L", "R"] as const) {
      const upper = clone.getObjectByName(`UpperLeg${side}`);
      const lower = clone.getObjectByName(`LowerLeg${side}`);
      if (upper) aimLocalY(upper, thighDir);
      if (lower) aimLocalY(lower, worldDown);
      placeFoot(clone, side, 0.46);
    }
    return;
  }
  const body = clone.getObjectByName("Body");
  if (body) body.position.y = 0.36;
  clone.updateMatrixWorld(true);
  facingRoot.getWorldQuaternion(quatA);
  forwardDir.set(0, 0, 1).applyQuaternion(quatA).normalize();
  thighDir.set(0, -0.92, 0).addScaledVector(forwardDir, 0.35);
  shinDir.set(0, -0.08, 0).addScaledVector(forwardDir, -1);
  for (const side of ["L", "R"] as const) {
    const upper = clone.getObjectByName(`UpperLeg${side}`);
    const lower = clone.getObjectByName(`LowerLeg${side}`);
    if (upper) aimLocalY(upper, thighDir);
    if (lower) aimLocalY(lower, shinDir);
    placeFoot(clone, side, 0.42);
  }
}
