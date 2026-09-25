type PagerProps = {
  index: number;
  count: number;
  hint: string;
  onPrev: () => void;
  onNext: () => void;
};

export function Pager({ index, count, hint, onPrev, onNext }: PagerProps) {
  return (
    <div className="pager">
      <button type="button" className="pager-prev" onClick={onPrev} disabled={index === 0}>
        Previous
      </button>
      <p className="pager-status">
        <span>
          {index + 1} / {count}
        </span>
        <span className="hint">{hint}</span>
      </p>
      <button type="button" className="pager-next" onClick={onNext} disabled={index === count - 1}>
        Next
      </button>
    </div>
  );
}
