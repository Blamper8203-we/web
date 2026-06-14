import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ProjectMetadata } from "../types/projectMetadata";
import { normalizeSymbolItems, type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import { createEmptyProjectMetadata } from "./projectMetadata";
import { getModuleAssetUrl } from "./modules/moduleCatalog";
import { buildSchematicLayout } from "./schematic/schematicLayoutEngine";

const DEFAULT_PROJECT_FILE_NAME = "zlecenie.dinboard";
const PROJECT_FILE_ACCEPT = ".dinboard,.json,application/json";
const WEB_PROJECT_SCHEMA_VERSION = 2;
const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

export type ProjectFileData = {
  metadata: ProjectMetadata | null;
  symbols: SymbolItem[];
  connections?: ConnectionItem[];
  version: string;
  path?: string;
  rail?: {
    svg: string;
    width: number;
    height: number;
    rows: number;
    modulesPerRow: number;
    isVisible: boolean;
  } | null;
};

type RawProjectFileData = {
  metadata?: ProjectMetadata | null;
  symbols?: Partial<SymbolItem>[];
  connections?: Partial<ConnectionItem>[];
  circuitRows?: Partial<SymbolItem>[];
  version?: string;
  schemaVersion?: number;
  name?: string | null;
  description?: string | null;
  powerConfig?: {
    voltage?: number | null;
    mainProtection?: number | null;
    powerKw?: number | null;
    phases?: number | null;
  } | null;
  dinRailSvgContent?: string;
  dinRailWidth?: number;
  dinRailHeight?: number;
  dinRailAxes?: number[];
  isDinRailVisible?: boolean;
  rail?: {
    svg?: string;
    width?: number;
    height?: number;
    rows?: number;
    modulesPerRow?: number;
    isVisible?: boolean;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateWebProjectShape(raw: RawProjectFileData): void {
  if (!("metadata" in raw) || !("symbols" in raw)) {
    throw new Error("Brak wymaganych pól metadata/symbols");
  }

  if (raw.metadata !== undefined && raw.metadata !== null && !isRecord(raw.metadata)) {
    throw new Error("Pole metadata ma nieprawidlowy typ");
  }

  if (!Array.isArray(raw.symbols)) {
    throw new Error("Pole symbols musi byc tablica");
  }

  for (const item of raw.symbols) {
    if (!isRecord(item)) {
      throw new Error("Element symbols ma nieprawidlowy format");
    }
  }

  if (raw.connections !== undefined && raw.connections !== null) {
    if (!Array.isArray(raw.connections)) {
      throw new Error("Pole connections musi byc tablica");
    }
    for (const item of raw.connections) {
      if (!isRecord(item)) {
        throw new Error("Element connections ma nieprawidlowy format");
      }
    }
  }

  if (raw.rail !== undefined && raw.rail !== null) {
    if (!isRecord(raw.rail)) {
      throw new Error("Pole rail ma nieprawidlowy typ");
    }
    const rail = raw.rail as Record<string, unknown>;
    if ("svg" in rail && rail.svg !== undefined && typeof rail.svg !== "string") {
      throw new Error("Pole rail.svg ma nieprawidlowy typ");
    }
    for (const key of ["width", "height", "rows", "modulesPerRow"] as const) {
      if (key in rail && rail[key] !== undefined && typeof rail[key] !== "number") {
        throw new Error(`Pole rail.${key} ma nieprawidlowy typ`);
      }
    }
    if ("isVisible" in rail && rail.isVisible !== undefined && typeof rail.isVisible !== "boolean") {
      throw new Error("Pole rail.isVisible ma nieprawidlowy typ");
    }
  }

  if (raw.schemaVersion !== undefined) {
    if (!Number.isInteger(raw.schemaVersion) || raw.schemaVersion <= 0) {
      throw new Error("Nieprawidlowe schemaVersion");
    }
    if (raw.schemaVersion > WEB_PROJECT_SCHEMA_VERSION) {
      throw new Error(`Nowsza wersja schematu (${raw.schemaVersion})`);
    }
  }
}

const MODULE_REF_ALIASES: Record<string, string> = {
  "Złącza/ZŁĄCZE 3XPEN.svg": "zlacza/zlacze-3xpen.svg",
  "Złącza/Listwa zaciskowa 5pin (3P+N+PE).svg": "zlacza/listwa-zaciskowa-5pin-3p-n-pe.svg",
};

function normalizeModuleRefForWeb(moduleRef: string): string {
  const cleaned = moduleRef
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^Avalonia\/Assets\/Modules\//i, "")
    .replace(/^Assets\/Modules\//i, "")
    .replace(/^assets\/modules\//i, "");

  return MODULE_REF_ALIASES[cleaned] ?? cleaned;
}

function resolveVisualPath(rawVisualPath: unknown, rawModuleRef: unknown): string {
  if (typeof rawVisualPath === "string" && rawVisualPath.trim().length > 0) {
    return rawVisualPath;
  }

  if (typeof rawModuleRef !== "string" || rawModuleRef.trim().length === 0) {
    return "";
  }

  return getModuleAssetUrl(normalizeModuleRefForWeb(rawModuleRef));
}

function resolveModuleSourceType(rawModuleSourceType: unknown, normalizedModuleRef: string): string {
  if (typeof rawModuleSourceType === "string" && rawModuleSourceType.trim().length > 0) {
    return rawModuleSourceType;
  }

  return normalizedModuleRef.length > 0 ? "ProjectRelativeFile" : "";
}

function normalizeNullableObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeNullableObject(item)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (nestedValue === null) {
        continue;
      }

      next[key] = normalizeNullableObject(nestedValue);
    }

    return next as T;
  }

  return value;
}

function toProjectMetadataFromAvalonia(raw: RawProjectFileData): ProjectMetadata {
  const defaults = createEmptyProjectMetadata();
  const allowedMainBreakers = [25, 32, 40, 63, 80, 100, 125] as const;
  const voltage = raw.powerConfig?.voltage === 400 ? 400 : 230;
  const phases = raw.powerConfig?.phases === 1 ? 1 : 3;
  const mainProtection = Number(raw.powerConfig?.mainProtection);
  const powerKw = Number(raw.powerConfig?.powerKw);
  const normalizedName = raw.name?.trim() || "";
  const resolvedMainBreaker =
    Number.isFinite(mainProtection) && mainProtection > 0
      ? allowedMainBreakers.reduce((nearest, candidate) =>
          Math.abs(candidate - mainProtection) < Math.abs(nearest - mainProtection)
            ? candidate
            : nearest,
        allowedMainBreakers[0])
      : defaults.mainBreakerA;

  return {
    ...defaults,
    company: normalizedName,
    notes: raw.description?.trim() || defaults.notes,
    supplyVoltageV: voltage,
    supplyPhases: phases,
    mainBreakerA: resolvedMainBreaker,
    contractedPowerKw: Number.isFinite(powerKw) && powerKw > 0 ? powerKw : defaults.contractedPowerKw,
  };
}

function extractProjectSymbols(raw: RawProjectFileData): SymbolItem[] | null {
  if (Array.isArray(raw.symbols)) {
    return normalizeSymbolItems(
      normalizeNullableObject(raw.symbols).map((item) => {
        const rawModuleRef = typeof item?.moduleRef === "string" ? item.moduleRef : "";
        const normalizedModuleRef = normalizeModuleRefForWeb(rawModuleRef);

        return {
          ...item,
          type: typeof item?.type === "string" ? item.type : "",
          label: typeof item?.label === "string" ? item.label : "",
          visualPath: resolveVisualPath(item?.visualPath, rawModuleRef),
          moduleRef: normalizedModuleRef,
          moduleSourceType: resolveModuleSourceType(item?.moduleSourceType, normalizedModuleRef),
          phase: typeof item?.phase === "string" ? item.phase : "L1",
        };
      }),
    );
  }

  if (Array.isArray(raw.circuitRows)) {
    return normalizeSymbolItems(
      normalizeNullableObject(raw.circuitRows).map((item) => {
        const rawModuleRef = typeof item?.moduleRef === "string" ? item.moduleRef : "";
        const normalizedModuleRef = normalizeModuleRefForWeb(rawModuleRef);

        return {
          ...item,
          type: typeof item?.type === "string" ? item.type : "",
          label: typeof item?.label === "string" ? item.label : "",
          visualPath: resolveVisualPath(item?.visualPath, rawModuleRef),
          moduleRef: normalizedModuleRef,
          moduleSourceType: resolveModuleSourceType(item?.moduleSourceType, normalizedModuleRef),
          phase: typeof item?.phase === "string" ? item.phase : "L1",
        };
      }),
    );
  }

  return null;
}

function normalizeAvaloniaCoordinates(
  symbols: SymbolItem[],
  raw: RawProjectFileData,
): SymbolItem[] {
  const railWidth = Number(raw.dinRailWidth);
  const railHeight = Number(raw.dinRailHeight);

  if (!Number.isFinite(railWidth) || !Number.isFinite(railHeight) || railWidth <= 0 || railHeight <= 0) {
    return symbols;
  }

  const offsetX = railWidth / 2;
  const offsetY = railHeight / 2;

  return symbols.map((symbol) => ({
    ...symbol,
    x: symbol.x + offsetX,
    y: symbol.y + offsetY,
  }));
}

function toRailFromAvalonia(raw: RawProjectFileData) {
  const svg = typeof raw.dinRailSvgContent === "string" ? raw.dinRailSvgContent : "";
  const width = Number(raw.dinRailWidth);
  const height = Number(raw.dinRailHeight);
  const rows = Array.isArray(raw.dinRailAxes) && raw.dinRailAxes.length > 0 ? raw.dinRailAxes.length : 1;
  const modulesPerRow = Number.isFinite(width) && width > 0 ? Math.max(6, Math.min(48, Math.round((width - 120) / 17.5))) : 24;

  if (!svg || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    svg,
    width,
    height,
    rows: Math.max(1, Math.min(10, rows)),
    modulesPerRow,
    isVisible: raw.isDinRailVisible !== false,
  };
}

function toRailFromWeb(raw: RawProjectFileData): ProjectFileData["rail"] {
  const rail = raw.rail;
  if (!rail) {
    return null;
  }

  const svg = typeof rail.svg === "string" ? rail.svg : "";
  const width = Number(rail.width);
  const height = Number(rail.height);
  const rows = Number(rail.rows);
  const modulesPerRow = Number(rail.modulesPerRow);
  const isVisible = rail.isVisible === true;

  if (!isVisible || !svg || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    svg,
    width,
    height,
    rows: Number.isFinite(rows) ? Math.max(1, Math.min(10, Math.round(rows))) : 1,
    modulesPerRow: Number.isFinite(modulesPerRow) ? Math.max(6, Math.min(48, Math.round(modulesPerRow))) : 24,
    isVisible: true,
  };
}

function cloneForAutomaticDesignationAnalysis(symbol: SymbolItem): SymbolItem {
  const parameters = { ...symbol.parameters };
  delete parameters[MANUAL_REFERENCE_DESIGNATION_KEY];

  return {
    ...symbol,
    referenceDesignation: "",
    parameters,
  };
}

function buildAutomaticDesignationMap(symbols: SymbolItem[]): Map<string, string> {
  const layout = buildSchematicLayout(symbols);
  const automaticDesignations = new Map<string, string>();

  for (const node of layout.nodes) {
    const designation = node.designation.trim();
    if (designation.length > 0) {
      automaticDesignations.set(node.id, designation);
    }
  }

  return automaticDesignations;
}

function migrateLegacyManualReferenceDesignations(symbols: SymbolItem[]): SymbolItem[] {
  if (symbols.length === 0) {
    return symbols;
  }

  const automaticDesignations = buildAutomaticDesignationMap(
    symbols.map(cloneForAutomaticDesignationAnalysis),
  );
  let changed = false;

  const migratedSymbols = symbols.map((symbol) => {
    const currentDesignation = symbol.referenceDesignation.trim();
    const isManualDesignation =
      symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY]?.toLocaleLowerCase("pl-PL") === "true";

    if (currentDesignation.length === 0 || isManualDesignation) {
      return symbol;
    }

    const automaticDesignation = automaticDesignations.get(symbol.id);
    if (!automaticDesignation) {
      return symbol;
    }

    if (currentDesignation !== automaticDesignation) {
      changed = true;
      return {
        ...symbol,
        referenceDesignation: currentDesignation,
        parameters: {
          ...symbol.parameters,
          [MANUAL_REFERENCE_DESIGNATION_KEY]: "true",
        },
      };
    }

    return symbol;
  });

  return changed ? migratedSymbols : symbols;
}

export function parseProjectFileContent(content: string, fileName?: string): ProjectFileData {
  const parsed = normalizeNullableObject(JSON.parse(content) as RawProjectFileData);
  const symbols = extractProjectSymbols(parsed);
  const hasWebShape = "metadata" in parsed && "symbols" in parsed && "version" in parsed;
  const hasAvaloniaSchema = typeof parsed.schemaVersion === "number" && parsed.schemaVersion > 0 && !hasWebShape;

  if (symbols === null || (!hasWebShape && !hasAvaloniaSchema)) {
    throw new Error("Nieprawidlowy format pliku zlecenia");
  }

  if (hasWebShape) {
    validateWebProjectShape(parsed);
  }

  const normalizedSymbols = hasAvaloniaSchema
    ? normalizeAvaloniaCoordinates(symbols, parsed)
    : symbols;
  const migratedSymbols = migrateLegacyManualReferenceDesignations(normalizedSymbols);

  let connections: ConnectionItem[] = [];
  if (hasWebShape && Array.isArray(parsed.connections)) {
    connections = parsed.connections.map((conn: any) => ({
      id: typeof conn.id === "string" && conn.id.trim().length > 0 ? conn.id : crypto.randomUUID(),
      fromSymbolId: typeof conn.fromSymbolId === "string" ? conn.fromSymbolId : "",
      fromTerminal: typeof conn.fromTerminal === "string" ? conn.fromTerminal : "",
      toSymbolId: typeof conn.toSymbolId === "string" ? conn.toSymbolId : "",
      toTerminal: typeof conn.toTerminal === "string" ? conn.toTerminal : "",
      wireColor: typeof conn.wireColor === "string" ? conn.wireColor : "black",
      wireCrossSection: typeof conn.wireCrossSection === "number" ? conn.wireCrossSection : 2.5,
      wireType: typeof conn.wireType === "string" ? conn.wireType : "LgY",
      ferruleColor: typeof conn.ferruleColor === "string" ? conn.ferruleColor : undefined,
      routingMode: typeof conn.routingMode === "string" ? conn.routingMode : "manhattan",
      customOffset: typeof conn.customOffset === "number" ? conn.customOffset : undefined,
      customOffsetX: typeof conn.customOffsetX === "number" ? conn.customOffsetX : undefined,
      customOffsetY1: typeof conn.customOffsetY1 === "number" ? conn.customOffsetY1 : undefined,
      customOffsetY2: typeof conn.customOffsetY2 === "number" ? conn.customOffsetY2 : undefined,
      isFromTop: typeof conn.isFromTop === "boolean" ? conn.isFromTop : undefined,
      isToTop: typeof conn.isToTop === "boolean" ? conn.isToTop : undefined,
      points: Array.isArray(conn.points) ? conn.points.filter((p: any) => typeof p.x === 'number' && typeof p.y === 'number') : undefined,
    }));
  }

  return {
    metadata: hasWebShape ? parsed.metadata ?? null : toProjectMetadataFromAvalonia(parsed),
    symbols: migratedSymbols,
    connections,
    version: parsed.version ?? String(parsed.schemaVersion ?? "1.0"),
    path: fileName,
    rail: hasAvaloniaSchema ? toRailFromAvalonia(parsed) : toRailFromWeb(parsed),
  };
}

export function serializeProjectFileContent(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  rail: ProjectFileData["rail"],
  connections?: ConnectionItem[],
): string {
  const data: ProjectFileData = {
    metadata,
    symbols,
    connections: connections ?? [],
    version: "2.0",
    rail: rail?.isVisible ? rail : null,
  };

  return JSON.stringify(
    {
      schemaVersion: WEB_PROJECT_SCHEMA_VERSION,
      ...data,
    },
    null,
    2,
  );
}

function selectProjectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    let settled = false;

    const finish = (file: File | null) => {
      if (settled) {
        return;
      }

      settled = true;
      window.removeEventListener("focus", handleFocus);
      input.remove();
      resolve(file);
    };

    const handleFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) {
          finish(null);
        }
      }, 250);
    };

    input.type = "file";
    input.accept = PROJECT_FILE_ACCEPT;

    input.addEventListener(
      "change",
      () => {
        finish(input.files?.[0] ?? null);
      },
      { once: true },
    );

    window.addEventListener("focus", handleFocus, { once: true });
    input.click();
  });
}

