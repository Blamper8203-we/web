import type { DeviceKind, PhaseAssignment } from "../../types/symbolItem";
import type { PaletteGroup, PaletteTemplate } from "./moduleCatalog";
import { getModuleAssetUrl, MODULE_PX_PER_MM, MODULE_UNIT_MM_WIDTH } from "./moduleCatalog";
import { safeGetItemSync, safeSetItem, safeRemoveItem } from "../storageService";
import { reportRuntimeError } from "../runtimeDiagnostics";

import {
  type SvgDimensions,
  parseSvgDimensions,
  createSvgDataUri,
  isValidSvgMarkup,
  sanitizeSvg,
  parseExplicitMmDimensions,
} from "./svgParsing";

import {
  CATEGORY_DEFAULT_HEIGHT_MM,
  normalizeDetectionText,
  detectPoleCount,
  detectCategory,
  detectDeviceKind,
  detectType,
  detectPhase,
  storeTerminalBlockPinPositions,
  detectCircuitType,
  extractPlaceholderDefaults,
  detectRcdRatedCurrent,
  detectRcdResidualCurrent,
  detectRcdType,
  deriveImportTraits,
  detectExplicitPoleCount,
} from "./moduleHeuristics";

export { deriveImportTraits, detectExplicitPoleCount };

const IMPORTED_MODULES_STORAGE_KEY = "dinboard.importedModules";
const IMPORTED_MODULES_CATALOG_VERSION_KEY = "dinboard.importedModules.catalogVersion";
const IMPORTED_MODULES_CATALOG_VERSION = "new-svg-models-2026-05-30-fr-1p-fix";
const HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY = "dinboard.hiddenPaletteTemplateIds";

export interface ImportedModuleDefinition {
  assetPath: string;
  category: string;
  code: string;
  customHeight: number;
  customWidth: number;
  deviceKind: DeviceKind;
  heightMm: number;
  id: string;
  label: string;
  moduleRef: string;
  modules: number;
  originalFileName: string;
  parameters: Record<string, string>;
  phase: PhaseAssignment;
  rawSvg: string;
  rcdRatedCurrent?: number;
  rcdResidualCurrent?: number;
  rcdType?: string;
  type: string;
  widthMm: number;
}

export interface PendingSvgImportItem {
  assetPath: string;
  category: string;
  code: string;
  detectedCategory: string;
  deviceKind: DeviceKind;
  fileName: string;
  heightMm: number;
  id: string;
  isDuplicate: boolean;
  label: string;
  modules: number;
  parameters: Record<string, string>;
  phase: PhaseAssignment;
  rawSvg: string;
  selected: boolean;
  sizeDetection: "fallback" | "svg-ratio" | "svg-units" | "svg-300dpi";
  type: string;
  widthMm: number;
}

interface ImportedFilePayload {
  content: string;
  name: string;
}

export interface DiscoveredModuleAsset {
  category: string;
  fileName: string;
  moduleRef: string;
  size?: number;
  updatedAt?: number;
}

function ensureImportedModulesCatalogVersion(): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentVersion = safeGetItemSync(IMPORTED_MODULES_CATALOG_VERSION_KEY);
  if (currentVersion === IMPORTED_MODULES_CATALOG_VERSION) {
    return;
  }
  safeRemoveItem(IMPORTED_MODULES_STORAGE_KEY);
  safeRemoveItem(HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY);
  safeSetItem(IMPORTED_MODULES_CATALOG_VERSION_KEY, IMPORTED_MODULES_CATALOG_VERSION);
}

function calculateDefaultHeightMm(category: string, modules: number, svgDimensions: SvgDimensions | null): number {
  const authoredHeight = CATEGORY_DEFAULT_HEIGHT_MM[category];
  if (authoredHeight) {
    return authoredHeight;
  }

  if (svgDimensions && svgDimensions.width > 0 && svgDimensions.height > 0) {
    const widthMm = modules * MODULE_UNIT_MM_WIDTH;
    return Math.max(10, Math.round(((widthMm * svgDimensions.height) / svgDimensions.width) * 100) / 100);
  }

  return 83;
}

