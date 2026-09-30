import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Shape,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { colors } from "./colors";
import type { DoorState } from "./staging";
import { Frescoes } from "./Frescoes";
import { ByzantineCross } from "./Figures";
import { SacredArt } from "./Iconostas";
import { Pews } from "./architecture/Pews";
import { columnMarbleTexture, floorRoughTexture, floorTileTexture, starVaultTexture, tiled, wallTexture } from "./materials/paint";
import { paintAltarFrontal } from "./icons";
import type { Quality } from "./quality";
import { giltTexture, marbleTexture } from "./surfaces";
import type { SpaceId } from "../liturgy/spaces";
import { clerestoryZ, domeZ, floorPatches, spaceLabels, world } from "./world";
import { candleStandSpots, chandelierSpots, lampadaSpots, sandTraySpots } from "./lighting/practicals";

type ChurchProps = {
  doors: DoorState;
  showLabels: boolean;
  quality: Quality;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
  showArt?: boolean;
};

const columnZ = [-4.6, -0.2, 4.2, 8.6, 13.0];
const castScale = new Vector3();

export function Church({ doors, showLabels, quality, activeSpaces, selectedSpace, onSelectSpace, showArt = true }: ChurchProps) {
  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      if (!material || material.transparent || material instanceof MeshBasicMaterial) return;
      object.receiveShadow = true;
      let shell = false;
      for (let node: Object3D | null = object; node; node = node.parent) if (node.userData.shell) shell = true;
      // Small props (tapers, lamp bulbs, frames) cost a shadow draw each and cast nothing visible.
      object.getWorldScale(castScale);
      const geometry = object.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const radius = (geometry.boundingSphere?.radius ?? 0) * Math.max(castScale.x, castScale.y, castScale.z);
      object.castShadow = !shell && radius > 0.45;
    });
  });
  return (
    <group ref={root}>
      <group userData={{ shell: true }}>
        <Ground />
        <Shell />
        <Vault />
        <Dome />
        <Clerestory />
        <Arcade />
      </group>
      <Columns />
      <Gallery />
      <Floors />
      <Pews shadows={quality !== "low"} />
      <Furnishings />
      <SacredArt doors={doors} quality={quality} showArt={showArt} />
      <pointLight position={[0.1, 2.7, -14.6]} color="#ffc99a" intensity={quality === "low" ? 7 : 3.4} distance={10} decay={2} />
      <pointLight position={[-6.4, 2.4, -14.2]} color="#ffc99a" intensity={quality === "low" ? 4.5 : 2.2} distance={7} decay={2} />
      <pointLight position={[7.2, 5.35, 6.1]} color="#ffd2a8" intensity={quality === "low" ? 8 : 4.2} distance={9} decay={2} />
      {showArt ? <Frescoes /> : null}
      <Lamps />
      <CandleStands />
      <DevotionalProps />
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
      <Wall position={[0, height - 1.3, world.narthexWest]} args={[4.4, 2.6, world.wall]} painted={false} />
      <mesh position={[0, 2.2, world.narthexWest - 0.05]}>
        <boxGeometry args={[3.2, 4.2, 0.12]} />
        <meshStandardMaterial color="#6a5138" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Full-height walls carry the painted dado and frieze, one pattern repeat about every 5 m. */
function Wall({ position, args, painted = true }: { position: [number, number, number]; args: [number, number, number]; painted?: boolean }) {
  const map = painted ? tiled(wallTexture(), Math.max(1, Math.round(Math.max(args[0], args[2]) / 5)), 1) : null;
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial map={map} color={painted ? "#f2e6d2" : colors.plaster} roughness={0.9} />
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
              <meshStandardMaterial map={tiled(columnMarbleTexture(), 1, 2)} color="#efe6d6" roughness={0.42} metalness={0.02} />
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
    </group>
  );
}

const archTop = 0.78;
const archRise = 0.5;
const capitalTop = 7.74;

