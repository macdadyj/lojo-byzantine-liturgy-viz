type StepBarProps = {
  index: number;
  count: number;
  title: string;
  onPrev: () => void;
  onNext: () => void;
};

/** The phone's Previous and Next: always at the bottom of the screen, clear of the home indicator. */
export function StepBar({ index, count, title, onPrev, onNext }: StepBarProps) {
  return (
    <nav className="step-bar" aria-label="Step">
      <button type="button" className="step-bar-prev" onClick={onPrev} disabled={index === 0} aria-label="Previous step">
        Back
      </button>
      <p className="step-bar-status">
        <span className="step-bar-count">
          {index + 1} / {count}
        </span>
        <span className="step-bar-title">{title}</span>
      </p>
      <button type="button" className="step-bar-next" onClick={onNext} disabled={index === count - 1} aria-label="Next step">
        Next
      </button>
    </nav>
  );
}
