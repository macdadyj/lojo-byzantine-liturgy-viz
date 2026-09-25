import { useLayoutEffect, useMemo, useRef } from "react";
import { PlaneGeometry, SRGBColorSpace, type Group, type Texture } from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ByzantineCross } from "./Figures";
import { colors } from "./colors";
import { world } from "./world";

const domeZ = -1.15;

function iconUrl(file: string): string {
  return `${import.meta.env.BASE_URL}icons/${file}.jpg`;
}

const iconFiles = {
  christ: iconUrl("christ"),
  theotokos: iconUrl("theotokos"),
  forerunner: iconUrl("forerunner"),
  nicholas: iconUrl("nicholas"),
  annunciation: iconUrl("annunciation"),
  supper: iconUrl("supper"),
  trinity: iconUrl("trinity"),
  nativity: iconUrl("nativity"),
  transfiguration: iconUrl("transfiguration"),
  michael: iconUrl("michael"),
  gabriel: iconUrl("gabriel"),
  pantocrator: iconUrl("pantocrator-dome"),
  platytera: iconUrl("platytera"),
  deesis: iconUrl("deesis"),
};

type IconMaps = Record<keyof typeof iconFiles, Texture>;

export function SacredArt({ doorsOpen }: { doorsOpen: boolean }) {
  const maps = useTexture(iconFiles) as IconMaps;
  useLayoutEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
    }
  }, [maps]);

  return (
    <group>
      <Iconostas doorsOpen={doorsOpen} maps={maps} />
      <DomeMedallion map={maps.pantocrator} />
      <ApseTheotokos map={maps.platytera} />
    </group>
  );
}

function Iconostas({ doorsOpen, maps }: { doorsOpen: boolean; maps: IconMaps }) {
  return (
    <group position={[0, 0, world.iconZ]}>
      <Screen />
      <Framed map={maps.nicholas} x={-4.7} y={2.35} w={1.45} h={2.7} />
      <Framed map={maps.theotokos} x={-2.35} y={2.4} w={1.55} h={2.85} />
      <Framed map={maps.christ} x={2.35} y={2.4} w={1.55} h={2.85} />
      <Framed map={maps.forerunner} x={4.7} y={2.35} w={1.45} h={2.7} />
      <Framed map={maps.gabriel} x={-world.deaconDoorX} y={2.15} w={1.05} h={2.45} />
      <Framed map={maps.michael} x={world.deaconDoorX} y={2.15} w={1.05} h={2.45} />
      <RoyalLeaf side={-1} open={doorsOpen} map={maps.annunciation} half="north" />
      <RoyalLeaf side={1} open={doorsOpen} map={maps.annunciation} half="south" />
      <Framed map={maps.supper} x={0} y={4.85} w={2.5} h={0.95} />
      <Framed map={maps.deesis} x={0} y={6.2} w={9.2} h={1.35} />
      <Framed map={maps.nativity} x={-3.15} y={7.65} w={1.85} h={1.15} />
      <Framed map={maps.trinity} x={0} y={7.7} w={1.7} h={1.2} />
      <Framed map={maps.transfiguration} x={3.15} y={7.65} w={1.85} h={1.15} />
      <group position={[0, 8.85, 0.1]}>
        <ByzantineCross scale={0.55} />
      </group>
    </group>
  );
}

function Screen() {
  const panels: [number, number, number, number][] = [
    [0, 4.15, 18.4, 8.2],
    [-8.4, 2.2, 1.5, 4.2],
    [8.4, 2.2, 1.5, 4.2],
  ];
  return (
    <group>
      {panels.map(([x, y, width, height]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -0.08]}>
          <boxGeometry args={[width, height, 0.18]} />
          <meshStandardMaterial color={colors.woodDark} roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, 4.35, 0.02]}>
        <boxGeometry args={[18.6, 0.12, 0.28]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 8.35, 0.02]}>
        <boxGeometry args={[12.4, 0.1, 0.26]} />
        <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.28} />
      </mesh>
    </group>
  );
}

function Framed({
  map,
  x,
  y,
  w,
  h,
}: {
  map: Texture;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <group position={[x, y, 0.12]}>
      <mesh>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.08]} />
        <meshStandardMaterial color={colors.gold} metalness={0.68} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RoyalLeaf({
  side,
  open,
  map,
  half,
}: {
  side: -1 | 1;
  open: boolean;
  map: Texture;
  half: "north" | "south";
}) {
  const hinge = useRef<Group>(null);
  const geometry = useMemo(() => halfPlane(0.78, 3.35, half), [half]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    const leaf = hinge.current;
    if (!leaf) return;
    const goal = open ? side * 1.05 : 0;
    leaf.rotation.y += (goal - leaf.rotation.y) * (1 - Math.exp(-delta * 3.5));
  });
  const panelX = side === -1 ? 0.42 : -0.42;
  return (
    <group ref={hinge} position={[side * 0.92, 0, 0.12]}>
      <mesh position={[panelX, 1.85, 0]}>
        <boxGeometry args={[0.84, 3.55, 0.07]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.55} />
      </mesh>
      <mesh position={[panelX, 1.88, 0.04]} geometry={geometry}>
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  );
}

function halfPlane(width: number, height: number, half: "north" | "south"): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height);
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    uv.setX(index, half === "north" ? u * 0.5 : 0.5 + u * 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

function DomeMedallion({ map }: { map: Texture }) {
  return (
    <mesh position={[0, 15.15, domeZ]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.15, 40]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function ApseTheotokos({ map }: { map: Texture }) {
  return (
    <group position={[0, 6.4, world.sanctuaryEast + 0.55]}>
      <mesh>
        <planeGeometry args={[4.6, 6.1]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[4.9, 6.4, 0.06]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
