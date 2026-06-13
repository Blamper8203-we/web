import { describe, expect, it } from "vitest";
import {
  clamp,
  buildWorldRectStyle,
  expandRect,
  worldRectFromNormalizedRect,
  sameNormalizedRect,
  getSymbolDesignationLabel,
} from "./geometry";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { MAX_SCALE, MIN_SCALE, WIRE_COLORS_MAP, WIRE_THICKNESS_MAP, DEFAULT_CONFIG } from "./constants";
import type { NormalizedRect, WorldRect } from "./types";

describe("dinRailCanvas/geometry - clamp", () => {
  it("clamps value below min to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps value above max to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value within range unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("handles inverted range (max < min) by returning min", () => {
    // clamp(value, min, max) where max < min: Math.max(min, max) returns min
    expect(clamp(5, 10, 0)).toBe(10);
  });
});

describe("dinRailCanvas/geometry - buildWorldRectStyle", () => {
  it("builds absolute positioning style from world rect", () => {
    const rect: WorldRect = { x: 100, y: 200, width: 300, height: 400 };
    const style = buildWorldRectStyle(rect);

    expect(style.position).toBe("absolute");
    expect(style.left).toBe("100px");
    expect(style.top).toBe("200px");
    expect(style.width).toBe("300px");
    expect(style.height).toBe("400px");
  });

  it("handles negative coordinates", () => {
    const rect: WorldRect = { x: -50, y: -100, width: 10, height: 20 };
    const style = buildWorldRectStyle(rect);

    expect(style.left).toBe("-50px");
    expect(style.top).toBe("-100px");
  });
});

describe("dinRailCanvas/geometry - expandRect", () => {
  it("expands a rect uniformly on all sides by padding", () => {
    const rect: WorldRect = { x: 10, y: 20, width: 100, height: 200 };
    const expanded = expandRect(rect, 5);

    expect(expanded.x).toBe(5);
    expect(expanded.y).toBe(15);
    expect(expanded.width).toBe(110);
    expect(expanded.height).toBe(210);
  });

  it("expands by zero padding produces identical rect", () => {
    const rect: WorldRect = { x: 10, y: 20, width: 100, height: 200 };
    const expanded = expandRect(rect, 0);

    expect(expanded).toEqual(rect);
  });
});

describe("dinRailCanvas/geometry - worldRectFromNormalizedRect", () => {
  it("scales normalized rect by symbol dimensions and offsets by symbol position", () => {
    const symbol = createDefaultSymbolItem({ id: "s1", x: 50, y: 60, width: 200, height: 400 });
    const normalized: NormalizedRect = { x: 0.1, y: 0.2, width: 0.5, height: 0.25 };

    const result = worldRectFromNormalizedRect(symbol, normalized);

    expect(result.x).toBe(50 + 0.1 * 200);
    expect(result.y).toBe(60 + 0.2 * 400);
    expect(result.width).toBe(0.5 * 200);
    expect(result.height).toBe(0.25 * 400);
  });
});

describe("dinRailCanvas/geometry - sameNormalizedRect", () => {
  it("returns true for structurally equal rects", () => {
    const a: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const b: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    expect(sameNormalizedRect(a, b)).toBe(true);
  });

  it("returns false when any field differs", () => {
    const a: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const b: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.41 };
    expect(sameNormalizedRect(a, b)).toBe(false);
  });

  it("returns false when x differs", () => {
    const a: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const b: NormalizedRect = { x: 0.11, y: 0.2, width: 0.3, height: 0.4 };
    expect(sameNormalizedRect(a, b)).toBe(false);
  });
});

describe("dinRailCanvas/geometry - getSymbolDesignationLabel", () => {
  it("returns manual designation when ManualReferenceDesignation flag is true", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      referenceDesignation: "K1",
      parameters: { ManualReferenceDesignation: "true" },
    });

    const result = getSymbolDesignationLabel(symbol, new Map());
    expect(result).toBe("K1");
  });

  it("ignores manual designation when flag is false (uses automatic map)", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      referenceDesignation: "K1",
      parameters: { ManualReferenceDesignation: "false" },
    });

    const automatic = new Map<string, string>([["s1", "Q1"]]);
    expect(getSymbolDesignationLabel(symbol, automatic)).toBe("Q1");
  });

  it("uses displayModuleNumber (computed as X{moduleNumber}) for auxiliary terminal block", () => {
    // For terminal blocks, computeDisplayModuleNumber returns
    // referenceDesignation || `X${moduleNumber}`. With no manual
    // referenceDesignation and moduleNumber=5, the result should be "X5".
    const symbol = createDefaultSymbolItem({
      id: "tb1",
      type: "Złączka",
      deviceKind: "terminalBlock",
      moduleNumber: 5,
      parameters: {},
    });

    const result = getSymbolDesignationLabel(symbol, new Map());
    expect(result).toBe("X5");
  });

  it("uses displayModuleNumber (computed as X{moduleNumber}) for distribution block", () => {
    const symbol = createDefaultSymbolItem({
      id: "bl1",
      type: "Blok rozdzielczy",
      deviceKind: "terminalBlock",
      moduleNumber: 3,
      parameters: {},
    });

    const result = getSymbolDesignationLabel(symbol, new Map());
    expect(result).toBe("X3");
  });

  it("prefers manual referenceDesignation when Manual flag is true even on auxiliary symbols", () => {
    const symbol = createDefaultSymbolItem({
      id: "tb1",
      type: "Złączka",
      deviceKind: "terminalBlock",
      moduleNumber: 5,
      referenceDesignation: "KEEP-MANUAL",
      parameters: { ManualReferenceDesignation: "true" },
    });

    const result = getSymbolDesignationLabel(symbol, new Map());
    expect(result).toBe("KEEP-MANUAL");
  });

  it("falls back to empty string when automatic map has no entry and no manual flag", () => {
    const symbol = createDefaultSymbolItem({
      id: "missing",
      parameters: {},
    });

    expect(getSymbolDesignationLabel(symbol, new Map())).toBe("");
  });
});

describe("dinRailCanvas/constants - invariant values", () => {
  it("min scale < max scale", () => {
    expect(MIN_SCALE).toBeLessThan(MAX_SCALE);
  });

  it("default config has at least one row", () => {
    expect(DEFAULT_CONFIG.rows).toBeGreaterThanOrEqual(1);
  });

  it("wire colors map has all standard colors", () => {
    expect(WIRE_COLORS_MAP).toHaveProperty("black");
    expect(WIRE_COLORS_MAP).toHaveProperty("blue");
    expect(WIRE_COLORS_MAP).toHaveProperty("brown");
    expect(WIRE_COLORS_MAP).toHaveProperty("grey");
    expect(WIRE_COLORS_MAP).toHaveProperty("red");
    expect(WIRE_COLORS_MAP).toHaveProperty("green-yellow");
  });

  it("wire thickness map has standard cross sections", () => {
    expect(WIRE_THICKNESS_MAP[1.5]).toBeGreaterThan(0);
    expect(WIRE_THICKNESS_MAP[2.5]).toBeGreaterThan(WIRE_THICKNESS_MAP[1.5]);
    expect(WIRE_THICKNESS_MAP[16]).toBeGreaterThan(WIRE_THICKNESS_MAP[10]);
  });
});