function calculateDefaultWidthMm(modules: number): number {
  return Math.round(modules * MODULE_UNIT_MM_WIDTH * 100) / 100;
}

export function calculateModulesFromWidthMm(widthMm: number): number {
  return Math.max(1, Math.round(widthMm / MODULE_UNIT_MM_WIDTH));
}

function normalizeCatalogCategory(category: string, fileName: string): string {
  const trimmedCategory = category.trim();
  const normalizedCategory = normalizeDetectionText(trimmedCategory);
  const detectedCategory = detectCategory(fileName);

  if (normalizedCategory === "CONTROLS") {
    return "Kontrolki faz";
  }

  if (normalizedCategory === "ZLACZA") {
    return "Z\u0142\u0105cza";
  }

  if (!trimmedCategory || normalizedCategory === "INNE") {
    return detectedCategory;
  }

  return trimmedCategory;
}

function buildStableImportedModuleId(moduleRef: string): string {
  return moduleRef
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/\.svg$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "module";
}

function buildDiscoveredModuleAssetPath(moduleRef: string, version?: string): string {
  const assetUrl = getModuleAssetUrl(moduleRef);
  const separator = assetUrl.includes("?") ? "&" : "?";
  const cacheKey = version ? `&v=${encodeURIComponent(version)}` : "";

  return `${assetUrl}${separator}dinboardSource=importedSvg${cacheKey}`;
}

function buildDiscoveredModuleAssetVersion(asset: DiscoveredModuleAsset): string | undefined {
  const parts = [asset.updatedAt, asset.size].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return parts.length > 0 ? parts.join("-") : undefined;
}

function buildImportedModuleDefinition(item: PendingSvgImportItem): ImportedModuleDefinition {
  const customWidth = Math.round(item.widthMm * MODULE_PX_PER_MM * 100) / 100;
  const customHeight = Math.round(item.heightMm * MODULE_PX_PER_MM * 100) / 100;

  return {
    id: item.id,
    code: item.code,
    label: item.label,
    category: item.category,
    modules: item.modules,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    deviceKind: item.deviceKind,
    type: item.type,
    phase: item.phase,
    moduleRef: `imported/${item.id}/${item.fileName}`,
    originalFileName: item.fileName,
    rawSvg: item.rawSvg,
    assetPath: item.assetPath,
    customWidth,
    customHeight,
    parameters: item.parameters,
    rcdRatedCurrent: detectRcdRatedCurrent(item.fileName, item.category),
    rcdResidualCurrent: detectRcdResidualCurrent(item.fileName, item.category),
    rcdType: detectRcdType(item.fileName, item.category),
  };
}

function buildPendingSvgImportItem(
  file: ImportedFilePayload,
  existingModules: ImportedModuleDefinition[],
): PendingSvgImportItem {
  const safeName = file.name.replace(/\.[^.]+$/, "");
  const category = detectCategory(safeName);
  const normalizedSvg = sanitizeSvg(file.content);
  const svgDimensions = parseSvgDimensions(normalizedSvg);
  const explicitMmDimensions = parseExplicitMmDimensions(normalizedSvg, svgDimensions);
  const detectedModules = detectPoleCount(safeName);
  const widthMm = explicitMmDimensions?.widthMm ?? calculateDefaultWidthMm(detectedModules);
  const modules = explicitMmDimensions?.widthMm
    ? calculateModulesFromWidthMm(explicitMmDimensions.widthMm)
    : detectedModules;
  const parameters = extractPlaceholderDefaults(normalizedSvg, category);
  storeTerminalBlockPinPositions(parameters, normalizedSvg, detectDeviceKind(category));
  const id = crypto.randomUUID();
  const code = safeName;
  const duplicateKey = `${category}::${code}`.toLocaleLowerCase("pl-PL");
  const existingKeys = new Set(
    existingModules.map((item) => `${item.category}::${item.code}`.toLocaleLowerCase("pl-PL")),
  );

  return {
    id,
    fileName: file.name,
    code,
    label: safeName,
    category,
    detectedCategory: category,
    modules,
    widthMm,
    heightMm: explicitMmDimensions?.heightMm ?? calculateDefaultHeightMm(category, modules, svgDimensions),
    sizeDetection: explicitMmDimensions?.source ?? "fallback",
    deviceKind: detectDeviceKind(category),
    type: detectType(category),
    phase: detectPhase(category, safeName),
    rawSvg: normalizedSvg,
    assetPath: createSvgDataUri(normalizedSvg),
    parameters,
    isDuplicate: existingKeys.has(duplicateKey),
    selected: true,
  };
}

