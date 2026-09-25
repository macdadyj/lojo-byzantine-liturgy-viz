import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, SRGBColorSpace, Vector3, type PointLight } from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { colors } from "./colors";
import { Frescoes } from "./Frescoes";
import { ByzantineCross } from "./Figures";
import { SacredArt } from "./Iconostas";
import { paintAltarFrontal } from "./icons";
import type { Quality } from "./quality";
import { giltTexture, marbleTexture } from "./surfaces";
import type { SpaceId } from "../liturgy/spaces";
import { floorPatches, spaceLabels, world } from "./world";

type ChurchProps = {
  doorsOpen: boolean;
  showLabels: boolean;
  quality: Quality;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

const columnZ = [-4.6, -0.2, 4.2, 8.6, 13.0];
const domeZ = -1.15;

export function Church({ doorsOpen, showLabels, quality, activeSpaces, selectedSpace, onSelectSpace }: ChurchProps) {
  return (
    <group>
      <Ground />
      <Shell />
      <Columns />
      <Vault />
      <Dome />
      <Clerestory />
      <Gallery />
      <Floors />
      <Pews />
      <Furnishings />
      <SacredArt doorsOpen={doorsOpen} />
      <Frescoes />
      <Lamps flicker={quality !== "low"} quality={quality} />
      <CandleStands quality={quality} />
      <DevotionalProps quality={quality} />
      <Shafts quality={quality} />
      <Labels activeSpaces={activeSpaces} showLabels={showLabels} />
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
            opacity={activeSpaces.includes(patch.id) ? 0.34 : 0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 2]}>
      <circleGeometry args={[48, 48]} />
      <meshStandardMaterial color={colors.ground} roughness={1} />
    </mesh>
  );
}