function normalizeDownloadFileName(fileName: string | undefined): string {
  const fallback = DEFAULT_PROJECT_FILE_NAME;
  const cleaned = (fileName ?? fallback).split(/[\\/]/).pop()?.trim() || fallback;

  return /\.(dinboard|json)$/i.test(cleaned) ? cleaned : `${cleaned}.dinboard`;
}

type TauriInvokeFn = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

/**
 * Detect a Tauri runtime and return a function to invoke backend commands.
 *
 * Uses the official `isTauri()` from @tauri-apps/api/core which handles all
 * known injection points (window.__TAURI_INTERNALS__ in Tauri 2.x,
 * window.__TAURI__.core.invoke when withGlobalTauri is enabled, etc).
 *
 * Returns null on plain web, so the calling code can fall back to the
 * browser File System Access API or <a download>.
 */
function getTauriInvoke(): TauriInvokeFn | null {
  if (!isTauri()) {
    return null;
  }
  // Wrap the typed `invoke` to match the call-site shape.
  return (command, args) => invoke(command, args ?? {}) as Promise<unknown>;
}

function downloadTextFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function saveTextFileWithBrowserPicker(content: string, fileName: string): Promise<string | null> {
  const picker = (window as unknown as {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      startIn?: "documents" | "downloads" | "desktop" | "music" | "pictures" | "videos";
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
      excludeAcceptAllOption?: boolean;
    }) => Promise<{
      createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
      name?: string;
    }>;
  }).showSaveFilePicker;

  if (typeof picker !== "function") {
    return null;
  }

  const handle = await picker({
    suggestedName: fileName,
    startIn: "documents",
    excludeAcceptAllOption: true,
    types: [
      {
        description: "DINBoard Project",
        accept: { "application/json": [".dinboard"] },
      },
    ],
  });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return handle.name ?? fileName;
}

