import { Raycaster, Vector3, type Object3D } from "three";

const raycaster = new Raycaster();
const origin = new Vector3();
const down = new Vector3(0, -1, 0);
const floors: Object3D[] = [];

/**
 * Top of the rendered floor under a standing spot.
 * Matches the boxes in Church: nave marble, narthex, solea, sanctuary step, runner, and the kliros.
 */
export function floorTopAt(x: number, z: number, maxY = Infinity): number {
  let top = 0.02;
  const consider = (y: number) => {
    if (y <= maxY + 0.02) top = Math.max(top, y);
  };
  if (Math.abs(x) <= 11.5 && z >= 16.5 && z <= 22.7) consider(0.13);
  if (Math.abs(x) <= 0.85 && z >= -7.8 && z <= 16.2) consider(0.06);
  if (Math.abs(x) <= 8 && z >= -8.9 && z <= -5.5) consider(0.2);
  if (Math.abs(x) <= 11.5 && z >= -18.6 && z <= -9.2) consider(0.42);
  if (x >= 6.4 && x <= 11 && z >= 1.8 && z <= 11) consider(3.23);
  return top;
}

function collectFloors(scene: Object3D): void {
  floors.length = 0;
  scene.traverse((object) => {
    if (object.userData.floor === true) floors.push(object);
  });
}

/**
 * Floor under a foot. The ray starts just above that foot so the kliros slab,
 * which hangs over the south pews, is not treated as the nave floor.
 */
export function raycastFloor(scene: Object3D, x: number, z: number, fromY = 12): number {
  const mounted = floors[0]?.parent;
  if (floors.length < 4 || !mounted) collectFloors(scene);
  origin.set(x, fromY, z);
  raycaster.set(origin, down);
  raycaster.far = fromY + 2;
  const hits = raycaster.intersectObjects(floors, false);
  const hit = hits.find((item) => item.point.y <= fromY + 0.02);
  if (hit) return hit.point.y;
  return floorTopAt(x, z, fromY);
}
