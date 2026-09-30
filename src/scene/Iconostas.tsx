import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, DataTexture, PlaneGeometry, SRGBColorSpace, type BufferGeometry, type Group, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ByzantineCross } from "./Figures";
import { colors } from "./colors";
import { iconCards, type IconCard } from "./iconCards";
import { holyClosesDoors } from "./holyBeat";
import type { Quality } from "./quality";
import { carvedPanelTexture, tiled } from "./materials/paint";
import { giltTexture, marbleTexture } from "./surfaces";
import type { DoorState } from "./staging";
import { world } from "./world";

const domeZ = -1.15;

/** Phones load the half-size copies in `icons/small` (`npm run small-art`). */
export function iconUrl(file: string, small = false): string {
  return `${import.meta.env.BASE_URL}icons/${small ? "small/" : ""}${file}.jpg`;
}

function iconSet(small: boolean) {
  return {
    christ: iconUrl("christ", small),
    theotokos: iconUrl("theotokos", small),
    forerunner: iconUrl("forerunner", small),
    nicholas: iconUrl("nicholas", small),
    annunciation: iconUrl("annunciation", small),
    supper: iconUrl("supper", small),
    trinity: iconUrl("trinity", small),
    nativity: iconUrl("nativity", small),
    transfiguration: iconUrl("transfiguration", small),
    michael: iconUrl("michael", small),
    gabriel: iconUrl("gabriel", small),
    pantocrator: iconUrl("pantocrator-dome", small),
    platytera: iconUrl("platytera", small),
    deesis: iconUrl("deesis", small),
  };
}

const iconFiles = { full: iconSet(false), small: iconSet(true) };

type IconMaps = Record<keyof typeof iconFiles.full, Texture>;

let blankMaps: IconMaps | null = null;

/** Neutral panels for the lab's icons-off view, so geometry and light can be judged alone. */
function blankIconMaps(): IconMaps {
  if (blankMaps) return blankMaps;
  const blank = new DataTexture(new Uint8Array([168, 150, 120, 255]), 1, 1);
  blank.colorSpace = SRGBColorSpace;
  blank.needsUpdate = true;
  const maps = {} as IconMaps;
  for (const key of Object.keys(iconFiles.full) as (keyof IconMaps)[]) maps[key] = blank;
  blankMaps = maps;
  return blankMaps;
}

type ArtProps = { doors: DoorState; quality: Quality };
type LoadProps = ArtProps & { smallArt: boolean; onShown?: () => void };

/**
 * The iconostas, dome and apse with their icons. Until the images arrive (2 MB, slow on a phone) the same
 * panels stand blank, so the church can be drawn and used right away. `onShown` runs once the loaded
 * panels are in the scene, since they replace the blank ones after the parent has committed.
 */
export function SacredArt({
  doors,
  quality,
  showArt = true,
  smallArt = false,
  onShown,
}: ArtProps & { showArt?: boolean; smallArt?: boolean; onShown?: () => void }) {
  const blank = <ArtPanels doors={doors} quality={quality} maps={blankIconMaps()} />;
  if (!showArt) return blank;
  return (
    <Suspense fallback={blank}>
      <LoadedArt doors={doors} quality={quality} smallArt={smallArt} onShown={onShown} />
    </Suspense>
  );
}

function LoadedArt({ doors, quality, smallArt, onShown }: LoadProps) {
  const loaded = useTexture(smallArt ? iconFiles.small : iconFiles.full) as IconMaps;
  useLayoutEffect(() => {
    for (const texture of Object.values(loaded)) {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
    }
  }, [loaded]);
  useLayoutEffect(() => onShown?.(), [onShown]);
  return <ArtPanels doors={doors} quality={quality} maps={loaded} />;
}

