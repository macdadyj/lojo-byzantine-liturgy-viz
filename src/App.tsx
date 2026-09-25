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

  useLiturgyKeyboard(setIndex);

  useEffect(() => {
    setPinnedSpace(null);
  }, [index]);

  if (!step) return null;
  const featuredSpace = pinnedSpace ?? step.spaces[0];
  if (!featuredSpace) return null;

  return (
    <div className="page">
      <header className="info-bar">
        <div className="info-brand">
          <p className="eyebrow">Ruthenian Byzantine Catholic Church</p>
          <h1>Divine Liturgy</h1>
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
              The church is a teaching model of a large nave. The people are CC0 humanoid meshes and
              the icons are public-domain historical works, both listed in ATTRIBUTION.md. As you face
              the iconostas, the Theotokos is at the left
              of the Royal Doors and Christ is at the right. The Royal Doors show the Ustyug
              Annunciation, the Mystical Supper is above them, and the patron on the north is St.
              Nicholas.
            </p>
          </details>
        </div>
        <Pager
          index={index}
          count={steps.length}
          onPrev={() => setIndex((current) => prevIndex(current, steps.length))}
          onNext={() => setIndex((current) => nextIndex(current, steps.length))}
        />
        <StepDetail
          step={step}
          index={index}
          count={steps.length}
          selectedSpace={featuredSpace}
          onSelectSpace={setPinnedSpace}
        />
      </header>

      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {steps.length}: {step.title}
      </p>

      <div className="layout">
        <StepList index={index} onSelect={setIndex} />
        <div className="stage">
          <div className="stage-body">
            <section className="map-panel" aria-labelledby="map-heading">
              <h2 id="map-heading" className="sr-only">
                Church
              </h2>
              <ChurchView
                step={step}
                activeSpaces={step.spaces}
                selectedSpace={featuredSpace}
                onSelectSpace={setPinnedSpace}
              />
              <ul className="legend" aria-label="Places in the church">
                {spaceList.map((space) => {
                  const active = step.spaces.includes(space.id);
                  const selected = space.id === featuredSpace;
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
              <SpaceNote space={spaceById(featuredSpace)} currentIndex={index} onJump={setIndex} />
              <p className="map-footnote">
                Public-domain historical icons. Sources, dates, and licenses are in ATTRIBUTION.md.
              </p>
            </section>
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
