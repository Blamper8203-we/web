import { describe, expect, it } from "vitest";
import {
  compareDinPosition,
  findDinRailSnapTarget,
  normalizeDinRailModuleOrdering,
  snapDraggedGroupToNeighborModules,
} from "./dinRailArrangement";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("dinRailArrangement - compareDinPosition", () => {
  it("orders by Y when difference is more than 50px", () => {
    const a = createDefaultSymbolItem({ id: "a", x: 100, y: 0 });
    const b = createDefaultSymbolItem({ id: "b", x: 0, y: 100 });
    expect(compareDinPosition(a, b)).toBeLessThan(0);
    expect(compareDinPosition(b, a)).toBeGreaterThan(0);
  });

  it("orders by X when Y difference is within 50px (same row)", () => {
    const a = createDefaultSymbolItem({ id: "a", x: 0, y: 10 });
    const b = createDefaultSymbolItem({ id: "b", x: 50, y: 10 });
    expect(compareDinPosition(a, b)).toBeLessThan(0);
    expect(compareDinPosition(b, a)).toBeGreaterThan(0);
  });

  it("returns 0 for symbols at the same position", () => {
    const a = createDefaultSymbolItem({ id: "a", x: 0, y: 0 });
    const b = createDefaultSymbolItem({ id: "b", x: 0, y: 0 });
    expect(compareDinPosition(a, b)).toBe(0);
  });

  it("respects the 50px tolerance for Y", () => {
    // y difference of 40px -> considered same row -> order by x
    const a = createDefaultSymbolItem({ id: "a", x: 0, y: 0 });
    const b = createDefaultSymbolItem({ id: "b", x: 50, y: 40 });
    expect(compareDinPosition(a, b)).toBeLessThan(0);
  });
});

describe("dinRailArrangement - findDinRailSnapTarget", () => {
  it("returns null when no symbols are snapped to rail", () => {
    const a = createDefaultSymbolItem({ id: "a", x: 0, y: 0, isSnappedToRail: false });
    const result = findDinRailSnapTarget([a], 0, 0, 100, 200);
    expect(result).toBeNull();
  });

  it("returns null when candidate is too far away on Y (>100px)", () => {
    const a = createDefaultSymbolItem({ id: "a", x: 0, y: 0, isSnappedToRail: true, width: 100, height: 200 });
    const result = findDinRailSnapTarget([a], 0, 500, 100, 200);
    expect(result).toBeNull();
  });

  it("returns the closest snap candidate within threshold on X", () => {
    // Two candidates at the same Y row, one closer
    const close = createDefaultSymbolItem({
      id: "close",
      x: 100,
      y: 0,
      width: 100,
      height: 200,
      isSnappedToRail: true,
    });
    const far = createDefaultSymbolItem({
      id: "far",
      x: 500,
      y: 0,
      width: 100,
      height: 200,
      isSnappedToRail: true,
    });
    // Probe placed just to the right of close (within snap threshold of 30)
    // close.right = 200, probe.left = 195 -> distance = 5
    const result = findDinRailSnapTarget([close, far], 195, 0, 50, 200);
    expect(result).toBe(close);
  });

  it("returns null when all candidates are beyond snap threshold (30px)", () => {
    const a = createDefaultSymbolItem({
      id: "a",
      x: 0,
      y: 0,
      width: 100,
      height: 200,
      isSnappedToRail: true,
    });
    const result = findDinRailSnapTarget([a], 500, 0, 50, 200);
    expect(result).toBeNull();
  });
});

