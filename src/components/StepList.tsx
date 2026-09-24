import { useEffect } from "react";
import { steps } from "../liturgy/steps";
import { phaseLabel, type PhaseId } from "../liturgy/types";

const phaseOrder: PhaseId[] = ["gathering", "word", "faithful", "sending"];

type StepListProps = {
  index: number;
  onSelect: (index: number) => void;
};

export function StepList({ index, onSelect }: StepListProps) {
  const activeId = steps[index]?.id;

  useEffect(() => {
    if (!activeId) return;
    const button = document.getElementById(`step-link-${activeId}`);
    const list = button?.closest(".step-nav");
    if (!(button instanceof HTMLElement) || !(list instanceof HTMLElement)) return;
    const offset = button.getBoundingClientRect().top - list.getBoundingClientRect().top;
    if (offset < 0) {
      list.scrollTop += offset;
    } else if (offset + button.offsetHeight > list.clientHeight) {
      list.scrollTop += offset + button.offsetHeight - list.clientHeight;
    }
  }, [activeId]);

  return (
    <nav className="step-nav" aria-label="Liturgy steps">
      {phaseOrder.map((phase) => (
        <section key={phase} className="phase">
          <h2 className="phase-label">{phaseLabel(phase)}</h2>
          <ol className="phase-steps">
            {steps.map((step, stepIndex) =>
              step.phase === phase ? (
                <li key={step.id}>
                  <button
                    type="button"
                    id={`step-link-${step.id}`}
                    className={stepIndex === index ? "step-link is-current" : "step-link"}
                    aria-current={stepIndex === index ? "step" : undefined}
                    onClick={() => onSelect(stepIndex)}
                  >
                    <span className="step-num">{stepIndex + 1}</span>
                    <span>{step.title}</span>
                  </button>
                </li>
              ) : null,
            )}
          </ol>
        </section>
      ))}
    </nav>
  );
}
