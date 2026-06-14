import { describe, expect, it } from "vitest";
import {
  buildPaletteTemplateMap,
  getPaletteDescription,
  getPaletteIconName,
  getSymbolRatingText,
  normalizePaletteAssetDimensions,
} from "./paletteFormatting";
import type { PaletteTemplate } from "../modules/moduleCatalog";
import { createDefaultSymbolItem } from "../../types/symbolItem";

function makeTemplate(overrides: Partial<PaletteTemplate> = {}): PaletteTemplate {
  return {
    templateId: "mcb-1p-b16",
    type: "Wyłącznik nadprądowy",
    label: "MCB 1P B16",
    code: "MCB-1P-B16",
    category: "Wyłączniki",
    deviceKind: "mcb",
    phase: "L1",
    modules: 1,
    moduleRef: "mcb-1p-b16",
    assetPath: "/assets/modules/mcb-1p.svg",
    protectionType: "B16",
    ...overrides,
  };
}

describe("paletteFormatting - buildPaletteTemplateMap", () => {
  it("returns empty map for empty input", () => {
    const map = buildPaletteTemplateMap([]);
    expect(map.size).toBe(0);
  });

  it("builds map keyed by templateId with the template as value", () => {
    const t1 = makeTemplate({ templateId: "id-1" });
    const t2 = makeTemplate({ templateId: "id-2" });
    const map = buildPaletteTemplateMap([{ items: [t1, t2] }]);
    expect(map.size).toBe(2);
    expect(map.get("id-1")).toBe(t1);
    expect(map.get("id-2")).toBe(t2);
  });

  it("flattens multiple groups", () => {
    const t1 = makeTemplate({ templateId: "id-1" });
    const t2 = makeTemplate({ templateId: "id-2" });
    const t3 = makeTemplate({ templateId: "id-3" });
    const map = buildPaletteTemplateMap([{ items: [t1] }, { items: [t2, t3] }]);
    expect(map.size).toBe(3);
  });

  it("preserves only the last template when templateIds collide", () => {
    const t1 = makeTemplate({ templateId: "dup", label: "first" });
    const t2 = makeTemplate({ templateId: "dup", label: "second" });
    const map = buildPaletteTemplateMap([{ items: [t1, t2] }]);
    expect(map.get("dup")).toBe(t2);
  });
});

describe("paletteFormatting - getPaletteIconName", () => {
  it("returns 'busbar' for FR", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "fr" }))).toBe("busbar");
  });

  it("returns 'validation' for RCD", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "rcd" }))).toBe("validation");
  });

  it("returns 'validation' for RCBO", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "rcbo" }))).toBe("validation");
  });

  it("returns 'fileTree' for MCB", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "mcb" }))).toBe("fileTree");
  });

  it("returns 'balance' for SPD", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "spd" }))).toBe("balance");
  });

  it("returns 'list' for terminalBlock", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "terminalBlock" }))).toBe("list");
  });

  it("returns 'theme' for phaseIndicator", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "phaseIndicator" }))).toBe("theme");
  });

  it("returns 'palette' for unknown deviceKind", () => {
    expect(getPaletteIconName(makeTemplate({ deviceKind: "other" as PaletteTemplate["deviceKind"] }))).toBe("palette");
  });
});

describe("paletteFormatting - getPaletteDescription", () => {
  it("returns empty string for terminal blocks", () => {
    expect(getPaletteDescription(makeTemplate({ deviceKind: "terminalBlock" }))).toBe("");
  });

  it("builds '{modules}M' base for any template", () => {
    expect(getPaletteDescription(makeTemplate({ modules: 1, deviceKind: "mcb", label: "MCB 1P B16" }))).toContain("1M");
  });

  it("includes pole count for MCB based on label (e.g. 1P, 2P, 3P, 4P)", () => {
    expect(getPaletteDescription(makeTemplate({ deviceKind: "mcb", label: "MCB 1P B16" }))).toContain("1P");
    expect(getPaletteDescription(makeTemplate({ deviceKind: "mcb", label: "MCB 3P B25" }))).toContain("3P");
  });

  it("includes protection type when present", () => {
    expect(getPaletteDescription(makeTemplate({ deviceKind: "mcb", label: "MCB 1P B16", protectionType: "B16" }))).toContain("B16");
  });

  it("omits duplicate FR rating when already in label", () => {
    expect(
      getPaletteDescription(
        makeTemplate({ deviceKind: "fr", label: "FR 63A", frRatedCurrent: "63A", protectionType: "" }),
      ),
    ).toBe("1M");
  });

  it("includes FR rating when not in label", () => {
    expect(
      getPaletteDescription(
        makeTemplate({ deviceKind: "fr", label: "Main breaker", frRatedCurrent: "63A", protectionType: "" }),
      ),
    ).toContain("63A");
  });

  it("includes RCD rated + residual current", () => {
    expect(
      getPaletteDescription(makeTemplate({
        deviceKind: "rcd",
        label: "RCD 4P 40A 30mA",
        rcdRatedCurrent: 40,
        rcdResidualCurrent: 30,
      })),
    ).toContain("40A / 30mA");
  });
});

