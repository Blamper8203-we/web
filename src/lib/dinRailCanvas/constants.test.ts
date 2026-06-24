import { describe, expect, it } from "vitest";
import {
  MAX_SCALE,
  MIN_SCALE,
  PIXI_LABEL_SYMBOL_LIMIT,
  PIXI_MAX_RESOLUTION,
} from "./constants";

// WHY: regression test dla MUST #5 z distribution-roadmap.md (mobile perf).
// PIXI_MAX_RESOLUTION cap chroni przed rozmyciem canvasu na retina iPhone (3× DPR)
// — bez testu ktoś mógłby przypadkiem podnieść wartość i cofnąć fix.
// PIXI_LABEL_SYMBOL_LIMIT chroni przed przeładowaniem Pixi tekstem na słabym CPU.

describe("Pixi canvas mobile safety caps", () => {
  it("PIXI_MAX_RESOLUTION jest ograniczony do 2 (retina iPhone safe)", () => {
    expect(PIXI_MAX_RESOLUTION).toBeLessThanOrEqual(2);
    expect(PIXI_MAX_RESOLUTION).toBeGreaterThan(1);
  });

  it("PIXI_LABEL_SYMBOL_LIMIT chroni przed przeładowaniem Pixi etykietami", () => {
    expect(PIXI_LABEL_SYMBOL_LIMIT).toBeGreaterThan(0);
    expect(PIXI_LABEL_SYMBOL_LIMIT).toBeLessThanOrEqual(128);
  });

  it("skala canvasu pozostaje w bezpiecznych widełkach", () => {
    expect(MIN_SCALE).toBeGreaterThan(0);
    expect(MAX_SCALE).toBeGreaterThan(MIN_SCALE);
    expect(MAX_SCALE).toBeLessThanOrEqual(10);
  });
});
