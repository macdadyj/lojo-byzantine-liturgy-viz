import { useLayoutEffect, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace, type Group, type Texture } from "three";
import { iconCards, type IconCard, type IconId } from "./iconCards";
import { colors } from "./colors";
import { ornamentTexture } from "./surfaces";

const domeZ = -1.15;

function frescoUrl(file: string): string {
  return `${import.meta.env.BASE_URL}fresco/${file}`;
}

function iconUrl(file: string): string {
  return `${import.meta.env.BASE_URL}icons/${file}.jpg`;
}

const frescoFiles = {
  cefalu: frescoUrl("master-of-cefalu-001-christ-pantocrator-adjusted.webp"),
  bread: frescoUrl("eucharisty-with-bread-1420s-sergiev-posad-jpg.webp"),
  wine: frescoUrl("eucharisty-with-wine-1420s-sergiev-posad-jpg.webp"),
  dormition: frescoUrl("goluboe-uspeniejpg.webp"),
  matthew: frescoUrl("matthew-the-evangelist-iconjpeg.webp"),
  mark: frescoUrl("087-mark-the-evangelist-icon-from-saint-paraskev.webp"),
  luke: frescoUrl("st-luke-the-evangelistjpg.webp"),
  john: frescoUrl("john-the-evangelistjpg.webp"),
  exaltation: frescoUrl("exaltation-of-the-cross-palekh-icon-19-c-privcol.webp"),
  presentation: frescoUrl("050-presentation-of-jesus-at-the-temple-icon-fro.webp"),
  entry: frescoUrl("005-entry-into-jerusalem-icon-from-saint-paraske.webp"),
  lazarus: frescoUrl("novgorod-school-the-raising-of-lazarus-ngm02420-.webp"),
  ascension: frescoUrl("ascension-candia-15th-c-jpg.webp"),
  pentecost: frescoUrl("katholikon-hosios-loukas-pentecost-mosaicjpg.webp"),
  prophets: frescoUrl("prophet-elijah-venerable-pimen-the-great-and-mos.webp"),
  nativity: iconUrl("nativity"),
  annunciation: iconUrl("annunciation"),
  transfiguration: iconUrl("transfiguration"),
  trinity: iconUrl("trinity"),
  deesis: iconUrl("deesis"),
  michael: iconUrl("michael"),
  gabriel: iconUrl("gabriel"),
  forerunner: iconUrl("forerunner"),
  nicholas: iconUrl("nicholas"),
  theotokos: iconUrl("theotokos"),
  christ: iconUrl("christ"),
} as const;

type FrescoKey = keyof typeof frescoFiles;

