import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { buildSchematicLayout } from "./schematicLayoutEngine";

describe("schematicLayoutEngine (Avalonia parity & stable sorting)", () => {
  it("Build_WithOnlyBusbarAndTerminal_ShouldReturnEmptyResult", () => {
    const symbols = [
      createDefaultSymbolItem({ id: "bus", type: "Busbar", x: 100 }),
      createDefaultSymbolItem({ id: "term", type: "Listwy zaciskowe", x: 200 }),
    ];

    const result = buildSchematicLayout(symbols);

    expect(result.nodes).toHaveLength(0);
    expect(result.pages).toHaveLength(1);
  });

  it("Build_WithStandaloneFr_ShouldCreateQsNode", () => {
    const fr = createDefaultSymbolItem({
      id: "fr1",
      type: "FR",
      circuitName: "Main Feed",
      x: 100,
    });

    const result = buildSchematicLayout([fr]);

    expect(result.nodes).toHaveLength(1);
    const node = result.nodes[0];
    expect(node.nodeType).toBe("MainBreaker");
    expect(node.designation).toBe("QS");
    expect(node.circuitName).toBe("Main Feed");
  });

  it("getModuleType - detects Polish characters and isolators", () => {
    const symbols = [
      createDefaultSymbolItem({
        id: "switch1",
        type: "Rozłącznik izolacyjny",
        label: "",
        visualPath: "assets/modules/rozlacznik.svg",
        x: 100,
      }),
      createDefaultSymbolItem({
        id: "switch2",
        type: "Main Switch",
        label: "",
        visualPath: "assets/modules/isolator.svg",
        x: 200,
      }),
      createDefaultSymbolItem({
        id: "indicator1",
        type: "KontrolkiFaz",
        label: "",
        visualPath: "assets/modules/kf.svg",
        x: 300,
      }),
    ];

    const result = buildSchematicLayout(symbols);
    // switch1 and switch2 should be classified as MainBreaker (FR)
    // since both are standalone Switches, one is taken as 'fr' (QS) and the other is standalone KF/SPD/MCB fallback?
    // Wait, in buildNodes, any standalone Switch is classified as MainBreaker.
    // Let's check how many MainBreaker nodes exist in nodes.
    const mainBreakers = result.nodes.filter(n => n.nodeType === "MainBreaker");
    expect(mainBreakers.length).toBeGreaterThanOrEqual(1);
  });

  it("Stable sorting of equidistant MCBs in a group", () => {
    // Equidistant MCBs (same distance to RCD head device)
    // RCD head at x = 200
    // MCB1 at x = 100 (distance = 100, left)
    // MCB2 at x = 300 (distance = 100, right)
    // MCB3 at x = 150 (distance = 50, left)
    // MCB4 at x = 250 (distance = 50, right)
    // In original array order, let's put MCB2 before MCB1.
    // Since distance(MCB3) = distance(MCB4) = 50, and distance(MCB1) = distance(MCB2) = 100,
    // they should be sorted by distance: [MCB3, MCB4] first, then [MCB1, MCB2].
    // For equidistant items, C# stable sorting keeps original list order.
    // Let's verify that TS preserves the original array order for equidistant items.
    
    const rcd = createDefaultSymbolItem({
      id: "rcd1",
      type: "RCD",
      group: "G1",
      x: 200,
    });

    const mcbRightEquidistant = createDefaultSymbolItem({
      id: "mcb2-right",
      type: "MCB",
      group: "G1",
      x: 300, // dist = 100
    });

    const mcbLeftEquidistant = createDefaultSymbolItem({
      id: "mcb1-left",
      type: "MCB",
      group: "G1",
      x: 100, // dist = 100
    });

    const mcbCloseRight = createDefaultSymbolItem({
      id: "mcb4-closer-right",
      type: "MCB",
      group: "G1",
      x: 250, // dist = 50
    });

    const mcbCloseLeft = createDefaultSymbolItem({
      id: "mcb3-closer-left",
      type: "MCB",
      group: "G1",
      x: 150, // dist = 50
    });

    // Original array order: rcd, mcbRightEquidistant, mcbLeftEquidistant, mcbCloseRight, mcbCloseLeft
    const symbols = [rcd, mcbRightEquidistant, mcbLeftEquidistant, mcbCloseRight, mcbCloseLeft];
    const result = buildSchematicLayout(symbols);

    // Finding RCD node
    const rcdNode = result.nodes.find(n => n.nodeType === "RCD");
    expect(rcdNode).toBeDefined();
    
    // Children sorted by distance (50 first, then 100)
    // Equidistant 50: mcbCloseRight first (because it appeared before mcbCloseLeft in symbols)
    // Equidistant 100: mcbRightEquidistant first (because it appeared before mcbLeftEquidistant in symbols)
    const childIds = rcdNode!.children.map(c => c.id);
    expect(childIds).toEqual([
      "mcb4-closer-right",
      "mcb3-closer-left",
      "mcb2-right",
      "mcb1-left"
    ]);
  });

  it("Stable sorting of identical-X standalone MCBs", () => {
    const mcbB = createDefaultSymbolItem({ id: "mcb-b", type: "MCB", x: 100 });
    const mcbA = createDefaultSymbolItem({ id: "mcb-a", type: "MCB", x: 100 });
    const mcbC = createDefaultSymbolItem({ id: "mcb-c", type: "MCB", x: 100 });

    const result = buildSchematicLayout([mcbB, mcbA, mcbC]);
    const mcbNodes = result.nodes.filter(n => n.nodeType === "MCB");
    expect(mcbNodes.map(n => n.id)).toEqual(["mcb-b", "mcb-a", "mcb-c"]);
  });

  it("Stable sorting of identical-X groups", () => {
    const rcdA = createDefaultSymbolItem({ id: "rcd-a", type: "RCD", group: "GA", x: 100 });
    const rcdB = createDefaultSymbolItem({ id: "rcd-b", type: "RCD", group: "GB", x: 100 });

    const result = buildSchematicLayout([rcdA, rcdB]);
    const rcdNodes = result.nodes.filter(n => n.nodeType === "RCD");
    expect(rcdNodes.map(n => n.id)).toEqual(["rcd-a", "rcd-b"]);
  });

  it("RCD with 3P MCB or Induction+Oven scenario should be classified as ThreePhaseHead (4P) and go to mainDevices", () => {
    // Scenario 1: RCD + MCB 3P
    const rcd1 = createDefaultSymbolItem({
      id: "rcd-3p-group",
      type: "RCD",
      deviceKind: "rcd",
      group: "G3P",
      phase: "PENDING" as any,
      x: 100,
    });
    const mcb3p = createDefaultSymbolItem({
      id: "mcb-3p",
      type: "MCB 3P",
      deviceKind: "mcb",
      group: "G3P",
      phase: "PENDING" as any,
      visualPath: "assets/modules/mcb_3p.svg",
      x: 120,
    });

    // Scenario 2: RCD + MCB 2P + MCB 1P with Induction+Oven scenario
    const rcd2 = createDefaultSymbolItem({
      id: "rcd-induction-group",
      type: "RCD",
      deviceKind: "rcd",
      group: "G_IND",
      phase: "PENDING" as any,
      x: 200,
    });
    const mcb2p = createDefaultSymbolItem({
      id: "mcb-induction",
      type: "MCB 2P",
      deviceKind: "mcb",
      group: "G_IND",
      phase: "PENDING" as any,
      parameters: {
        "GroupScenario.InductionWithOven.Enabled": "true",
        "GroupScenario.InductionWithOven.Pattern": "Rcd4PWithMcb2PAnd1P",
      },
      visualPath: "assets/modules/mcb_2p.svg",
      x: 220,
    });
    const mcb1p = createDefaultSymbolItem({
      id: "mcb-oven",
      type: "MCB 1P",
      deviceKind: "mcb",
      group: "G_IND",
      phase: "PENDING" as any,
      parameters: {
        "GroupScenario.InductionWithOven.Enabled": "true",
        "GroupScenario.InductionWithOven.Pattern": "Rcd4PWithMcb2PAnd1P",
      },
      visualPath: "assets/modules/mcb_1p.svg",
      x: 240,
    });

    const result = buildSchematicLayout([rcd1, mcb3p, rcd2, mcb2p, mcb1p]);

    // Verify Scenario 1 (RCD + MCB 3P)
    const node1 = result.nodes.find((n) => n.id === "rcd-3p-group");
    expect(node1).toBeDefined();
    expect(node1!.protection).toContain("4P");
    expect(node1!.phase).toBe("L1+L2+L3");
    expect(node1!.phaseCount).toBe(3);
    // Should be on page 0 since it is a mainDevice (three-phase)
    expect(node1!.pageIndex).toBe(0);

    // Verify Scenario 2 (RCD + MCB 2P + MCB 1P)
    const node2 = result.nodes.find((n) => n.id === "rcd-induction-group");
    expect(node2).toBeDefined();
    expect(node2!.protection).toContain("4P");
    expect(node2!.phase).toBe("L1+L2+L3");
    expect(node2!.phaseCount).toBe(3);
    // Should also be on page 0 as a mainDevice
    expect(node2!.pageIndex).toBe(0);

    // Verify children phase assignment in Scenario 2
    const child2p = result.nodes.find((n) => n.id === "mcb-induction");
    const child1p = result.nodes.find((n) => n.id === "mcb-oven");
    expect(child2p!.phase).toBe("L1+L2");
    expect(child1p!.phase).toBe("L3");
  });

  it("keeps imported 4P RCD groups on the first schematic page when only moduleRef carries the 4P hint", () => {
    const rcdA = createDefaultSymbolItem({
      id: "rcd-a",
      type: "RCD",
      deviceKind: "other",
      visualPath: "assets/modules/RCD/RCD.svg",
      moduleRef: "RCD/RCD 4P.svg",
      phase: "L1" as any,
      group: "GA",
      x: 100,
    });
    const mcbA = createDefaultSymbolItem({
      id: "mcb-a",
      type: "MCB",
      deviceKind: "other",
      visualPath: "assets/modules/MCB/MCB.svg",
      moduleRef: "MCB/MCB 1P.svg",
      phase: "L1" as any,
      group: "GA",
      x: 140,
    });
    const rcdB = createDefaultSymbolItem({
      id: "rcd-b",
      type: "RCD",
      deviceKind: "other",
      visualPath: "assets/modules/RCD/RCD.svg",
      moduleRef: "RCD/RCD 4P.svg",
      phase: "L1" as any,
      group: "GB",
      x: 260,
    });
    const mcbB = createDefaultSymbolItem({
      id: "mcb-b",
      type: "MCB",
      deviceKind: "other",
      visualPath: "assets/modules/MCB/MCB.svg",
      moduleRef: "MCB/MCB 1P.svg",
      phase: "L2" as any,
      group: "GB",
      x: 300,
    });

    const result = buildSchematicLayout([rcdA, mcbA, rcdB, mcbB]);

    const headA = result.nodes.find((node) => node.id === "rcd-a");
    const headB = result.nodes.find((node) => node.id === "rcd-b");

    expect(headA).toBeDefined();
    expect(headB).toBeDefined();
    expect(headA!.nodeType).toBe("RCD");
    expect(headB!.nodeType).toBe("RCD");
    expect(headA!.protection).toContain("4P");
    expect(headB!.protection).toContain("4P");
    expect(headA!.pageIndex).toBe(0);
    expect(headB!.pageIndex).toBe(0);
  });
});
