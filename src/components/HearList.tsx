import { roleLabels, type HearLine } from "../liturgy/types";

export function HearList({ lines }: { lines: HearLine[] }) {
  return (
    <div className="hear-list">
      {lines.map((line, index) => (
        <HearItem key={`${line.kind}-${index}`} line={line} />
      ))}
    </div>
  );
}

function HearItem({ line }: { line: HearLine }) {
  switch (line.kind) {
    case "speech":
      return (
        <div className="speech">
          <span className={`speech-who role-${line.who}`}>{roleLabels[line.who]}</span>
          <p>{line.text}</p>
        </div>
      );
    case "note":
      return <p className="hear-note">{line.text}</p>;
    default: {
      const exhaustive: never = line;
      return exhaustive;
    }
  }
}