export function recalculatePendingSvgImportDuplicates(
  items: PendingSvgImportItem[],
  existingModules: ImportedModuleDefinition[],
): PendingSvgImportItem[] {
  const existingKeys = new Set(
    existingModules.map((item) => `${item.category}::${item.code}`.toLocaleLowerCase("pl-PL")),
  );
  const seenInBatch = new Set<string>();

  return items.map((item) => {
    const key = `${item.category}::${item.code}`.toLocaleLowerCase("pl-PL");
    const isDuplicate = existingKeys.has(key) || seenInBatch.has(key);
    seenInBatch.add(key);
    return {
      ...item,
      isDuplicate,
    };
  });
}

export async function prepareSvgImportFiles(
  files: File[],
  existingModules: ImportedModuleDefinition[],
): Promise<PendingSvgImportItem[]> {
  const imported: PendingSvgImportItem[] = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".svg")) {
      continue;
    }

    const content = await file.text();
    if (!isValidSvgMarkup(content)) {
      continue;
    }

    imported.push(buildPendingSvgImportItem({ content, name: file.name }, existingModules));
  }

  return recalculatePendingSvgImportDuplicates(imported, existingModules);
}

export function finalizePendingSvgImports(items: PendingSvgImportItem[]): ImportedModuleDefinition[] {
  return items.filter((item) => item.selected).map(buildImportedModuleDefinition);
}

export function buildDiscoveredModuleDefinition(
  asset: DiscoveredModuleAsset,
  rawSvg: string,
): ImportedModuleDefinition | null {
  if (!isValidSvgMarkup(rawSvg)) {
    return null;
  }

  const normalizedSvg = sanitizeSvg(rawSvg);
  const category = normalizeCatalogCategory(asset.category, asset.fileName);
  const safeName = asset.fileName.replace(/\.[^.]+$/, "");
  const svgDimensions = parseSvgDimensions(normalizedSvg);
  const explicitMmDimensions = parseExplicitMmDimensions(normalizedSvg, svgDimensions);
  const detectedModules = detectPoleCount(safeName);
  const widthMm = explicitMmDimensions?.widthMm ?? calculateDefaultWidthMm(detectedModules);
  const modules = explicitMmDimensions?.widthMm
    ? calculateModulesFromWidthMm(explicitMmDimensions.widthMm)
    : detectedModules;
  const heightMm = explicitMmDimensions?.heightMm ?? calculateDefaultHeightMm(category, modules, svgDimensions);
  const customWidth = Math.round(widthMm * MODULE_PX_PER_MM * 100) / 100;
  const customHeight = Math.round(heightMm * MODULE_PX_PER_MM * 100) / 100;
  const deviceKind = detectDeviceKind(category);
  const parameters = extractPlaceholderDefaults(normalizedSvg, category);

  const definition: ImportedModuleDefinition = {
    id: `catalog-${buildStableImportedModuleId(asset.moduleRef)}`,
    code: safeName,
    label: safeName,
    category,
    modules,
    widthMm,
    heightMm,
    deviceKind,
    type: detectType(category),
    phase: detectPhase(category, asset.fileName),
    moduleRef: asset.moduleRef,
    originalFileName: asset.fileName,
    rawSvg: normalizedSvg,
    assetPath: buildDiscoveredModuleAssetPath(asset.moduleRef, buildDiscoveredModuleAssetVersion(asset)),
    customWidth,
    customHeight,
    parameters,
    rcdRatedCurrent: detectRcdRatedCurrent(asset.fileName, category),
    rcdResidualCurrent: detectRcdResidualCurrent(asset.fileName, category),
    rcdType: detectRcdType(asset.fileName, category),
  };

  // Detect terminal block pin positions for discovered terminal modules
  storeTerminalBlockPinPositions(definition.parameters, normalizedSvg, deviceKind);

  return definition;
}

