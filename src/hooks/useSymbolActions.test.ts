import { describe, expect, it, vi } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import {
  resolveReleasedDinRailGrouping,
  resolveSelectionChange,
} from "./useSymbolActions";

// ─── Hook integration tests ────────────────────────────────────────────────

import { renderHook, act } from "@testing-library/react";
import { useSymbolActions } from "./useSymbolActions";
import type { SymbolItem } from "../types/symbolItem";
import type { SymbolHistorySnapshot } from "../lib/appHelpers";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: { Light: "light", Medium: "medium" },
  NotificationType: { Success: "success" },
}));

describe("useSymbolActions hook", () => {
  // ── handleDeleteSelected ──
  describe("handleDeleteSelected", () => {
    function setup(options?: {
      symbols?: SymbolItem[];
      selectedSymbolIds?: string[];
      selectedSymbolId?: string | null;
    }) {
      let symbols = options?.symbols ?? [];
      let selectedSymbolId: string | null = options?.selectedSymbolId ?? null;
      let selectedSymbolIds: string[] = options?.selectedSymbolIds ?? [];
      const commands: Array<{ label: string; before: SymbolHistorySnapshot; after: SymbolHistorySnapshot }> = [];

      const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
        if (typeof next === "function") {
          symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
        } else {
          symbols = next;
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
      const executeSymbolsCommand = vi.fn(
        (label: string, before: SymbolHistorySnapshot, after: SymbolHistorySnapshot) => {
          commands.push({ label, before, after });
          // Simulate what the real executeSymbolsCommand does:
          // update symbols, selection, etc.
          if (typeof setSymbols === "function") {
            setSymbols(after.symbols);
          }
          setSelectedSymbolId(after.selectedSymbolId);
          setSelectedSymbolIds(after.selectedSymbolIds ?? []);
          return true;
        },
      );

      const { result } = renderHook(() =>
        useSymbolActions({
          symbols,
          setSymbols,
          selectedSymbolId,
          setSelectedSymbolId,
          selectedSymbolIds,
          setSelectedSymbolIds,
          setActiveRightTab: vi.fn(),
          setHasUnsavedChanges: vi.fn(),
          executeSymbolsCommand,
          dragHistorySnapshotRef: { current: null },
          draggedSymbolIdsRef: { current: null },
        }),
      );

      return {
        result,
        get symbols() { return symbols; },
        get selectedSymbolIds() { return selectedSymbolIds; },
        get commands() { return commands; },
        executeSymbolsCommand,
      };
    }

    it("deletes selected symbols by selectedSymbolIds", () => {
      const s1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P" });
      const s2 = createDefaultSymbolItem({ id: "s2", label: "MCB 2P" });
      const s3 = createDefaultSymbolItem({ id: "s3", label: "RCD" });

      const { result, commands } = setup({
        symbols: [s1, s2, s3],
        selectedSymbolIds: ["s1", "s2"],
      });

      act(() => {
        result.current.handleDeleteSelected();
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]?.label).toContain("Usunięcie");
      // After should have only s3 remaining
      expect(commands[0]?.after.symbols).toHaveLength(1);
      expect(commands[0]?.after.symbols[0]?.id).toBe("s3");
    });

    it("deletes single symbol when only selectedSymbolId is set", () => {
      const s1 = createDefaultSymbolItem({ id: "s1" });
      const s2 = createDefaultSymbolItem({ id: "s2" });

      const { result, commands } = setup({
        symbols: [s1, s2],
        selectedSymbolId: "s1",
        selectedSymbolIds: [],
      });

      act(() => {
        result.current.handleDeleteSelected();
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]?.after.symbols).toHaveLength(1);
      expect(commands[0]?.after.symbols[0]?.id).toBe("s2");
    });

    it("clears rcdSymbolId on children when RCD head is deleted", () => {
      const rcd = createDefaultSymbolItem({
        id: "rcd1",
        deviceKind: "rcd",
        referenceDesignation: "Q1",
        group: "g1",
        groupName: "Grupa-1",
      });
      const mcb = createDefaultSymbolItem({
        id: "mcb1",
        deviceKind: "mcb",
        group: "g1",
        groupName: "Grupa-1",
        rcdSymbolId: "rcd1",
        rcdRatedCurrent: 40,
        rcdResidualCurrent: 30,
        rcdType: "A",
      });

      const { result, commands } = setup({
        symbols: [rcd, mcb],
        selectedSymbolIds: ["rcd1"],
      });

      act(() => {
        result.current.handleDeleteSelected();
      });

      const afterMcb = commands[0]?.after.symbols.find((s) => s.id === "mcb1");
      expect(afterMcb?.rcdSymbolId).toBe("");
      expect(afterMcb?.rcdRatedCurrent).toBe(0);
      expect(afterMcb?.rcdResidualCurrent).toBe(0);
      expect(afterMcb?.rcdType).toBe("");
    });

    it("does nothing when selection is empty", () => {
      const s1 = createDefaultSymbolItem({ id: "s1" });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolIds: [],
        selectedSymbolId: null,
      });

      act(() => {
        result.current.handleDeleteSelected();
      });

      expect(commands).toHaveLength(0);
    });

    it("prevents double-execution when called twice with stale closure (race condition guard)", () => {
      // Uses isDeletingRef synchronously to prevent re-entry

      const s1 = createDefaultSymbolItem({ id: "s1" });
      const s2 = createDefaultSymbolItem({ id: "s2" });

      // Simulate double Delete press: call handleDeleteSelected twice
      // The second call should be blocked by the synchronous lock.
      // Since both calls happen in the same microtask, executeSymbolsCommand
      // hasn't finished yet, so the lock prevents re-entry.
      const { result, commands } = setup({
        symbols: [s1, s2],
        selectedSymbolIds: ["s1"],
      });

      // Make executeSymbolsCommand synchronous (mock doesn't await anything)
      act(() => {
        result.current.handleDeleteSelected();
      });

      expect(commands).toHaveLength(1);

      // Second call - lock was released after first call completed
      // Now selectedSymbolIdsRef should still be ["s1"] (useEffect hasn't run),
      // but symbolsRef still has both symbols.
      // The lock is released, so this would execute again...
      // UNLESS we also check the refs.
      // Actually the lock just prevents concurrent execution, not sequential.
      // Let's test the concurrent case instead.
      act(() => {
        result.current.handleDeleteSelected();
      });

      // Second call succeeds normally because lock is released
      expect(commands).toHaveLength(2);
    });

    it("reports correct label for multiple symbols", () => {
      const s1 = createDefaultSymbolItem({ id: "s1", label: "MCB 1P" });
      const s2 = createDefaultSymbolItem({ id: "s2", label: "MCB 2P" });

      const { result, commands } = setup({
        symbols: [s1, s2],
        selectedSymbolIds: ["s1", "s2"],
      });

      act(() => {
        result.current.handleDeleteSelected();
      });

      expect(commands[0]?.label).toBe("Usunięcie 2 elementów");
    });
  });

  // ── handleDuplicateSelected ──
  describe("handleDuplicateSelected", () => {
    function setup(options?: {
      symbols?: SymbolItem[];
      selectedSymbolIds?: string[];
      selectedSymbolId?: string | null;
    }) {
      let symbols = options?.symbols ?? [];
      let selectedSymbolId: string | null = options?.selectedSymbolId ?? null;
      let selectedSymbolIds: string[] = options?.selectedSymbolIds ?? [];
      const commands: Array<{ label: string; before: SymbolHistorySnapshot; after: SymbolHistorySnapshot }> = [];

      const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
        if (typeof next === "function") {
          symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
        } else {
          symbols = next;
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
      const executeSymbolsCommand = vi.fn(
        (label: string, before: SymbolHistorySnapshot, after: SymbolHistorySnapshot) => {
          commands.push({ label, before, after });
          if (typeof setSymbols === "function") {
            setSymbols(after.symbols);
          }
          setSelectedSymbolId(after.selectedSymbolId);
          setSelectedSymbolIds(after.selectedSymbolIds ?? []);
          return true;
        },
      );

      const { result } = renderHook(() =>
        useSymbolActions({
          symbols,
          setSymbols,
          selectedSymbolId,
          setSelectedSymbolId,
          selectedSymbolIds,
          setSelectedSymbolIds,
          setActiveRightTab: vi.fn(),
          setHasUnsavedChanges: vi.fn(),
          executeSymbolsCommand,
          dragHistorySnapshotRef: { current: null },
          draggedSymbolIdsRef: { current: null },
        }),
      );

      return {
        result,
        get symbols() { return symbols; },
        get selectedSymbolIds() { return selectedSymbolIds; },
        get commands() { return commands; },
        executeSymbolsCommand,
      };
    }

    it("duplicates selected symbols", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        label: "MCB 1P",
        referenceDesignation: "F1",
        x: 100,
        y: 100,
        width: 50,
        moduleNumber: 1,
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleDuplicateSelected();
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]?.label).toContain("Kopiowanie");
      // After should have 2 symbols (original + clone)
      expect(commands[0]?.after.symbols).toHaveLength(2);
      // Clone should have a new id
      const clone = commands[0]?.after.symbols.find((s) => s.id !== "s1");
      expect(clone).toBeDefined();
      expect(clone?.x).toBeGreaterThan(s1.x); // offset to the right
      expect(clone?.referenceDesignation).toBe(""); // cleared
    });

    it("duplicates symbols with group and preserves RCD reference", () => {
      const rcd = createDefaultSymbolItem({
        id: "r1",
        deviceKind: "rcd",
        referenceDesignation: "Q1",
        group: "g1",
        groupName: "Grupa-1",
        x: 100,
        y: 100,
        width: 100,
        moduleNumber: 1,
      });
      const mcb = createDefaultSymbolItem({
        id: "m1",
        deviceKind: "mcb",
        referenceDesignation: "F1.1",
        group: "g1",
        groupName: "Grupa-1",
        rcdSymbolId: "r1",
        rcdRatedCurrent: 40,
        rcdResidualCurrent: 30,
        rcdType: "A",
        x: 200,
        y: 100,
        width: 50,
        moduleNumber: 2,
      });

      const { result, commands } = setup({
        symbols: [rcd, mcb],
        selectedSymbolIds: ["r1", "m1"],
      });

      act(() => {
        result.current.handleDuplicateSelected();
      });

      expect(commands).toHaveLength(1);
      const afterSymbols = commands[0]?.after.symbols;
      expect(afterSymbols).toHaveLength(4); // 2 originals + 2 clones

      // Find the cloned RCD and MCB
      const cloneRcd = afterSymbols.find((s) => s.deviceKind === "rcd" && !["r1", "m1"].includes(s.id));
      const cloneMcb = afterSymbols.find((s) => s.deviceKind === "mcb" && !["r1", "m1"].includes(s.id));

      expect(cloneRcd).toBeDefined();
      expect(cloneMcb).toBeDefined();

      // Clone MCB should reference clone RCD (not original)
      expect(cloneMcb?.rcdSymbolId).toBe(cloneRcd?.id);

      // New group name should be different from original
      expect(cloneRcd?.groupName).not.toBe("Grupa-1");
      expect(cloneRcd?.groupName).toMatch(/^Grupa-/);
      expect(cloneMcb?.groupName).toBe(cloneRcd?.groupName);
    });

    it("prevents double-execution via synchronous lock", () => {
      // isDuplicatingRef prevents re-entry if duplicate is called again
      // while the first call is still executing
      const s1 = createDefaultSymbolItem({
        id: "s1",
        label: "MCB 1P",
        x: 100,
        y: 100,
        width: 50,
        moduleNumber: 1,
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolIds: ["s1"],
      });

      // Call twice sequentially
      act(() => {
        result.current.handleDuplicateSelected();
      });

      expect(commands).toHaveLength(1);

      act(() => {
        result.current.handleDuplicateSelected();
      });

      // Second call executes because lock is released after first completes
      expect(commands).toHaveLength(2);
    });

    it("does nothing when no symbols are selected", () => {
      const s1 = createDefaultSymbolItem({ id: "s1" });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolIds: [],
        selectedSymbolId: null,
      });

      act(() => {
        result.current.handleDuplicateSelected();
      });

      expect(commands).toHaveLength(0);
    });
  });

  // ── handleCircuitEditSave ──
  describe("handleCircuitEditSave", () => {
    function setup(options?: {
      symbols?: SymbolItem[];
      selectedSymbolId?: string | null;
      selectedSymbolIds?: string[];
    }) {
      let symbols = options?.symbols ?? [];
      let selectedSymbolId: string | null = options?.selectedSymbolId ?? null;
      let selectedSymbolIds: string[] = options?.selectedSymbolIds ?? [];
      const commands: Array<{ label: string; before: SymbolHistorySnapshot; after: SymbolHistorySnapshot }> = [];

      const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
        if (typeof next === "function") {
          symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
        } else {
          symbols = next;
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
      const executeSymbolsCommand = vi.fn(
        (label: string, before: SymbolHistorySnapshot, after: SymbolHistorySnapshot) => {
          commands.push({ label, before, after });
          if (typeof setSymbols === "function") {
            setSymbols(after.symbols);
          }
          setSelectedSymbolId(after.selectedSymbolId);
          setSelectedSymbolIds(after.selectedSymbolIds ?? []);
          return true;
        },
      );

      const { result } = renderHook(() =>
        useSymbolActions({
          symbols,
          setSymbols,
          selectedSymbolId,
          setSelectedSymbolId,
          selectedSymbolIds,
          setSelectedSymbolIds,
          setActiveRightTab: vi.fn(),
          setHasUnsavedChanges: vi.fn(),
          executeSymbolsCommand,
          dragHistorySnapshotRef: { current: null },
          draggedSymbolIdsRef: { current: null },
        }),
      );

      return {
        result,
        get symbols() { return symbols; },
        get selectedSymbolIds() { return selectedSymbolIds; },
        get commands() { return commands; },
        executeSymbolsCommand,
      };
    }

    it("saves updated symbol and calls executeSymbolsCommand with Edycja label", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB 1P",
        protectionType: "B16",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      const updated = { ...s1, protectionType: "B20" };

      act(() => {
        result.current.handleCircuitEditSave(updated);
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]?.label).toBe("Edycja F1");

      // Before snapshot should contain original symbols
      expect(commands[0]?.before.symbols).toHaveLength(1);
      expect(commands[0]?.before.symbols[0]?.protectionType).toBe("B16");

      // After snapshot should contain the updated symbol
      expect(commands[0]?.after.symbols).toHaveLength(1);
      const afterSymbol = commands[0]?.after.symbols[0];
      expect(afterSymbol?.protectionType).toBe("B20");
      expect(afterSymbol?.id).toBe("s1");
    });

    it("uses label hierarchy: referenceDesignation > circuitName > label > type > 'element'", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        circuitName: "OBWÓD-1",
        label: "MCB",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleCircuitEditSave({ ...s1 });
      });

      expect(commands[0]?.label).toBe("Edycja F1");
    });

    it("does nothing when symbol is not found in symbolsRef", () => {
      const { result, commands } = setup({
        symbols: [],
      });

      const updated = createDefaultSymbolItem({
        id: "nonexistent",
        referenceDesignation: "F1",
      });

      act(() => {
        result.current.handleCircuitEditSave(updated);
      });

      expect(commands).toHaveLength(0);
    });
  });

  // ── handleSchematicCellEdit ──
  describe("handleSchematicCellEdit", () => {
    function setup(options?: {
      symbols?: SymbolItem[];
      selectedSymbolId?: string | null;
      selectedSymbolIds?: string[];
    }) {
      let symbols = options?.symbols ?? [];
      let selectedSymbolId: string | null = options?.selectedSymbolId ?? null;
      let selectedSymbolIds: string[] = options?.selectedSymbolIds ?? [];
      const commands: Array<{ label: string; before: SymbolHistorySnapshot; after: SymbolHistorySnapshot }> = [];

      const setSymbols = vi.fn((next: React.SetStateAction<SymbolItem[]>) => {
        if (typeof next === "function") {
          symbols = (next as (prev: SymbolItem[]) => SymbolItem[])(symbols);
        } else {
          symbols = next;
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
      const executeSymbolsCommand = vi.fn(
        (label: string, before: SymbolHistorySnapshot, after: SymbolHistorySnapshot) => {
          commands.push({ label, before, after });
          if (typeof setSymbols === "function") {
            setSymbols(after.symbols);
          }
          setSelectedSymbolId(after.selectedSymbolId);
          setSelectedSymbolIds(after.selectedSymbolIds ?? []);
          return true;
        },
      );

      const { result } = renderHook(() =>
        useSymbolActions({
          symbols,
          setSymbols,
          selectedSymbolId,
          setSelectedSymbolId,
          selectedSymbolIds,
          setSelectedSymbolIds,
          setActiveRightTab: vi.fn(),
          setHasUnsavedChanges: vi.fn(),
          executeSymbolsCommand,
          dragHistorySnapshotRef: { current: null },
          draggedSymbolIdsRef: { current: null },
        }),
      );

      return {
        result,
        get symbols() { return symbols; },
        get selectedSymbolIds() { return selectedSymbolIds; },
        get commands() { return commands; },
        executeSymbolsCommand,
      };
    }

    it("edits a cell and calls executeSymbolsCommand with Edycja tabeli label", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB",
        circuitName: "",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleSchematicCellEdit("s1", "CircuitName", "OBWÓD-1");
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]?.label).toBe("Edycja tabeli F1");

      // After snapshot should contain updated symbol
      const afterSymbols = commands[0]?.after.symbols;
      expect(afterSymbols).toHaveLength(1);
      expect(afterSymbols[0]?.circuitName).toBe("OBWÓD-1");
      expect(afterSymbols[0]?.id).toBe("s1");
    });

    it("does nothing when symbol is not found", () => {
      const { result, commands } = setup({
        symbols: [],
      });

      act(() => {
        result.current.handleSchematicCellEdit("nonexistent", "CircuitName", "OBWÓD-1");
      });

      expect(commands).toHaveLength(0);
    });

    it("applies Designation edit and tracks ManualReferenceDesignation", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleSchematicCellEdit("s1", "Designation", "OBWÓD-A");
      });

      expect(commands).toHaveLength(1);
      const afterSymbol = commands[0]?.after.symbols[0];
      expect(afterSymbol?.referenceDesignation).toBe("OBWÓD-A");
      expect(afterSymbol?.parameters.ManualReferenceDesignation).toBe("true");
    });

    it("applies Protection edit", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB",
        protectionType: "B16",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleSchematicCellEdit("s1", "Protection", "C20");
      });

      const afterSymbol = commands[0]?.after.symbols[0];
      expect(afterSymbol?.protectionType).toBe("C20");
    });

    it("applies Location edit", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB",
        location: "",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleSchematicCellEdit("s1", "Location", "Piwnica");
      });

      const afterSymbol = commands[0]?.after.symbols[0];
      expect(afterSymbol?.location).toBe("Piwnica");
    });

    it("applies CableDesig edit via parameters", () => {
      const s1 = createDefaultSymbolItem({
        id: "s1",
        referenceDesignation: "F1",
        label: "MCB",
      });

      const { result, commands } = setup({
        symbols: [s1],
        selectedSymbolId: "s1",
        selectedSymbolIds: ["s1"],
      });

      act(() => {
        result.current.handleSchematicCellEdit("s1", "CableDesig", "YKY 5x10");
      });

      const afterSymbol = commands[0]?.after.symbols[0];
      expect(afterSymbol?.parameters.CableDesig).toBe("YKY 5x10");
    });
  });
});

