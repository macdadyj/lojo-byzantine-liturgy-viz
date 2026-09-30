import { describe, expect, it } from "vitest";
import { chooseTier, dprFor, nextQuality, type DeviceTraits } from "./quality";

const desktop: DeviceTraits = { phone: false, tablet: false, renderer: "ANGLE (NVIDIA GeForce RTX 3060)", memoryGb: 16 };

describe("picture quality tiers", () => {
  it("starts phones and tablets at Low and keeps Auto there", () => {
    expect(chooseTier({ ...desktop, phone: true, renderer: "Apple GPU", memoryGb: null })).toEqual({
      quality: "low",
      ceiling: "low",
      reason: "phone",
    });
    expect(chooseTier({ ...desktop, tablet: true, renderer: "Apple GPU" }).quality).toBe("low");
  });

  it("starts software renderers at Low", () => {
    expect(chooseTier({ ...desktop, renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))" }).quality).toBe("low");
    expect(chooseTier({ ...desktop, renderer: "llvmpipe (LLVM 15.0.7, 256 bits)" }).ceiling).toBe("low");
  });

  it("keeps desktops at Medium with room to climb", () => {
    expect(chooseTier(desktop)).toEqual({ quality: "medium", ceiling: "high", reason: "desktop" });
    expect(chooseTier({ ...desktop, memoryGb: 4 }).quality).toBe("low");
  });

  it("honours an explicit ?quality= request", () => {
    expect(chooseTier({ ...desktop, phone: true }, "high")).toEqual({ quality: "high", ceiling: "high", reason: "?quality=high" });
    expect(chooseTier(desktop, "ultra").quality).toBe("medium");
  });

  it("steps Auto down on a low frame rate and never above the ceiling", () => {
    expect(nextQuality("high", 20)).toBe("medium");
    expect(nextQuality("medium", 18)).toBe("low");
    expect(nextQuality("low", 60)).toBe("medium");
    expect(nextQuality("low", 60, "low")).toBe("low");
    expect(nextQuality("medium", 60, "medium")).toBe("medium");
    expect(nextQuality("medium", 18, "low")).toBe("low");
  });

  it("caps the phone canvas at 1.5x on every tier", () => {
    expect(dprFor("high", true)).toEqual([1, 1.5]);
    expect(dprFor("low", true)).toEqual([1, 1.5]);
    expect(dprFor("low")).toEqual([1, 1]);
    expect(dprFor("medium")).toEqual([1, 1.25]);
  });
});
