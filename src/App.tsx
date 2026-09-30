import { useCallback, useEffect, useRef, useState } from "react";
import { ChurchView } from "./components/ChurchView";
import type { LookMode } from "./scene/LiturgyScene";
import { Pager } from "./components/Pager";
import { PhoneBar, type PhoneView } from "./components/PhoneBar";
import { StepMenu, type PageSection } from "./components/StepMenu";
import { SpaceNote } from "./components/SpaceNote";
import { StepDetail } from "./components/StepDetail";
import { StepBar } from "./components/StepBar";
import { StepList } from "./components/StepList";
import { mark } from "./diagnostics";
import { nextIndex, prevIndex } from "./liturgy/navigate";
import { spaceById, spaceList, type SpaceId } from "./liturgy/spaces";
import { steps } from "./liturgy/steps";
import { useLiturgyKeyboard } from "./useLiturgyKeyboard";
import { phoneQuery, useMediaQuery } from "./useMediaQuery";

export function App() {
  const [index, setIndex] = useState(0);
  const [look, setLook] = useState<LookMode>("follow");
  const [pinnedSpace, setPinnedSpace] = useState<SpaceId | null>(null);
  const step = steps[index] ?? steps[0];
  const phone = useMediaQuery(phoneQuery);
  const [view, setView] = useState<PhoneView>("church");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<PageSection | null>(null);
  const sheetBody = useRef<HTMLDivElement>(null);
  const shownView = useRef(view);
  const churchShown = !phone || view === "church";

  useLiturgyKeyboard(setIndex);

  // Switching views starts at the top (the 3D view is exactly one screen tall); a section chosen in the
  // menu scrolls the Text view to it.
  useEffect(() => {
    if (!phone) return;
    if (section) {
      const target = document.getElementById(sectionIds[section]);
      if (section === "about") target?.querySelector("details")?.setAttribute("open", "");
      target?.scrollIntoView({ block: "start" });
      shownView.current = view;
      setSection(null);
      return;
    }
    if (shownView.current === view) return;
    shownView.current = view;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [phone, view, section]);

  useEffect(() => {
    if (sheetBody.current) sheetBody.current.scrollTop = 0;
  }, [index]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const goToSection = useCallback((next: PageSection) => {
    setMenuOpen(false);
    if (next === "church") {
      setView("church");
      return;
    }
    setView("text");
    setSection(next);
  }, []);

  useEffect(() => {
    mark("shell");
    window.__bootMounted?.();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__liturgy ?? {};
    bridge.setStep = (next) => setIndex(() => next);
    window.__liturgy = bridge;
  }, []);

  useEffect(() => {
    setPinnedSpace(null);
  }, [index]);

  if (!step) return null;
  const featuredSpace = pinnedSpace ?? step.spaces[0];
  if (!featuredSpace) return null;

  const goPrev = () => setIndex((current) => prevIndex(current, steps.length));
  const goNext = () => setIndex((current) => nextIndex(current, steps.length));
  const brand = (
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
          The church is a teaching model of a large nave. The people and their vestments are simple shapes built in code for this lesson; the icons are credited in ATTRIBUTION.md. As you face
          the iconostas, the Theotokos is at the left
          of the Royal Doors and Christ is at the right. The Royal Doors show the Ustyug
          Annunciation, the Mystical Supper is above them, and the patron on the north is St.
          Nicholas.
        </p>
      </details>
    </div>
  );
  const detail = (
    <StepDetail
      step={step}
      index={index}
      count={steps.length}
      selectedSpace={featuredSpace}
      onSelectSpace={setPinnedSpace}
    />
  );

  const phoneChurch = phone && view === "church";
  const pageClass = ["page", phone ? "is-phone" : "", phone ? `is-${view}` : "", phoneChurch && sheetOpen ? "sheet-open" : ""]
    .filter(Boolean)
    .join(" ");

  // One tree for every layout, so turning a phone, resizing, or switching 3D and Text never remounts the church.
  return (
    <div className={pageClass}>
      {phone ? (
        <PhoneBar view={view} onView={setView} menuOpen={menuOpen} onMenu={() => setMenuOpen((open) => !open)} />
      ) : (
        <header className="info-bar">
          {brand}
          <Pager
            index={index}
            count={steps.length}
            hint={look === "free" ? "Home and End change the step" : "Arrow keys, Home, End"}
            onPrev={goPrev}
            onNext={goNext}
          />
          {detail}
        </header>
      )}

      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {steps.length}: {step.title}
      </p>

      <div className="layout">
        {phone ? null : <StepList index={index} onSelect={setIndex} />}
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
                onLookMode={setLook}
                compact={phone}
                paused={!churchShown}
              />
              {phoneChurch ? (
                <section className="step-sheet" aria-label="This step">
                  <div className="step-sheet-body" id="step-sheet-words" ref={sheetBody} hidden={!sheetOpen}>
                    {detail}
                  </div>
                  <StepBar
                    index={index}
                    count={steps.length}
                    title={step.title}
                    onPrev={goPrev}
                    onNext={goNext}
                    sheet={{ open: sheetOpen, controls: "step-sheet-words", onToggle: () => setSheetOpen((open) => !open) }}
                  />
                </section>
              ) : null}
              {phoneChurch ? null : (
                <>
                  {phone ? (
                    <div id="page-words" className="page-section">
                      {detail}
                    </div>
                  ) : null}
                  <PlacesPanel
                    featuredSpace={featuredSpace}
                    activeSpaces={step.spaces}
                    index={index}
                    onSelectSpace={setPinnedSpace}
                    onJump={setIndex}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {phone && view === "text" ? (
        <>
          <StepList index={index} onSelect={setIndex} />
          <header className="info-bar page-section" id="page-about">
            {brand}
          </header>
        </>
      ) : null}

      {phoneChurch ? null : (
        <footer className="colophon">
          <p>
            Teaching paraphrase for the Ruthenian Byzantine Catholic Divine Liturgy of St. John
            Chrysostom. Worship follows the parish and the official liturgical books.
          </p>
        </footer>
      )}
      {phone && view === "text" ? (
        <StepBar index={index} count={steps.length} title={step.title} onPrev={goPrev} onNext={goNext} />
      ) : null}
      {phone && menuOpen ? (
        <StepMenu index={index} view={view} onSelect={setIndex} onSection={goToSection} onClose={closeMenu} />
      ) : null}
    </div>
  );
}

const sectionIds: Record<PageSection, string> = {
  church: "map-heading",
  words: "page-words",
  places: "page-places",
  about: "page-about",
};

type PlacesPanelProps = {
  featuredSpace: SpaceId;
  activeSpaces: readonly SpaceId[];
  index: number;
  onSelectSpace: (id: SpaceId) => void;
  onJump: (index: number) => void;
};

function PlacesPanel({ featuredSpace, activeSpaces, index, onSelectSpace, onJump }: PlacesPanelProps) {
  return (
    <div id="page-places" className="page-section">
      <ul className="legend" aria-label="Places in the church">
        {spaceList.map((space) => {
          const active = activeSpaces.includes(space.id);
          const selected = space.id === featuredSpace;
          return (
            <li key={space.id}>
              <button
                type="button"
                className={["legend-button", active ? "is-active" : "", selected ? "is-selected" : ""].filter(Boolean).join(" ")}
                aria-pressed={selected}
                onClick={() => onSelectSpace(space.id)}
              >
                {space.label}
              </button>
            </li>
          );
        })}
      </ul>
      <SpaceNote space={spaceById(featuredSpace)} currentIndex={index} onJump={onJump} />
      <p className="map-footnote">Public-domain historical icons. Sources, dates, and licenses are in ATTRIBUTION.md.</p>
    </div>
  );
}