function ArtPanels({ doors, quality, maps }: ArtProps & { maps: IconMaps }) {
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

/** Gilt colonnettes at every jamb of the lower tier: royal doors, between icons, and both deacon doors. */
const colonnetteX = [1.12, 3.55, 5.9, 9.0];
const colonnetteBottom = 0.5;
const colonnetteTop = 3.95;

function colonnettesGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const shaft = colonnetteTop - colonnetteBottom - 0.3;
  for (const x of colonnetteX.flatMap((value) => [-value, value])) {
    const base = new BoxGeometry(0.22, 0.14, 0.2);
    base.translate(x, colonnetteBottom + 0.07, 0);
    const column = new CylinderGeometry(0.065, 0.075, shaft, 10, 1);
    column.translate(x, colonnetteBottom + 0.14 + shaft / 2, 0);
    const ring = new CylinderGeometry(0.085, 0.085, 0.05, 10, 1);
    ring.translate(x, colonnetteBottom + 0.14 + shaft * 0.34, 0);
    const capital = new CylinderGeometry(0.13, 0.075, 0.16, 10, 1);
    capital.translate(x, colonnetteTop - 0.08, 0);
    parts.push(...[base, column, ring, capital].map((part) => part.toNonIndexed()));
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("colonnette merge failed");
  return merged;
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
  const colonnettes = useMemo(colonnettesGeometry, []);
  useLayoutEffect(() => () => colonnettes.dispose(), [colonnettes]);
  const gilt = <meshStandardMaterial map={giltTexture()} color={colors.gold} metalness={0.78} roughness={0.28} />;
  return (
    <group>
      {panels.map(([x, y, width, height]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -0.08]}>
          <boxGeometry args={[width, height, 0.18]} />
          <meshStandardMaterial
            map={tiled(carvedPanelTexture(), Math.max(1, Math.round(width / 1.1)), Math.max(1, Math.round(height / 1.1)))}
            color="#ffffff"
            roughness={0.6}
            metalness={0.18}
          />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) => [
        <mesh key={`plinth-${side}-a`} position={[side * (inner + 1) / 2, 0.25, 0.02]}>
          <boxGeometry args={[inner - 1, 0.5, 0.3]} />
          <meshStandardMaterial map={marbleTexture()} color="#9a6a5a" roughness={0.45} metalness={0.05} />
        </mesh>,
        <mesh key={`plinth-${side}-b`} position={[side * (outer + 9.2) / 2, 0.25, 0.02]}>
          <boxGeometry args={[9.2 - outer, 0.5, 0.3]} />
          <meshStandardMaterial map={marbleTexture()} color="#9a6a5a" roughness={0.45} metalness={0.05} />
        </mesh>,
      ])}
      <mesh geometry={colonnettes} position={[0, 0, 0.12]}>
        {gilt}
      </mesh>
      <mesh position={[0, 4.12, 0.1]}>
        <boxGeometry args={[18.6, 0.16, 0.36]} />
        {gilt}
      </mesh>
      <mesh position={[0, 4.35, 0.06]}>
        <boxGeometry args={[18.8, 0.3, 0.3]} />
        <meshStandardMaterial map={tiled(carvedPanelTexture(), 34, 1)} color="#ffffff" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 4.56, 0.12]}>
        <boxGeometry args={[19, 0.12, 0.44]} />
        {gilt}
      </mesh>
      <mesh position={[0, 8.35, 0.04]}>
        <boxGeometry args={[12.4, 0.2, 0.34]} />
        {gilt}
      </mesh>
      {[-4.6, -1.6, 1.6, 4.6].map((x) => (
        <mesh key={x} position={[x, 7.65, 0.06]}>
          <boxGeometry args={[0.12, 1.3, 0.16]} />
          {gilt}
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

const curtainWidth = 1.65;

/** The curtain is drawn aside to the north jamb, not gathered in the middle of the doorway. */
function gatherNorth(cloth: Group): void {
  cloth.position.x = -(curtainWidth / 2) * (1 - cloth.scale.x);
}

function Curtain({ open }: { open: boolean }) {
  const veil = useRef<Group>(null);
  useLayoutEffect(() => {
    const cloth = veil.current;
    if (!cloth) return;
    cloth.userData.doorKind = "curtain";
    cloth.scale.x = curtainShown(open) ? 0.06 : 1;
    gatherNorth(cloth);
  }, [open]);
  useFrame((_, delta) => {
    const cloth = veil.current;
    if (!cloth) return;
    const shown = curtainShown(open);
    const goal = shown ? 0.06 : 1;
    if (!shown) {
      cloth.scale.x = 1;
      gatherNorth(cloth);
      return;
    }
    cloth.scale.x += (goal - cloth.scale.x) * (1 - Math.exp(-delta * 3));
    gatherNorth(cloth);
  });
  return (
    <group ref={veil} position={[0, 1.9, -0.48]}>
      <mesh>
        <planeGeometry args={[curtainWidth, 3.4]} />
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
        <meshStandardMaterial map={tiled(carvedPanelTexture(), 2, 3)} color="#ffffff" roughness={0.55} metalness={0.18} />
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
        <meshStandardMaterial map={tiled(carvedPanelTexture(), 1, 4)} color="#ffffff" roughness={0.55} metalness={0.18} />
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
