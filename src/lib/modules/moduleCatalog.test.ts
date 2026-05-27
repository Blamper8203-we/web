import { describe, expect, it } from "vitest";
import { getModuleSnapAnchorRatioY, getPaletteTemplateDimensions, PALETTE_GROUPS } from "./moduleCatalog";
import { mergePaletteGroups, type ImportedModuleDefinition } from "./importedModuleCatalog";

function createImportedRcd(label: string): ImportedModuleDefinition {
  return {
    assetPath: `/assets/modules/RCD/${encodeURIComponent(label)}.svg`,
    category: "RCD",
    code: label,
    customHeight: 1102.54,
    customWidth: label.includes("3P+N") ? 930.32 : 465.16,
    deviceKind: "rcd",
    heightMm: 83,
    id: `catalog-rcd-${label}`,
    label,
    moduleRef: `RCD/${label}.svg`,
    modules: label.includes("3P+N") ? 4 : 2,
    originalFileName: `${label}.svg`,
    parameters: {},
    phase: label.includes("3P+N") ? "L1+L2+L3" : "L1",
    rawSvg: "<svg />",
    rcdRatedCurrent: undefined,
    rcdResidualCurrent: 30,
    rcdType: "A",
    type: "RCD",
    widthMm: label.includes("3P+N") ? 70 : 35,
  };
}

describe("module catalog groups", () => {
  it("keeps the RCD tab with the new residual-current switch modules only", () => {
    const rcdGroup = PALETTE_GROUPS.find((group) => group.title === "RCD");

    expect(rcdGroup).toBeDefined();
    expect(rcdGroup?.items.map((item) => item.label)).toEqual([
      "Rozłącznik różnicowoprądowy 1P+N",
      "Rozłącznik różnicowoprądowy 3P+N",
    ]);
    expect(rcdGroup?.items.map((item) => item.moduleRef)).toEqual([
      "RCD/Rozłącznik różnicowoprądowy 1P+N.svg",
      "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
    ]);
    expect(rcdGroup?.items.every((item) => item.assetPath.includes("dinboardSource=importedSvg"))).toBe(true);
    expect(rcdGroup?.items.some((item) => item.label === "RCD 2P" || item.label === "RCD 4P")).toBe(false);
  });

  it("uses the authored SVG dimensions for the pinned RCD modules", () => {
    const rcdGroup = PALETTE_GROUPS.find((group) => group.title === "RCD");
    const singlePhaseRcd = rcdGroup?.items.find((item) => item.code.includes("1P+N"));
    const threePhaseRcd = rcdGroup?.items.find((item) => item.code.includes("3P+N"));

    expect(singlePhaseRcd).toBeDefined();
    expect(threePhaseRcd).toBeDefined();
    expect(getPaletteTemplateDimensions(singlePhaseRcd!).width).toBeGreaterThan(2 * 232);
    expect(getPaletteTemplateDimensions(threePhaseRcd!).width).toBeGreaterThan(4 * 232);
  });

  it("places discovered residual-current switches inside the RCD group", () => {
    const paletteGroups = mergePaletteGroups(PALETTE_GROUPS, [
      createImportedRcd("Testowy rozłącznik różnicowoprądowy 1P+N"),
      createImportedRcd("Testowy rozłącznik różnicowoprądowy 3P+N"),
    ]);
    const rcdGroup = paletteGroups.find((group) => group.title === "RCD");

    expect(rcdGroup?.items.map((item) => item.label)).toContain("Testowy rozłącznik różnicowoprądowy 1P+N");
    expect(rcdGroup?.items.map((item) => item.label)).toContain("Testowy rozłącznik różnicowoprądowy 3P+N");
  });

  it("uses the corrected DIN snap axis for 12PIN terminal strips", () => {
    expect(getModuleSnapAnchorRatioY("Listwy zaciskowe/Listwa N 12PIN.svg")).toBe(0.464);
    expect(getModuleSnapAnchorRatioY("Listwy zaciskowe/Listwa PE 12PIN.svg")).toBe(0.464);
    expect(getModuleSnapAnchorRatioY("Listwy zaciskowe/Listwa N 15PIN.svg")).toBe(0.5);
  });
});
