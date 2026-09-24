import { useEffect, useState } from "react";
import { ChurchView } from "./components/ChurchView";
import { Pager } from "./components/Pager";
import { SpaceNote } from "./components/SpaceNote";
import { StepDetail } from "./components/StepDetail";
import { StepList } from "./components/StepList";
import { nextIndex, prevIndex } from "./liturgy/navigate";
import { spaceById, spaceList, type SpaceId } from "./liturgy/spaces";
import { steps } from "./liturgy/steps";
import { useLiturgyKeyboard } from "./useLiturgyKeyboard";

export function App() {
  const [index, setIndex] = useState(0);
  const [pinnedSpace, setPinnedSpace] = useState<SpaceId | null>(null);
  const step = steps[index] ?? steps[0];
  const featured: SpaceId = pinnedSpace ?? step.spaces[0];

  useLiturgyKeyboard(setIndex);

  useEffect(() => {
    setPinnedSpace(null);
  }, [index]);

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Ruthenian Byzantine Catholic Church</p>
        <h1>Divine Liturgy</h1>
        <p className="lede">
          A walkthrough of the Liturgy of St. John Chrysostom: where to look, what the faithful
          see, and what they hear.
        </p>
        <details className="about">
          <summary>About this walkthrough</summary>
          <p>
            This follows the Divine Liturgy of St. John Chrysostom, the Liturgy on most Sundays in
            the Ruthenian Church in the United States. On some days of the Great Fast, and on a few
            other days, the Liturgy of St. Basil the Great is used. The path through the church is
            the same; the anaphora is longer.
          </p>
          <p>
            Where a deacon is named and no deacon is serving, the priest says those parts. Many
            parishes pray in English. Some also use Church Slavonic.
          </p>
          <p>
            The sentences here are short paraphrases and a few ancient responses, so a learner can
            recognize the service. They are not the official liturgical text. For prayer, follow
            the parish and the liturgical books.
          </p>
          <p>
            The church is a stylized model for teaching, and the icons are schematic drawings. As
            you face the iconostas, the Theotokos is at the left of the Royal Doors and Christ is
            at the right.
          </p>
        </details>
      </header>

      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {steps.length}: {step.title}
      </p>

      <div className="layout">
        <StepList index={index} onSelect={setIndex} />
        <div className="stage">
          <Pager
            index={index}
            count={steps.length}
            onPrev={() => setIndex((current) => prevIndex(current, steps.length))}
            onNext={() => setIndex((current) => nextIndex(current, steps.length))}
          />
          <div className="stage-body">
            <section className="map-panel" aria-labelledby="map-heading">
              <div className="map-heading">
                <h2 id="map-heading">Church</h2>
                <p id="map-caption">
                  East is the altar. Follow liturgy moves the view with each step. Free look orbits,
                  pans, and zooms while the service stays on the current step. Arrow keys still
                  change the step. Gold light marks the places of this step. Click a floor to read
                  that place.
                </p>
              </div>
              <ChurchView
                step={step}
                activeSpaces={step.spaces}
                selectedSpace={featured}
                onSelectSpace={setPinnedSpace}
              />
              <ul className="legend" aria-label="Places in the church">
                {spaceList.map((space) => {
                  const active = step.spaces.includes(space.id);
                  const selected = space.id === featured;
                  return (
                    <li key={space.id}>
                      <button
                        type="button"
                        className={[
                          "legend-button",
                          active ? "is-active" : "",
                          selected ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-pressed={selected}
                        onClick={() => setPinnedSpace(space.id)}
                      >
                        {space.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <SpaceNote space={spaceById(featured)} currentIndex={index} onJump={setIndex} />
              <p className="map-footnote">
                Schematic icons for teaching, not the painted icons of a particular church.
              </p>
            </section>
            <StepDetail
              step={step}
              index={index}
              count={steps.length}
              selectedSpace={featured}
              onSelectSpace={setPinnedSpace}
            />
          </div>
        </div>
      </div>

      <footer className="colophon">
        <p>
          Teaching paraphrase for the Ruthenian Byzantine Catholic Divine Liturgy of St. John
          Chrysostom. Worship follows the parish and the official liturgical books.
        </p>
      </footer>
    </div>
  );
}