/** Segmental arch between two capitals, extruded through the arcade wall's thickness. */
function archGeometry(span: number, depth: number): ExtrudeGeometry {
  const half = span / 2;
  const clear = half - 0.36;
  const radius = (clear * clear + archRise * archRise) / (2 * archRise);
  const centerY = archRise - radius;
  const start = Math.atan2(-centerY, -clear);
  const end = Math.atan2(-centerY, clear);
  const shape = new Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-clear, 0);
  shape.absarc(0, centerY, radius, start, end, true);
  shape.lineTo(half, 0);
  shape.lineTo(half, archTop);
  shape.lineTo(-half, archTop);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Arcade over the columns: arches, a plaster wall up to the vault springing, and a gilt string course. */
function Arcade() {
  const geometries = useMemo(
    () => columnZ.slice(0, -1).map((z, index) => ({ z, span: (columnZ[index + 1] ?? z) - z, geometry: archGeometry((columnZ[index + 1] ?? z) - z, 0.42) })),
    [],
  );
  useEffect(() => () => geometries.forEach((arch) => arch.geometry.dispose()), [geometries]);
  const first = columnZ[0] ?? 0;
  const last = columnZ[columnZ.length - 1] ?? 0;
  const wallBottom = capitalTop + archTop;
  const wallHeight = 9.2 - wallBottom;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * world.columnX, 0, 0]}>
          {geometries.map((arch) => (
            <mesh key={arch.z} geometry={arch.geometry} position={[0, capitalTop, arch.z + arch.span / 2]} rotation={[0, Math.PI / 2, 0]}>
              <meshStandardMaterial color={colors.plasterDeep} roughness={0.86} />
            </mesh>
          ))}
          <mesh position={[0, wallBottom + wallHeight / 2, (first + last) / 2]}>
            <boxGeometry args={[0.42, wallHeight, last - first + 0.7]} />
            <meshStandardMaterial color={colors.plaster} roughness={0.9} />
          </mesh>
          <mesh position={[0, wallBottom + 0.05, (first + last) / 2]}>
            <boxGeometry args={[0.5, 0.1, last - first + 0.7]} />
            <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Vault() {
  return (
    <group>
      <mesh position={[0, 9.15, 9.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.15, 5.15, 14.5, 36, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          map={tiled(starVaultTexture(), 5, 5)}
          emissiveMap={tiled(starVaultTexture(), 5, 5)}
          color="#d8dcef"
          roughness={0.8}
          side={2}
          emissive="#ffffff"
          emissiveIntensity={0.1}
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
      {[
        [4.7, 9.22],
        [3.5, 11.6],
        [3.36, 13.15],
      ].map(([radius, y]) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.07, 6, 48]} />
          <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
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
  return (
    <group>
      {clerestoryZ.map((z) => (
        <group key={z}>
          <HighWindow x={-world.halfWidth + 0.02} z={z} />
          <HighWindow x={world.halfWidth - 0.02} z={z} />
        </group>
      ))}
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
      <mesh userData={{ floor: true }}>
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
      <mesh position={[0, -0.04, 6.2]} userData={{ floor: true }}>
        <boxGeometry args={[world.halfWidth * 2, 0.12, 33]} />
        <meshStandardMaterial
          map={tiled(floorTileTexture(), 12, 17)}
          roughnessMap={tiled(floorRoughTexture(), 12, 17)}
          color="#eee4d4"
          roughness={0.7}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, 0.08, 19.6]} userData={{ floor: true }}>
        <boxGeometry args={[world.halfWidth * 2, 0.1, 6.2]} />
        <meshStandardMaterial map={tiled(floorTileTexture(), 12, 3)} color="#b8a48c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.1, -7.2]} userData={{ floor: true }}>
        <boxGeometry args={[16, 0.2, 3.4]} />
        <meshStandardMaterial map={marbleTexture()} color="#d6c6ac" roughness={0.6} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.21, -13.9]} userData={{ floor: true }}>
        <boxGeometry args={[world.halfWidth * 2, 0.42, 9.4]} />
        <meshStandardMaterial
          map={tiled(floorTileTexture(), 10, 4)}
          roughnessMap={tiled(floorRoughTexture(), 10, 4)}
          color="#f4ead8"
          roughness={0.62}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, 0.16, -5.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7, 28, 0, Math.PI]} />
        <meshStandardMaterial color="#b29772" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.05, 4.2]} userData={{ floor: true }}>
        <boxGeometry args={[1.7, 0.02, 24]} />
        <meshStandardMaterial color={colors.runner} roughness={0.8} />
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
        <group position={[-0.16, 1.28, 0.08]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.035, 16]} />
            <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
            <meshStandardMaterial color="#f4efe4" roughness={0.65} />
          </mesh>
        </group>
        <group position={[0.22, 1.32, 0.02]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.04, 0.16, 12]} />
            <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.3} />
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

