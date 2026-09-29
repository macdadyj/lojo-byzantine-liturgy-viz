import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MeshStandardMaterial, type Group, type Mesh, type Vector3 } from "three";

export type Carry = "none" | "gospel" | "gifts" | "candle" | "cross";

const gold = new MeshStandardMaterial({ color: "#d4b06a", roughness: 0.32, metalness: 0.72 });
const cover = new MeshStandardMaterial({ color: "#6a242c", roughness: 0.55, metalness: 0.1 });
const pages = new MeshStandardMaterial({ color: "#f4efe4", roughness: 0.75 });
const wax = new MeshStandardMaterial({ color: "#f6f1e4", roughness: 0.62 });
const flame = new MeshStandardMaterial({ color: "#ffb45a", emissive: "#ff8a1e", emissiveIntensity: 2.2, roughness: 0.4 });
const smoke = new MeshStandardMaterial({ color: "#efe6d8", transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });

type Hands = { left: Vector3; right: Vector3; between: Vector3 };

/** Whatever the figure holds, placed where the rig puts its hands for the pose. */
export function HeldProp({ carry, hands, elevated }: { carry: Exclude<Carry, "none">; hands: Hands; elevated: boolean }) {
  switch (carry) {
    case "gospel":
      return (
        <group position={[hands.between.x, hands.between.y + 0.1, hands.between.z - 0.03]}>
          <mesh material={cover} castShadow>
            <boxGeometry args={[0.24, 0.3, 0.06]} />
          </mesh>
          <mesh material={pages} position={[0, 0, 0.004]}>
            <boxGeometry args={[0.22, 0.28, 0.062]} />
          </mesh>
          <mesh material={gold} position={[0, 0, -0.034]}>
            <boxGeometry args={[0.1, 0.14, 0.012]} />
          </mesh>
          <mesh material={gold} position={[0, 0, -0.042]}>
            <boxGeometry args={[0.02, 0.1, 0.008]} />
          </mesh>
          <mesh material={gold} position={[0, 0.02, -0.042]}>
            <boxGeometry args={[0.07, 0.018, 0.008]} />
          </mesh>
        </group>
      );
    case "gifts":
      return (
        <group position={[hands.between.x, hands.between.y + (elevated ? 0.03 : 0.02), hands.between.z - 0.02]} scale={1.6}>
          <mesh material={gold} castShadow>
            <cylinderGeometry args={[0.05, 0.058, 0.016, 16]} />
          </mesh>
          <mesh material={gold} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.011, 0.014, 0.13, 10]} />
          </mesh>
          <mesh material={gold} position={[0, 0.075, 0]}>
            <sphereGeometry args={[0.022, 12, 8]} />
          </mesh>
          <mesh material={gold} position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.068, 0.03, 0.1, 18, 1, true]} />
          </mesh>
          <mesh material={gold} position={[0, 0.122, 0]}>
            <sphereGeometry args={[0.03, 12, 8]} />
          </mesh>
        </group>
      );
    case "candle":
      return (
        <group position={[hands.right.x, hands.right.y - 0.02, hands.right.z]}>
          <mesh material={wax} position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.022, 0.46, 10]} />
          </mesh>
          <mesh material={gold} position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.03, 0.03, 12]} />
          </mesh>
          <mesh material={flame} position={[0, 0.44, 0]} scale={[1, 1.6, 1]}>
            <sphereGeometry args={[0.022, 8, 6]} />
          </mesh>
        </group>
      );
    case "cross":
      return (
        <group position={[hands.right.x, hands.right.y + 0.12, hands.right.z - 0.02]} scale={1.8}>
          <mesh material={gold}>
            <boxGeometry args={[0.028, 0.28, 0.016]} />
          </mesh>
          <mesh material={gold} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.16, 0.022, 0.016]} />
          </mesh>
          <mesh material={gold} position={[0, 0.1, 0]}>
            <boxGeometry args={[0.09, 0.016, 0.014]} />
          </mesh>
          <mesh material={gold} position={[0, -0.07, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.07, 0.014, 0.014]} />
          </mesh>
        </group>
      );
    default: {
      const exhaustive: never = carry;
      return exhaustive;
    }
  }
}

/** The censer on its chains, swinging from the deacon's hand, with a little rising smoke. */
export function Censer({ hand }: { hand: Vector3 }) {
  const pivot = useRef<Group>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const clouds = useMemo(() => [0, 1, 2].map(() => smoke.clone()), []);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const swing = pivot.current;
    if (swing) swing.rotation.x = Math.sin(time * 2.4) * 0.5;
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const rise = (time * 0.35 + index / 3) % 1;
      puff.position.set(Math.sin(time * 1.4 + index) * 0.04, -0.2 + rise * 0.45, 0);
      const cloud = clouds[index];
      if (cloud) cloud.opacity = 0.06 + (1 - rise) * 0.16;
    });
  });
  return (
    <group position={[hand.x, hand.y, hand.z]}>
      <group ref={pivot}>
        <mesh material={gold} position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.26, 5]} />
        </mesh>
        <mesh material={gold} position={[0, -0.29, 0]} scale={[1, 0.8, 1]} castShadow>
          <sphereGeometry args={[0.05, 12, 8]} />
        </mesh>
        <mesh material={gold} position={[0, -0.24, 0]}>
          <coneGeometry args={[0.045, 0.06, 10]} />
        </mesh>
      </group>
      {clouds.map((cloud, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            puffs.current[index] = mesh;
          }}
          material={cloud}
        >
          <planeGeometry args={[0.16, 0.22]} />
        </mesh>
      ))}
    </group>
  );
}
