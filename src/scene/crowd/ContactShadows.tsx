import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { blobTexture } from "../materials/paint";

export type Contact = { x: number; y: number; z: number; radius: number };

const matrix = new Matrix4();
const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const scale = new Vector3();
const place = new Vector3();

/** Soft dark ovals on the floor under feet and pews, drawn in one call, so figures sit on the ground. */
export function ContactShadows({ contacts, opacity }: { contacts: readonly Contact[]; opacity: number }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const material = useMemo(
    () => new MeshBasicMaterial({ map: blobTexture(), color: "#000000", transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [opacity],
  );
  useLayoutEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    contacts.forEach((contact, index) => {
      place.set(contact.x, contact.y + 0.012, contact.z);
      scale.set(contact.radius * 2, contact.radius * 2.4, 1);
      matrix.compose(place, flat, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [contacts]);
  if (contacts.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, contacts.length]} renderOrder={1} />;
}
