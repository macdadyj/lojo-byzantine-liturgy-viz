import { describe, expect, it } from "vitest";
import { clampStep, nextIndex, prevIndex } from "./navigate";
import { spaceList, type SpaceId } from "./spaces";
import { steps, stepsUsing } from "./steps";
import { phaseLabel, type PhaseId } from "./types";

const requiredIds = [
  "gathering",
  "proskomedia",
  "opening",
  "little-entrance",
  "trisagion",
  "epistle",
  "gospel",
  "great-entrance",
  "creed",
  "anaphora",
  "epiklesis",
  "our-father",
  "communion",
  "dismissal",
];

const phaseOrder: PhaseId[] = ["gathering", "word", "faithful", "sending"];

describe("liturgy steps", () => {
  it("keeps a teaching-sized sequence", () => {
    expect(steps.length).toBeGreaterThanOrEqual(12);
    expect(steps.length).toBeLessThanOrEqual(25);
  });

  it("walks the main arc from gathering to dismissal", () => {
    expect(steps[0]?.id).toBe("gathering");
    expect(steps[steps.length - 1]?.id).toBe("dismissal");
    const ids = steps.map((step) => step.id);
    for (const id of requiredIds) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known spaces, in a single forward sweep of the service", () => {
    const known = new Set(spaceList.map((space) => space.id));
    let lastPhase = 0;
    for (const step of steps) {
      expect(step.spaces.length).toBeGreaterThan(0);
      expect(new Set(step.spaces).size).toBe(step.spaces.length);
      expect(step.roles.length).toBeGreaterThan(0);
      expect(step.see.trim().length).toBeGreaterThan(40);
      expect(step.hear.length).toBeGreaterThan(0);
      expect(step.why.trim().length).toBeGreaterThan(40);
      for (const space of step.spaces) {
        expect(known.has(space)).toBe(true);
      }
      const phaseIndex = phaseOrder.indexOf(step.phase);
      expect(phaseIndex).toBeGreaterThanOrEqual(lastPhase);
      lastPhase = phaseIndex;
    }
  });

  it("gives every place on the map at least one step", () => {
    for (const space of spaceList) {
      expect(stepsUsing(space.id).length).toBeGreaterThan(0);
    }
  });

  it("shows the two processions through the deacon door and the Royal Doors", () => {
    const little = steps.find((step) => step.id === "little-entrance");
    const great = steps.find((step) => step.id === "great-entrance");
    expect(little?.route).toBe("little-entrance");
    expect(great?.route).toBe("great-entrance");
    expect(little?.spaces).toEqual(
      expect.arrayContaining<SpaceId>(["deacon-door", "royal-doors", "nave"]),
    );
    expect(great?.spaces).toEqual(
      expect.arrayContaining<SpaceId>(["prothesis", "deacon-door", "royal-doors", "altar"]),
    );
  });

  it("explains the epiklesis as a calling on the Holy Spirit", () => {
    const epiklesis = steps.find((step) => step.id === "epiklesis");
    expect(epiklesis).toBeDefined();
    const text = `${epiklesis?.see} ${epiklesis?.why} ${epiklesis?.hear
      .map((line) => line.text)
      .join(" ")}`.toLowerCase();
    expect(text).toContain("holy spirit");
    expect(text).toContain("epiklesis");
  });

  it("distinguishes antidoron from Holy Communion", () => {
    const dismissal = steps.find((step) => step.id === "dismissal");
    expect(dismissal?.see.toLowerCase()).toContain("antidoron");
    expect(dismissal?.see.toLowerCase()).toContain("holy eucharist");
    expect(dismissal?.spaces).toContain("narthex");
  });

  it("names every phase used by the steps", () => {
    for (const phase of phaseOrder) {
      expect(phaseLabel(phase).length).toBeGreaterThan(0);
      expect(steps.some((step) => step.phase === phase)).toBe(true);
    }
  });
});

describe("navigate", () => {
  it("moves one step and stops at the ends", () => {
    expect(nextIndex(0, 22)).toBe(1);
    expect(prevIndex(0, 22)).toBe(0);
    expect(nextIndex(21, 22)).toBe(21);
    expect(prevIndex(3, 22)).toBe(2);
  });

  it("clamps out-of-range indexes", () => {
    expect(clampStep(-3, 22)).toBe(0);
    expect(clampStep(40, 22)).toBe(21);
    expect(clampStep(0, 0)).toBe(0);
  });
});
