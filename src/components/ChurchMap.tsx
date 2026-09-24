import type { KeyboardEvent, ReactNode } from "react";
import type { RouteId } from "../liturgy/types";
import { spaceById, type SpaceId } from "../liturgy/spaces";
import { IconPlate } from "./iconArt";

type ChurchMapProps = {
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  route?: RouteId;
  onSelectSpace: (id: SpaceId) => void;
};

type Point = { x: number; y: number };

const frame = { x: 36, w: 568 };
const altar = { x: 246, y: 48, w: 148, h: 90 };
const prothesis = { x: 52, y: 126, w: 160, h: 80 };
const kliros = { x: 420, y: 498, w: 164, h: 156 };

const prothesisPoint: Point = { x: 132, y: 166 };
const northDoorPoint: Point = { x: 70, y: 304 };

const routes: Record<RouteId, Point[]> = {
  "little-entrance": [
    { x: 250, y: 110 },
    northDoorPoint,
    { x: 168, y: 600 },
    { x: 300, y: 500 },
    { x: 320, y: 300 },
  ],
  "great-entrance": [
    prothesisPoint,
    northDoorPoint,
    { x: 190, y: 620 },
    { x: 320, y: 392 },
    { x: 320, y: 110 },
  ],
};

export function ChurchMap({
  activeSpaces,
  selectedSpace,
  route,
  onSelectSpace,
}: ChurchMapProps) {
  const routePoints = route ? routes[route] : undefined;
  return (
    <svg
      className="map-svg"
      viewBox="0 0 640 890"
      role="group"
      aria-label="Plan of the church"
    >
      <defs>
        <marker
          id="route-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="route-arrow" />
        </marker>
      </defs>

      <text className="compass" x="40" y="22">
        North
      </text>
      <text className="compass" x="320" y="22" textAnchor="middle">
        East · altar
      </text>
      <text className="compass" x="600" y="22" textAnchor="end">
        South
      </text>

      <Zone
        id="sanctuary"
        x={frame.x}
        y={32}
        width={frame.w}
        height={188}
        label="Sanctuary"
        labelX={500}
        labelY={78}
        anchor="start"
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <Zone
        id="altar"
        x={altar.x}
        y={altar.y}
        width={altar.w}
        height={altar.h}
        label="Altar"
        labelX={300}
        labelY={128}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      >
        <path
          className="altar-cross"
          d="M320 62 V92 M306 72 H334"
        />
      </Zone>
      <Zone
        id="prothesis"
        x={prothesis.x}
        y={prothesis.y}
        width={prothesis.w}
        height={prothesis.h}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      >
        <text className="zone-label" x="132" y="152" textAnchor="middle">
          Preparation
        </text>
        <text className="zone-sublabel" x="132" y="168" textAnchor="middle">
          Prothesis
        </text>
        <circle className="vessel" cx="86" cy="188" r="7" />
        <path className="vessel" d="M150 180 h18 l-3 12 q-6 6-12 0 z" />
      </Zone>
      <text className="zone-label band-label" x="490" y="198" textAnchor="middle">
        Iconostas
      </text>

      <Zone
        id="iconostas"
        x={frame.x}
        y={220}
        width={frame.w}
        height={168}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <IconPlate x={100} y={236} width={72} height={136} kind="patron" caption="Patron" />
      <IconPlate x={180} y={232} width={76} height={140} kind="theotokos" caption="Theotokos" />
      <IconPlate x={384} y={232} width={76} height={140} kind="christ" caption="Christ" />
      <IconPlate x={468} y={236} width={72} height={136} kind="forerunner" caption="Forerunner" />
      <Door
        id="deacon-door"
        x={48}
        y={248}
        width={44}
        height={116}
        lines={["North", "door"]}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <RoyalDoors
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <Door
        id="deacon-door"
        x={548}
        y={248}
        width={44}
        height={116}
        lines={["South", "door"]}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />

      <Zone
        id="solea"
        x={frame.x}
        y={388}
        width={frame.w}
        height={70}
        label="Solea"
        labelX={120}
        labelY={428}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <Zone
        id="nave"
        x={frame.x}
        y={458}
        width={frame.w}
        height={268}
        label="Nave"
        labelX={110}
        labelY={560}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />
      <Zone
        id="kliros"
        x={kliros.x}
        y={kliros.y}
        width={kliros.w}
        height={kliros.h}
        label="Kliros"
        labelX={502}
        labelY={582}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      >
        <text className="zone-sublabel" x="502" y="602" textAnchor="middle">
          Choir
        </text>
      </Zone>

      <HitTarget
        id="solea"
        active={activeSpaces.includes("solea")}
        selected={selectedSpace === "solea"}
        onSelectSpace={onSelectSpace}
        label="Ambon"
      >
        <path className="hit-shape ambon-shape" d="M264 458 A56 38 0 0 1 376 458 Z" />
        <text className="zone-label" x="392" y="478" textAnchor="start">
          Ambon
        </text>
      </HitTarget>

      <Zone
        id="narthex"
        x={frame.x}
        y={726}
        width={frame.w}
        height={118}
        label="Narthex"
        labelX={320}
        labelY={792}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
      />

      <text className="compass" x="320" y="870" textAnchor="middle">
        West · entrance
      </text>

      {routePoints ? (
        <polyline
          className="route"
          points={routePoints.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          markerEnd="url(#route-arrow)"
        />
      ) : null}
    </svg>
  );
}

type ZoneProps = {
  id: SpaceId;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  labelX?: number;
  labelY?: number;
  anchor?: "start" | "middle" | "end";
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
  children?: ReactNode;
};

function Zone({
  id,
  x,
  y,
  width,
  height,
  label,
  labelX,
  labelY,
  anchor = "middle",
  activeSpaces,
  selectedSpace,
  onSelectSpace,
  children,
}: ZoneProps) {
  return (
    <HitTarget
      id={id}
      active={activeSpaces.includes(id)}
      selected={selectedSpace === id}
      onSelectSpace={onSelectSpace}
    >
      <rect className={`hit-shape zone-${id}`} x={x} y={y} width={width} height={height} rx={2} />
      {label ? (
        <text className="zone-label" x={labelX ?? x + width / 2} y={labelY ?? y + 24} textAnchor={anchor}>
          {label}
        </text>
      ) : null}
      <g className="zone-deco">{children}</g>
    </HitTarget>
  );
}

type DoorProps = {
  id: SpaceId;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: [string, string];
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

function Door({
  id,
  x,
  y,
  width,
  height,
  lines,
  activeSpaces,
  selectedSpace,
  onSelectSpace,
}: DoorProps) {
  return (
    <HitTarget
      id={id}
      label={`${lines[0]} deacon door`}
      active={activeSpaces.includes(id)}
      selected={selectedSpace === id}
      onSelectSpace={onSelectSpace}
    >
      <path className="hit-shape door-shape" d={archedDoor(x, y, width, height)} />
      <text className="door-label" x={x + width / 2} y={y + height / 2} textAnchor="middle">
        {lines[0]}
      </text>
      <text className="door-label" x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle">
        {lines[1]}
      </text>
    </HitTarget>
  );
}

function RoyalDoors({
  activeSpaces,
  selectedSpace,
  onSelectSpace,
}: {
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
}) {
  const y = 240;
  const height = 128;
  return (
    <HitTarget
      id="royal-doors"
      active={activeSpaces.includes("royal-doors")}
      selected={selectedSpace === "royal-doors"}
      onSelectSpace={onSelectSpace}
    >
      <path className="hit-shape door-shape" d={archedDoor(266, y, 50, height)} />
      <path className="hit-shape door-shape" d={archedDoor(324, y, 50, height)} />
      <path className="door-cross" d="M291 292 V316 M283 300 H299 M357 292 V316 M349 300 H365" />
      <text className="door-label royal-label" x="320" y="336" textAnchor="middle">
        Royal
      </text>
      <text className="door-label royal-label" x="320" y="350" textAnchor="middle">
        Doors
      </text>
    </HitTarget>
  );
}

function HitTarget({
  id,
  label,
  active,
  selected,
  onSelectSpace,
  children,
}: {
  id: SpaceId;
  label?: string;
  active: boolean;
  selected: boolean;
  onSelectSpace: (id: SpaceId) => void;
  children: ReactNode;
}) {
  const name = label ?? spaceById(id).label;
  const className = ["zone", `zone-${id}`, active ? "is-active" : "", selected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");

  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectSpace(id);
    }
  }

  return (
    <g
      className={className}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={active ? `${name}, highlighted for this step` : name}
      onClick={() => onSelectSpace(id)}
      onKeyDown={onKeyDown}
    >
      {children}
    </g>
  );
}

function archedDoor(x: number, y: number, width: number, height: number): string {
  const arch = Math.min(28, width / 2);
  const top = y + arch;
  const bottom = y + height;
  const mid = x + width / 2;
  const right = x + width;
  return `M ${x} ${bottom} V ${top} Q ${mid} ${y} ${right} ${top} V ${bottom} Z`;
}
