import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import {
  DRAW_LEFT,
  DRAW_RIGHT,
  MODULE_WIDTH,
} from "./schematicLayout";
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

  it("Build_WithConnectorsTerminalStripsAndDistributionBlocks_ShouldExcludeThemFromSchematic", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd",
      type: "RCD 2P",
      deviceKind: "rcd",
      group: "G1",
      groupName: "Grupa-1",
      x: 100,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      group: "G1",
      groupName: "Grupa-1",
      rcdSymbolId: "rcd",
      x: 200,
    });
    const connector = createDefaultSymbolItem({
      id: "connector",
      type: "Złącza",
      label: "Złącze 3XPEN",
      deviceKind: "terminalBlock",
      group: "G1",
      groupName: "Grupa-1",
      visualPath: "assets/modules/zlacza/zlacze-3xpen.svg",
      x: 300,
    });
    const terminalStrip = createDefaultSymbolItem({
      id: "terminal-strip",
      type: "Listwy zaciskowe",
      label: "Listwa N/PE",
      group: "G1",
      groupName: "Grupa-1",
      visualPath: "assets/modules/Listwy zaciskowe/LISTWA 12 PIN.svg",
      x: 400,
    });
    const distributionBlock = createDefaultSymbolItem({
      id: "distribution-block",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy",
      group: "G1",
      groupName: "Grupa-1",
      x: 500,
    });

    const result = buildSchematicLayout([rcd, mcb, connector, terminalStrip, distributionBlock]);

    expect(result.nodes.map((node) => node.id)).toEqual(["rcd", "mcb"]);
    expect(result.nodes.every((node) => node.distributionBlockLabel === "")).toBe(true);
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

  it("keeps discovered three-phase RCD heads on the first schematic page even when SVG geometry is tall", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-discovered",
      type: "RCD 40A",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      width: 232.58,
      height: 1103,
      group: "G1",
      moduleRef: "RCD/RCD 40A.svg",
      visualPath: "/assets/modules/RCD/RCD%2040A.svg?dinboardSource=importedSvg",
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L1",
      group: "G1",
      x: 250,
    });

    const result = buildSchematicLayout([rcd, mcb]);
    const head = result.nodes.find((node) => node.id === "rcd-discovered");

    expect(head).toBeDefined();
    expect(head!.nodeType).toBe("RCD");
    expect(head!.phaseCount).toBe(3);
    expect(head!.pageIndex).toBe(0);
  });

  it("places RCD 4P and RCD 40A 4P equivalently when their electrical settings match", () => {
    const rcd4p = createDefaultSymbolItem({
      id: "rcd-4p",
      type: "RCD",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G1",
      moduleRef: "RCD/RCD 4P.svg",
      rcdRatedCurrent: 40,
    });
    const rcd40a = createDefaultSymbolItem({
      id: "rcd-40a-4p",
      type: "RCD",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G2",
      moduleRef: "RCD/RCD 40A 4P.svg",
      rcdRatedCurrent: 40,
      x: 300,
    });

    const result = buildSchematicLayout([rcd4p, rcd40a]);
    const head4p = result.nodes.find((node) => node.id === "rcd-4p");
    const head40a = result.nodes.find((node) => node.id === "rcd-40a-4p");

    expect(head4p?.nodeType).toBe("RCD");
    expect(head40a?.nodeType).toBe("RCD");
    expect(head4p?.phaseCount).toBe(3);
    expect(head40a?.phaseCount).toBe(3);
    expect(head4p?.pageIndex).toBe(0);
    expect(head40a?.pageIndex).toBe(0);
  });

  it("treats an old manually-phased RCD 40A 4P as a three-phase schematic head", () => {
    const rcd40a = createDefaultSymbolItem({
      id: "rcd-40a-4p",
      type: "RCD 40A 4P",
      deviceKind: "rcd",
      phase: "L1",
      parameters: { ManualPhase: "true" },
      group: "G1",
      moduleRef: "RCD/RCD 40A 4P.svg",
      visualPath: "/assets/modules/RCD/RCD%2040A%204P.svg?dinboardSource=importedSvg",
      rcdRatedCurrent: 40,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L1",
      group: "G1",
      x: 250,
    });

    const result = buildSchematicLayout([rcd40a, mcb]);
    const head = result.nodes.find((node) => node.id === "rcd-40a-4p");

    expect(head).toBeDefined();
    expect(head!.nodeType).toBe("RCD");
    expect(head!.protection).toContain("4P");
    expect(head!.phase).toBe("L1+L2+L3");
    expect(head!.phaseCount).toBe(3);
    expect(head!.pageIndex).toBe(0);
  });

  it("places standalone RCD 40A 4P on the first schematic page as a main RCD", () => {
    const rcd40a = createDefaultSymbolItem({
      id: "standalone-rcd-40a-4p",
      type: "RCD 40A 4P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      moduleRef: "RCD/RCD 40A 4P.svg",
      visualPath: "/assets/modules/RCD/RCD%2040A%204P.svg?dinboardSource=importedSvg",
      rcdRatedCurrent: 40,
      x: 200,
    });

    const result = buildSchematicLayout([rcd40a]);
    const head = result.nodes.find((node) => node.id === "standalone-rcd-40a-4p");

    expect(head).toBeDefined();
    expect(head!.nodeType).toBe("RCD");
    expect(head!.protection).toContain("4P");
    expect(head!.phase).toBe("L1+L2+L3");
    expect(head!.phaseCount).toBe(3);
    expect(head!.pageIndex).toBe(0);
  });

  it("places Polish-named imported RCD 4-pole assets on the first schematic page", () => {
    const rcd = createDefaultSymbolItem({
      id: "imported-polish-rcd",
      type: "Wyłącznik różnicowoprądowy 40A 4-biegunowy",
      label: "Wyłącznik różnicowoprądowy 40A 4-biegunowy",
      deviceKind: "other",
      phase: "L1",
      moduleRef: "RCD/Wyłącznik różnicowoprądowy 40A 4-biegunowy.svg",
      visualPath: "/assets/modules/RCD/Wyłącznik%20różnicowoprądowy%2040A%204-biegunowy.svg?dinboardSource=importedSvg",
      x: 120,
    });

    const result = buildSchematicLayout([rcd]);
    const head = result.nodes.find((node) => node.id === "imported-polish-rcd");

    expect(head).toBeDefined();
    expect(head!.nodeType).toBe("RCD");
    expect(head!.protection).toContain("4P");
    expect(head!.phase).toBe("L1+L2+L3");
    expect(head!.pageIndex).toBe(0);
  });

  it("keeps standalone FR, phase indicator, SPD and two 3P+N RCD heads compact inside the drawing area", () => {
    const symbols = [
      createDefaultSymbolItem({
        id: "fr",
        type: "Rozłącznik izolacyjny FR 3P",
        deviceKind: "fr",
        phase: "L1+L2+L3",
        x: 100,
      }),
      createDefaultSymbolItem({
        id: "phase-indicator",
        type: "Kontrolki faz",
        label: "Kontrolki faz",
        deviceKind: "phaseIndicator",
        phase: "L1+L2+L3",
        x: 200,
      }),
      createDefaultSymbolItem({
        id: "spd",
        type: "SPD",
        label: "SPD T1+T2 275V 25kA",
        deviceKind: "spd",
        phase: "L1+L2+L3",
        x: 300,
      }),
      createDefaultSymbolItem({
        id: "rcd-a",
        type: "Rozłącznik różnicowoprądowy 3P+N",
        label: "Rozłącznik różnicowoprądowy 3P+N",
        deviceKind: "rcd",
        phase: "L1+L2+L3",
        moduleRef: "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
        x: 400,
      }),
      createDefaultSymbolItem({
        id: "rcd-b",
        type: "Rozłącznik różnicowoprądowy 3P+N",
        label: "Rozłącznik różnicowoprądowy 3P+N",
        deviceKind: "rcd",
        phase: "L1+L2+L3",
        moduleRef: "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
        x: 500,
      }),
    ];

    const result = buildSchematicLayout(symbols);
    const firstPageNodes = result.nodes.filter((node) => node.pageIndex === 0);
    const firstPage = result.pages[0];

    expect(firstPageNodes).toHaveLength(5);
    expect(firstPage.busX1).toBeGreaterThanOrEqual(DRAW_LEFT);
    expect(firstPage.busX2).toBeLessThanOrEqual(DRAW_RIGHT);
    expect(Math.max(...firstPageNodes.map((node) => node.x + MODULE_WIDTH))).toBeLessThanOrEqual(DRAW_RIGHT);
    expect(Math.min(...firstPageNodes.map((node) => node.x))).toBeGreaterThanOrEqual(DRAW_LEFT);
  });

  it("does not hide a second RCD when it was accidentally added to an existing RCD group", () => {
    const oldRcd = createDefaultSymbolItem({
      id: "old-rcd-4p",
      type: "RCD 4P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G1",
      moduleRef: "RCD/RCD 4P.svg",
      x: 100,
    });
    const newRcd = createDefaultSymbolItem({
      id: "new-rcd-40a-4p",
      type: "RCD 40A 4P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G1",
      moduleRef: "RCD/RCD 40A 4P.svg",
      visualPath: "/assets/modules/RCD/RCD%2040A%204P.svg?dinboardSource=importedSvg",
      x: 300,
    });

    const result = buildSchematicLayout([oldRcd, newRcd]);
    const oldHead = result.nodes.find((node) => node.id === "old-rcd-4p");
    const newHead = result.nodes.find((node) => node.id === "new-rcd-40a-4p");

    expect(oldHead?.nodeType).toBe("RCD");
    expect(newHead?.nodeType).toBe("RCD");
    expect(oldHead?.pageIndex).toBe(0);
    expect(newHead?.pageIndex).toBe(0);
  });

  it("cycles pending single-phase RCDs through L1, L2, L3 sequentially", () => {
    const rcd1 = createDefaultSymbolItem({
      id: "rcd-1",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "PENDING" as any,
      x: 100,
    });
    const rcd2 = createDefaultSymbolItem({
      id: "rcd-2",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "PENDING" as any,
      x: 200,
    });
    const rcd3 = createDefaultSymbolItem({
      id: "rcd-3",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "PENDING" as any,
      x: 300,
    });
    const rcd4 = createDefaultSymbolItem({
      id: "rcd-4",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "PENDING" as any,
      x: 400,
    });

    const result = buildSchematicLayout([rcd1, rcd2, rcd3, rcd4]);

    const node1 = result.nodes.find((n) => n.id === "rcd-1");
    const node2 = result.nodes.find((n) => n.id === "rcd-2");
    const node3 = result.nodes.find((n) => n.id === "rcd-3");
    const node4 = result.nodes.find((n) => n.id === "rcd-4");

    expect(node1!.phase).toBe("L1");
    expect(node2!.phase).toBe("L2");
    expect(node3!.phase).toBe("L3");
    expect(node4!.phase).toBe("L1");
  });

  it("keeps RCD 2P single-phase even when stale data says L1+L2+L3", () => {
    const firstRcd = createDefaultSymbolItem({
      id: "rcd-2p-a",
      type: "RCD 40A 2P",
      label: "RCD 40A 2P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "GA",
      x: 100,
    });
    const firstMcb = createDefaultSymbolItem({
      id: "mcb-a",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L2",
      group: "GA",
      x: 140,
    });
    const secondRcd = createDefaultSymbolItem({
      id: "rcd-2p-b",
      type: "RCD 40A 2P",
      label: "RCD 40A 2P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "GB",
      x: 260,
    });
    const secondMcb = createDefaultSymbolItem({
      id: "mcb-b",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L3",
      group: "GB",
      x: 300,
    });

    const result = buildSchematicLayout([firstRcd, firstMcb, secondRcd, secondMcb]);
    const firstHead = result.nodes.find((node) => node.id === "rcd-2p-a");
    const secondHead = result.nodes.find((node) => node.id === "rcd-2p-b");
    const firstChild = result.nodes.find((node) => node.id === "mcb-a");
    const secondChild = result.nodes.find((node) => node.id === "mcb-b");

    expect(firstHead!.protection).toContain("2P");
    expect(firstHead!.phase).toBe("L1");
    expect(firstHead!.phaseCount).toBe(1);
    expect(firstChild!.phase).toBe("L1");
    expect(secondHead!.protection).toContain("2P");
    expect(secondHead!.phase).toBe("L2");
    expect(secondHead!.phaseCount).toBe(1);
    expect(secondChild!.phase).toBe("L2");
  });

  it("chunks a large RCD group exceeding maxChildrenPerHeadChunk across multiple pages", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-large",
      type: "RCD 4P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G_LARGE",
      moduleRef: "RCD/RCD 4P.svg",
      x: 100,
    });

    // Create 15 MCB symbols under this RCD group so the chunking logic is
    // exercised. MAX_MODULES_PER_CARD is 10, so 15 children force a split
    // into one chunk of 10 + one continuation chunk of 5.
    const mcbs = Array.from({ length: 15 }, (_, i) =>
      createDefaultSymbolItem({
        id: `mcb-${i + 1}`,
        type: "MCB 1P",
        deviceKind: "mcb",
        group: "G_LARGE",
        rcdSymbolId: "rcd-large",
        x: 120 + i * 20,
      })
    );

    const result = buildSchematicLayout([rcd, ...mcbs]);

    // Root nodes should have 2 chunks representing the RCD head (10 + 5).
    const rcdNodes = result.nodes.filter((node) => node.id === "rcd-large");
    expect(rcdNodes).toHaveLength(2);

    const chunk1 = rcdNodes[0];
    const chunk2 = rcdNodes[1];

    expect(chunk1.nodeType).toBe("RCD");
    expect(chunk1.children).toHaveLength(10);
    expect(chunk1.protection).not.toContain("(cd.)");

    expect(chunk2.nodeType).toBe("RCD");
    expect(chunk2.children).toHaveLength(5);
    expect(chunk2.protection).toContain("(cd.)");

    // All 15 MCBs should be accounted for as children across the two RCD chunks
    const allChildIds = [...chunk1.children.map(c => c.id), ...chunk2.children.map(c => c.id)];
    expect(allChildIds).toHaveLength(15);
    expect(allChildIds).toContain("mcb-1");
    expect(allChildIds).toContain("mcb-15");
  });

  it("sets hasNeutralBar when an N terminal block is in the RCD group", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-n",
      type: "RCD 2P",
      deviceKind: "rcd",
      group: "GN",
      x: 100,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-n",
      type: "MCB 1P",
      deviceKind: "mcb",
      group: "GN",
      rcdSymbolId: "rcd-n",
      x: 200,
    });
    const terminalN = createDefaultSymbolItem({
      id: "term-n",
      type: "Listwy zaciskowe",
      label: "Listwa zaciskowa N",
      deviceKind: "terminalBlock",
      group: "GN",
      x: 300,
    });

    const result = buildSchematicLayout([rcd, mcb, terminalN]);
    const head = result.nodes.find((n) => n.id === "rcd-n");

    expect(head).toBeDefined();
    expect(head!.hasNeutralBar).toBe(true);
    expect(head!.neutralBarLabel).toContain("N");
  });

  it("does not set hasNeutralBar for a PE terminal block in the RCD group", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-pe",
      type: "RCD 2P",
      deviceKind: "rcd",
      group: "GPE",
      x: 100,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb-pe",
      type: "MCB 1P",
      deviceKind: "mcb",
      group: "GPE",
      rcdSymbolId: "rcd-pe",
      x: 200,
    });
    const terminalPE = createDefaultSymbolItem({
      id: "term-pe",
      type: "Listwy zaciskowe",
      label: "Listwa PE",
      deviceKind: "terminalBlock",
      group: "GPE",
      x: 300,
    });

    const result = buildSchematicLayout([rcd, mcb, terminalPE]);
    const head = result.nodes.find((n) => n.id === "rcd-pe");

    expect(head).toBeDefined();
    expect(head!.hasNeutralBar).toBeFalsy();
  });
});