type TauriOpenedFilePayload = {
  path?: unknown;
  content?: unknown;
};

export async function openProjectFile(): Promise<ProjectFileData | null> {
  const invoke = getTauriInvoke();
  if (invoke) {
    try {
      const result = await invoke("open_project_file_with_dialog");
      if (!result) {
        return null;
      }
      const payload = result as TauriOpenedFilePayload;
      const content = typeof payload.content === "string" ? payload.content : "";
      const path = typeof payload.path === "string" ? payload.path : undefined;
      if (!content) {
        throw new Error("Pusty plik lub nieprawidlowy format odpowiedzi");
      }
      return parseProjectFileContent(content, path);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      throw new Error(`Nie można otworzyć pliku: ${message}`);
    }
  }

  const file = await selectProjectFile();

  if (!file) {
    return null;
  }

  try {
    return parseProjectFileContent(await file.text(), file.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd";
    throw new Error(`Nie można otworzyć pliku: ${message}`);
  }
}

export async function saveProjectFile(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  rail: ProjectFileData["rail"],
  suggestedPath?: string,
  connections?: ConnectionItem[],
): Promise<string | null> {
  const content = serializeProjectFileContent(metadata, symbols, rail, connections);
  const fileName = normalizeDownloadFileName(suggestedPath ?? DEFAULT_PROJECT_FILE_NAME);

  try {
    const invoke = getTauriInvoke();
    if (invoke) {
      const result = await invoke("save_project_file_with_dialog", {
        content,
        suggestedFileName: fileName,
      });
      if (typeof result === "string" && result.trim().length > 0) {
        return result;
      }
      return null;
    }

    const pickedName = await saveTextFileWithBrowserPicker(content, fileName);
    if (pickedName) {
      return normalizeDownloadFileName(pickedName);
    }

    downloadTextFile(content, fileName);

    return fileName;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd";
    throw new Error(`Nie można zapisać pliku: ${message}`);
  }
}

export async function loadProjectFromPath(filePath: string): Promise<ProjectFileData | null> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return parseProjectFileContent(await response.text(), filePath.split(/[\\/]/).pop());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd";
    throw new Error(`Nie można załadować pliku: ${message}`);
  }
}
