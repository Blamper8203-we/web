import { describe, expect, it } from "vitest";
// @ts-expect-error -- bundler resolution does not type bare 'fs' import
import { existsSync } from "fs";
// @ts-expect-error -- bundler resolution does not type bare 'path' import
import { resolve } from "path";
import { getModuleSnapAnchorRatioY, getPaletteTemplateDimensions, PALETTE_GROUPS, currentModuleEntries } from "./moduleCatalog";
import { mergePaletteGroups, type ImportedModuleDefinition } from "./importedModuleCatalog";
import { getSymbolTerminals } from "./moduleTerminals";
import { createDefaultSymbolItem } from "../../types/symbolItem";

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

describe("module catalog integrity", () => {
  it("every currentModuleEntries moduleRef points to an existing SVG file on disk", () => {
    // WHY: literówki w moduleRef (np. rozłacznik vs rozłącznik) powodują że moduły
    // są niewidoczne w palecie — 404 przy ładowaniu SVG. Ten test łapie takie błędy w CI.
    // Używamy PALETTE_GROUPS które są budowane z currentModuleEntries (nie z legacy moduleEntries).
    // @ts-expect-error -- __dirname not defined in test's ESM context
    const publicModulesDir = resolve(__dirname, "../../../public/assets/modules");
    const missing: string[] = [];
    for (const group of PALETTE_GROUPS) {
      for (const item of group.items) {
        if (!item.moduleRef) continue;
        // Imported modules (z assetPath zawierającym importedSvg) są na dysku w innym miejscu
        // i nie mają stałego moduleRef na dysku — pomijamy je.
        if (item.assetPath.includes("imported/")) continue;
        const fullPath = resolve(publicModulesDir, item.moduleRef);
        if (!existsSync(fullPath)) {
          missing.push(`${item.templateId}: moduleRef="${item.moduleRef}" → brak pliku: ${fullPath}`);
        }
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Brakujące pliki SVG dla wpisów katalogu:\n${missing.map((m) => `  - ${m}`).join("\n")}`
      );
    }
  });
});

describe("getSymbolTerminals for 28-pin block", () => {
  it("maps 28 terminals with correct names and phases for 7-pin block", () => {
    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: "Blok rozdzielczy/blok rozdzielczy 4x7.svg",
      width: 840,
      height: 1150,
    });

    const terminals = getSymbolTerminals(symbol);
    expect(terminals.length).toBe(28);

    // Verify L1 row
    const l1_1 = terminals.find((t) => t.name === "L1-1");
    expect(l1_1).toBeDefined();
    expect(l1_1?.type).toBe("phase");
    expect(l1_1?.isTop).toBe(true);
    expect(l1_1?.y).toBe(420);

    // Verify N row
    const n_7 = terminals.find((t) => t.name === "N-7");
    expect(n_7).toBeDefined();
    expect(n_7?.type).toBe("neutral");
    expect(n_7?.isTop).toBe(false);
    expect(n_7?.y).toBe(1005);
    expect(n_7?.x).toBe(780);
  });
});

import { svgTerminalCache } from "./svgTerminalCache";

describe("getSymbolTerminals uniform scaling (none) for custom block", () => {
  it("calculates terminal positions and radiuses using none scaling", () => {
    const moduleRef = "Blok rozdzielczy/blok rozdzielczy 4x7.svg";
    const groups = [
      {
        prefix: "L1",
        viewBoxWidth: 841,
        viewBoxHeight: 1148,
        terminals: [
          {
            name: "L1-1",
            xRatio: 172.025 / 841,
            yRatio: 242.834 / 1148,
            rRatio: 23.622 / 841,
          },
        ],
      },
    ];
    svgTerminalCache.set(moduleRef, groups);

    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: moduleRef,
      width: 1395.48,
      height: 1170,
    });

    const terminals = getSymbolTerminals(symbol);
    expect(terminals.length).toBe(1);

    const l1_1 = terminals[0]!;
    expect(l1_1.name).toBe("L1-1");
    // scaleX = 1395.48 / 841 = 1.659
    // scaleY = 1170 / 1148 = 1.019
    // none scaling
    // x = width * xRatio = 1395.48 * (172.025 / 841) = 285.45
    // y = height * yRatio = 1170 * (242.834 / 1148) = 247.487
    // radius = width * rRatio = 1395.48 * (23.622 / 841) = 39.19
    expect(l1_1.x).toBeCloseTo(285.45, 1);
    expect(l1_1.y).toBeCloseTo(247.487, 1);
    expect(l1_1.radius).toBeCloseTo(39.19, 1);
  });
});

import { parseSvgForTerminals } from "./svgTerminalParser";

describe("parseSvgForTerminals with data URI", () => {
  it("decodes and parses a UTF-8 encoded SVG data URI", async () => {
    const rawSvg = `<svg viewBox="0 0 100 200"><g id="Grupa-L1"><circle cx="20" cy="30" r="5" /></g></svg>`;
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
    const cacheKey = "imported/test-uuid/custom-block.svg";

    await parseSvgForTerminals(dataUri, cacheKey);

    const cached = svgTerminalCache.get(cacheKey);
    expect(cached).toBeDefined();
    expect(cached?.length).toBe(1);
    expect(cached?.[0].prefix).toBe("L1");
    expect(cached?.[0].viewBoxWidth).toBe(100);
    expect(cached?.[0].viewBoxHeight).toBe(200);
    expect(cached?.[0].terminals[0].name).toBe("L1-1");
    expect(cached?.[0].terminals[0].xRatio).toBe(20 / 100);
    expect(cached?.[0].terminals[0].yRatio).toBe(30 / 200);
  });
});

describe("module catalog integrity", () => {
  it("every moduleRef points to an existing SVG file on disk", () => {
    // @ts-expect-error -- process.cwd() not typed in browser-mode test
    const publicAssetsDir = resolve(process.cwd(), "public/assets/modules");
    
    const missingFiles: string[] = [];
    for (const entry of currentModuleEntries) {
      if (entry.moduleRef) {
        const fullPath = resolve(publicAssetsDir, entry.moduleRef);
        if (!existsSync(fullPath)) {
          missingFiles.push(`Missing: ${entry.moduleRef} (resolved to ${fullPath})`);
        }
      }
    }

    if (missingFiles.length > 0) {
      console.error(missingFiles.join("\\n"));
    }
    
    expect(missingFiles.length).toBe(0);
  });
});
