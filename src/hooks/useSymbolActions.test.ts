import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import {
  resolveReleasedDinRailGrouping,
  resolveSelectionChange,
} from "./useSymbolActions";

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
  it("creates a new RCD group when an ungrouped MCB is released next to an ungrouped RCD", () => {
    const rcd = createDefaultSymbolItem({
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
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB",
      x: 200,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
    });

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

  it("joins an ungrouped MCB to an existing RCD group when released next to its member", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "Q1",
      x: 100,
      y: 100,
      width: 100,
      height: 200,
      isSnappedToRail: true,
      rcdRatedCurrent: 63,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const existingMcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "F1.1",
      rcdSymbolId: "rcd-1",
      x: 200,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
    });
    const releasedMcb = createDefaultSymbolItem({
      id: "mcb-2",
      deviceKind: "mcb",
      x: 250,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
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
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "Q1",
      x: 100,
      y: 100,
      width: 100,
      height: 200,
      isSnappedToRail: true,
    });
    const existingMcb = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      group: "g1",
      groupName: "Grupa-1",
      referenceDesignation: "F1.1",
      rcdSymbolId: "rcd-1",
      x: 200,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
    });
    const releasedMcb = createDefaultSymbolItem({
      id: "mcb-2",
      deviceKind: "mcb",
      referenceDesignation: "OBWÓD-A",
      parameters: { ManualReferenceDesignation: "true" },
      x: 250,
      y: 100,
      width: 50,
      height: 200,
      isSnappedToRail: true,
    });

    const next = resolveReleasedDinRailGrouping([rcd, existingMcb, releasedMcb], "mcb-2");
    const nextReleased = next.find((symbol) => symbol.id === "mcb-2");

    expect(nextReleased?.referenceDesignation).toBe("OBWÓD-A");
  });
});