describe("dinRailArrangement - snapDraggedGroupToNeighborModules", () => {
  it("returns initialDeltaX when movedSymbols is empty", () => {
    const result = snapDraggedGroupToNeighborModules([], [], 10, createDefaultSymbolItem({ id: "a" }), 0);
    expect(result).toBe(10);
  });

  it("returns initialDeltaX when no neighbor is within snap threshold", () => {
    const moved = [createDefaultSymbolItem({ id: "m1", x: 100, y: 0, width: 50, height: 200 })];
    const existing = createDefaultSymbolItem({
      id: "e1",
      x: 1000,
      y: 0,
      width: 50,
      height: 200,
    });
    const anchor = moved[0];
    const result = snapDraggedGroupToNeighborModules(moved, [existing], 0, anchor, 0);
    expect(result).toBe(0);
  });

  it("snaps the moved group to the right edge of a neighbor", () => {
    const moved = [createDefaultSymbolItem({ id: "m1", x: 100, y: 0, width: 50, height: 200 })];
    const existing = createDefaultSymbolItem({
      id: "e1",
      x: 50,
      y: 0,
      width: 50,
      height: 200,
    });
    // moved.left = 100, existing.right = 100, so snapDeltaX = 100 - 100 = 0
    const anchor = moved[0];
    const result = snapDraggedGroupToNeighborModules(moved, [existing], 0, anchor, 0);
    expect(result).toBe(0);
  });

  it("ignores the anchor itself when computing snap targets", () => {
    // Anchor is at x=100. The function should not snap to itself.
    const anchor = createDefaultSymbolItem({ id: "anchor", x: 100, y: 0, width: 50, height: 200 });
    const result = snapDraggedGroupToNeighborModules([anchor], [anchor], 0, anchor, 0);
    expect(result).toBe(0);
  });
});

describe("dinRailArrangement - normalizeDinRailModuleOrdering", () => {
  it("returns empty array unchanged", () => {
    expect(normalizeDinRailModuleOrdering([])).toEqual([]);
  });

  it("assigns moduleNumber=1 to a non-grouped non-RCD symbol when missing", () => {
    const s = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      isSnappedToRail: true,
      moduleNumber: 0,
    });
    const result = normalizeDinRailModuleOrdering([s]);
    expect(result[0].moduleNumber).toBe(1);
    expect(result[0].displayModuleNumber).toBe("#1");
  });

  it("sets moduleNumber=0 and displayModuleNumber='#0' for non-grouped RCD", () => {
    const s = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      isSnappedToRail: true,
      moduleNumber: 5,
    });
    const result = normalizeDinRailModuleOrdering([s]);
    expect(result[0].moduleNumber).toBe(0);
    expect(result[0].displayModuleNumber).toBe("#0");
  });

  it("does not modify unsnapped symbols (group-aware path)", () => {
    const s = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      isSnappedToRail: false,
      moduleNumber: 0,
    });
    const result = normalizeDinRailModuleOrdering([s]);
    // Unsnap path doesn't assign moduleNumber
    expect(result[0].moduleNumber).toBe(0);
  });

  it("groups by group field and assigns sequential numbers within group", () => {
    const mcb1 = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "G1",
      isSnappedToRail: true,
      x: 100,
      y: 0,
      width: 100,
      height: 200,
    });
    const mcb2 = createDefaultSymbolItem({
      id: "m2",
      deviceKind: "mcb",
      group: "G1",
      isSnappedToRail: true,
      x: 200,
      y: 0,
      width: 100,
      height: 200,
    });
    const result = normalizeDinRailModuleOrdering([mcb1, mcb2]);
    const numbers = result.map((s) => s.moduleNumber).sort();
    // Both should get sequential numbers within the group
    expect(numbers).toEqual([1, 2]);
  });

  it("auto-assigns F{group}.{circuit} referenceDesignation to MCB/RCBO without manual flag", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      group: "G1",
      isSnappedToRail: true,
      referenceDesignation: "Q1",
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });
    const mcb = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "G1",
      isSnappedToRail: true,
      x: 100,
      y: 0,
      width: 100,
      height: 200,
    });
    const result = normalizeDinRailModuleOrdering([rcd, mcb]);
    const mcbResult = result.find((s) => s.id === "m1");
    expect(mcbResult?.referenceDesignation).toBe("F1.1");
  });

  it("does not auto-assign referenceDesignation when Manual flag is set", () => {
    const rcd = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      group: "G1",
      isSnappedToRail: true,
      referenceDesignation: "Q1",
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });
    const mcb = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "G1",
      isSnappedToRail: true,
      referenceDesignation: "KEEP",
      x: 100,
      y: 0,
      width: 100,
      height: 200,
      parameters: { ManualReferenceDesignation: "true" },
    });
    const result = normalizeDinRailModuleOrdering([rcd, mcb]);
    const mcbResult = result.find((s) => s.id === "m1");
    expect(mcbResult?.referenceDesignation).toBe("KEEP");
  });

  it("returns a new array (does not mutate input symbols in-place)", () => {
    const s = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      isSnappedToRail: true,
      moduleNumber: 0,
    });
    const result = normalizeDinRailModuleOrdering([s]);
    expect(result).not.toBe([s]);
    expect(result[0]).not.toBe(s);
  });
});
