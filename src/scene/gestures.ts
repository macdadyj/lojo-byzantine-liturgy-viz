export type Gesture = "none" | "cross";

/** Crossing at the Trisagion, the Creed, and the epiklesis. Bowing stays on the staging stance. */
export function gestureFor(stepId: string): Gesture {
  switch (stepId) {
    case "trisagion":
    case "creed":
    case "epiklesis":
      return "cross";
    default:
      return "none";
  }
}

export function censingFor(stepId: string): boolean {
  switch (stepId) {
    case "cherubic":
    case "great-entrance":
    case "epiklesis":
      return true;
    default:
      return false;
  }
}
