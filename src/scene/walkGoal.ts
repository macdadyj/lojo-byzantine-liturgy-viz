export const walkStick = { x: 0, y: 0 };

export const walkGoal = {
  token: 0,
  x: 0,
  z: 6,
  yaw: 0,
  pitch: 0,
};

export function requestWalk(x: number, z: number, yaw: number, pitch = 0): void {
  walkGoal.token += 1;
  walkGoal.x = x;
  walkGoal.z = z;
  walkGoal.yaw = yaw;
  walkGoal.pitch = pitch;
}
