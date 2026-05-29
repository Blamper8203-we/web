import {
  buildDiscoveredModuleDefinition,
  type DiscoveredModuleAsset,
  type ImportedModuleDefinition,
} from "./importedModuleCatalog";
import { getModuleAssetUrl, type PaletteGroup } from "./moduleCatalog";

const MODULE_MANIFEST_URL = "assets/modules/module-manifest.json";
const FALLBACK_SVG_MARKUP = '<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="200" fill="none"/></svg>';

interface ModuleAssetManifest {
  modules?: DiscoveredModuleAsset[];
}

const FALLBACK_MODULE_ASSETS: DiscoveredModuleAsset[] = [
  {
    category: "Blok rozdzielczy",
    fileName: "Blok rozdzielczy 7 pin.svg",
    moduleRef: "Blok rozdzielczy/Blok rozdzielczy 7 pin.svg",
  },
  {
    category: "FR",
    fileName: "Rozłącznik izolacyjny FR 1P.svg",
    moduleRef: "FR/Rozłącznik izolacyjny FR 1P.svg",
  },
  {
    category: "FR",
    fileName: "Rozłącznik izolacyjny FR 3P.svg",
    moduleRef: "FR/Rozłącznik izolacyjny FR 3P.svg",
  },
  {
    category: "Kontrolki faz",
    fileName: "Kontrolki faz.svg",
    moduleRef: "Kontrolki faz/Kontrolki faz.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa N 12PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa N 12PIN.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa N 15PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa N 15PIN.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa N 7PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa N 7PIN.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa PE 12PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa PE 12PIN.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa PE 15PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa PE 15PIN.svg",
  },
  {
    category: "Listwy zaciskowe",
    fileName: "Listwa PE 7PIN.svg",
    moduleRef: "Listwy zaciskowe/Listwa PE 7PIN.svg",
  },
  {
    category: "MCB",
    fileName: "rozłacznik nadprądowy MCB 1P.svg",
    moduleRef: "MCB/rozłacznik nadprądowy MCB 1P.svg",
  },
  {
    category: "MCB",
    fileName: "rozłacznik nadprądowy MCB 2P.svg",
    moduleRef: "MCB/rozłacznik nadprądowy MCB 2P.svg",
  },
  {
    category: "MCB",
    fileName: "rozłacznik nadprądowy MCB 3P.svg",
    moduleRef: "MCB/rozłacznik nadprądowy MCB 3P.svg",
  },
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
  {
    category: "SPD",
    fileName: "SPD.svg",
    moduleRef: "SPD/SPD.svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka 2-torowa.svg",
    moduleRef: "Złącza/Złączka 2-torowa.svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka 5-torowa (L1-L2-L3-N-PE).svg",
    moduleRef: "Złącza/Złączka 5-torowa (L1-L2-L3-N-PE).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka 3-torowa (L1-L2-L3).svg",
    moduleRef: "Złącza/Złączka 3-torowa (L1-L2-L3).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka N (1-torowa).svg",
    moduleRef: "Złącza/Złączka N (1-torowa).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka N (2-torowa).svg",
    moduleRef: "Złącza/Złączka N (2-torowa).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka N (3-torowa).svg",
    moduleRef: "Złącza/Złączka N (3-torowa).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka PE (1-torowa).svg",
    moduleRef: "Złącza/Złączka PE (1-torowa).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka PE (2-torowa).svg",
    moduleRef: "Złącza/Złączka PE (2-torowa).svg",
  },
  {
    category: "Złącza",
    fileName: "Złączka PE (3-torowa).svg",
    moduleRef: "Złącza/Złączka PE (3-torowa).svg",
  },
];

function normalizeModuleRef(moduleRef: string): string {
  return moduleRef.replace(/\\/g, "/").replace(/^\/+/, "").toLocaleLowerCase("pl-PL");
}

function getModuleManifestUrl(): string {
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return `${baseUrl}${MODULE_MANIFEST_URL}`;
}

function buildBuiltInModuleRefSet(groups: PaletteGroup[]): Set<string> {
  return new Set(
    groups.flatMap((group) => group.items.map((item) => normalizeModuleRef(item.moduleRef))),
  );
}

function isDiscoveredModuleAsset(value: unknown): value is DiscoveredModuleAsset {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DiscoveredModuleAsset).category === "string" &&
    typeof (value as DiscoveredModuleAsset).fileName === "string" &&
    typeof (value as DiscoveredModuleAsset).moduleRef === "string" &&
    (
      typeof (value as DiscoveredModuleAsset).size === "undefined" ||
      typeof (value as DiscoveredModuleAsset).size === "number"
    ) &&
    (
      typeof (value as DiscoveredModuleAsset).updatedAt === "undefined" ||
      typeof (value as DiscoveredModuleAsset).updatedAt === "number"
    ) &&
    value instanceof Object
  );
}

function buildFetchVersion(asset: DiscoveredModuleAsset): string {
  const parts = [asset.updatedAt, asset.size].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return parts.length > 0 ? parts.join("-") : String(Date.now());
}

async function fetchSvgMarkup(asset: DiscoveredModuleAsset): Promise<string | null> {
  try {
    const assetUrl = getModuleAssetUrl(asset.moduleRef);
    const separator = assetUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${assetUrl}${separator}v=${encodeURIComponent(buildFetchVersion(asset))}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function fetchManifestModuleAssets(): Promise<DiscoveredModuleAsset[]> {
  try {
    const manifestResponse = await fetch(`${getModuleManifestUrl()}?t=${Date.now()}`, { cache: "no-store" });
    if (!manifestResponse.ok) {
      return FALLBACK_MODULE_ASSETS;
    }

    const manifest = (await manifestResponse.json()) as ModuleAssetManifest;
    const manifestModules = Array.isArray(manifest.modules)
      ? manifest.modules.filter(isDiscoveredModuleAsset)
      : [];

    return manifestModules.length > 0 ? manifestModules : FALLBACK_MODULE_ASSETS;
  } catch {
    return FALLBACK_MODULE_ASSETS;
  }
}

export async function discoverModuleAssets(
  builtInGroups: PaletteGroup[],
): Promise<ImportedModuleDefinition[]> {
  try {
    const manifestModules = await fetchManifestModuleAssets();
    const builtInModuleRefs = buildBuiltInModuleRefSet(builtInGroups);
    const discoveredModules: ImportedModuleDefinition[] = [];

    for (const asset of manifestModules) {
      if (builtInModuleRefs.has(normalizeModuleRef(asset.moduleRef))) {
        continue;
      }

      const rawSvg = await fetchSvgMarkup(asset) ?? FALLBACK_SVG_MARKUP;
      const definition = buildDiscoveredModuleDefinition(asset, rawSvg);
      if (definition) {
        discoveredModules.push(definition);
      }
    }

    return discoveredModules;
  } catch {
    return [];
  }
}