function Shell() {
  const span = world.narthexWest - world.sanctuaryEast + 1.2;
  const centerZ = (world.narthexWest + world.sanctuaryEast) / 2;
  const outer = world.halfWidth + world.wall;
  const height = world.wallHeight;
  return (
    <group>
      <Wall position={[0, height / 2, world.sanctuaryEast - 0.15]} args={[outer * 2 + 0.6, height, world.wall]} />
      <Wall position={[-outer, height / 2, centerZ]} args={[world.wall, height, span]} />
      <Wall position={[outer, height / 2, centerZ]} args={[world.wall, height, span]} />
      <Wall position={[-6.2, height / 2, world.narthexWest]} args={[outer * 2 - 8.4, height, world.wall]} />
      <Wall position={[6.2, height / 2, world.narthexWest]} args={[outer * 2 - 8.4, height, world.wall]} />
      <Wall position={[0, height - 1.3, world.narthexWest]} args={[4.4, 2.6, world.wall]} />
      <mesh position={[0, 2.2, world.narthexWest - 0.05]}>
        <boxGeometry args={[3.2, 4.2, 0.12]} />
        <meshStandardMaterial color="#6a5138" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Wall({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={colors.plaster} roughness={0.9} />
    </mesh>
  );
}

function Columns() {
  return (
    <group>
      {[-1, 1].map((side) =>
        columnZ.map((z) => (
          <group key={`${side}-${z}`} position={[side * world.columnX, 0, z]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.42, 0.48, 0.36, 12]} />
              <meshStandardMaterial color={colors.stone} roughness={0.85} />
            </mesh>
            <mesh position={[0, 3.9, 0]}>
              <cylinderGeometry args={[0.28, 0.32, 7.1, 12]} />
              <meshStandardMaterial map={marbleTexture()} color="#cfc4b2" roughness={0.72} metalness={0.02} />
            </mesh>
            <mesh position={[0, 7.35, 0]}>
              <torusGeometry args={[0.34, 0.07, 8, 14]} />
              <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.62} roughness={0.34} />
            </mesh>
            <mesh position={[0, 7.6, 0]}>
              <boxGeometry args={[0.7, 0.28, 0.7]} />
              <meshStandardMaterial color={colors.gold} metalness={0.45} roughness={0.4} />
            </mesh>
          </group>
        )),
      )}
      {[-1, 1].map((side) =>
        columnZ.slice(0, -1).map((z, index) => {
          const next = columnZ[index + 1] ?? z;
          const mid = (z + next) / 2;
          return (
            <mesh key={`arch-${side}-${z}`} position={[side * world.columnX, 7.55, mid]}>
              <boxGeometry args={[0.42, 0.32, next - z]} />
              <meshStandardMaterial color={colors.plasterDeep} roughness={0.86} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function Vault() {
  return (
    <group>
      <mesh position={[0, 9.15, 9.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.15, 5.15, 14.5, 28, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color="#8d6844"
          roughness={0.92}
          side={2}
          emissive="#5c3e28"
          emissiveIntensity={0.04}
        />
      </mesh>
      <mesh position={[0, 8.4, -6.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[4.4, 4.4, 5.2, 24, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color={colors.plasterDeep}
          roughness={0.9}
          side={2}
          emissive="#5c3e28"
          emissiveIntensity={0.04}
        />
      </mesh>
      <mesh position={[-8.2, 8.05, 4]}>
        <boxGeometry args={[6.4, 0.22, 30]} />
        <meshStandardMaterial color={colors.plasterDeep} roughness={0.92} emissive="#5c3e28" emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[8.2, 8.05, 4]}>
        <boxGeometry args={[6.4, 0.22, 30]} />
        <meshStandardMaterial color={colors.plasterDeep} roughness={0.92} emissive="#5c3e28" emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[0, 16.9, 11]}>
        <boxGeometry args={[26, 0.35, 18]} />
        <meshStandardMaterial color={colors.roof} roughness={0.9} />
      </mesh>
      <mesh position={[0, 16.9, -10]}>
        <boxGeometry args={[26, 0.35, 14]} />
        <meshStandardMaterial color={colors.roof} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Dome() {
  return (
    <group position={[0, 0, domeZ]}>
      <mesh position={[0, 10.4, 0]}>
        <cylinderGeometry args={[3.5, 4.7, 2.4, 24, 1, true]} />
        <meshStandardMaterial color={colors.plaster} roughness={0.86} side={2} emissive="#5c3e28" emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0, 12.3, 0]}>
        <cylinderGeometry args={[3.35, 3.5, 1.7, 24, 1, true]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.8} side={2} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 3.42, 12.3, Math.sin(angle) * 3.42]} rotation={[0, -angle, 0]}>
            <planeGeometry args={[0.55, 1.15]} />
            <meshStandardMaterial color={colors.glass} emissive="#fff1d2" emissiveIntensity={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, 13.15, 0]}>
        <sphereGeometry args={[3.35, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#c9a15a"
          roughness={0.55}
          metalness={0.25}
          side={1}
          emissive="#8a6230"
          emissiveIntensity={0.25}
        />
      </mesh>
      <group position={[0, 16.5, 0]}>
        <ByzantineCross scale={0.7} />
      </group>
    </group>
  );
}

function Clerestory() {
  const zs = [-6.2, -1.2, 3.4, 8.2, 12.6];
  return (
    <group>
      {zs.map((z) => (
        <group key={z}>
          <HighWindow x={-world.halfWidth + 0.02} z={z} />
          <HighWindow x={world.halfWidth - 0.02} z={z} />
        </group>
      ))}
      <mesh position={[-6.2, 7.2, 6]} rotation={[0.35, 0, 0.15]}>
        <boxGeometry args={[1.2, 9, 0.08]} />
        <meshBasicMaterial color="#fff6e4" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh position={[5.4, 7.4, 2]} rotation={[0.2, 0, -0.2]}>
        <boxGeometry args={[1.1, 9.5, 0.08]} />
        <meshBasicMaterial color="#fff6e4" transparent opacity={0.07} depthWrite={false} />
      </mesh>
    </group>
  );
}

function HighWindow({ x, z }: { x: number; z: number }) {
  const flip = x > 0 ? Math.PI : 0;
  return (
    <group position={[x, 10.3, z]} rotation={[0, flip, 0]}>
      <mesh>
        <planeGeometry args={[1.15, 2.1]} />
        <meshStandardMaterial color={colors.glass} emissive="#fff1d2" emissiveIntensity={0.55} side={2} />
      </mesh>
    </group>
  );
}

function Gallery() {
  return (
    <group position={[8.7, 3.15, 6.4]}>
      <mesh>
        <boxGeometry args={[4.6, 0.16, 9.2]} />
        <meshStandardMaterial color={colors.wood} roughness={0.75} />
      </mesh>
      <mesh position={[-2.15, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.9, 9.2]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
      </mesh>
      <mesh position={[-0.35, 0.5, -0.3]}>
        <boxGeometry args={[0.5, 0.08, 5.6]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Floors() {
  return (
    <group>
      <mesh position={[0, -0.04, 6.2]}>
        <boxGeometry args={[world.halfWidth * 2, 0.12, 33]} />
        <meshStandardMaterial map={marbleTexture()} color="#c4b49c" roughness={0.62} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.08, 19.6]}>
        <boxGeometry args={[world.halfWidth * 2, 0.1, 6.2]} />
        <meshStandardMaterial color={colors.floorDark} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.1, -7.2]}>
        <boxGeometry args={[16, 0.2, 3.4]} />
        <meshStandardMaterial color="#a88b68" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.21, -13.9]}>
        <boxGeometry args={[world.halfWidth * 2, 0.42, 9.4]} />
        <meshStandardMaterial map={marbleTexture()} color="#b7a58c" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.16, -5.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7, 28, 0, Math.PI]} />
        <meshStandardMaterial color="#b29772" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.05, 4.2]}>
        <boxGeometry args={[1.7, 0.02, 24]} />
        <meshStandardMaterial color={colors.runner} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Pews() {
  const rows = [2.2, 4.6, 7.0, 9.4, 11.8, 14.2];
  const banks = [-7.15, -2.2, 2.2, 7.15];
  return (
    <group>
      {rows.map((z) =>
        banks.map((x) => <Pew key={`${x}-${z}`} position={[x, z]} wide={Math.abs(x) < 4} />),
      )}
    </group>
  );
}

function Pew({ position, wide }: { position: [number, number]; wide: boolean }) {
  const width = wide ? 2.4 : 2.1;
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[width, 0.08, 0.48]} />
        <meshStandardMaterial color={colors.wood} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.78, 0.22]}>
        <boxGeometry args={[width, 0.62, 0.08]} />
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
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.7, 1.05, 0.9]} />
          <meshStandardMaterial color={colors.altarRed} roughness={0.62} />
        </mesh>
        <mesh position={[0, 0.62, 0.48]}>
          <planeGeometry args={[1.5, 0.95]} />
          <meshStandardMaterial map={frontal} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[1.9, 0.08, 1.1]} />
          <meshStandardMaterial color={colors.cloth} roughness={0.65} />
        </mesh>
        <group position={[0.05, 1.22, 0.12]}>
          <mesh>
            <boxGeometry args={[0.22, 0.05, 0.3]} />
            <meshStandardMaterial color="#6a2a22" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.16, 0.02, 0.22]} />
            <meshStandardMaterial color="#f4efe4" roughness={0.7} />
          </mesh>
        </group>
        <group position={[0, 1.7, 0]}>
          <ByzantineCross scale={0.5} />
        </group>
        <Candlestick position={[-0.62, 1.2, 0.12]} />
        <Candlestick position={[0.62, 1.2, -0.08]} />
      </group>
      <group position={world.prothesis}>
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[1.35, 0.88, 0.72]} />
          <meshStandardMaterial color={colors.wood} roughness={0.7} />
        </mesh>
        <mesh position={[-0.28, 0.96, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.04, 12]} />
          <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0.26, 1.04, 0]}>
          <cylinderGeometry args={[0.055, 0.045, 0.14, 12]} />
          <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
    </group>
  );
}

