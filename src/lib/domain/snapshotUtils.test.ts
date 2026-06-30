import { describe, expect, it } from "vitest";
import {
  areSymbolSnapshotsEqual,
  cloneSymbolsSnapshot,
  createSymbolHistorySnapshot,
} from "./snapshotUtils";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { createDefaultConnection } from "../../types/connectionItem";

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

describe("snapshotUtils - createSymbolHistorySnapshot", () => {
  const sampleState = {
    symbols: [createDefaultSymbolItem({ id: "s1", x: 10, y: 20 })],
    selectedSymbolId: "s1",
  };
  const sampleConnections = [
    createDefaultConnection({ id: "c1", fromSymbolId: "s1" }),
  ];

  it("zwraca snapshot z klonami symbols (nie wspoldzielona referencja)", () => {
    const snap = createSymbolHistorySnapshot(sampleState, sampleConnections);
    expect(snap.symbols).not.toBe(sampleState.symbols);
    expect(snap.symbols[0]).not.toBe(sampleState.symbols[0]);
  });

  it("zwraca snapshot z klonami connections (nie wspoldzielona referencja)", () => {
    const snap = createSymbolHistorySnapshot(sampleState, sampleConnections);
    expect(snap.connections).not.toBe(sampleConnections);
    expect(snap.connections![0]).not.toBe(sampleConnections[0]);
  });

  it("selectedSymbolIds fallback: gdy brak array, uzywa [selectedSymbolId]", () => {
    const snap = createSymbolHistorySnapshot(
      { symbols: [], selectedSymbolId: "s1" },
      [],
    );
    expect(snap.selectedSymbolIds).toEqual(["s1"]);
  });

  it("selectedSymbolIds fallback: gdy selectedSymbolId rowniez null, daje []", () => {
    const snap = createSymbolHistorySnapshot(
      { symbols: [], selectedSymbolId: null },
      [],
    );
    expect(snap.selectedSymbolIds).toEqual([]);
  });

  it("selectedSymbolIds: gdy array podany, uzywa go (nie fallback)", () => {
    const snap = createSymbolHistorySnapshot(
      { symbols: [], selectedSymbolId: "s1", selectedSymbolIds: ["s1", "s2"] },
      [],
    );
    expect(snap.selectedSymbolIds).toEqual(["s1", "s2"]);
  });

  it("mutacja oryginalu symbols nie wplywa na snapshot", () => {
    const state = {
      symbols: [createDefaultSymbolItem({ id: "s1", x: 10 })],
      selectedSymbolId: "s1",
    };
    const snap = createSymbolHistorySnapshot(state, []);
    state.symbols[0].x = 999;
    expect(snap.symbols[0].x).toBe(10);
  });

  it("mutacja oryginalu connections nie wplywa na snapshot", () => {
    const conns = [createDefaultConnection({ id: "c1", fromSymbolId: "s1" })];
    const snap = createSymbolHistorySnapshot(sampleState, conns);
    conns[0].fromSymbolId = "MUTATED";
    expect(snap.connections![0].fromSymbolId).toBe("s1");
  });

  it("selectedSymbolId jest przepisywany jak jest", () => {
    const snap = createSymbolHistorySnapshot(
      { symbols: [], selectedSymbolId: "abc" },
      [],
    );
    expect(snap.selectedSymbolId).toBe("abc");
  });

  it("puste connections -> snapshot.connections = [] (nie undefined)", () => {
    const snap = createSymbolHistorySnapshot(sampleState, []);
    expect(snap.connections).toEqual([]);
  });
});
