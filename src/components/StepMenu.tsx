import { useEffect, useRef } from "react";
import { StepList } from "./StepList";
import type { PhoneView } from "./PhoneBar";

export type PageSection = "church" | "words" | "places" | "about";

const sections: { id: PageSection; label: string }[] = [
  { id: "church", label: "3D church" },
  { id: "words", label: "Step words" },
  { id: "places", label: "Places in the church" },
  { id: "about", label: "About" },
];

type StepMenuProps = {
  index: number;
  view: PhoneView;
  onSelect: (index: number) => void;
  onSection: (section: PageSection) => void;
  onClose: () => void;
};

/** Every step by part of the Liturgy, plus the parts of the page, over whatever is showing. */
export function StepMenu({ index, view, onSelect, onSection, onClose }: StepMenuProps) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.querySelector<HTMLElement>(".phone-menu-button")?.focus();
    };
  }, [onClose]);

  return (
    <div className="step-menu" id="step-menu">
      <button type="button" className="step-menu-backdrop" aria-label="Close steps" tabIndex={-1} onClick={onClose} />
      <div className="step-menu-panel" role="dialog" aria-modal="true" aria-labelledby="step-menu-title">
        <div className="step-menu-head">
          <h2 id="step-menu-title">Steps</h2>
          <button type="button" ref={close} onClick={onClose}>
            Close
          </button>
        </div>
        <ul className="step-menu-sections" aria-label="Go to">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                aria-current={section.id === "church" && view === "church" ? "page" : undefined}
                onClick={() => onSection(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
        <StepList
          index={index}
          onSelect={(next) => {
            onSelect(next);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