function Candlestick({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.07, 0.08, 8]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.48, 6]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffb45c" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Lamps({ flicker, quality }: { flicker: boolean; quality: Quality }) {
  const spots: [number, number, number][] = [
    [0, 7.4, 11],
    [0, 7.6, 4.5],
    [0, 7.2, -4.2],
    [0, 5.8, -13.4],
  ];
  return (
    <group>
      {spots.map((position, index) => (
        <Chandelier
          key={position.join(",")}
          position={position}
          flicker={flicker}
          light={quality !== "low" || index < 2}
        />
      ))}
    </group>
  );
}

function Chandelier({
  position,
  flicker,
  light,
}: {
  position: [number, number, number];
  flicker: boolean;
  light: boolean;
}) {
  const lamp = useRef<PointLight>(null);
  useFrame((state) => {
    const bulb = lamp.current;
    if (!bulb || !flicker) return;
    const time = state.clock.elapsedTime + position[2];
    bulb.intensity = 1.7 + Math.sin(time * 8.2) * 0.18 + Math.sin(time * 14.5) * 0.08;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
        <meshStandardMaterial color={colors.gold} metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.72, 0.028, 8, 24]} />
        <meshStandardMaterial color="#d7b15a" metalness={0.86} roughness={0.22} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.018, 8, 20]} />
        <meshStandardMaterial color="#e6c56e" metalness={0.84} roughness={0.24} />
      </mesh>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.72, -0.08, Math.sin(angle) * 0.72]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={2.4} />
          </mesh>
        );
      })}
      {light ? <pointLight ref={lamp} color="#ffc48a" intensity={2.1} distance={14} decay={2} /> : null}
    </group>
  );
}

