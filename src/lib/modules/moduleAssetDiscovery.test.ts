import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverModuleAssets } from "./moduleAssetDiscovery";

const SIMPLE_SVG = '<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="200"/></svg>';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("discoverModuleAssets", () => {
  it("falls back to the bundled new SVG catalog when the manifest endpoint is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("module-manifest.json")) {
          return {
            ok: false,
          };
        }

        return {
          ok: true,
          text: async () => SIMPLE_SVG,
        };
      }),
    );

    const modules = await discoverModuleAssets([]);
    const rcdLabels = modules
      .filter((moduleDefinition) => moduleDefinition.category === "RCD")
      .map((moduleDefinition) => moduleDefinition.label);

    expect(modules).toHaveLength(25);
    expect(rcdLabels).toEqual([
      "Rozłącznik różnicowoprądowy 1P+N",
      "Rozłącznik różnicowoprądowy 3P+N",
    ]);
  });

  it("keeps RCD modules in the palette even when their SVG file fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("module-manifest.json")) {
          return {
            ok: true,
            json: async () => ({
              modules: [
                {
                  category: "RCD",
                  fileName: "Rozłącznik różnicowoprądowy 1P+N.svg",
                  moduleRef: "RCD/Rozłącznik różnicowoprądowy 1P+N.svg",
                },
                {
                  category: "RCD",
                  fileName: "Rozłącznik różnicowoprądowy 3P+N.svg",
                  moduleRef: "RCD/Rozłącznik różnicowoprądowy 3P+N.svg",
                },
              ],
            }),
          };
        }

        return {
          ok: false,
        };
      }),
    );

    const modules = await discoverModuleAssets([]);

    expect(modules.map((moduleDefinition) => moduleDefinition.label)).toEqual([
      "Rozłącznik różnicowoprądowy 1P+N",
      "Rozłącznik różnicowoprądowy 3P+N",
    ]);
    expect(modules.every((moduleDefinition) => moduleDefinition.category === "RCD")).toBe(true);
  });
});