function Lamps() {
  return (
    <group>
      {chandelierSpots.map((position) => (
        <Chandelier key={position.join(",")} position={position} />
      ))}
    </group>
  );
}

function Chandelier({ position }: { position: [number, number, number] }) {
  const bulbs = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = bulbs.current;
    if (!mesh) return;
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      mesh.setMatrixAt(index, taperMatrix.makeTranslation(Math.cos(angle) * 0.72, -0.08, Math.sin(angle) * 0.72));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
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
      <instancedMesh ref={bulbs} args={[undefined, undefined, 10]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={2.4} />
      </instancedMesh>
    </group>
  );
}

function CandleStands() {
  return (
    <group>
      {candleStandSpots.map((position) => (
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

function DevotionalProps() {
  return (
    <group>
      <SandTrays trays={sandTraySpots} />
      {lampadaSpots.map((position) => (
        <Lampada key={position.join(",")} position={position} />
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

const taperMatrix = new Matrix4();
const taperScale = new Vector3();
const taperAt = new Vector3();
const noTurn = new Matrix4().identity();

/** Every sand tray's tapers and flames as two instanced draws (there are over a hundred of each). */
function SandTrays({ trays }: { trays: [number, number, number][] }) {
  const wax = useRef<InstancedMesh>(null);
  const flames = useRef<InstancedMesh>(null);
  const count = trays.length * taperLayout.length;
  useLayoutEffect(() => {
    const waxMesh = wax.current;
    const flameMesh = flames.current;
    if (!waxMesh || !flameMesh) return;
    let index = 0;
    for (const [tx, ty, tz] of trays) {
      for (const [x, halfHeight, z] of taperLayout) {
        taperAt.set(tx + x, ty + halfHeight, tz + z);
        taperMatrix.copy(noTurn).scale(taperScale.set(1, halfHeight * 2, 1)).setPosition(taperAt);
        waxMesh.setMatrixAt(index, taperMatrix);
        taperAt.y = ty + halfHeight * 2;
        taperMatrix.copy(noTurn).setPosition(taperAt);
        flameMesh.setMatrixAt(index, taperMatrix);
        index += 1;
      }
    }
    waxMesh.instanceMatrix.needsUpdate = true;
    flameMesh.instanceMatrix.needsUpdate = true;
    waxMesh.computeBoundingSphere();
    flameMesh.computeBoundingSphere();
  }, [trays]);
  return (
    <group>
      {trays.map((position) => (
        <mesh key={position.join(",")} position={[position[0], position[1] + 0.06, position[2]]}>
          <boxGeometry args={[0.52, 0.08, 0.28]} />
          <meshStandardMaterial color="#c2b48a" roughness={0.95} />
        </mesh>
      ))}
      <instancedMesh ref={wax} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.006, 0.007, 1, 5]} />
        <meshStandardMaterial color="#f6f0e4" roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.012, 5, 5]} />
        <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={1.5} />
      </instancedMesh>
    </group>
  );
}

function Lampada({ position }: { position: [number, number, number] }) {
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
