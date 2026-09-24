export type IconKind = "christ" | "theotokos" | "forerunner" | "patron";

type PlateProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: IconKind;
  caption: string;
};

export function IconPlate({ x, y, width, height, kind, caption }: PlateProps) {
  const artWidth = 64;
  const artX = x + (width - artWidth) / 2;
  const artY = y + 8;
  return (
    <g className="icon-plate" aria-hidden="true">
      <rect
        className={`plate-ground plate-${kind}`}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
      />
      <g transform={`translate(${artX} ${artY})`}>
        <PlateArt kind={kind} />
      </g>
      <text className="plate-caption" x={x + width / 2} y={y + height - 10} textAnchor="middle">
        {caption}
      </text>
    </g>
  );
}

function PlateArt({ kind }: { kind: IconKind }) {
  switch (kind) {
    case "christ":
      return <ChristArt />;
    case "theotokos":
      return <TheotokosArt />;
    case "forerunner":
      return <ForerunnerArt />;
    case "patron":
      return <PatronArt />;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function ChristArt() {
  return (
    <g>
      <circle cx="32" cy="20" r="13" fill="none" stroke="#f0e2b8" strokeWidth="1.6" />
      <path d="M32 7 v8 M23 13 h18" stroke="#f0e2b8" strokeWidth="1.5" fill="none" />
      <path d="M14 72 L32 38 L50 72 Z" fill="#f0e2b8" />
      <text x="2" y="34" fill="#f0e2b8" fontSize="9">
        IC
      </text>
      <text x="46" y="34" fill="#f0e2b8" fontSize="9">
        XC
      </text>
    </g>
  );
}

function TheotokosArt() {
  return (
    <g>
      <circle cx="26" cy="22" r="12" fill="none" stroke="#f0e2b8" strokeWidth="1.5" />
      <circle cx="46" cy="14" r="7" fill="none" stroke="#f0e2b8" strokeWidth="1.3" />
      <path d="M8 72 L26 40 L42 72 Z" fill="#f0e2b8" />
      <path d="M36 72 L46 46 L58 72 Z" fill="#f6e7c4" />
      <circle cx="26" cy="10" r="1.5" fill="#f0e2b8" />
      <circle cx="12" cy="38" r="1.5" fill="#f0e2b8" />
      <circle cx="40" cy="38" r="1.5" fill="#f0e2b8" />
    </g>
  );
}

function ForerunnerArt() {
  return (
    <g>
      <circle cx="28" cy="16" r="10" fill="none" stroke="#f0e2b8" strokeWidth="1.5" />
      <path d="M16 72 L28 34 L40 72 Z" fill="#f0e2b8" />
      <rect x="42" y="38" width="16" height="22" fill="none" stroke="#f0e2b8" strokeWidth="1.2" />
      <path d="M45 44 h10 M45 48 h10 M45 52 h7" stroke="#f0e2b8" strokeWidth="0.8" />
    </g>
  );
}

function PatronArt() {
  return (
    <g>
      <circle cx="22" cy="16" r="10" fill="none" stroke="#f0e2b8" strokeWidth="1.5" />
      <path d="M10 72 L22 36 L34 72 Z" fill="#f0e2b8" />
      <path d="M40 72 V46 H58 V72" fill="none" stroke="#f0e2b8" strokeWidth="1.3" />
      <path d="M38 46 L49 36 L60 46" fill="none" stroke="#f0e2b8" strokeWidth="1.3" />
    </g>
  );
}
