import { describe, expect, it } from "vitest";
import {
  areSymbolSnapshotsEqual,
  cloneSymbolsSnapshot,
} from "./snapshotUtils";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("snapshotUtils - cloneSymbolsSnapshot", () => {
  it("returns a new array (not the same reference)", () => {
    const symbols = [createDefaultSymbolItem({ id: "s1" })];
    const cloned = cloneSymbolsSnapshot(symbols);

    expect(cloned).not.toBe(symbols);
    expect(cloned[0]).not.toBe(symbols[0]);
  });

  it("clones parameters as a new object (not a shared reference)", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      parameters: { ManualReferenceDesignation: "true" },
    });

    const cloned = cloneSymbolsSnapshot([symbol]);
    expect(cloned[0].parameters).not.toBe(symbol.parameters);

    // Mutating the clone's parameters does not affect the original.
    cloned[0].parameters.newKey = "newValue";
    expect(symbol.parameters.newKey).toBeUndefined();
  });

  it("preserves all primitive fields", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      x: 10,
      y: 20,
      label: "MCB 1P",
      phase: "L2",
      powerW: 2300,
    });

    const cloned = cloneSymbolsSnapshot([symbol]);
    expect(cloned[0].id).toBe("s1");
    expect(cloned[0].x).toBe(10);
    expect(cloned[0].y).toBe(20);
    expect(cloned[0].label).toBe("MCB 1P");
    expect(cloned[0].phase).toBe("L2");
    expect(cloned[0].powerW).toBe(2300);
  });

  it("returns empty array when input is empty", () => {
    expect(cloneSymbolsSnapshot([])).toEqual([]);
  });
});

describe("snapshotUtils - areSymbolSnapshotsEqual", () => {
  it("returns true for two empty arrays", () => {
    expect(areSymbolSnapshotsEqual([], [])).toBe(true);
  });

  it("returns true for identical snapshots", () => {
    const a = [createDefaultSymbolItem({ id: "s1", powerW: 100 })];
    const b = [createDefaultSymbolItem({ id: "s1", powerW: 100 })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(true);
  });

  it("returns false when lengths differ", () => {
    const a = [createDefaultSymbolItem({ id: "s1" })];
    const b = [createDefaultSymbolItem({ id: "s1" }), createDefaultSymbolItem({ id: "s2" })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("returns false when any tracked field differs", () => {
    const a = [createDefaultSymbolItem({ id: "s1", powerW: 100 })];
    const b = [createDefaultSymbolItem({ id: "s1", powerW: 200 })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("returns true when same reference (early return)", () => {
    const a = [createDefaultSymbolItem({ id: "s1" })];
    expect(areSymbolSnapshotsEqual(a, a)).toBe(true);
  });

  it("returns true when parameters are equal", () => {
    const a = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1" } })];
    const b = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1" } })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(true);
  });

  it("returns false when one has parameters and the other does not", () => {
    const a = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1" } })];
    const b = [createDefaultSymbolItem({ id: "s1", parameters: {} })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("returns false when parameter keys differ in count", () => {
    const a = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1" } })];
    const b = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1", y: "2" } })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("returns false when parameter values differ", () => {
    const a = [createDefaultSymbolItem({ id: "s1", parameters: { x: "1" } })];
    const b = [createDefaultSymbolItem({ id: "s1", parameters: { x: "2" } })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("detects differences in nested symbol position (x/y)", () => {
    const a = [createDefaultSymbolItem({ id: "s1", x: 0, y: 0 })];
    const b = [createDefaultSymbolItem({ id: "s1", x: 1, y: 0 })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });

  it("detects differences in rcd fields", () => {
    const a = [createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", rcdResidualCurrent: 30 })];
    const b = [createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", rcdResidualCurrent: 300 })];
    expect(areSymbolSnapshotsEqual(a, b)).toBe(false);
  });
});