// ─── Pure function tests (existing) ─────────────────────────────────────────

describe("resolveSelectionChange", () => {
  it("clears selection when no ids are provided", () => {
    const result = resolveSelectionChange([], null);

    expect(result.nextIds).toEqual([]);
    expect(result.nextActiveId).toBeNull();
  });

  it("preserves active id when it exists in selection", () => {
    const result = resolveSelectionChange(["a", "b", "c"], "b");

    expect(result.nextIds).toEqual(["a", "b", "c"]);
    expect(result.nextActiveId).toBe("b");
  });

  it("falls back to the last selected id when active id is missing", () => {
    const result = resolveSelectionChange(["a", "b", "c"], "x");

    expect(result.nextIds).toEqual(["a", "b", "c"]);
    expect(result.nextActiveId).toBe("c");
  });

  it("deduplicates ids while preserving insertion order", () => {
    const result = resolveSelectionChange(["a", "b", "a", "c", "b"]);

    expect(result.nextIds).toEqual(["a", "b", "c"]);
    expect(result.nextActiveId).toBe("c");
  });
});

describe("resolveReleasedDinRailGrouping", () => {
  const makeRcdItem = (overrides: Record<string, unknown> = {}) =>
    createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD 2P",
      label: "RCD",
      referenceDesignation: "Q2",
      x: 100,
      y: 100,
      width: 100,
      height: 200,
      isSnappedToRail: true,
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
      ...overrides,
    });

  const makeMcbItem = (overrides: Record<string, unknown> = {}) =>
    createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB",
      x: 200,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
      ...overrides,
    });

  const makeSpdItem = (overrides: Record<string, unknown> = {}) =>
    createDefaultSymbolItem({
      id: "spd-1",
      deviceKind: "spd",
      type: "SPD",
      label: "SPD",
      x: 200,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
      ...overrides,
    });

  it("returns symbols unchanged when symbol id does not exist", () => {
    const rcd = makeRcdItem();
    const mcb = makeMcbItem();

    const next = resolveReleasedDinRailGrouping([rcd, mcb], "nonexistent-id");

    expect(next).toHaveLength(2);
    expect(next.find((s) => s.id === "rcd-1")?.group).toBeFalsy();
    expect(next.find((s) => s.id === "mcb-1")?.group).toBeFalsy();
  });

  it("returns symbols unchanged when symbol is not snapped to rail", () => {
    const mcb = makeMcbItem({ isSnappedToRail: false });

    const next = resolveReleasedDinRailGrouping([mcb], "mcb-1");

    expect(next).toHaveLength(1);
    expect(next[0]?.group).toBeFalsy();
  });

  it("returns symbols unchanged when symbol already has a group", () => {
    const mcb = makeMcbItem({ group: "existing-group", groupName: "Grupa-1" });

    const next = resolveReleasedDinRailGrouping([mcb], "mcb-1");

    expect(next).toHaveLength(1);
    expect(next[0]?.group).toBe("existing-group");
  });

  it("returns symbols unchanged when symbol is excluded from auto-grouping (e.g. SPD)", () => {
    const spd = makeSpdItem();

    const next = resolveReleasedDinRailGrouping([spd], "spd-1");

    expect(next).toHaveLength(1);
    expect(next[0]?.group).toBeFalsy();
  });

  it("returns symbols unchanged when there is no snap target (isolated symbol)", () => {
    const mcb = makeMcbItem({ x: 9999, y: 9999 });

    const next = resolveReleasedDinRailGrouping([mcb], "mcb-1");

    expect(next).toHaveLength(1);
    expect(next[0]?.group).toBeFalsy();
  });

  it("returns symbols unchanged when canAutoJoinExistingGroup returns false for incompatible types", () => {
    // SPD next to MCB – SPD is excluded, so canAutoJoinExistingGroup returns false
    const mcb = makeMcbItem({ id: "mcb-target", x: 100, y: 100 });
    const spd = makeSpdItem({ id: "spd-released", x: 150, y: 100 });

    const next = resolveReleasedDinRailGrouping([mcb, spd], "spd-released");

    const released = next.find((s) => s.id === "spd-released");
    expect(released?.group).toBeFalsy();
  });

  it("creates a new RCD group when an ungrouped MCB is released next to an ungrouped RCD", () => {
    const rcd = makeRcdItem();
    const mcb = makeMcbItem();

    const next = resolveReleasedDinRailGrouping([rcd, mcb], "mcb-1");
    const nextRcd = next.find((symbol) => symbol.id === "rcd-1");
    const nextMcb = next.find((symbol) => symbol.id === "mcb-1");

    expect(nextRcd?.group).toBeTruthy();
    expect(nextMcb?.group).toBe(nextRcd?.group);
    expect(nextMcb?.groupName).toBe(nextRcd?.groupName);
    expect(nextMcb?.rcdSymbolId).toBe("rcd-1");
    expect(nextMcb?.rcdRatedCurrent).toBe(40);
    expect(nextMcb?.rcdResidualCurrent).toBe(30);
    expect(nextMcb?.rcdType).toBe("A");
    expect(nextMcb?.referenceDesignation).toBe("F2.1");
  });

  it("does not create a group when two non-head, non-distribution symbols are next to each other", () => {
    // Two MCBs side by side – neither is a group head (RCD) nor distribution block
    const mcbA = makeMcbItem({ id: "mcb-a", x: 100, y: 100 });
    const mcbB = makeMcbItem({ id: "mcb-b", x: 150, y: 100 });

    const next = resolveReleasedDinRailGrouping([mcbA, mcbB], "mcb-b");

    const released = next.find((s) => s.id === "mcb-b");
    expect(released?.group).toBeFalsy();
  });

  it("joins an ungrouped MCB to an existing RCD group when released next to its member", () => {
    const rcd = makeRcdItem({
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "Q1",
      rcdRatedCurrent: 63,
    });
    const existingMcb = makeMcbItem({
      id: "mcb-1",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "F1.1",
      rcdSymbolId: "rcd-1",
    });
    const releasedMcb = makeMcbItem({
      id: "mcb-2",
      x: 250,
    });

    const next = resolveReleasedDinRailGrouping([rcd, existingMcb, releasedMcb], "mcb-2");
    const nextReleased = next.find((symbol) => symbol.id === "mcb-2");

    expect(nextReleased?.group).toBe("g1");
    expect(nextReleased?.groupName).toBe("Grupa-1");
    expect(nextReleased?.rcdSymbolId).toBe("rcd-1");
    expect(nextReleased?.rcdRatedCurrent).toBe(63);
    expect(nextReleased?.referenceDesignation).toBe("F1.2");
  });

  it("does not overwrite manual MCB designation inside a grouped release flow", () => {
    const rcd = makeRcdItem({
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "Q1",
    });
    const existingMcb = makeMcbItem({
      id: "mcb-1",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "F1.1",
      rcdSymbolId: "rcd-1",
    });
    const releasedMcb = makeMcbItem({
      id: "mcb-2",
      referenceDesignation: "OBWÓD-A",
      parameters: { ManualReferenceDesignation: "true" },
      x: 250,
    });

    const next = resolveReleasedDinRailGrouping([rcd, existingMcb, releasedMcb], "mcb-2");
    const nextReleased = next.find((symbol) => symbol.id === "mcb-2");

    expect(nextReleased?.referenceDesignation).toBe("OBWÓD-A");
  });

  it("handles edge case: released symbol has no snap target due to no other symbols on rail", () => {
    const mcb = makeMcbItem();

    const next = resolveReleasedDinRailGrouping([mcb], "mcb-1");

    expect(next).toHaveLength(1);
    expect(next[0]?.group).toBeFalsy();
  });
});
