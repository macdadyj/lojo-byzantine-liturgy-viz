import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { colors } from "./colors";
import { world } from "./world";

type PlateKind = "christ" | "theotokos" | "forerunner" | "patron";

const plates: { kind: PlateKind; x: number }[] = [
  { kind: "patron", x: -2.35 },
  { kind: "theotokos", x: -1.2 },
  { kind: "christ", x: 1.2 },
  { kind: "forerunner", x: 2.35 },
];

export function Iconostas({ doorsOpen }: { doorsOpen: boolean }) {
  return (
    <group position={[0, 0, world.iconZ]}>
      <Screen />
      {plates.map((plate) => (
        <IconPlate key={plate.kind} kind={plate.kind} x={plate.x} />
      ))}
      <RoyalLeaf side={-1} open={doorsOpen} />
      <RoyalLeaf side={1} open={doorsOpen} />
      <DoorFrame x={-3.55} />
      <DoorFrame x={3.55} />
      <mesh position={[0, 3.15, 0]} castShadow>
        <boxGeometry args={[10.7, 0.16, 0.28]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Screen() {
  const spans: [number, number][] = [
    [-4.7, 1.5],
    [-1.78, 0.7],
    [1.78, 0.7],
    [4.7, 1.5],
  ];
  return (
    <group>
      {spans.map(([x, width]) => (
        <mesh key={`${x}-${width}`} position={[x, 1.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, 3.1, 0.16]} />
          <meshStandardMaterial color={colors.wood} roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

function DoorFrame({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[-0.48, 1.35, 0]}>
        <boxGeometry args={[0.1, 2.7, 0.2]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.68} />
      </mesh>
      <mesh position={[0.48, 1.35, 0]}>
        <boxGeometry args={[0.1, 2.7, 0.2]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.68} />
      </mesh>
      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[1.06, 0.12, 0.2]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.68} />
      </mesh>
    </group>
  );
}

function RoyalLeaf({ side, open }: { side: -1 | 1; open: boolean }) {
  const hinge = useRef<Group>(null);
  useFrame((_, delta) => {
    const leaf = hinge.current;
    if (!leaf) return;
    const goal = open ? side * 1.05 : 0;
    leaf.rotation.y += (goal - leaf.rotation.y) * (1 - Math.exp(-delta * 3.5));
  });
  const panelX = side === -1 ? 0.3 : -0.3;
  return (
    <group ref={hinge} position={[side * 0.72, 0, 0]}>
      <mesh position={[panelX, 1.4, 0]} castShadow>
        <boxGeometry args={[0.58, 2.55, 0.07]} />
        <meshStandardMaterial color="#4a301c" roughness={0.62} />
      </mesh>
      <mesh position={[panelX, 1.85, 0.045]}>
        <boxGeometry args={[0.07, 0.28, 0.015]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh position={[panelX, 1.85, 0.045]}>
        <boxGeometry args={[0.2, 0.05, 0.015]} />
        <meshStandardMaterial color={colors.gold} metalness={0.6} roughness={0.32} />
      </mesh>
    </group>
  );
}

function IconPlate({ kind, x }: { kind: PlateKind; x: number }) {
  const texture = usePlateTexture(kind);
  return (
    <group position={[x, 1.7, 0.1]}>
      <mesh>
        <boxGeometry args={[0.92, 1.35, 0.06]} />
        <meshStandardMaterial color={colors.woodDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0.04]}>
        <planeGeometry args={[0.78, 1.05]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}

function usePlateTexture(kind: PlateKind) {
  const texture = useMemo(() => {
    const canvas = paintPlate(kind);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function paintPlate(kind: PlateKind): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 340;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = plateGround(kind);
  context.fillRect(0, 0, 256, 340);
  context.strokeStyle = "#f0e2b8";
  context.fillStyle = "#f0e2b8";
  context.lineWidth = 6;
  const haloX = kind === "theotokos" ? 112 : 128;
  context.beginPath();
  context.arc(haloX, 108, 42, 0, Math.PI * 2);
  context.stroke();
  drawPlateMark(context, kind);
  context.beginPath();
  context.moveTo(78, 250);
  context.lineTo(128, 156);
  context.lineTo(178, 250);
  context.closePath();
  context.fill();
  context.fillStyle = "#f6efe4";
  context.font = "600 32px sans-serif";
  context.textAlign = "center";
  context.fillText(plateCaption(kind), 128, 312);
  return canvas;
}

function plateGround(kind: PlateKind): string {
  switch (kind) {
    case "christ":
      return "#7a3036";
    case "theotokos":
      return "#243e68";
    case "forerunner":
      return "#3e4a32";
    case "patron":
      return "#5c4032";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function plateCaption(kind: PlateKind): string {
  switch (kind) {
    case "christ":
      return "Christ";
    case "theotokos":
      return "Theotokos";
    case "forerunner":
      return "Forerunner";
    case "patron":
      return "Patron";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function drawPlateMark(context: CanvasRenderingContext2D, kind: PlateKind) {
  switch (kind) {
    case "christ":
      context.beginPath();
      context.moveTo(128, 58);
      context.lineTo(128, 86);
      context.moveTo(108, 70);
      context.lineTo(148, 70);
      context.stroke();
      return;
    case "theotokos":
      context.beginPath();
      context.arc(168, 86, 22, 0, Math.PI * 2);
      context.stroke();
      for (const [x, y] of [
        [112, 58],
        [70, 140],
        [150, 140],
      ] as const) {
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
      }
      return;
    case "forerunner":
      context.strokeRect(170, 168, 48, 62);
      return;
    case "patron":
      context.strokeRect(162, 188, 52, 50);
      context.beginPath();
      context.moveTo(154, 188);
      context.lineTo(188, 158);
      context.lineTo(222, 188);
      context.stroke();
      return;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
