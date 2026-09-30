export type PhoneView = "church" | "text";

type PhoneBarProps = {
  view: PhoneView;
  onView: (view: PhoneView) => void;
  menuOpen: boolean;
  onMenu: () => void;
};

/**
 * The phone's top bar, outside the 3D picture so a finger on it never turns the view: the step menu, and
 * a switch between the church (with the words over it) and a plain scrolling page of words.
 */
export function PhoneBar({ view, onView, menuOpen, onMenu }: PhoneBarProps) {
  return (
    <header className="phone-bar">
      <button type="button" className="phone-menu-button" aria-expanded={menuOpen} aria-controls="step-menu" onClick={onMenu}>
        <span className="phone-menu-icon" aria-hidden="true" />
        Steps
      </button>
      <p className="phone-bar-title">Divine Liturgy</p>
      <div className="phone-view-switch" role="group" aria-label="Show">
        <button type="button" aria-pressed={view === "church"} onClick={() => onView("church")}>
          3D
        </button>
        <button type="button" aria-pressed={view === "text"} onClick={() => onView("text")}>
          Text
        </button>
      </div>
    </header>
  );
}
