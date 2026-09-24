import { steps } from "../liturgy/steps";
import type { Space, SpaceId } from "../liturgy/spaces";

type SpaceNoteProps = {
  space: Space;
  currentIndex: number;
  onJump: (index: number) => void;
};

export function SpaceNote({ space, currentIndex, onJump }: SpaceNoteProps) {
  const related = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.spaces.includes(space.id as SpaceId));
  const usedNow = related.some(({ index }) => index === currentIndex);

  return (
    <aside className="space-note" aria-label={space.label}>
      <h2>{space.label}</h2>
      <p>{space.blurb}</p>
      <h3>{usedNow ? "This step uses this place" : "Steps in this place"}</h3>
      <ul className="related-steps">
        {related.map(({ step, index }) => (
          <li key={step.id}>
            <button
              type="button"
              className={index === currentIndex ? "related is-current" : "related"}
              aria-current={index === currentIndex ? "step" : undefined}
              onClick={() => onJump(index)}
            >
              {index + 1}. {step.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
