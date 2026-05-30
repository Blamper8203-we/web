import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDiscoveredModuleDefinition, loadImportedModules, saveImportedModules } from "./importedModuleCatalog";

const SIMPLE_SVG = '<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="200"/></svg>';
const PERCENT_SVG_2_MODULES = '<svg width="100%" height="100%" viewBox="0 0 416 983" xmlns="http://www.w3.org/2000/svg"><rect width="416" height="983"/></svg>';
const PERCENT_SVG_4_MODULES = '<svg width="100%" height="100%" viewBox="0 0 853 983" xmlns="http://www.w3.org/2000/svg"><rect width="853" height="983"/></svg>';

function stubWindowStorage(initialValues: Record<string, string>) {
  const storage = new Map(Object.entries(initialValues));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
    },
  });

  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildDiscoveredModuleDefinition", () => {
  it("builds a stable palette module from an SVG found in the modules folder", () => {
    const definition = buildDiscoveredModuleDefinition(
      {
        category: "Controls",
        fileName: "Kontrolki faz L1_L3.svg",
        moduleRef: "Controls/Kontrolki faz L1_L3.svg",
      },
      SIMPLE_SVG,
    );

    expect(definition).not.toBeNull();
    expect(definition?.id).toBe("catalog-controls-kontrolki-faz-l1-l3");
    expect(definition?.category).toBe("Kontrolki faz");
    expect(definition?.moduleRef).toBe("Controls/Kontrolki faz L1_L3.svg");
    expect(definition?.assetPath).toBe(
      "/assets/modules/Controls/Kontrolki%20faz%20L1_L3.svg?dinboardSource=importedSvg",
    );
  });

  it("infers RCD electrical metadata from a discovered RCD file name", () => {
    const definition = buildDiscoveredModuleDefinition(
      {
        category: "RCD",
        fileName: "RCD 40A 4P.svg",
        moduleRef: "RCD/RCD 40A 4P.svg",
      },
      SIMPLE_SVG,
    );

    expect(definition?.deviceKind).toBe("rcd");
    expect(definition?.phase).toBe("L1+L2+L3");
    expect(definition?.modules).toBe(4);
    expect(definition?.rcdRatedCurrent).toBe(40);
    expect(definition?.rcdResidualCurrent).toBe(30);
    expect(definition?.rcdType).toBe("A");
  });

  it("infers RCD from Polish residual-current naming", () => {
    const definition = buildDiscoveredModuleDefinition(
      {
        category: "Inne",
        fileName: "Wyłącznik różnicowoprądowy 40A 4-biegunowy.svg",
        moduleRef: "RCD/Wyłącznik różnicowoprądowy 40A 4-biegunowy.svg",
      },
      SIMPLE_SVG,
    );

    expect(definition?.category).toBe("RCD");
    expect(definition?.deviceKind).toBe("rcd");
    expect(definition?.phase).toBe("L1+L2+L3");
    expect(definition?.modules).toBe(4);
    expect(definition?.rcdRatedCurrent).toBe(40);
  });

  it("treats discovered RCD 2P as a single-phase apparatus", () => {
    const definition = buildDiscoveredModuleDefinition(
      {
        category: "RCD",
        fileName: "RCD 40A 2P.svg",
        moduleRef: "RCD/RCD 40A 2P.svg",
      },
      SIMPLE_SVG,
    );

    expect(definition?.deviceKind).toBe("rcd");
    expect(definition?.phase).toBe("L1");
    expect(definition?.modules).toBe(2);
    expect(definition?.rcdRatedCurrent).toBe(40);
  });

  it("keeps Polish 1P+N and 3P+N RCD files at their authored SVG width", () => {
    const singlePhaseDefinition = buildDiscoveredModuleDefinition(
      {
        category: "RCD",
        fileName: "Rozłącznik różnicowoprądowy 1P+N.svg",
        moduleRef: "RCD/Rozłącznik różnicowoprądowy 1P+N.svg",
      },
      PERCENT_SVG_2_MODULES,
    );
    const threePhaseDefinition = buildDiscoveredModuleDefinition(
      {
        category: "RCD",
        fileName: "Rozłącznik różnicowoprądowy 3P+N.svg",
        moduleRef: "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
      },
      PERCENT_SVG_4_MODULES,
    );

    expect(singlePhaseDefinition?.category).toBe("RCD");
    expect(singlePhaseDefinition?.deviceKind).toBe("rcd");
    expect(singlePhaseDefinition?.phase).toBe("L1");
    expect(singlePhaseDefinition?.modules).toBe(2);

    expect(threePhaseDefinition?.category).toBe("RCD");
    expect(threePhaseDefinition?.deviceKind).toBe("rcd");
    expect(threePhaseDefinition?.phase).toBe("L1+L2+L3");
    expect(threePhaseDefinition?.modules).toBe(4);
  });

  it("clears persisted imported modules when the catalog version changes", () => {
    const storage = stubWindowStorage({
      "dinboard.importedModules": JSON.stringify([{ id: "old-module", assetPath: "old.svg", moduleRef: "old.svg" }]),
      "dinboard.hiddenPaletteTemplateIds": JSON.stringify(["old-hidden-module"]),
    });

    expect(loadImportedModules()).toEqual([]);
    expect(storage.has("dinboard.importedModules")).toBe(false);
    expect(storage.has("dinboard.hiddenPaletteTemplateIds")).toBe(false);
    expect(storage.get("dinboard.importedModules.catalogVersion")).toBe("new-svg-models-2026-05-30-fr-1p-fix");

    saveImportedModules([]);
    expect(storage.get("dinboard.importedModules")).toBe("[]");
  });
});
