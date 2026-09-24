import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { Html } from "@react-three/drei";
import { colors } from "./colors";
import { ByzantineCross } from "./Figures";
import { Iconostas } from "./Iconostas";
import { paintAltarFrontal } from "./icons";
import type { SpaceId } from "../liturgy/spaces";
import { floorPatches, spaceLabels, world } from "./world";

type ChurchProps = {
  doorsOpen: boolean;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

export function Church({ doorsOpen, activeSpaces, selectedSpace, onSelectSpace }: ChurchProps) {
  return (
    <group>
      <Ground />
      <Shell />
      <Floors />
      <Pews />
      <Furnishings />
      <Iconostas doorsOpen={doorsOpen} />
      <Lamps />
      <Labels activeSpaces={activeSpaces} />
      {floorPatches.map((patch) => (
        <mesh
          key={`${patch.id}-${patch.position.join(",")}`}
          position={patch.position}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onSelectSpace(patch.id);
          }}
        >
          <planeGeometry args={patch.size} />
          <meshBasicMaterial
            color={patch.id === selectedSpace ? "#f3e2a8" : "#e7c56a"}
            transparent
            opacity={activeSpaces.includes(patch.id) ? 0.38 : 0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 2]} receiveShadow>
        <circleGeometry args={[28, 40]} />
        <meshStandardMaterial color={colors.ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 14.2]} receiveShadow>
        <planeGeometry args={[2.4, 4]} />
        <meshStandardMaterial color={colors.path} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Shell() {
  const span = world.narthexWest - world.sanctuaryEast;
  const centerZ = (world.narthexWest + world.sanctuaryEast) / 2;
  const outer = world.halfWidth + world.wall;
  return (
    <group>
      <Wall position={[0, 2.2, world.sanctuaryEast - 0.2]} args={[outer * 2 + 0.4, 4.4, world.wall]} />
      <Wall position={[-outer, 2.2, centerZ]} args={[world.wall, 4.4, span]} />
      <Wall position={[outer, 2.2, centerZ]} args={[world.wall, 4.4, span]} />
      <Wall position={[-2.4, 2.2, world.narthexWest]} args={[4.2, 4.4, world.wall]} />
      <Wall position={[2.4, 2.2, world.narthexWest]} args={[4.2, 4.4, world.wall]} />
      <Wall position={[0, 4.05, world.narthexWest]} args={[2.2, 0.7, world.wall]} />
      <Skirt />
      <InteriorFinish />
      <Windows />
      <Roof />
      <Dome />
    </group>
  );
}

function Wall({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={colors.plaster} roughness={0.9} />
    </mesh>
  );
}

function Skirt() {
  const span = world.narthexWest - world.sanctuaryEast;
  const centerZ = (world.narthexWest + world.sanctuaryEast) / 2;
  const outer = world.halfWidth + world.wall + 0.08;
  return (
    <group>
      <mesh position={[0, 0.35, world.sanctuaryEast - 0.28]} receiveShadow>
        <boxGeometry args={[outer * 2 + 0.5, 0.7, 0.2]} />
        <meshStandardMaterial color={colors.stone} roughness={0.95} />
      </mesh>
      <mesh position={[-outer, 0.35, centerZ]} receiveShadow>
        <boxGeometry args={[0.16, 0.7, span]} />
        <meshStandardMaterial color={colors.stone} roughness={0.95} />
      </mesh>
      <mesh position={[outer, 0.35, centerZ]} receiveShadow>
        <boxGeometry args={[0.16, 0.7, span]} />
        <meshStandardMaterial color={colors.stone} roughness={0.95} />
      </mesh>
    </group>
  );
}

function InteriorFinish() {
  return (
    <group>
      <mesh position={[-5.28, 0.58, 2.3]}>
        <boxGeometry args={[0.08, 1.16, 18.5]} />
        <meshStandardMaterial color="#7a3a32" roughness={0.82} />
      </mesh>
      <mesh position={[5.28, 0.58, 2.3]}>
        <boxGeometry args={[0.08, 1.16, 18.5]} />
        <meshStandardMaterial color="#7a3a32" roughness={0.82} />
      </mesh>
      <mesh position={[-5.28, 1.2, 2.3]}>
        <boxGeometry args={[0.1, 0.06, 18.5]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[5.28, 1.2, 2.3]}>
        <boxGeometry args={[0.1, 0.06, 18.5]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Windows() {
  const heights = [3.55];
  const zs = [-5.6, -1.2, 2.2, 5.4, 8.2];
  return (
    <group>
      {zs.map((z) =>
        heights.map((y) => (
          <group key={`${z}-${y}`}>
            <Window x={-world.halfWidth - 0.02} z={z} y={y} />
            <Window x={world.halfWidth + 0.02} z={z} y={y} />
          </group>
        )),
      )}
    </group>
  );
}

function Window({ x, y, z }: { x: number; y: number; z: number }) {
  const flip = x > 0 ? Math.PI : 0;
  return (
    <group position={[x, y, z]} rotation={[0, flip, 0]}>
      <mesh>
        <planeGeometry args={[0.55, 1.7]} />
        <meshStandardMaterial color={colors.glass} emissive={colors.glass} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.62, 0.06, 0.04]} />
        <meshStandardMaterial color={colors.woodDark} />
      </mesh>
    </group>
  );
}

function Roof() {
  const slopes: { tilt: number }[] = [{ tilt: 0.42 }, { tilt: -0.42 }];
  const runs: { z: number; depth: number }[] = [
    { z: -5.05, depth: 8.1 },
    { z: 7.25, depth: 7.7 },
  ];
  return (
    <group>
      {slopes.map((slope) =>
        runs.map((run) => (
          <mesh key={`${slope.tilt}-${run.z}`} position={[0, 5.55, run.z]} rotation={[0, 0, slope.tilt]} castShadow>
            <boxGeometry args={[6.4, 0.16, run.depth]} />
            <meshStandardMaterial color={colors.roof} roughness={0.86} />
          </mesh>
        )),
      )}
      <mesh position={[0, 4.7, 2.4]}>
        <boxGeometry args={[10.7, 0.12, 20.2]} />
        <meshStandardMaterial
          color={colors.plasterDeep}
          roughness={0.92}
          side={2}
          emissive={colors.plasterDeep}
          emissiveIntensity={0.22}
        />
      </mesh>
    </group>
  );
}

function Dome() {
  return (
    <group position={[0, 4.75, 1.2]}>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[2.15, 2.35, 2.2, 24]} />
        <meshStandardMaterial color={colors.exterior} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[2.15, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={colors.dome} metalness={0.35} roughness={0.4} />
      </mesh>
      <group position={[0, 4.55, 0]}>
        <ByzantineCross scale={0.55} />
      </group>
    </group>
  );
}

function Floors() {
  const naveDepth = world.naveWest - -1.5;
  const naveCenter = (-1.5 + world.naveWest) / 2;
  return (
    <group>
      <mesh position={[0, -0.06, naveCenter]} receiveShadow>
        <boxGeometry args={[world.halfWidth * 2, 0.12, naveDepth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.88} />
      </mesh>
      <mesh position={[0, -0.06, 10.75]} receiveShadow>
        <boxGeometry args={[world.halfWidth * 2, 0.12, 3.2]} />
        <meshStandardMaterial color={colors.floorDark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, -5.3]} receiveShadow>
        <boxGeometry args={[world.halfWidth * 2, 0.24, 4.5]} />
        <meshStandardMaterial color="#9a7d5c" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.07, -2.28]} receiveShadow>
        <boxGeometry args={[8.6, 0.14, 1.55]} />
        <meshStandardMaterial color="#a88b68" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.16, -1.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.25, 24, Math.PI, Math.PI]} />
        <meshStandardMaterial color="#b29772" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.03, 4]} receiveShadow>
        <boxGeometry args={[1.35, 0.02, 12.5]} />
        <meshStandardMaterial color={colors.runner} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Pews() {
  const rows = [2.55, 4.15, 5.75, 7.35];
  return (
    <group>
      {rows.map((z) => (
        <group key={z}>
          <Pew position={[-2.45, z]} />
          <Pew position={[2.45, z]} />
        </group>
      ))}
    </group>
  );
}