function CandleStands({ quality }: { quality: Quality }) {
  const spots: [number, number, number][] = [
    [-1.5, 0, -6.4],
    [1.5, 0, -6.4],
    [0, 0, 2.4],
    [-3.2, 0, 18.6],
  ];
  return (
    <group>
      {spots.map((position) => (
        <group key={position.join(",")} position={position}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.9, 10]} />
            <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.3} />
          </mesh>
          {[-0.08, 0, 0.08].map((x) => (
            <mesh key={x} position={[x, 1.05, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={2.2} />
            </mesh>
          ))}
          {quality === "low" ? null : (
            <pointLight color="#ffc48a" intensity={0.55} distance={3.2} decay={2} position={[0, 1.1, 0]} />
          )}
        </group>
      ))}
    </group>
  );
}

const taperLayout: [number, number, number][] = Array.from({ length: 24 }, (_, index) => {
  const column = index % 8;
  const row = Math.floor(index / 8);
  const height = 0.16 + ((index * 5) % 7) * 0.035;
  return [(column - 3.5) * 0.055, height / 2, (row - 1) * 0.07];
});

function DevotionalProps({ quality }: { quality: Quality }) {
  const trays: [number, number, number][] = [
    [0.85, 0, 1.15],
    [-0.85, 0, 1.15],
    [1.15, 0, -6.15],
    [-1.15, 0, -6.15],
    [-2.3, 0, 20.2],
  ];
  const lamps: [number, number, number][] = [
    [-2.35, 3.55, world.iconZ + 0.72],
    [2.35, 3.55, world.iconZ + 0.72],
    [-4.7, 3.4, world.iconZ + 0.72],
    [4.7, 3.4, world.iconZ + 0.72],
  ];
  return (
    <group>
      {trays.map((position) => (
        <SandTray key={position.join(",")} position={position} />
      ))}
      {lamps.map((position, index) => (
        <Lampada key={position.join(",")} position={position} light={quality !== "low" && index < 2} />
      ))}
      <group position={[7.85, 3.22, 6.1]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.7, 1.05, 0.42]} />
          <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.12, 0.02]} rotation={[-0.7, 0, 0]}>
          <boxGeometry args={[0.62, 0.08, 0.46]} />
          <meshStandardMaterial color={colors.wood} roughness={0.65} />
        </mesh>
        <mesh position={[-0.12, 1.16, 0.08]} rotation={[-0.7, 0.15, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.3]} />
          <meshStandardMaterial color="#f3efe4" roughness={0.7} />
        </mesh>
        <mesh position={[0.12, 1.16, 0.08]} rotation={[-0.7, -0.15, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.3]} />
          <meshStandardMaterial color="#f7f1e4" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function SandTray({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.28]} />
        <meshStandardMaterial color="#c2b48a" roughness={0.95} />
      </mesh>
      {taperLayout.map((spot, index) => (
        <group key={index} position={spot}>
          <mesh>
            <cylinderGeometry args={[0.006, 0.007, spot[1] * 2, 5]} />
            <meshStandardMaterial color="#f6f0e4" roughness={0.55} />
          </mesh>
          <mesh position={[0, spot[1], 0]}>
            <sphereGeometry args={[0.012, 5, 5]} />
            <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Lampada({ position, light }: { position: [number, number, number]; light: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.006, 0.006, 0.85, 5]} />
        <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#7a1e28" roughness={0.35} metalness={0.25} emissive="#3a1014" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.022, 6, 6]} />
        <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={1.8} />
      </mesh>
      {light ? <pointLight position={[0, -0.4, 0]} color="#ffc48a" intensity={0.4} distance={2.6} decay={2} /> : null}
    </group>
  );
}

function Shafts({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  const beams: [number, number, number][] = [
    [-2.2, 11.2, domeZ],
    [2.2, 11.2, domeZ],
    [0, 11.4, domeZ + 2.4],
  ];
  return (
    <group>
      {beams.map((position) => (
        <mesh key={position.join(",")} position={position} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.7, 7.5, 8, 1, true]} />
          <meshBasicMaterial color="#fff3d4" transparent opacity={quality === "high" ? 0.055 : 0.03} depthWrite={false} side={2} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -13.2]}>
        <sphereGeometry args={[2.4, 12, 10]} />
        <meshBasicMaterial color="#efe6d4" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  );
}

const placeLabels: { key: string; label: string; position: [number, number, number]; space?: SpaceId }[] = [
  ...spaceLabels.map((label) => ({
    key: label.id,
    label: label.label,
    position: label.position,
    space: label.id,
  })),
  { key: "ambon", label: "Ambon", position: [0, 2.35, -5.6] },
];

function Labels({ activeSpaces, showLabels }: { activeSpaces: readonly SpaceId[]; showLabels: boolean }) {
  if (!showLabels) return null;
  return (
    <group>
      {placeLabels.map((label) => (
        <PlaceTag
          key={label.key}
          position={label.position}
          active={label.space !== undefined && activeSpaces.includes(label.space)}
          label={label.label}
        />
      ))}
    </group>
  );
}

const labelForward = new Vector3();

function PlaceTag({
  position,
  active,
  label,
}: {
  position: [number, number, number];
  active: boolean;
  label: string;
}) {
  const visible = useRef(false);
  const [shown, setShown] = useState(false);
  const { camera } = useThree();

  useFrame(() => {
    const dx = position[0] - camera.position.x;
    const dy = position[1] - camera.position.y;
    const dz = position[2] - camera.position.z;
    const dist = Math.hypot(dx, dy, dz);
    camera.getWorldDirection(labelForward);
    const dot = dist > 0.001 ? (dx * labelForward.x + dy * labelForward.y + dz * labelForward.z) / dist : -1;
    const next = dist > 3.4 && dist < 38 && dot > 0.2;
    if (next !== visible.current) {
      visible.current = next;
      setShown(next);
    }
  });

  if (!shown) return null;
  return (
    <Html position={position} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      <span className={active ? "space-tag is-active" : "space-tag"}>{label}</span>
    </Html>
  );
}
