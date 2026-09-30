export type Quality = "high" | "medium" | "low";

const rank: Record<Quality, number> = { low: 0, medium: 1, high: 2 };

export function isLower(a: Quality, b: Quality): boolean {
  return rank[a] < rank[b];
}

export function isQuality(value: string | null | undefined): value is Quality {
  return value === "high" || value === "medium" || value === "low";
}

/**
 * Canvas pixel ratio range. Phones get more pixels than a desktop at Low because their screens are small and
 * dense (a 1x canvas looks smeared on a 3x screen), but never past 1.5: fill rate and render-target memory are
 * what iOS runs out of first.
 */
export function dprFor(quality: Quality, handheld = false): [number, number] {
  if (handheld) return [1, 1.5];
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

/** Auto never climbs above `ceiling`; it only steps down when the frame rate stays low. */
export function nextQuality(current: Quality, averageFps: number, ceiling: Quality = "high"): Quality {
  let next = current;
  if (averageFps < 28 && current === "high") next = "medium";
  else if (averageFps < 24 && current === "medium") next = "low";
  else if (averageFps > 55 && current === "low") next = "medium";
  else if (averageFps > 58 && current === "medium") next = "high";
  if (rank[next] > rank[ceiling]) return current;
  return next;
}

export type DeviceTraits = {
  /** A phone-sized touch device (or any iPhone). */
  phone: boolean;
  /** A touch-first tablet, including iPads that report themselves as Macs. */
  tablet: boolean;
  /** Unmasked GPU name, or null when WebGL is unavailable. */
  renderer: string | null;
  /** `navigator.deviceMemory` in GB where the browser reports it (not Safari). */
  memoryGb: number | null;
};

export type TierChoice = { quality: Quality; ceiling: Quality; reason: string };

const softwareGpu = /swiftshader|llvmpipe|softpipe|basic render|software/i;

/**
 * The tier the walkthrough starts at, and the highest tier Auto may move to. Phones and tablets start at Low
 * and stay there unless someone picks a higher tier: post-processing, shadow maps and the candle loop cost
 * every pixel, and each switch recompiles every shader, which stalls iOS Safari for seconds.
 */
export function chooseTier(traits: DeviceTraits, requested: string | null = null): TierChoice {
  if (isQuality(requested)) return { quality: requested, ceiling: requested, reason: `?quality=${requested}` };
  if (traits.renderer && softwareGpu.test(traits.renderer)) {
    return { quality: "low", ceiling: "low", reason: "software rendering" };
  }
  if (traits.phone) return { quality: "low", ceiling: "low", reason: "phone" };
  if (traits.tablet) return { quality: "low", ceiling: "low", reason: "tablet" };
  if (traits.memoryGb !== null && traits.memoryGb <= 4) {
    return { quality: "low", ceiling: "medium", reason: `${traits.memoryGb} GB memory` };
  }
  return { quality: "medium", ceiling: "high", reason: "desktop" };
}
