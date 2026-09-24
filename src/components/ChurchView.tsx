import { useEffect, useState } from "react";
import type { SpaceId } from "../liturgy/spaces";
import type { LiturgyStep } from "../liturgy/types";
import { LiturgyScene, type LookMode } from "../scene/LiturgyScene";

type ChurchViewProps = {
  step: LiturgyStep;
  activeSpaces: readonly SpaceId[];
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

const cast = [
  { label: "Priest", color: "#722433" },
  { label: "Deacon", color: "#1e3f38" },
  { label: "Reader", color: "#3c3848" },
  { label: "Choir", color: "#4a3a28" },
  { label: "Faithful", color: "#2c3c55" },
];

export function ChurchView({ step, activeSpaces, selectedSpace, onSelectSpace }: ChurchViewProps) {
  const [mode, setMode] = useState<LookMode>("follow");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <div className="church-view">
      <LiturgyScene
        step={step}
        mode={mode}
        activeSpaces={activeSpaces}
        selectedSpace={selectedSpace}
        onSelectSpace={onSelectSpace}
        reducedMotion={reducedMotion}
      />
      <div className="view-bar">
        <button type="button" aria-pressed={mode === "follow"} onClick={() => setMode("follow")}>
          Follow liturgy
        </button>
        <button type="button" aria-pressed={mode === "free"} onClick={() => setMode("free")}>
          Free look
        </button>
      </div>
      <ul className="cast-key" aria-label="Who is in the church">
        {cast.map((person) => (
          <li key={person.label}>
            <span className="cast-swatch" style={{ background: person.color }} />
            {person.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
