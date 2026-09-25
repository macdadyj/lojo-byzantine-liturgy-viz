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
  const bow = stance === "bow" ? 0.5 : stance === "kneel" ? 0.85 : 0;
  const seated = stance === "sit" || stance === "kneel";
  const priest = Boolean(accent);
  const robeHeight = seated ? 0.78 : priest ? 1.28 : 1.22;
  const robeY = seated ? 0.78 : 0.7;
  const headY = seated ? 1.28 : 1.52;
  const radiusTop = seated ? 0.2 : priest ? 0.16 : 0.18;
  const radiusBottom = seated ? 0.28 : priest ? 0.48 : 0.34;

  return (
    <group scale={scale} rotation={[bow, 0, 0]}>
      <mesh position={[0, robeY, 0]} castShadow>
        <cylinderGeometry args={[radiusTop, radiusBottom, robeHeight, 16]} />
        <meshStandardMaterial color={robe} roughness={0.72} />
      </mesh>
      {priest ? <PhelonionMarks /> : null}
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 14]} />
        <meshStandardMaterial color="#e6c8a8" roughness={0.62} />
      </mesh>
      {accent ? (
        <mesh position={[0, seated ? 0.85 : 0.95, -0.2]}>
          <boxGeometry args={[0.07, seated ? 0.62 : 1.05, 0.02]} />
          <meshStandardMaterial color={accent} metalness={0.55} roughness={0.32} />
        </mesh>
      ) : null}
      {orarion ? <Orarion /> : null}
      {priest || orarion ? <Cuffs /> : null}
      {carry === "gospel" ? <GospelBook /> : null}
      {carry === "gifts" ? <HolyGifts /> : null}
    </group>
  );
}

function PhelonionMarks() {
  const crosses = [
    [0, 1.05],
    [-0.12, 0.55],
    [0.12, 0.55],
  ] as const;
  return (
    <group>
      {crosses.map(([x, y]) => (
        <group key={`${x}-${y}`} position={[x, y, -0.28]}>
          <mesh>
            <boxGeometry args={[0.09, 0.018, 0.012]} />
            <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.018, 0.11, 0.012]} />
            <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 16]} />
        <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Orarion() {
  return (
    <group>
      <mesh position={[-0.08, 1.05, -0.2]} rotation={[0.2, 0, 0.55]}>
        <boxGeometry args={[0.055, 0.95, 0.016]} />
        <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0.1, 0.7, -0.22]}>
        <boxGeometry args={[0.05, 0.85, 0.016]} />
        <meshStandardMaterial color={colors.gold} metalness={0.55} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Cuffs() {
  return (
    <group>
      <mesh position={[-0.16, 0.95, -0.16]}>
        <boxGeometry args={[0.08, 0.05, 0.04]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.16, 0.95, -0.16]}>
        <boxGeometry args={[0.08, 0.05, 0.04]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function GospelBook() {
  return (
    <group>
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

export function HolyGifts() {
  return (
    <group>
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