function Pew({ position }: { position: [number, number] }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.08, 0.46]} />
        <meshStandardMaterial color={colors.wood} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.78, -0.2]} castShadow>
        <boxGeometry args={[1.85, 0.62, 0.08]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Furnishings() {
  const frontal = useMemo(() => {
    const map = new CanvasTexture(paintAltarFrontal());
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => frontal.dispose(), [frontal]);
  return (
    <group>
      <group position={world.altar}>
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.28, 0.9, 0.72]} />
          <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0.02]} castShadow>
          <boxGeometry args={[1.4, 0.98, 0.7]} />
          <meshStandardMaterial color={colors.altarRed} roughness={0.62} />
        </mesh>
        <mesh position={[0, 0.55, 0.38]}>
          <planeGeometry args={[1.28, 0.86]} />
          <meshStandardMaterial map={frontal} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[1.5, 0.06, 0.92]} />
          <meshStandardMaterial color={colors.cloth} roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.06, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.55]} />
          <meshStandardMaterial color={colors.gold} metalness={0.45} roughness={0.4} />
        </mesh>
        <group position={[0, 1.55, 0]}>
          <ByzantineCross scale={0.42} />
        </group>
        <Candlestick position={[-0.48, 1.08, 0.12]} />
        <Candlestick position={[0.48, 1.08, -0.08]} />
        <mesh position={[0.28, 1.12, 0.16]} castShadow>
          <boxGeometry args={[0.22, 0.06, 0.16]} />
          <meshStandardMaterial color="#3d2418" roughness={0.5} />
        </mesh>
      </group>
      <group position={world.prothesis}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.8, 0.62]} />
          <meshStandardMaterial color={colors.wood} roughness={0.7} />
        </mesh>
        <mesh position={[-0.22, 0.86, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.035, 12]} />
          <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0.22, 0.92, 0]}>
          <cylinderGeometry args={[0.05, 0.04, 0.12, 12]} />
          <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
      <group position={[1.55, 0, 3.22]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.08, 0.46]} />
          <meshStandardMaterial color={colors.wood} roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.72, -0.18]} castShadow>
          <boxGeometry args={[0.55, 0.52, 0.07]} />
          <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
        </mesh>
      </group>
      <group position={[4.15, 0, 4.05]}>
        <mesh position={[0, 0.35, 0]} receiveShadow>
          <boxGeometry args={[1.8, 0.12, 3.4]} />
          <meshStandardMaterial color="#c4b49a" roughness={0.9} />
        </mesh>
        <mesh position={[0.7, 0.7, 0]}>
          <boxGeometry args={[0.08, 0.7, 3.2]} />
          <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Candlestick({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 8]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.42, 6]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffb45c" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

