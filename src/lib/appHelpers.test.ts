import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import {
  getReferencePrefix,
  normalizeDinRailModuleOrdering,
  normalizeGroupConsistency,
  normalizePaletteAssetDimensions,
  type PaletteTemplate,
} from "./appHelpers";

describe("normalizePaletteAssetDimensions", () => {
  it("restores fixed 4P RCD phase from the palette even when an old symbol has ManualPhase", () => {
    const template: PaletteTemplate = {
      templateId: "imported-catalog-rcd-40a-4p",
      code: "RCD 40A 4P",
      label: "RCD 40A 4P",
      type: "RCD",
      category: "RCD",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      modules: 4,
      moduleRef: "RCD/RCD 40A 4P.svg",
      assetPath: "/assets/modules/RCD/RCD%2040A%204P.svg?dinboardSource=importedSvg",
      customWidth: 930.32,
      customHeight: 1103,
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    };
    const symbol = createDefaultSymbolItem({
      id: "old-rcd-40a-4p",
      type: "RCD",
      deviceKind: "rcd",
      moduleRef: template.moduleRef,
      moduleSourceType: "ImportedSvg",
      phase: "L1",
      parameters: { ManualPhase: "true" },
      width: 120,
      height: 520,
    });

    const [normalized] = normalizePaletteAssetDimensions([symbol], new Map([[template.templateId, template]]));

    expect(normalized.phase).toBe("L1+L2+L3");
    expect(normalized.parameters.ManualPhase).toBe("false");
    expect(normalized.rcdRatedCurrent).toBe(40);
    expect(normalized.displayProtection).toContain("40A/30mA");
  });

  it("preserves a valid single-phase RCD phase from the symbol", () => {
    const template: PaletteTemplate = {
      templateId: "rcd-2p-svg",
      code: "RCD 2P",
      label: "RCD 2P",
      type: "RCD",
      category: "RCD",
      deviceKind: "rcd",
      phase: "L1",
      modules: 2,
      moduleRef: "RCD/RCD 2P.svg",
      assetPath: "/assets/modules/RCD/RCD%202P.svg",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    };
    const symbol = createDefaultSymbolItem({
      id: "rcd-2p-inst",
      type: "RCD",
      deviceKind: "rcd",
      moduleRef: template.moduleRef,
      moduleSourceType: "BuiltInAsset",
      phase: "L3",
      width: 60,
      height: 520,
    });

    const [normalized] = normalizePaletteAssetDimensions([symbol], new Map([[template.templateId, template]]));

    expect(normalized.phase).toBe("L3");
    expect(normalized.rcdRatedCurrent).toBe(40);
  });

  it("converts stale 2P RCD multiphase values to a single phase", () => {
    const template: PaletteTemplate = {
      templateId: "imported-catalog-rcd-40a-2p",
      code: "RCD 40A 2P",
      label: "RCD 40A 2P",
      type: "RCD",
      category: "RCD",
      deviceKind: "rcd",
      phase: "L1",
      modules: 2,
      moduleRef: "RCD/RCD 40A 2P.svg",
      assetPath: "/assets/modules/RCD/RCD%2040A%202P.svg?dinboardSource=importedSvg",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    };
    const symbol = createDefaultSymbolItem({
      id: "rcd-2p-old",
      type: "RCD",
      label: "RCD 40A 2P",
      deviceKind: "rcd",
      moduleRef: template.moduleRef,
      moduleSourceType: "ImportedSvg",
      phase: "L1+L2+L3",
      parameters: { ManualPhase: "true" },
    });

    const [normalized] = normalizePaletteAssetDimensions([symbol], new Map([[template.templateId, template]]));

    expect(normalized.phase).toBe("L1");
    expect(normalized.parameters.ManualPhase).toBe("false");
  });

  it("cycles grouped 2P RCD heads through single phases and applies them to child circuits", () => {
    const firstRcd = createDefaultSymbolItem({
      id: "rcd-1",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G1",
      groupName: "Grupa-1",
    });
    const firstMcb = createDefaultSymbolItem({
      id: "mcb-1",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L2",
      group: "G1",
      groupName: "Grupa-1",
    });
    const secondRcd = createDefaultSymbolItem({
      id: "rcd-2",
      type: "RCD 2P",
      deviceKind: "rcd",
      phase: "L1+L2+L3",
      group: "G2",
      groupName: "Grupa-2",
    });
    const secondMcb = createDefaultSymbolItem({
      id: "mcb-2",
      type: "MCB 1P",
      deviceKind: "mcb",
      phase: "L3",
      group: "G2",
      groupName: "Grupa-2",
    });

    const normalized = normalizeGroupConsistency([firstRcd, firstMcb, secondRcd, secondMcb]);

    expect(normalized.find((symbol) => symbol.id === "rcd-1")?.phase).toBe("L1");
    expect(normalized.find((symbol) => symbol.id === "mcb-1")?.phase).toBe("L1");
    expect(normalized.find((symbol) => symbol.id === "rcd-2")?.phase).toBe("L2");
    expect(normalized.find((symbol) => symbol.id === "mcb-2")?.phase).toBe("L2");
  });

  it("keeps terminal connectors outside RCD groups and assigns X references by rail order", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd",
      type: "RCD 2P",
      deviceKind: "rcd",
      group: "G1",
      groupName: "Grupa-1",
      isSnappedToRail: true,
      x: 0,
      y: 0,
    });
    const mcb = createDefaultSymbolItem({
      id: "mcb",
      type: "MCB 1P",
      deviceKind: "mcb",
      group: "G1",
      groupName: "Grupa-1",
      rcdSymbolId: "rcd",
      isSnappedToRail: true,
      x: 100,
      y: 0,
    });
    const connector = createDefaultSymbolItem({
      id: "connector",
      type: "Złącza",
      label: "Złącze 3XPEN",
      deviceKind: "terminalBlock",
      group: "G1",
      groupName: "Grupa-1",
      rcdSymbolId: "rcd",
      isSnappedToRail: true,
      x: 200,
      y: 0,
      referenceDesignation: "",
      visualPath: "assets/modules/zlacza/zlacze-3xpen.svg",
    });
    const distributionBlock = createDefaultSymbolItem({
      id: "block",
      group: "G1",
      type: "Blok rozdzielczy",
      deviceKind: "terminalBlock",
      groupName: "Grupa-1",
      rcdSymbolId: "rcd",
      isSnappedToRail: true,
      x: 300,
      y: 0,
      referenceDesignation: "",
    });

    const normalized = normalizeDinRailModuleOrdering(
      normalizeGroupConsistency([rcd, mcb, connector, distributionBlock]),
    );

    expect(normalized.find((symbol) => symbol.id === "connector")).toMatchObject({
      group: "",
      rcdSymbolId: "",
      referenceDesignation: "X1",
      displayModuleNumber: "X1",
    });
    expect(normalized.find((symbol) => symbol.id === "block")).toMatchObject({
      group: "",
      rcdSymbolId: "",
      referenceDesignation: "BL1",
    });
    expect(normalized.find((symbol) => symbol.id === "mcb")?.rcdSymbolId).toBe("rcd");
  });

  it("uses X as the palette reference prefix for terminal blocks", () => {
    const template: PaletteTemplate = {
      templateId: "terminal",
      code: "Złącze",
      label: "Złącze",
      type: "Złącza",
      category: "Złącza",
      deviceKind: "terminalBlock",
      phase: "L1+L2+L3",
      modules: 1,
      moduleRef: "zlacza/zlacze.svg",
      assetPath: "/assets/modules/zlacza/zlacze.svg",
    };

    expect(getReferencePrefix(template)).toBe("X");
  });

  describe("assignAuxiliaryReferenceDesignations", () => {
    it("assigns PE prefix to terminal blocks with PE in the label", () => {
      const peTerminal = createDefaultSymbolItem({
        id: "pe-terminal",
        type: "Złącza",
        label: "PE terminal",
        deviceKind: "terminalBlock",
        isSnappedToRail: true,
        x: 100,
        y: 0,
        visualPath: "zlacza/zlacze.svg",
        moduleRef: "zlacza/zlacze.svg",
        referenceDesignation: "",
      });

      const normalized = normalizeDinRailModuleOrdering([peTerminal]);
      const result = normalized.find((s) => s.id === "pe-terminal");
      expect(result?.referenceDesignation).toBe("PE1");
      expect(result?.displayModuleNumber).toBe("PE1");
    });

    it("assigns N prefix to terminal blocks with N in the label", () => {
      const nTerminal = createDefaultSymbolItem({
        id: "n-terminal",
        type: "Złącza",
        label: "N",
        deviceKind: "terminalBlock",
        isSnappedToRail: true,
        x: 100,
        y: 0,
        visualPath: "zlacza/zlacze.svg",
        moduleRef: "zlacza/zlacze.svg",
        referenceDesignation: "",
      });

      const normalized = normalizeDinRailModuleOrdering([nTerminal]);
      const result = normalized.find((s) => s.id === "n-terminal");
      expect(result?.referenceDesignation).toBe("N1");
      expect(result?.displayModuleNumber).toBe("N1");
    });

    it("assigns BL prefix to distribution blocks", () => {
      const block = createDefaultSymbolItem({
        id: "block-1",
        type: "Blok rozdzielczy",
        label: "Blok rozdzielczy",
        deviceKind: "other",
        isSnappedToRail: true,
        x: 100,
        y: 0,
        visualPath: "bloki/blok.svg",
        moduleRef: "bloki/blok.svg",
        referenceDesignation: "",
      });

      const normalized = normalizeDinRailModuleOrdering([block]);
      const result = normalized.find((s) => s.id === "block-1");
      expect(result?.referenceDesignation).toBe("BL1");
      expect(result?.displayModuleNumber).toBe("BL1");
    });

    it("increments counters for multiple terminals of the same type", () => {
      const t1 = createDefaultSymbolItem({
        id: "t1",
        type: "Złącza",
        label: "Złącze uniwersalne",
        deviceKind: "terminalBlock",
        isSnappedToRail: true,
        x: 100,
        y: 0,
        visualPath: "zlacza/zlacze.svg",
        moduleRef: "zlacza/zlacze.svg",
        referenceDesignation: "",
      });
      const t2 = createDefaultSymbolItem({
        id: "t2",
        type: "Złącza",
        label: "Złącze uniwersalne",
        deviceKind: "terminalBlock",
        isSnappedToRail: true,
        x: 200,
        y: 0,
        visualPath: "zlacza/zlacze.svg",
        moduleRef: "zlacza/zlacze.svg",
        referenceDesignation: "",
      });

      const normalized = normalizeDinRailModuleOrdering([t1, t2]);
      expect(normalized.find((s) => s.id === "t1")?.referenceDesignation).toBe("X1");
      expect(normalized.find((s) => s.id === "t2")?.referenceDesignation).toBe("X2");
    });

    it("preserves manual auxiliary reference designations", () => {
      const manualTerminal = createDefaultSymbolItem({
        id: "manual-t",
        type: "Złącza",
        label: "PEN terminal",
        deviceKind: "terminalBlock",
        isSnappedToRail: true,
        x: 100,
        y: 0,
        visualPath: "zlacza/zlacze.svg",
        moduleRef: "zlacza/zlacze.svg",
        referenceDesignation: "X5",
        parameters: { ManualReferenceDesignation: "true" },
      });

      const normalized = normalizeDinRailModuleOrdering([manualTerminal]);
      const result = normalized.find((s) => s.id === "manual-t");
      expect(result?.referenceDesignation).toBe("X5");
      expect(result?.displayModuleNumber).toBe("X5");
    });
  });
});