describe("paletteFormatting - getSymbolRatingText", () => {
  it("returns '40A/30mA' style for RCD with 30mA residual", () => {
    const s = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
    });
    expect(getSymbolRatingText(s)).toBe("40A/0,03A");
  });

  it("returns '40A/0,1A' for 100mA residual", () => {
    const s = createDefaultSymbolItem({
      id: "r1",
      deviceKind: "rcd",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 100,
    });
    expect(getSymbolRatingText(s)).toBe("40A/0,1A");
  });

  it("returns frRatedCurrent for FR", () => {
    const s = createDefaultSymbolItem({
      id: "f1",
      deviceKind: "fr",
      frRatedCurrent: "63A",
    });
    expect(getSymbolRatingText(s)).toBe("63A");
  });

  it("returns protectionType for MCB", () => {
    const s = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "mcb",
      protectionType: "B16",
    });
    expect(getSymbolRatingText(s)).toBe("B16");
  });

  it("returns protectionType for RCBO", () => {
    const s = createDefaultSymbolItem({
      id: "m1",
      deviceKind: "rcbo",
      protectionType: "C20",
    });
    expect(getSymbolRatingText(s)).toBe("C20");
  });

  it("returns undefined for terminal block with no special fields", () => {
    const s = createDefaultSymbolItem({ id: "t1", deviceKind: "terminalBlock" });
    expect(getSymbolRatingText(s)).toBeUndefined();
  });
});

describe("paletteFormatting - normalizePaletteAssetDimensions", () => {
  it("returns input unchanged when no symbol has a moduleRef", () => {
    const s = createDefaultSymbolItem({ id: "s1" });
    const template = makeTemplate({ moduleRef: "mcb-1p-b16" });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result).toEqual([s]);
  });

  it("returns input unchanged when moduleRef doesn't match any template", () => {
    const s = createDefaultSymbolItem({ id: "s1", moduleRef: "unknown-ref" });
    const template = makeTemplate({ moduleRef: "mcb-1p-b16" });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result).toEqual([s]);
  });

  it("updates width/height when symbol is a BuiltInAsset and dimensions differ", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      moduleRef: "mcb-1p-b16",
      moduleSourceType: "BuiltInAsset",
      width: 999,
      height: 999,
    });
    const template = makeTemplate({
      moduleRef: "mcb-1p-b16",
      customWidth: 100,
      customHeight: 200,
    });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result[0].width).toBe(100);
    expect(result[0].height).toBe(200);
  });

  it("preserves width/height when symbol is not BuiltIn and not severely underscaled", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      moduleRef: "mcb-1p-b16",
      moduleSourceType: "UserFile",
      width: 150, // 1.5x of template, not < 0.55
      height: 300,
    });
    const template = makeTemplate({
      moduleRef: "mcb-1p-b16",
      customWidth: 100,
      customHeight: 200,
    });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result[0].width).toBe(150);
    expect(result[0].height).toBe(300);
  });

  it("updates deviceKind when template's deviceKind differs", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      moduleRef: "mcb-1p-b16",
      moduleSourceType: "BuiltInAsset",
      deviceKind: "other",
      width: 100,
      height: 200,
    });
    const template = makeTemplate({ moduleRef: "mcb-1p-b16", deviceKind: "mcb" });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result[0].deviceKind).toBe("mcb");
  });

  it("updates visualPath to template's assetPath when different", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      moduleRef: "mcb-1p-b16",
      moduleSourceType: "BuiltInAsset",
      visualPath: "/old/path.svg",
      width: 100,
      height: 200,
    });
    const template = makeTemplate({
      moduleRef: "mcb-1p-b16",
      assetPath: "/new/path.svg",
    });
    const map = buildPaletteTemplateMap([{ items: [template] }]);
    const result = normalizePaletteAssetDimensions([s], map);
    expect(result[0].visualPath).toBe("/new/path.svg");
  });
});