type Placement = {
  key: FrescoKey;
  card: IconId;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

const north = Math.PI / 2;
const south = -Math.PI / 2;
const west = Math.PI;

const placements: Placement[] = [
  { key: "exaltation", card: "exaltation", position: [-11.42, 3.15, -2.2], rotation: [0, north, 0], size: [1.7, 2.3] },
  { key: "presentation", card: "presentation", position: [-11.42, 3.15, 2.2], rotation: [0, north, 0], size: [1.7, 2.3] },
  { key: "entry", card: "entry", position: [-11.42, 3.15, 6.6], rotation: [0, north, 0], size: [1.7, 2.3] },
  { key: "lazarus", card: "lazarus", position: [-11.42, 3.15, 11], rotation: [0, north, 0], size: [1.7, 2.3] },
  { key: "nativity", card: "nativity", position: [-11.42, 6.35, 0], rotation: [0, north, 0], size: [2.1, 1.55] },
  { key: "annunciation", card: "annunciation", position: [-11.42, 6.35, 4.6], rotation: [0, north, 0], size: [2.1, 1.55] },
  { key: "transfiguration", card: "transfiguration", position: [-11.42, 6.35, 9.2], rotation: [0, north, 0], size: [2.1, 1.55] },
  { key: "ascension", card: "ascension", position: [11.42, 3.15, -2.2], rotation: [0, south, 0], size: [1.7, 2.3] },
  { key: "pentecost", card: "pentecost", position: [11.42, 3.15, 2.4], rotation: [0, south, 0], size: [1.7, 2.3] },
  { key: "trinity", card: "trinity", position: [11.42, 3.15, 7], rotation: [0, south, 0], size: [1.7, 2.3] },
  { key: "deesis", card: "deesis", position: [11.42, 6.45, 4.2], rotation: [0, south, 0], size: [6.4, 1.7] },
  { key: "dormition", card: "dormition", position: [0, 4.6, 22.35], rotation: [0, west, 0], size: [3.4, 4.4] },
  { key: "cefalu", card: "cefalu", position: [0, 8.6, 22.35], rotation: [0, west, 0], size: [2.4, 3.1] },
  { key: "bread", card: "communionBread", position: [-1.7, 2.15, -17.95], rotation: [0, 0, 0], size: [1.55, 2] },
  { key: "wine", card: "communionWine", position: [1.7, 2.15, -17.95], rotation: [0, 0, 0], size: [1.55, 2] },
  { key: "nicholas", card: "nicholas", position: [0, 2.05, -17.9], rotation: [0, 0, 0], size: [1.15, 1.7] },
  { key: "matthew", card: "matthew", position: [-2.35, 9.55, domeZ - 2.15], rotation: [0.5, 0.4, 0], size: [1.35, 1.7] },
  { key: "mark", card: "mark", position: [2.35, 9.55, domeZ - 2.15], rotation: [0.5, -0.4, 0], size: [1.35, 1.7] },
  { key: "luke", card: "luke", position: [-2.35, 9.55, domeZ + 2.15], rotation: [-0.45, 2.6, 0], size: [1.35, 1.7] },
  { key: "john", card: "john", position: [2.35, 9.55, domeZ + 2.15], rotation: [-0.45, -2.6, 0], size: [1.35, 1.7] },
];

function drumPlacement(index: number, key: FrescoKey, card: IconId): Placement {
  const angle = (index / 8) * Math.PI * 2 + 0.2;
  const radius = 3.05;
  return {
    key,
    card,
    position: [Math.cos(angle) * radius, 11.55, domeZ + Math.sin(angle) * radius],
    rotation: [0, Math.atan2(-Math.cos(angle), -Math.sin(angle)), 0],
    size: [0.85, 1.15],
  };
}

const drum: Placement[] = [
  drumPlacement(0, "michael", "michael"),
  drumPlacement(1, "gabriel", "gabriel"),
  drumPlacement(2, "prophets", "prophets"),
  drumPlacement(3, "forerunner", "forerunner"),
  drumPlacement(4, "michael", "michael"),
  drumPlacement(5, "gabriel", "gabriel"),
  drumPlacement(6, "prophets", "prophets"),
  drumPlacement(7, "forerunner", "forerunner"),
];


export const tourStops: { id: IconId; x: number; z: number; yaw: number; pitch: number }[] = [
  { id: "exaltation", x: -8.4, z: -2.2, yaw: Math.PI / 2, pitch: 0 },
  { id: "deesis", x: 8.2, z: 4.2, yaw: -Math.PI / 2, pitch: 0.15 },
  { id: "dormition", x: 0.2, z: 16.5, yaw: Math.PI, pitch: 0.05 },
  { id: "pantocrator", x: 0.4, z: 7.4, yaw: 0, pitch: -0.62 },
];

export function Frescoes() {
  const maps = useTexture(frescoFiles) as Record<FrescoKey, Texture>;
  const border = ornamentTexture();
  useLayoutEffect(() => {
    for (const texture of Object.values(maps)) {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
    }
  }, [maps]);

  return (
    <group>
      {placements.map((item) => (
        <FrescoPlane key={`${item.card}-${item.position.join(",")}`} item={item} map={maps[item.key]} />
      ))}
      {drum.map((item, index) => (
        <FrescoPlane key={`drum-${index}`} item={item} map={maps[item.key]} />
      ))}
      {[-11.34, 11.34].map((x) =>
        [2.25, 6.15, 9.05].map((y) => (
          <mesh key={`band-${x}-${y}`} position={[x, y, 2]}>
            <boxGeometry args={[0.05, 0.16, 38]} />
            <meshStandardMaterial map={border} color="#f0d7a0" roughness={0.45} metalness={0.25} />
          </mesh>
        )),
      )}
      <Stand
        position={[0, 0, 1.15]}
        map={maps.nativity}
        card={iconCards.nativity}
        label="tetrapod"
      />
      <Stand
        position={[-1.4, 0, 20.4]}
        map={maps.christ}
        card={iconCards.christ}
        label="proskynetarion"
        tilt={-0.35}
      />
    </group>
  );
}

function FrescoPlane({ item, map, framed = true }: { item: Placement; map: Texture; framed?: boolean }) {
  const ref = useRef<Group>(null);
  const card = iconCards[item.card];
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.userData.icon = card;
    });
  }, [card]);
  return (
    <group ref={ref} position={item.position} rotation={item.rotation}>
      {framed ? (
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[item.size[0] + 0.12, item.size[1] + 0.12, 0.04]} />
          <meshStandardMaterial color={colors.gold} metalness={0.72} roughness={0.32} />
        </mesh>
      ) : null}
      <mesh>
        <planeGeometry args={item.size} />
        <meshStandardMaterial map={map} roughness={0.78} emissive="#fff6e8" emissiveMap={map} emissiveIntensity={0.24} />
      </mesh>
    </group>
  );
}

function Stand({
  position,
  map,
  card,
  tilt = 0,
}: {
  position: [number, number, number];
  map: Texture;
  card: IconCard;
  label: string;
  tilt?: number;
}) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.userData.icon = card;
    });
  }, [card]);
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.9, 1.05, 0.55]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.62} />
      </mesh>
      <group position={[0, 1.35, 0.05]} rotation={[-0.2 + tilt, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.85, 1.15, 0.06]} />
          <meshStandardMaterial color={colors.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[0.7, 1]} />
          <meshStandardMaterial map={map} roughness={0.78} emissive="#fff6e8" emissiveMap={map} emissiveIntensity={0.24} />
        </mesh>
      </group>
      {[-0.28, 0.28].map((x) => (
        <group key={x} position={[x, 1.08, 0.18]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
            <meshStandardMaterial color="#f4efe4" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshStandardMaterial color="#ffe1b0" emissive="#ffb45c" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
