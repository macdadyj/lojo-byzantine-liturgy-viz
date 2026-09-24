import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { Group, Texture } from "three";
import { useFrame } from "@react-three/fiber";
import { colors } from "./colors";
import { paintIcon, paintWood, type IconId } from "./icons";
import { world } from "./world";

const mainIcons: { id: IconId; x: number }[] = [
  { id: "nicholas", x: -2.35 },
  { id: "hodegetria", x: -1.22 },
  { id: "pantocrator", x: 1.22 },
  { id: "forerunner", x: 2.35 },
];

export function Iconostas({ doorsOpen }: { doorsOpen: boolean }) {
  const wood = useCanvasTexture(paintWood, true);
  return (
    <group position={[0, 0, world.iconZ]}>
      <Screen wood={wood} />
      {mainIcons.map((icon) => (
        <FramedIcon key={icon.id} id={icon.id} x={icon.x} />
      ))}
      <SupperPanel />
      <RoyalLeaf side={-1} open={doorsOpen} id="gabriel" />
      <RoyalLeaf side={1} open={doorsOpen} id="annunciation-theotokos" />
      <DoorFrame x={-3.55} />
      <DoorFrame x={3.55} />
      <mesh position={[0, 4.22, 0]} castShadow>
        <boxGeometry args={[10.7, 0.14, 0.32]} />
        <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.28} />
      </mesh>
    </group>
  );
}

function Screen({ wood }: { wood: Texture }) {
  const panels: [number, number, number, number][] = [
    [-4.7, 2.05, 1.35, 4.1],
    [-2.4, 1.45, 1.35, 2.9],
    [-1.22, 1.45, 0.95, 2.9],
    [1.22, 1.45, 0.95, 2.9],
    [2.4, 1.45, 1.35, 2.9],
    [4.7, 2.05, 1.35, 4.1],
    [0, 3.55, 10.5, 1.25],
  ];
  return (
    <group>
      {panels.map(([x, y, width, height]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -0.04]} castShadow receiveShadow>
          <boxGeometry args={[width, height, 0.14]} />
          <meshStandardMaterial map={wood} roughness={0.78} color="#8a6244" />
        </mesh>
      ))}
    </group>
  );
}

function FramedIcon({ id, x }: { id: IconId; x: number }) {
  const texture = useIconTexture(id);
  return (
    <group position={[x, 1.55, 0.08]}>
      <mesh castShadow>
        <boxGeometry args={[1.08, 1.72, 0.08]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0.045]}>
        <planeGeometry args={[0.92, 1.48]} />
        <meshStandardMaterial map={texture} roughness={0.72} />
      </mesh>
    </group>
  );
}

function SupperPanel() {
  const texture = useIconTexture("supper");
  return (
    <group position={[0, 3.45, 0.1]}>
      <mesh>
        <boxGeometry args={[2.15, 0.78, 0.06]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.98, 0.64]} />
        <meshStandardMaterial map={texture} roughness={0.72} />
      </mesh>
    </group>
  );
}

function DoorFrame({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[-0.5, 1.5, 0.02]}>
        <boxGeometry args={[0.1, 3, 0.22]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0.5, 1.5, 0.02]}>
        <boxGeometry args={[0.1, 3, 0.22]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0, 3.05, 0.02]}>
        <boxGeometry args={[1.1, 0.12, 0.22]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.32} />
      </mesh>
    </group>
  );
}

function RoyalLeaf({ side, open, id }: { side: -1 | 1; open: boolean; id: IconId }) {
  const hinge = useRef<Group>(null);
  const texture = useIconTexture(id);
  useFrame((_, delta) => {
    const leaf = hinge.current;
    if (!leaf) return;
    const goal = open ? side * 1.05 : 0;
    leaf.rotation.y += (goal - leaf.rotation.y) * (1 - Math.exp(-delta * 3.5));
  });
  const panelX = side === -1 ? 0.36 : -0.36;
  return (
    <group ref={hinge} position={[side * 0.74, 0, 0]}>
      <mesh position={[panelX, 1.5, 0]} castShadow>
        <boxGeometry args={[0.7, 2.85, 0.06]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.55} />
      </mesh>
      <mesh position={[panelX, 1.55, 0.035]}>
        <planeGeometry args={[0.6, 2.6]} />
        <meshStandardMaterial map={texture} roughness={0.7} />
      </mesh>
    </group>
  );
}

function useIconTexture(id: IconId): Texture {
  const texture = useMemo(() => {
    const map = new CanvasTexture(paintIcon(id));
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, [id]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useCanvasTexture(paint: () => HTMLCanvasElement, repeat: boolean): Texture {
  const texture = useMemo(() => {
    const map = new CanvasTexture(paint());
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    if (repeat) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.repeat.set(2, 4);
    }
    return map;
  }, [paint, repeat]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
