import type { CircuitTypeValue, DeviceKind, PhaseAssignment } from "../../types/symbolItem";
import type { PaletteGroup, PaletteTemplate } from "./moduleCatalog";
import { MODULE_PX_PER_MM, MODULE_UNIT_MM_WIDTH } from "./moduleCatalog";
import { reportRuntimeError } from "../runtimeDiagnostics";

const IMPORTED_MODULES_STORAGE_KEY = "dinboard.importedModules";

const CATEGORY_DEFAULT_HEIGHT_MM: Record<string, number> = {
  FR: 80,
  SPD: 90,
  RCD: 83,
  MCB: 83,
  "Kontrolki faz": 83,
  Inne: 85,
};

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

interface SvgDimensions {
  height: number;
  width: number;
}

function parseSvgDimensions(svgMarkup: string): SvgDimensions | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    const viewBox = root.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox
        .split(/[\s,]+/)
        .map((part) => Number.parseFloat(part))
        .filter((part) => Number.isFinite(part));
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        return { width: parts[2], height: parts[3] };
      }
    }

    const width = Number.parseFloat((root.getAttribute("width") ?? "").replace(/px$/i, ""));
    const height = Number.parseFloat((root.getAttribute("height") ?? "").replace(/px$/i, ""));
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    return null;
  }

  return null;
}

function createSvgDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

function parseSvgLengthToMm(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith("%")) {
    return null;
  }

  const match = trimmed.match(/^(-?\d*\.?\d+)(mm|cm|in|pt|pc|q|px)?$/);
  if (!match) {
    return null;
  }

  const numericValue = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  const unit = match[2] ?? "px";
  switch (unit) {
    case "mm":
      return numericValue;
    case "cm":
      return numericValue * 10;
    case "in":
      return numericValue * 25.4;
    case "pt":
      return numericValue * (25.4 / 72);
    case "pc":
      return numericValue * (25.4 / 6);
    case "q":
      return numericValue * 0.25;
    case "px":
      return numericValue * (25.4 / 96);
    default:
      return null;
  }
}

function isPercentSvgLength(value: string | null): boolean {
  return typeof value === "string" && value.trim().endsWith("%");
}

function normalizeDetectionText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function detectPoleCount(fileName: string): number {
  const normalizedName = normalizeDetectionText(fileName);
  const match = normalizedName.match(/(^|[^0-9])([1-9]|1[0-2])\s*P([^A-Z0-9]|$)/);
  if (match) {
    return Number.parseInt(match[2]!, 10);
  }

  if (normalizedName.includes("3XPEN")) {
    return 2;
  }

  const trailingNumberMatch = normalizedName.match(/(?:^|[^0-9])(1[0-2]|[2-9])(?:[^0-9]*)$/);
  if (trailingNumberMatch) {
    return Number.parseInt(trailingNumberMatch[1]!, 10);
  }

  return 1;
}

function detectCategory(fileName: string): string {
  const upperName = normalizeDetectionText(fileName);

  if (upperName.includes("RCD")) return "RCD";
  if (upperName.includes("MCB")) return "MCB";
  if (upperName.includes("SPD")) return "SPD";
  if (upperName.includes("FR")) return "FR";
  if (upperName.includes("BLOK")) return "Blok rozdzielczy";
  if (upperName.includes("LISTWA")) return "Listwy zaciskowe";
  if (upperName.includes("ZLACZ") || upperName.includes("PEN")) return "Z\u0142\u0105cza";
  if (upperName.includes("KONTROLK")) return "Kontrolki faz";

  return "Inne";
}

function detectDeviceKind(category: string): DeviceKind {
  switch (category) {
    case "FR":
      return "fr";
    case "RCD":
      return "rcd";
    case "MCB":
      return "mcb";
    case "SPD":
      return "spd";
    case "Kontrolki faz":
      return "phaseIndicator";
    case "Listwy zaciskowe":
    case "Z\u0142\u0105cza":
      return "terminalBlock";
    default:
      return "other";
  }
}

function detectType(category: string): string {
  switch (category) {
    case "Kontrolki faz":
      return "Controls";
    default:
      return category;
  }
}

function detectPhase(category: string): PhaseAssignment {
  switch (category) {
    case "FR":
    case "RCD":
    case "SPD":
    case "Listwy zaciskowe":
    case "Z\u0142\u0105cza":
      return "L1+L2+L3";
    default:
      return "L1";
  }
}

export function deriveImportTraits(category: string) {
  return {
    deviceKind: detectDeviceKind(category),
    phase: detectPhase(category),
    type: detectType(category),
    defaultHeightMm: CATEGORY_DEFAULT_HEIGHT_MM[category],
  };
}

function detectCircuitType(category: string): CircuitTypeValue | undefined {
  return category === "Inne" ? "Inne" : undefined;
}

