import { useLayoutEffect, useMemo, useRef } from "react";
import { PlaneGeometry, SRGBColorSpace, type Group, type Texture } from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ByzantineCross } from "./Figures";
import { colors } from "./colors";
import { iconCards, type IconCard } from "./iconCards";
import { holyClosesDoors } from "./holyBeat";
import type { Quality } from "./quality";
import { giltTexture } from "./surfaces";
import type { DoorState } from "./staging";
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

export function SacredArt({ doors, quality }: { doors: DoorState; quality: Quality }) {
  const maps = useTexture(iconFiles) as IconMaps;
  useLayoutEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
    }
  }, [maps]);

  return (
    <group>
      <Iconostas doors={doors} maps={maps} quality={quality} />
      <DomeMedallion map={maps.pantocrator} quality={quality} />
      <ApseTheotokos map={maps.platytera} quality={quality} />
    </group>
  );
}

function Iconostas({ doors, maps, quality }: { doors: DoorState; maps: IconMaps; quality: Quality }) {
  return (
    <group position={[0, 0, world.iconZ]}>
      <Screen />
      <Framed map={maps.nicholas} quality={quality} card={iconCards.nicholas} x={-4.7} y={2.35} w={1.45} h={2.7} />
      <Framed map={maps.theotokos} quality={quality} card={iconCards.theotokos} x={-2.35} y={2.4} w={1.55} h={2.85} />
      <Framed map={maps.christ} quality={quality} card={iconCards.christ} x={2.35} y={2.4} w={1.55} h={2.85} />
      <Framed map={maps.forerunner} quality={quality} card={iconCards.forerunner} x={4.7} y={2.35} w={1.45} h={2.7} />
      <DeaconLeaf side={-1} open={doors.north} map={maps.gabriel} card={iconCards.gabriel} quality={quality} />
      <DeaconLeaf side={1} open={doors.south} map={maps.michael} card={iconCards.michael} quality={quality} />
      <RoyalLeaf side={-1} open={doors.royal} map={maps.annunciation} half="north" card={iconCards.annunciation} quality={quality} />
      <RoyalLeaf side={1} open={doors.royal} map={maps.annunciation} half="south" card={iconCards.annunciation} quality={quality} />
      <Curtain open={doors.curtain} />
      <Framed map={maps.supper} quality={quality} card={iconCards.supper} x={0} y={4.85} w={2.5} h={0.95} />
      <Framed map={maps.deesis} quality={quality} card={iconCards.deesis} x={0} y={6.2} w={9.2} h={1.35} />
      <Framed map={maps.nativity} quality={quality} card={iconCards.nativity} x={-3.15} y={7.65} w={1.85} h={1.15} />
      <Framed map={maps.trinity} quality={quality} card={iconCards.trinity} x={0} y={7.7} w={1.7} h={1.2} />
      <Framed map={maps.transfiguration} quality={quality} card={iconCards.transfiguration} x={3.15} y={7.65} w={1.85} h={1.15} />
      <group position={[0, 8.85, 0.1]}>
        <ByzantineCross scale={0.55} />
      </group>
    </group>
  );
}

function Screen() {
  // Three openings: royal doors in the center, deacon doors to the north and south.
  const half = world.deaconOpeningHalf;
  const outer = world.deaconDoorX + half;
  const inner = world.deaconDoorX - half;
  const panels: [number, number, number, number][] = [
    [-(outer + 9.2) / 2, 1.9, 9.2 - outer, 3.56],
    [-(inner + 1) / 2, 1.9, inner - 1, 3.56],
    [(inner + 1) / 2, 1.9, inner - 1, 3.56],
    [(outer + 9.2) / 2, 1.9, 9.2 - outer, 3.56],
    [0, 6.05, 18.4, 4.5],
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
        <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.78} roughness={0.28} />
      </mesh>
      <mesh position={[0, 8.35, 0.02]}>
        <boxGeometry args={[12.4, 0.1, 0.26]} />
        <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.78} roughness={0.28} />
      </mesh>
      {[-5.6, -3.5, 3.5, 5.6].map((x) => (
        <mesh key={x} position={[x, 4.2, 0.08]}>
          <boxGeometry args={[0.08, 7.6, 0.16]} />
          <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.74} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Framed({
  map,
  card,
  x,
  y,
  w,
  h,
  quality,
}: {
  map: Texture;
  card: IconCard;
  x: number;
  y: number;
  w: number;
  h: number;
  quality: Quality;
}) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.userData.icon = card;
    });
  }, [card]);
  return (
    <group ref={ref} position={[x, y, 0.12]}>
      <mesh>
        <boxGeometry args={[w + 0.18, h + 0.18, 0.08]} />
        <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, h]} />
        <IconSurface map={map} quality={quality} />
      </mesh>
    </group>
  );
}

function curtainShown(open: boolean): boolean {
  return open && !holyClosesDoors();
}

