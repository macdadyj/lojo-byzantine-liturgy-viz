type PagerProps = {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
};

export function Pager({ index, count, onPrev, onNext }: PagerProps) {
  return (
    <div className="pager">
      <button type="button" className="pager-prev" onClick={onPrev} disabled={index === 0}>
        Previous
      </button>
      <p className="pager-status">
        <span>
          {index + 1} / {count}
        </span>
        <span className="hint">Arrow keys, Home, End</span>
      </p>
      <button type="button" className="pager-next" onClick={onNext} disabled={index === count - 1}>
        Next
      </button>
    </div>
  );
}
