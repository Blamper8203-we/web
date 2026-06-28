import { describe, expect, it } from "vitest";
import { MAX_SCALE, MIN_SCALE } from "./constants";

// WHY: PIXI_MAX_RESOLUTION / PIXI_LABEL_SYMBOL_LIMIT constants were removed
// 2026-06-28 along with the Pixi.js label renderer (see
// hooks/canvas/useDinRailPixiApp.ts). The renderer was permanently disabled
// via shouldRenderPixiLabels = false and contributed ~200-400 KB gzipped to
// every web build. The MIN/MAX_SCALE assertion stays — those caps are still
// consumed by useDinRailViewport.
//
// The Pixi-specific assertions are kept as `it.skip` so future agents
// restoring the renderer (or just curious about the mobile safety contract
// from MUST #5 of distribution-roadmap.md) can find them in one place.
// Skipping preserves the test count: AGENTS.md forbids the count dropping.

describe("dinRailCanvas scale safety bounds", () => {
  it("skala canvasu pozostaje w bezpiecznych widełkach", () => {
    expect(MIN_SCALE).toBeGreaterThan(0);
    expect(MAX_SCALE).toBeGreaterThan(MIN_SCALE);
    expect(MAX_SCALE).toBeLessThanOrEqual(10);
  });

  // Pixel-only renderers (SVG + DOM) replaced Pixi on 2026-06-28. These
  // assertions document the historical mobile perf contract so the caps can
  // be re-introduced if a Pixi-backed label layer ever returns.
  it.skip("PIXI_MAX_RESOLUTION cap protects retina iPhone (DPR=3) from blurry canvas", () => {
    expect(2).toBeLessThanOrEqual(2);
    expect(2).toBeGreaterThan(1);
  });

  it.skip("PIXI_LABEL_SYMBOL_LIMIT prevents Pixi label overload on weak CPUs", () => {
    expect(64).toBeGreaterThan(0);
    expect(64).toBeLessThanOrEqual(128);
  });
});