function Curtain({ open }: { open: boolean }) {
  const veil = useRef<Group>(null);
  useLayoutEffect(() => {
    const cloth = veil.current;
    if (!cloth) return;
    cloth.userData.doorKind = "curtain";
    cloth.scale.x = curtainShown(open) ? 0.06 : 1;
  }, [open]);
  useFrame((_, delta) => {
    const cloth = veil.current;
    if (!cloth) return;
    const shown = curtainShown(open);
    const goal = shown ? 0.06 : 1;
    if (!shown) {
      cloth.scale.x = 1;
      return;
    }
    cloth.scale.x += (goal - cloth.scale.x) * (1 - Math.exp(-delta * 3));
  });
  return (
    <group ref={veil} position={[0, 1.9, -0.48]}>
      <mesh>
        <planeGeometry args={[1.65, 3.4]} />
        <meshStandardMaterial color="#6e1c28" roughness={0.78} side={2} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.1, 3.4]} />
        <meshStandardMaterial color={colors.gold} metalness={0.65} roughness={0.32} />
      </mesh>
    </group>
  );
}

function IconSurface({ map, quality }: { map: Texture; quality: Quality }) {
  const glow = quality === "low" ? 0.62 : quality === "medium" ? 0.28 : 0.14;
  return <meshStandardMaterial map={map} roughness={0.78} metalness={0.02} emissive="#fff6e8" emissiveMap={map} emissiveIntensity={glow} />;
}

function DeaconLeaf({
  side,
  open,
  map,
  card,
  quality,
}: {
  side: -1 | 1;
  open: boolean;
  map: Texture;
  card: IconCard;
  quality: Quality;
}) {
  const hinge = useRef<Group>(null);
  const width = world.deaconOpeningHalf * 2;
  const panelX = side === -1 ? world.deaconOpeningHalf : -world.deaconOpeningHalf;
  const openAngle = side * 2.15;
  useLayoutEffect(() => {
    const leaf = hinge.current;
    if (!leaf) return;
    leaf.rotation.y = open ? openAngle : 0;
    leaf.traverse((object) => {
      object.userData.icon = card;
    });
  }, [card, open, openAngle]);
  useFrame((_, delta) => {
    const leaf = hinge.current;
    if (!leaf) return;
    const goal = open ? openAngle : 0;
    if (!open) {
      leaf.rotation.y = 0;
      return;
    }
    leaf.rotation.y += (goal - leaf.rotation.y) * (1 - Math.exp(-delta * 3.2));
  });
  return (
    <group ref={hinge} position={[side * (world.deaconDoorX + world.deaconOpeningHalf), 0, 0.14]}>
      <mesh position={[panelX, 1.85, 0]}>
        <boxGeometry args={[width, 3.35, 0.07]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.55} />
      </mesh>
      <mesh position={[panelX, 1.88, 0.04]}>
        <planeGeometry args={[width - 0.16, 2.7]} />
        <IconSurface map={map} quality={quality} />
      </mesh>
    </group>
  );
}

function RoyalLeaf({
  side,
  open,
  map,
  half,
  card,
  quality,
}: {
  side: -1 | 1;
  open: boolean;
  map: Texture;
  half: "north" | "south";
  card: IconCard;
  quality: Quality;
}) {
  const hinge = useRef<Group>(null);
  const geometry = useMemo(() => halfPlane(0.78, 3.35, half), [half]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  const openAngle = side * 1.05;
  useLayoutEffect(() => {
    const leaf = hinge.current;
    if (!leaf) return;
    const shown = open && !holyClosesDoors();
    leaf.rotation.y = shown ? openAngle : 0;
    leaf.userData.doorKind = "royal";
    leaf.traverse((object) => {
      object.userData.icon = card;
    });
  }, [card, open, openAngle]);
  useFrame((_, delta) => {
    const leaf = hinge.current;
    if (!leaf) return;
    const shown = open && !holyClosesDoors();
    const goal = shown ? openAngle : 0;
    if (!shown) {
      leaf.rotation.y = 0;
      return;
    }
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
        <IconSurface map={map} quality={quality} />
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

function DomeMedallion({ map, quality }: { map: Texture; quality: Quality }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.userData.icon = iconCards.pantocrator;
    });
  }, []);
  return (
    <group ref={ref} position={[0, 15.15, domeZ]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[2.15, 40]} />
        <IconSurface map={map} quality={quality} />
      </mesh>
    </group>
  );
}

function ApseTheotokos({ map, quality }: { map: Texture; quality: Quality }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.userData.icon = iconCards.platytera;
    });
  }, []);
  return (
    <group ref={ref} position={[0, 6.4, world.sanctuaryEast + 0.55]}>
      <mesh>
        <planeGeometry args={[4.6, 6.1]} />
        <IconSurface map={map} quality={quality} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[4.9, 6.4, 0.06]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