function extractPlaceholderDefaults(svgMarkup: string, category: string): Record<string, string> {
  const matches = svgMarkup.match(/\{\{([A-Z0-9_]+)\}\}/g) ?? [];
  const defaults: Record<string, string> = {};

  for (const match of matches) {
    const key = match.slice(2, -2);
    if (defaults[key]) {
      continue;
    }

    switch (key) {
      case "CURRENT":
        defaults[key] = category === "MCB" ? "B16" : "40A";
        break;
      case "SENSITIVITY":
        defaults[key] = "30mA";
        break;
      case "TYPE":
        defaults[key] = "Typ A";
        break;
      case "LABEL":
        defaults[key] = category === "FR" ? "63A" : "";
        break;
      case "BLUE_COVER_VISIBILITY":
      case "BLUE_COVER_VISIBLE":
        defaults[key] = "visible";
        break;
      default:
        defaults[key] = "";
        break;
    }
  }

  return defaults;
}

function parseSvgDocument(svgMarkup: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    const hasParserError = doc.querySelector("parsererror") !== null;
    if (hasParserError || !root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    return doc;
  } catch {
    return null;
  }
}

function isLikelySvgMarkup(svgMarkup: string): boolean {
  let remaining = svgMarkup.replace(/^\uFEFF/, "").trimStart();
  remaining = remaining.replace(/^<\?xml[^>]*>\s*/i, "");

  while (true) {
    const trimmed = remaining.trimStart();
    if (trimmed.startsWith("<!--")) {
      const commentEnd = trimmed.indexOf("-->");
      if (commentEnd < 0) {
        return false;
      }
      remaining = trimmed.slice(commentEnd + 3);
      continue;
    }

    if (/^<!doctype/i.test(trimmed)) {
      const doctypeEnd = trimmed.indexOf(">");
      if (doctypeEnd < 0) {
        return false;
      }
      remaining = trimmed.slice(doctypeEnd + 1);
      continue;
    }

    return /^<svg(?:\s|>)/i.test(trimmed);
  }
}

function isValidSvgMarkup(svgMarkup: string): boolean {
  if (!isLikelySvgMarkup(svgMarkup)) {
    return false;
  }

  if (typeof DOMParser === "undefined") {
    return true;
  }

  return parseSvgDocument(svgMarkup) !== null;
}

function sanitizeSvg(svgMarkup: string): string {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svgMarkup;
  }

  try {
    const doc = parseSvgDocument(svgMarkup);
    if (!doc) {
      return "";
    }

    for (const node of Array.from(doc.querySelectorAll("script, foreignObject"))) {
      node.remove();
    }

    for (const element of Array.from(doc.querySelectorAll("*"))) {
      for (const attribute of Array.from(element.attributes)) {
        if (/^on/i.test(attribute.name)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (attribute.name === "href" || attribute.name === "xlink:href") {
          const value = attribute.value.trim();
          const safeReference =
            value.startsWith("#")
            || value.startsWith("data:image/")
            || value.startsWith("data:application/octet-stream");
          if (!safeReference) {
            element.removeAttribute(attribute.name);
          }
        }
      }
    }

    return new XMLSerializer().serializeToString(doc.documentElement);
  } catch {
    return svgMarkup;
  }
}

function parseExplicitMmDimensions(
  svgMarkup: string,
  svgDimensions: SvgDimensions | null,
): { heightMm: number; source: "svg-300dpi" | "svg-ratio" | "svg-units"; widthMm: number } | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return null;
    }

    const widthMm = parseSvgLengthToMm(root.getAttribute("width"));
    const heightMm = parseSvgLengthToMm(root.getAttribute("height"));
    if (widthMm && heightMm) {
      return { widthMm, heightMm, source: "svg-units" };
    }

    if (svgDimensions && svgDimensions.width > 0 && svgDimensions.height > 0) {
      if (widthMm && !heightMm) {
        return {
          widthMm,
          heightMm: Math.round(((widthMm * svgDimensions.height) / svgDimensions.width) * 100) / 100,
          source: "svg-ratio",
        };
      }

      if (!widthMm && heightMm) {
        return {
          widthMm: Math.round(((heightMm * svgDimensions.width) / svgDimensions.height) * 100) / 100,
          heightMm,
          source: "svg-ratio",
        };
      }
    }

    const hasPercentDimensions =
      isPercentSvgLength(root.getAttribute("width")) || isPercentSvgLength(root.getAttribute("height"));
    const looksLikeSerifExport = root.hasAttribute("xmlns:serif");
    if (svgDimensions && svgDimensions.width > 0 && svgDimensions.height > 0 && (hasPercentDimensions || looksLikeSerifExport)) {
      const mmPerPxAt300Dpi = 25.4 / 300;
      return {
        widthMm: Math.round(svgDimensions.width * mmPerPxAt300Dpi * 100) / 100,
        heightMm: Math.round(svgDimensions.height * mmPerPxAt300Dpi * 100) / 100,
        source: "svg-300dpi",
      };
    }
  } catch {
    return null;
  }

  return null;
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
    phase: detectPhase(category),
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
    const raw = window.localStorage.getItem(IMPORTED_MODULES_STORAGE_KEY);
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
    window.localStorage.setItem(IMPORTED_MODULES_STORAGE_KEY, JSON.stringify(modules));
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
