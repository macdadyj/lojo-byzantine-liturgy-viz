import { useState } from "react";
import type { LiturgyStep } from "../liturgy/types";
import { iconCards, type IconId } from "../scene/iconCards";

type SceneFallbackProps = {
  step: LiturgyStep;
  title: string;
  detail: string;
  onRetry?: () => void;
};

const gallery: { id: IconId; file: string }[] = [
  { id: "christ", file: "christ" },
  { id: "theotokos", file: "theotokos" },
  { id: "annunciation", file: "annunciation" },
  { id: "supper", file: "supper" },
  { id: "forerunner", file: "forerunner" },
  { id: "nicholas", file: "nicholas" },
  { id: "deesis", file: "deesis" },
  { id: "trinity", file: "trinity" },
  { id: "nativity", file: "nativity" },
  { id: "transfiguration", file: "transfiguration" },
  { id: "michael", file: "michael" },
  { id: "gabriel", file: "gabriel" },
  { id: "pantocrator", file: "pantocrator-dome" },
  { id: "platytera", file: "platytera" },
];

/**
 * What the church view shows when the 3D scene cannot run: the reason in plain words, a picture of this step
 * (pre-rendered by `npm run stills`), what you would see, and the icons of the church as a gallery. The page is never blank.
 */
export function SceneFallback({ step, title, detail, onRetry }: SceneFallbackProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [stillFailed, setStillFailed] = useState<string | null>(null);
  return (
    <div className="scene-fallback" role="region" aria-label="Church pictures">
      <div className="fallback-head">
        <p className="fallback-title">{title}</p>
        <div className="fallback-actions">
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Try the 3D church again
            </button>
          ) : null}
          <button type="button" aria-expanded={showDetail} onClick={() => setShowDetail((open) => !open)}>
            {showDetail ? "Hide details" : "Details"}
          </button>
        </div>
        {showDetail ? <pre className="fallback-detail">{detail}</pre> : null}
      </div>
      {stillFailed !== step.id ? (
        <figure className="fallback-still">
          <img
            src={`${import.meta.env.BASE_URL}stills/${step.id}.jpg`}
            alt={`The church during ${step.title}`}
            decoding="async"
            onError={() => setStillFailed(step.id)}
          />
          <figcaption>{step.title}</figcaption>
        </figure>
      ) : null}
      <p className="fallback-see">{step.see}</p>
      <ul className="fallback-gallery" aria-label="Icons in the church">
        {gallery.map(({ id, file }) => {
          const card = iconCards[id];
          return (
            <li key={id}>
              <img src={`${import.meta.env.BASE_URL}icons/${file}.jpg`} alt={card.title} loading="lazy" decoding="async" />
              <p className="fallback-icon-title">{card.title}</p>
              <p className="fallback-icon-text">{card.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
