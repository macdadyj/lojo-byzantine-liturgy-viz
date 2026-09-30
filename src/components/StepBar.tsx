type StepBarProps = {
  index: number;
  count: number;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  /** Over the 3D view the middle of the bar opens and closes the step's words above it. */
  sheet?: { open: boolean; controls: string; onToggle: () => void };
};

/** The phone's Previous and Next: always at the bottom of the screen, clear of the home indicator. */
export function StepBar({ index, count, title, onPrev, onNext, sheet }: StepBarProps) {
  const status = (
    <>
      <span className="step-bar-count">
        {index + 1} / {count}
        {sheet ? <span className="step-bar-toggle">{sheet.open ? " · Hide words" : " · Show words"}</span> : null}
      </span>
      <span className="step-bar-title">{title}</span>
    </>
  );
  return (
    <nav className="step-bar" aria-label="Step">
      <button type="button" className="step-bar-prev" onClick={onPrev} disabled={index === 0} aria-label="Previous step">
        Back
      </button>
      {sheet ? (
        <button
          type="button"
          className="step-bar-status is-toggle"
          aria-expanded={sheet.open}
          aria-controls={sheet.controls}
          onClick={sheet.onToggle}
        >
          {status}
        </button>
      ) : (
        <p className="step-bar-status">{status}</p>
      )}
      <button type="button" className="step-bar-next" onClick={onNext} disabled={index === count - 1} aria-label="Next step">
        Next
      </button>
    </nav>
  );
}
