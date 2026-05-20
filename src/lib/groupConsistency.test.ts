import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import { normalizeGroupConsistency } from "./appHelpers";

describe("normalizeGroupConsistency", () => {
  it("clears dangling rcdSymbolId references", () => {
    const member = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "g1",
      groupName: "Grupa-1",
      rcdSymbolId: "missing-rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });

    const normalized = normalizeGroupConsistency([member]);
    expect(normalized[0].rcdSymbolId).toBe("");
    expect(normalized[0].rcdRatedCurrent).toBe(0);
    expect(normalized[0].rcdResidualCurrent).toBe(0);
    expect(normalized[0].rcdType).toBe("");
  });

  it("dissolves a group without any RCD head", () => {
    const a = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "g1",
      groupName: "Grupa-1",
    });
    const b = createDefaultSymbolItem({
      id: "m2",
      deviceKind: "rcbo",
      group: "g1",
      groupName: "Grupa-1",
    });

    const normalized = normalizeGroupConsistency([a, b]);
    expect(normalized.every((symbol) => symbol.group === "")).toBe(true);
    expect(normalized.every((symbol) => symbol.groupName === "")).toBe(true);
  });

  it("propagates head RCD params to grouped non-RCD symbols", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-head",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      rcdRatedCurrent: 63,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const member = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      group: "g1",
      groupName: "",
      rcdSymbolId: "",
    });

    const normalized = normalizeGroupConsistency([head, member]);
    const nextMember = normalized.find((symbol) => symbol.id === "m1");
    expect(nextMember).toBeDefined();
    expect(nextMember?.rcdSymbolId).toBe("rcd-head");
    expect(nextMember?.rcdRatedCurrent).toBe(63);
    expect(nextMember?.rcdResidualCurrent).toBe(30);
    expect(nextMember?.rcdType).toBe("A");
    expect(nextMember?.groupName).toBe("Grupa-1");
  });

  it("attaches child RCD without parent to group head RCD", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-head",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const child = createDefaultSymbolItem({
      id: "rcd-child",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      rcdSymbolId: "",
    });

    const normalized = normalizeGroupConsistency([head, child]);
    const nextChild = normalized.find((symbol) => symbol.id === "rcd-child");
    expect(nextChild?.rcdSymbolId).toBe("rcd-head");
  });
});

