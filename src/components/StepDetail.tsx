import { spaceById, type SpaceId } from "../liturgy/spaces";
import { roleLabels, phaseLabel, type LiturgyStep } from "../liturgy/types";
import { HearList } from "./HearList";

type StepDetailProps = {
  step: LiturgyStep;
  index: number;
  count: number;
  selectedSpace: SpaceId;
  onSelectSpace: (id: SpaceId) => void;
};

export function StepDetail({
  step,
  index,
  count,
  selectedSpace,
  onSelectSpace,
}: StepDetailProps) {
  return (
    <article className="detail" aria-labelledby="step-title">
      <div className="detail-lead">
        <p className="kicker">
          {phaseLabel(step.phase)} · Step {index + 1} of {count}
        </p>
        <h2 id="step-title">{step.title}</h2>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={index + 1}
          aria-valuetext={`Step ${index + 1} of ${count}: ${step.title}`}
        >
          <span style={{ width: `${((index + 1) / count) * 100}%` }} />
        </div>
        <ul className="roles" aria-label="Who is acting">
          {step.roles.map((role) => (
            <li key={role} className={`role-chip role-${role}`}>
              {roleLabels[role]}
            </li>
          ))}
        </ul>
        <ul className="where-list" aria-label="Where">
          {step.spaces.map((spaceId) => {
            const space = spaceById(spaceId);
            const selected = spaceId === selectedSpace;
            return (
              <li key={spaceId}>
                <button
                  type="button"
                  className={selected ? "where-chip is-selected" : "where-chip"}
                  aria-pressed={selected}
                  onClick={() => onSelectSpace(spaceId)}
                >
                  {space.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <details className="detail-more" open>
        <summary>What you see, hear, and why</summary>
        <div className="info-columns">
          <section>
            <h3>What the faithful see</h3>
            <p>{step.see}</p>
          </section>
          <section>
            <h3>What the faithful hear</h3>
            <HearList lines={step.hear} />
          </section>
          <section>
            <h3>Why it matters</h3>
            <p className="why">{step.why}</p>
          </section>
        </div>
      </details>
    </article>
  );
}