export async function savePendingSvgImportsToDirectory(
  items: PendingSvgImportItem[],
  directoryHandle: FileSystemDirectoryHandle,
) {
  for (const item of items.filter((entry) => entry.selected)) {
    const categoryHandle = await directoryHandle.getDirectoryHandle(item.category, { create: true });
    const fileHandle = await categoryHandle.getFileHandle(item.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(item.rawSvg);
    await writable.close();
  }
}

export function loadImportedModules(): ImportedModuleDefinition[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    ensureImportedModulesCatalogVersion();
    const raw = safeGetItemSync(IMPORTED_MODULES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ImportedModuleDefinition =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      typeof item.assetPath === "string" &&
      typeof item.moduleRef === "string",
    );
  } catch {
    return [];
  }
}

export function saveImportedModules(modules: ImportedModuleDefinition[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    ensureImportedModulesCatalogVersion();
    safeSetItem(IMPORTED_MODULES_STORAGE_KEY, JSON.stringify(modules));
  } catch (error) {
    reportRuntimeError(error, {
      source: "unhandled-error",
    });
  }
}

export function upsertImportedModules(
  currentModules: ImportedModuleDefinition[],
  nextModules: ImportedModuleDefinition[],
): ImportedModuleDefinition[] {
  const nextByKey = new Map(
    nextModules.map((item) => [`${item.category}::${item.code}`.toLocaleLowerCase("pl-PL"), item] as const),
  );

  const merged: ImportedModuleDefinition[] = [];

  for (const currentModule of currentModules) {
    const key = `${currentModule.category}::${currentModule.code}`.toLocaleLowerCase("pl-PL");
    const replacement = nextByKey.get(key);
    if (replacement) {
      merged.push(replacement);
      nextByKey.delete(key);
    } else {
      merged.push(currentModule);
    }
  }

  for (const moduleDefinition of nextByKey.values()) {
    merged.push(moduleDefinition);
  }

  return merged;
}

export function toImportedPaletteTemplate(definition: ImportedModuleDefinition): PaletteTemplate {
  return {
    templateId: `imported-${definition.id}`,
    code: definition.code,
    label: definition.label,
    type: definition.type,
    category: definition.category,
    deviceKind: definition.deviceKind,
    phase: definition.phase,
    modules: definition.modules,
    moduleRef: definition.moduleRef,
    assetPath: definition.assetPath,
    placeholderDefaults: definition.parameters,
    customWidth: definition.customWidth,
    customHeight: definition.customHeight,
    circuitType: detectCircuitType(definition.category),
    rcdRatedCurrent: definition.rcdRatedCurrent,
    rcdResidualCurrent: definition.rcdResidualCurrent,
    rcdType: definition.rcdType,
  };
}

export function mergePaletteGroups(
  builtInGroups: PaletteGroup[],
  importedModules: ImportedModuleDefinition[],
): PaletteGroup[] {
  if (importedModules.length === 0) {
    return builtInGroups;
  }

  const importedByCategory = new Map<string, PaletteTemplate[]>();

  for (const moduleDefinition of importedModules) {
    const bucket = importedByCategory.get(moduleDefinition.category) ?? [];
    bucket.push(toImportedPaletteTemplate(moduleDefinition));
    importedByCategory.set(moduleDefinition.category, bucket);
  }

  const seen = new Set<string>();
  const mergedGroups: PaletteGroup[] = [];

  for (const group of builtInGroups) {
    const importedItems = importedByCategory.get(group.title) ?? [];
    seen.add(group.title);
    mergedGroups.push({
      ...group,
      items: [...importedItems, ...group.items],
      subtitle: importedItems.length > 0
        ? `${group.subtitle} + importowane`
        : group.subtitle,
    });
  }

  for (const [category, items] of importedByCategory.entries()) {
    if (seen.has(category)) {
      continue;
    }

    mergedGroups.push({
      title: category,
      subtitle: "Importowane SVG",
      items,
    });
  }

  return mergedGroups;
}