function Lamps() {
  const spots: [number, number, number][] = [
    [0, 4.15, 5.4],
    [0, 4.05, 1.4],
    [0, 3.7, -5.4],
  ];
  return (
    <group>
      {spots.map((position) => (
        <Chandelier key={position.join(",")} position={position} />
      ))}
    </group>
  );
}

function Chandelier({ position }: { position: [number, number, number] }) {
  const candles = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <torusGeometry args={[0.42, 0.02, 8, 20]} />
        <meshStandardMaterial color={colors.gold} metalness={0.75} roughness={0.25} />
      </mesh>
      {candles.map((index) => {
        const angle = (index / candles.length) * Math.PI * 2;
        return (
          <group key={index} position={[Math.cos(angle) * 0.42, -0.05, Math.sin(angle) * 0.42]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
              <meshStandardMaterial color="#f6efe4" />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#ffd9a8" emissive="#ffb45c" emissiveIntensity={2.2} />
            </mesh>
          </group>
        );
      })}
      <pointLight position={[0, -0.1, 0]} color="#ffc48a" intensity={2.2} distance={8} decay={2} />
    </group>
  );
}

function Labels({ activeSpaces }: { activeSpaces: readonly SpaceId[] }) {
  return (
    <group>
      {spaceLabels.map((label) => (
        <Html
          key={label.id}
          position={label.position}
          center
          distanceFactor={11}
          zIndexRange={[4, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={activeSpaces.includes(label.id) ? "space-tag is-active" : "space-tag"}>
            {label.label}
          </span>
        </Html>
      ))}
      <Html
        position={[0, 0.42, -1.05]}
        center
        distanceFactor={11}
        zIndexRange={[4, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span className="space-tag">Ambon</span>
      </Html>
    </group>
  );
}
