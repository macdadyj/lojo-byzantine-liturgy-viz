import { colors } from "./colors";
import type { Stance } from "./staging";

type Carry = "none" | "gospel" | "gifts";

type FigureProps = {
  robe: string;
  accent?: string;
  scale?: number;
  stance: Stance;
  carry?: Carry;
  orarion?: boolean;
};

export function Figure({
  robe,
  accent,
  scale = 1,
  stance,
  carry = "none",
  orarion = false,
}: FigureProps) {
  const bow = stance === "bow" ? 0.5 : 0;
  const seated = stance === "sit";
  const robeHeight = seated ? 0.78 : 1.22;
  const robeY = seated ? 0.78 : 0.72;
  const headY = seated ? 1.28 : 1.48;

  return (
    <group scale={scale} rotation={[bow, 0, 0]}>
      <mesh position={[0, robeY, 0]} castShadow>
        <cylinderGeometry args={[seated ? 0.2 : 0.18, seated ? 0.28 : 0.36, robeHeight, 14]} />
        <meshStandardMaterial color={robe} roughness={0.78} />
      </mesh>
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 14]} />
        <meshStandardMaterial color="#e6c8a8" roughness={0.62} />
      </mesh>
      {accent ? (
        <mesh position={[0, seated ? 0.85 : 0.9, 0.16]}>
          <boxGeometry args={[0.055, seated ? 0.62 : 0.95, 0.02]} />
          <meshStandardMaterial color={accent} metalness={0.45} roughness={0.38} />
        </mesh>
      ) : null}
      {orarion ? (
        <mesh position={[0.02, 0.95, 0.15]} rotation={[0.15, 0, 0.85]}>
          <boxGeometry args={[0.045, 0.92, 0.018]} />
          <meshStandardMaterial color={colors.gold} metalness={0.5} roughness={0.35} />
        </mesh>
      ) : null}
      {carry === "gospel" ? <GospelBook /> : null}
      {carry === "gifts" ? <HolyGifts /> : null}
    </group>
  );
}

function GospelBook() {
  return (
    <group position={[0.05, 1.05, -0.28]}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.28, 0.06]} />
        <meshStandardMaterial color="#4a2a22" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.034]}>
        <boxGeometry args={[0.08, 0.12, 0.008]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function HolyGifts() {
  return (
    <group position={[0, 1.02, -0.32]}>
      <mesh position={[-0.1, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.03, 12]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0.1, 0.06, 0]}>
        <cylinderGeometry args={[0.045, 0.035, 0.12, 12]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
    </group>
  );
}

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
