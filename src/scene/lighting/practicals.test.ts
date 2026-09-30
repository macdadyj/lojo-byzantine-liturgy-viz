import { ShaderChunk } from "three";
import { describe, expect, it } from "vitest";
import { clusterPracticals, practicalChunk, practicals } from "./practicals";

describe("practical lights", () => {
  it("puts every light in exactly one group, inside its group's box", () => {
    const { wide, clusters } = clusterPracticals(practicals);
    const grouped = clusters.flatMap((cluster) => cluster.lights);
    expect(wide.length + grouped.length).toBe(practicals.length);
    for (const cluster of clusters) {
      for (const light of cluster.lights) {
        for (let axis = 0; axis < 3; axis += 1) {
          const at = light.position[axis] ?? 0;
          expect(at - light.reach).toBeGreaterThanOrEqual((cluster.low[axis] ?? 0) - 1e-9);
          expect(at + light.reach).toBeLessThanOrEqual((cluster.high[axis] ?? 0) + 1e-9);
        }
      }
    }
  });

  it("only runs with the pooled (shadow-mapped) rig and is installed once", () => {
    expect(practicalChunk(practicals)).toContain("defined( USE_SHADOWMAP )");
    expect(ShaderChunk.lights_fragment_end.match(/parish practicals/g)?.length).toBe(1);
    expect(ShaderChunk.lights_pars_begin).toContain("float practicalTerm(");
  });
});
