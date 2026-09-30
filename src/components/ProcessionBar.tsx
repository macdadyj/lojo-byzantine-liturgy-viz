import type { RouteId } from "../liturgy/types";
import { processionClock, speeds, useProcessionClock, type Speed } from "../scene/processionClock";

/**
 * Play, pause, speed, and position for the procession on screen, for teaching: stop at a moment, talk about
 * it, step to the next one. Phones get one row of large buttons with speed on a single button.
 */
export function ProcessionBar({ compact = false }: { compact?: boolean }) {
  const clock = useProcessionClock();
  if (clock.route === null) return null;
  const ended = clock.time >= clock.duration - 0.01;
  const beat = clock.beats[clock.beat];
  const title = routeTitle(clock.route);
  const playLabel = ended ? "Replay" : clock.playing ? "Pause" : "Play";
  const nextSpeed = speeds[(speeds.indexOf(clock.speed) + 1) % speeds.length] ?? 1;

  return (
    <section className={compact ? "procession-bar is-compact" : "procession-bar"} aria-label={`${title} player`}>
      <p className="procession-beat">
        <span className="procession-label" aria-live="polite">
          {beat?.label ?? title}
        </span>
        <span className="procession-time">
          {clockText(clock.time)} / {clockText(clock.duration)}
        </span>
      </p>
      <div className="procession-controls">
        <button type="button" className="procession-step" onClick={() => processionClock.stepBeat(-1)} aria-label="Previous moment">
          <Icon kind="back" />
        </button>
        <button type="button" className="procession-play" onClick={() => processionClock.toggle()} aria-label={playLabel}>
          <Icon kind={ended ? "replay" : clock.playing ? "pause" : "play"} />
          {compact ? null : <span>{playLabel}</span>}
        </button>
        <button
          type="button"
          className="procession-step"
          onClick={() => processionClock.stepBeat(1)}
          aria-label="Next moment"
          disabled={ended}
        >
          <Icon kind="next" />
        </button>
        <input
          className="procession-scrub"
          type="range"
          min={0}
          max={Number(clock.duration.toFixed(1))}
          step={0.1}
          value={Number(clock.time.toFixed(1))}
          onChange={(event) => processionClock.seek(Number(event.target.value))}
          aria-label={`Position in the ${title}`}
          aria-valuetext={`${clockText(clock.time)}: ${beat?.label ?? ""}`}
        />
        {compact ? (
          <button
            type="button"
            className="procession-speed"
            onClick={() => processionClock.setSpeed(nextSpeed)}
            aria-label={`Speed ${speedText(clock.speed)}. Change to ${speedText(nextSpeed)}`}
          >
            {speedText(clock.speed)}
          </button>
        ) : (
          <div className="procession-speeds" role="group" aria-label="Speed">
            {speeds.map((speed) => (
              <button key={speed} type="button" aria-pressed={clock.speed === speed} onClick={() => processionClock.setSpeed(speed)}>
                {speedText(speed)}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function routeTitle(route: RouteId): string {
  switch (route) {
    case "little-entrance":
      return "Little Entrance";
    case "great-entrance":
      return "Great Entrance";
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

function speedText(speed: Speed): string {
  return `${speed}×`;
}

function clockText(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

type IconKind = "play" | "pause" | "replay" | "back" | "next";

function Icon({ kind }: { kind: IconKind }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={iconPath(kind)} fill="currentColor" />
    </svg>
  );
}

function iconPath(kind: IconKind): string {
  switch (kind) {
    case "play":
      return "M7 4.5v15l12.5-7.5z";
    case "pause":
      return "M6 4.5h4.2v15H6zM13.8 4.5H18v15h-4.2z";
    case "replay":
      return "M12 4.5a7.5 7.5 0 1 1-7.2 9.6h2.4A5.2 5.2 0 1 0 12 6.8v3L7.2 5.7 12 1.5z";
    case "back":
      return "M6 5h2.4v14H6zM20 5v14L9.5 12z";
    case "next":
      return "M15.6 5H18v14h-2.4zM4 5l10.5 7L4 19z";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
