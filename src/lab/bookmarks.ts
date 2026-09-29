import type { CameraPose } from "../scene/staging";

export type Bookmark = {
  id: string;
  label: string;
  /** Step shown with this bookmark in the screenshot run. */
  step: string;
  pose: CameraPose;
};

/** Fixed views that are not any one step's own camera. Shots use these to judge the church itself. */
export const bookmarks: readonly Bookmark[] = [
  { id: "west-overview", label: "West, whole nave", step: "gathering", pose: { position: [0, 4.2, 20.5], target: [0, 3.2, -6] } },
  { id: "iconostas", label: "Iconostas, front", step: "trisagion", pose: { position: [0, 1.7, -3.2], target: [0, 3.2, -9.2] } },
  { id: "royal-doors", label: "Royal doors, close", step: "holy-things", pose: { position: [0.4, 1.6, -6.2], target: [0, 1.8, -9.2] } },
  { id: "altar", label: "Altar and apse", step: "anaphora", pose: { position: [2.2, 1.9, -11.6], target: [0, 1.6, -16.4] } },
  { id: "dome", label: "Dome and drum", step: "creed", pose: { position: [0, 1.7, 5.5], target: [0, 11.5, -1.2] } },
  { id: "pews-close", label: "Faithful in the pews", step: "gathering", pose: { position: [4.6, 1.45, 0.4], target: [1.2, 0.9, 6.5] } },
  { id: "kneeling", label: "Faithful kneeling", step: "epiklesis", pose: { position: [-4.2, 1.5, 0.2], target: [-2.2, 0.6, 5.8] } },
  { id: "clergy-close", label: "Priest and deacon, close", step: "opening", pose: { position: [1.4, 1.62, -11.2], target: [0.3, 1.35, -13.8] } },
  { id: "procession", label: "Great Entrance in the nave", step: "great-entrance", pose: { position: [0.8, 1.7, 5.5], target: [-3.4, 1.2, -1] } },
  { id: "kliros", label: "Kliros and choir", step: "antiphons", pose: { position: [2.6, 5.2, 0.6], target: [8.4, 4.1, 6.2] } },
];

export function bookmarkById(id: string): Bookmark | undefined {
  return bookmarks.find((bookmark) => bookmark.id === id);
}
