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

  it("retains group for N terminal blocks if there is an RCD head", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-head",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
      rcdRatedCurrent: 40,
    });
    const terminalN = createDefaultSymbolItem({
      id: "term-n",
      deviceKind: "terminalBlock",
      type: "terminal",
      label: "N1",
      visualPath: "assets/modules/terminal-n.svg",
      group: "g1",
      groupName: "Grupa-1",
    });

    const normalized = normalizeGroupConsistency([head, terminalN]);
    const nextTerminal = normalized.find((symbol) => symbol.id === "term-n");
    expect(nextTerminal?.group).toBe("g1");
    expect(nextTerminal?.groupName).toBe("Grupa-1");
  });

  it("clears group for non-N terminal auxiliary blocks", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-head",
      deviceKind: "rcd",
      group: "g1",
      groupName: "Grupa-1",
    });
    const auxiliaryPE = createDefaultSymbolItem({
      id: "aux-pe",
      deviceKind: "terminalBlock",
      type: "terminal",
      label: "PE",
      group: "g1",
      groupName: "Grupa-1",
    });

    const normalized = normalizeGroupConsistency([head, auxiliaryPE]);
    const nextAux = normalized.find((symbol) => symbol.id === "aux-pe");
    expect(nextAux?.group).toBe("");
    expect(nextAux?.groupName).toBe("");
  });

  it("assigns L1+L2+L3 phase to children under a 3-phase RCD head and cycles single-phase children", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-3p",
      deviceKind: "rcd",
      type: "RCD 4P",
      label: "RCD 40A 4P",
      visualPath: "RCD/RCD 4P.svg",
      moduleRef: "RCD/RCD 4P.svg",
      phase: "L1+L2+L3",
      group: "g1",
      groupName: "Grupa-1",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const child1 = createDefaultSymbolItem({
      id: "mcb-1",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB B16",
      visualPath: "MCB/MCB 1P.svg",
      moduleRef: "MCB/MCB 1P.svg",
      group: "g1",
      groupName: "",
      rcdSymbolId: "",
      x: 100,
      y: 0,
    });
    const child2 = createDefaultSymbolItem({
      id: "mcb-2",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB B16",
      visualPath: "MCB/MCB 1P.svg",
      moduleRef: "MCB/MCB 1P.svg",
      group: "g1",
      groupName: "",
      rcdSymbolId: "",
      x: 200,
      y: 0,
    });
    const child3 = createDefaultSymbolItem({
      id: "mcb-3",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB B16",
      visualPath: "MCB/MCB 1P.svg",
      moduleRef: "MCB/MCB 1P.svg",
      group: "g1",
      groupName: "",
      rcdSymbolId: "",
      x: 300,
      y: 0,
    });

    const normalized = normalizeGroupConsistency([head, child1, child2, child3]);

    expect(normalized.find((s) => s.id === "rcd-3p")?.phase).toBe("L1+L2+L3");
    // Children inherit RCD params
    expect(normalized.find((s) => s.id === "mcb-1")?.rcdSymbolId).toBe("rcd-3p");
    expect(normalized.find((s) => s.id === "mcb-1")?.rcdRatedCurrent).toBe(40);
    expect(normalized.find((s) => s.id === "mcb-1")?.rcdResidualCurrent).toBe(30);
    // First child keeps its default phase (L1), subsequent children cycle L2, L3
    expect(normalized.find((s) => s.id === "mcb-1")?.phase).toBe("L1");
    expect(normalized.find((s) => s.id === "mcb-2")?.phase).toBe("L2");
    expect(normalized.find((s) => s.id === "mcb-3")?.phase).toBe("L3");
  });

  it("preserves ManualPhase on RCD head and does not auto-assign a new phase", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-manual",
      deviceKind: "rcd",
      type: "RCD 2P",
      label: "RCD 40A 2P",
      visualPath: "RCD/RCD 2P.svg",
      moduleRef: "RCD/RCD 2P.svg",
      phase: "L3",
      isPhaseLocked: true,
      parameters: { ManualPhase: "true" },
      group: "g2",
      groupName: "Grupa-2",
    });
    const child = createDefaultSymbolItem({
      id: "mcb-manual-child",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB B16",
      visualPath: "MCB/MCB 1P.svg",
      moduleRef: "MCB/MCB 1P.svg",
      group: "g2",
      groupName: "",
      rcdSymbolId: "",
      x: 100,
      y: 0,
    });

    const normalized = normalizeGroupConsistency([head, child]);

    // ManualPhase RCD keeps its phase
    expect(normalized.find((s) => s.id === "rcd-manual")?.phase).toBe("L3");
    // Child gets the same phase as its single-phase RCD head
    expect(normalized.find((s) => s.id === "mcb-manual-child")?.phase).toBe("L3");
  });

  it("handles empty symbols array gracefully", () => {
    const normalized = normalizeGroupConsistency([]);
    expect(normalized).toEqual([]);
  });

  it("handles single standalone symbol without group", () => {
    const standalone = createDefaultSymbolItem({
      id: "standalone",
      deviceKind: "mcb",
      group: "",
      groupName: "",
    });

    const normalized = normalizeGroupConsistency([standalone]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe("standalone");
    expect(normalized[0].group).toBe("");
  });

  it("does not modify symbols that are already consistent", () => {
    const head = createDefaultSymbolItem({
      id: "rcd-ok",
      deviceKind: "rcd",
      type: "RCD 2P",
      label: "RCD 40A",
      phase: "L1",
      group: "g3",
      groupName: "Grupa-3",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const child = createDefaultSymbolItem({
      id: "mcb-ok",
      deviceKind: "mcb",
      type: "MCB 1P",
      label: "MCB B16",
      phase: "L1",
      group: "g3",
      groupName: "Grupa-3",
      rcdSymbolId: "rcd-ok",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
      x: 100,
      y: 0,
    });

    const normalized = normalizeGroupConsistency([head, child]);
    // Should remain unchanged
    expect(normalized.find((s) => s.id === "mcb-ok")?.rcdSymbolId).toBe("rcd-ok");
    expect(normalized.find((s) => s.id === "mcb-ok")?.phase).toBe("L1");
  });
});


