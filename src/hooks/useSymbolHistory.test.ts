import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSymbolHistory } from "./useSymbolHistory";
import { createDefaultSymbolItem, type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";

describe("useSymbolHistory", () => {
  function setup(initialSymbols: SymbolItem[] = [], initialConnections: ConnectionItem[] = []) {
    let symbols = [...initialSymbols];
    let connections = [...initialConnections];
    let selectedSymbolId: string | null = null;
    let selectedSymbolIds: string[] = [];
    let hasUnsavedChanges = false;
    const statusMessages: string[] = [];

    const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
      if (typeof next === "function") {
        symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
      } else {
        symbols = next;
      }
    });

    const setConnections = vi.fn((next: React.SetStateAction<ConnectionItem[]>) => {
      if (typeof next === "function") {
        connections = (next as (prev: ConnectionItem[]) => ConnectionItem[])(connections);
      } else {
        connections = next;
      }
    });

    const setSelectedSymbolId = vi.fn((next: React.SetStateAction<string | null>) => {
      if (typeof next === "function") {
        selectedSymbolId = (next as (prev: string | null) => string | null)(selectedSymbolId);
      } else {
        selectedSymbolId = next;
      }
    });

    const setSelectedSymbolIds = vi.fn((next: React.SetStateAction<string[]>) => {
      if (typeof next === "function") {
        selectedSymbolIds = (next as (prev: string[]) => string[])(selectedSymbolIds);
      } else {
        selectedSymbolIds = next;
      }
    });

    const setHasUnsavedChanges = vi.fn((value: boolean) => {
      hasUnsavedChanges = value;
    });

    const showTemporaryStatus = vi.fn((msg: string) => {
      statusMessages.push(msg);
    });

    const { result } = renderHook(() =>
      useSymbolHistory({
        connections,
        setSymbols,
        setConnections,
        setSelectedSymbolId,
        setSelectedSymbolIds,
        setHasUnsavedChanges,
        showTemporaryStatus,
      }),
    );

    return {
      result,
      get symbols() { return symbols; },
      get connections() { return connections; },
      get selectedSymbolId() { return selectedSymbolId; },
      get selectedSymbolIds() { return selectedSymbolIds; },
      get hasUnsavedChanges() { return hasUnsavedChanges; },
      get statusMessages() { return statusMessages; },
    };
  }

  it("starts with no undo/redo", () => {
    const { result } = setup();

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabel).toBeNull();
    expect(result.current.redoLabel).toBeNull();
  });

  it("executeSymbolsCommand records history and enables undo", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });
    const sym2 = createDefaultSymbolItem({ id: "s2", label: "MCB", powerW: 2000 });

    const { result } = setup([sym1, sym2]);
    const before = { symbols: [sym1, sym2], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed, sym2], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    let executed = false;
    act(() => {
      executed = result.current.executeSymbolsCommand(
        "Zmiana mocy",
        before,
        after,
        "Zmieniono moc MCB",
      );
    });

    expect(executed).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoLabel).toBe("Zmiana mocy");
    expect(result.current.canRedo).toBe(false);
  });

  it("returns false when before and after are identical", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });
    const { result } = setup([sym1]);
    const snapshot = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };

    let executed = false;
    act(() => {
      executed = result.current.executeSymbolsCommand(
        "Pusta zmiana",
        snapshot,
        snapshot,
        "Nic się nie zmieniło",
      );
    });

    expect(executed).toBe(false);
    expect(result.current.canUndo).toBe(false);
  });

  it("undo restores the previous state", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });
    const sym2 = createDefaultSymbolItem({ id: "s2", label: "MCB", powerW: 2000 });

    const { result } = setup([sym1, sym2]);
    const before = { symbols: [sym1, sym2], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed, sym2], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    act(() => { result.current.executeSymbolsCommand("Zmiana mocy", before, after, "Zmieniono"); });
    act(() => { result.current.handleUndo(); });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.redoLabel).toBe("Zmiana mocy");
  });

  it("redo restores the after state", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result } = setup([sym1]);
    const before = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    act(() => { result.current.executeSymbolsCommand("Zmiana mocy", before, after, "Zmieniono"); });
    act(() => { result.current.handleUndo(); });
    act(() => { result.current.handleRedo(); });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabel).toBe("Zmiana mocy");
  });

  it("executeSymbolsCommand calls showTemporaryStatus when changed", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result, statusMessages } = setup([sym1]);
    const before = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    act(() => { result.current.executeSymbolsCommand("Zmiana mocy", before, after, "Zmieniono moc"); });

    expect(statusMessages).toContain("Zmieniono moc");
  });

  it("executeSymbolsCommand does not call showTemporaryStatus when nothing changed", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result, statusMessages } = setup([sym1]);
    const snapshot = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };

    act(() => { result.current.executeSymbolsCommand("Pusta", snapshot, snapshot, "Nic"); });

    expect(statusMessages).not.toContain("Nic");
  });

  it("handleUndo shows status message", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result, statusMessages } = setup([sym1]);
    const before = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    act(() => { result.current.executeSymbolsCommand("Zmiana mocy", before, after, "Zmieniono"); });
    act(() => { result.current.handleUndo(); });

    expect(statusMessages).toContain("Cofnięto: Zmiana mocy");
  });

  it("handleRedo shows status message", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result, statusMessages } = setup([sym1]);
    const before = { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] };
    const changed = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1500 });
    const after = { symbols: [changed], selectedSymbolId: "s1", selectedSymbolIds: ["s1"] };

    act(() => { result.current.executeSymbolsCommand("Zmiana mocy", before, after, "Zmieniono"); });
    act(() => { result.current.handleUndo(); });
    act(() => { result.current.handleRedo(); });

    expect(statusMessages).toContain("Ponowiono: Zmiana mocy");
  });

  it("handles undo/redo for connections changes", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });
    const connBefore: ConnectionItem[] = [{
      id: "c1", fromSymbolId: "s1", fromTerminal: "L1", toSymbolId: "s2", toTerminal: "L1",
      wireColor: "black", wireCrossSection: 2.5, wireType: "LgY", routingMode: "manhattan",
    }];
    const connAfter: ConnectionItem[] = [{
      id: "c1", fromSymbolId: "s1", fromTerminal: "L2", toSymbolId: "s2", toTerminal: "L2",
      wireColor: "black", wireCrossSection: 2.5, wireType: "LgY", routingMode: "manhattan",
    }];

    const { result } = setup([sym1], connBefore);
    const before = { symbols: [sym1], connections: connBefore, selectedSymbolId: null, selectedSymbolIds: [] };
    const after = { symbols: [sym1], connections: connAfter, selectedSymbolId: null, selectedSymbolIds: [] };

    act(() => { result.current.executeSymbolsCommand("Zmiana połączenia", before, after, "Zmieniono połączenie"); });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => { result.current.handleUndo(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.handleRedo(); });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("supports multiple sequential commands", () => {
    const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

    const { result } = setup([sym1]);

    // Command 1: change power
    act(() => {
      result.current.executeSymbolsCommand(
        "Zmiana na 1500W",
        { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] },
        { symbols: [createDefaultSymbolItem({ ...sym1, powerW: 1500 })], selectedSymbolId: null, selectedSymbolIds: [] },
        "1500W",
      );
    });

    // Command 2: change power again
    act(() => {
      result.current.executeSymbolsCommand(
        "Zmiana na 2000W",
        { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] },
        { symbols: [createDefaultSymbolItem({ ...sym1, powerW: 2000 })], selectedSymbolId: null, selectedSymbolIds: [] },
        "2000W",
      );
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoLabel).toBe("Zmiana na 2000W");

    // Undo once
    act(() => { result.current.handleUndo(); });
    expect(result.current.undoLabel).toBe("Zmiana na 1500W");
    expect(result.current.canRedo).toBe(true);

    // Undo twice
    act(() => { result.current.handleUndo(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.redoLabel).toBe("Zmiana na 1500W");
  });

  // ===== hasUnsavedChanges ↔ cleanSnapshot integration (P1-8) =====
  // Pin the dirty-flag lifecycle relative to the clean snapshot baseline.
  // Before this fix, every undo unconditionally asserted hasUnsavedChanges=true
  // (see useSymbolHistory.ts:103), producing a data-loss illusion: save →
  // undo → app claims unsaved changes even though on-disk == current state.
  describe("hasUnsavedChanges vs cleanSnapshot (P1-8)", () => {
    it("edit → save → undo → hasUnsavedChanges becomes false (restored to clean state)", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

      const ctx = setup([sym1]);
      const cleanSnapshot = {
        symbols: [sym1],
        selectedSymbolId: null as string | null,
        selectedSymbolIds: [] as string[],
      };

      // 1) edit (dirty)
      act(() => {
        ctx.result.current.executeSymbolsCommand(
          "Zmiana mocy",
          cleanSnapshot,
          { symbols: [createDefaultSymbolItem({ ...sym1, powerW: 1500 })], selectedSymbolId: null, selectedSymbolIds: [] },
          "Zmieniono",
        );
      });
      expect(ctx.hasUnsavedChanges).toBe(true);

      // 2) save — caller (useProjectActions.handleSaveProject) pins clean snapshot
      act(() => { ctx.result.current.markClean(cleanSnapshot); });
      expect(ctx.hasUnsavedChanges).toBe(false);

      // 3) undo — restores the saved snapshot; must clear the dirty flag
      act(() => { ctx.result.current.handleUndo(); });
      expect(ctx.hasUnsavedChanges).toBe(false);
    });

    it("edit → undo without saving → hasUnsavedChanges clears (state matches the clean baseline again)", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

      const ctx = setup([sym1]);
      const cleanSnapshot = {
        symbols: [sym1],
        selectedSymbolId: null as string | null,
        selectedSymbolIds: [] as string[],
      };

      // mark the initial state as clean (e.g. right after load)
      act(() => { ctx.result.current.markClean(cleanSnapshot); });
      expect(ctx.hasUnsavedChanges).toBe(false);

      // edit (dirty)
      act(() => {
        ctx.result.current.executeSymbolsCommand(
          "Zmiana mocy",
          cleanSnapshot,
          { symbols: [createDefaultSymbolItem({ ...sym1, powerW: 1500 })], selectedSymbolId: null, selectedSymbolIds: [] },
          "Zmieniono",
        );
      });
      expect(ctx.hasUnsavedChanges).toBe(true);

      // undo restores the clean baseline; the dirty flag must clear because
      // dirty tracks (current state == clean state), not session edit history.
      act(() => { ctx.result.current.handleUndo(); });
      expect(ctx.hasUnsavedChanges).toBe(false);
    });

    it("edit → save → undo → redo → hasUnsavedChanges becomes true again (now differs from clean state)", () => {
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB", powerW: 1000 });

      const ctx = setup([sym1]);
      const cleanSnapshot = {
        symbols: [sym1],
        selectedSymbolId: null as string | null,
        selectedSymbolIds: [] as string[],
      };
      const changedSym = createDefaultSymbolItem({ ...sym1, powerW: 1500 });
      const afterSnapshot = {
        symbols: [changedSym],
        selectedSymbolId: null as string | null,
        selectedSymbolIds: [] as string[],
      };

      act(() => {
        ctx.result.current.executeSymbolsCommand("Zmiana mocy", cleanSnapshot, afterSnapshot, "Zmieniono");
      });
      act(() => { ctx.result.current.markClean(cleanSnapshot); });
      expect(ctx.hasUnsavedChanges).toBe(false);

      act(() => { ctx.result.current.handleUndo(); });
      expect(ctx.hasUnsavedChanges).toBe(false);

      act(() => { ctx.result.current.handleRedo(); });
      expect(ctx.hasUnsavedChanges).toBe(true);
    });

    it("new project → markClean(empty) → edit → markClean(empty) → hasUnsavedChanges stays false after a second clean marker", () => {
      const ctx = setup();
      const emptySnapshot = {
        symbols: [] as SymbolItem[],
        selectedSymbolId: null as string | null,
        selectedSymbolIds: [] as string[],
      };

      // new project baseline
      act(() => { ctx.result.current.markClean(emptySnapshot); });
      expect(ctx.hasUnsavedChanges).toBe(false);

      // edit (dirty)
      const sym1 = createDefaultSymbolItem({ id: "s1", label: "MCB" });
      act(() => {
        ctx.result.current.executeSymbolsCommand(
          "Dodanie MCB",
          emptySnapshot,
          { symbols: [sym1], selectedSymbolId: null, selectedSymbolIds: [] },
          "Dodano",
        );
      });
      expect(ctx.hasUnsavedChanges).toBe(true);

      // "New project" — reset baseline back to empty
      act(() => { ctx.result.current.markClean(emptySnapshot); });
      expect(ctx.hasUnsavedChanges).toBe(false);
    });
  });
});
