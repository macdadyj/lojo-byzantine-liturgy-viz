export type Quality = "high" | "medium" | "low";

export function dprFor(quality: Quality): [number, number] {
  switch (quality) {
    case "high":
      return [1, 1.5];
    case "medium":
      return [1, 1.25];
    case "low":
      return [1, 1];
    default: {
      const exhaustive: never = quality;
      return exhaustive;
    }
  }
}

export function nextQuality(current: Quality, averageFps: number): Quality {
  if (averageFps < 28 && current === "high") return "medium";
  if (averageFps < 24 && current === "medium") return "low";
  if (averageFps > 55 && current === "low") return "medium";
  if (averageFps > 58 && current === "medium") return "high";
  return current;
}
