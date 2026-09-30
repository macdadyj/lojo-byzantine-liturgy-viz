import { colors } from "./colors";

export function ByzantineCross({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.06, 1.15, 0.06]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.52, 0.06, 0.06]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.32, 0.05, 0.05]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.36, 0.045, 0.05]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}
