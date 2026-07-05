import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ProjectMetadata } from "../types/projectMetadata";
import { normalizeSymbolItems, type SymbolItem } from "../types/symbolItem";
import { createDefaultConnection, filterConnectionOverrides, type ConnectionItem } from "../types/connectionItem";
import { getModuleAssetUrl } from "./modules/moduleCatalog";
import { migrateProjectData, runMigrations } from "./projectMigrations";

const DEFAULT_PROJECT_FILE_NAME = "zlecenie.dinboard";
const PROJECT_FILE_ACCEPT = ".dinboard,.json,application/json";
const WEB_PROJECT_SCHEMA_VERSION = 2;


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
  /**
   * Migracje z rejestru, które zostały zastosowane przy ostatnim otwarciu.
   * Używane do pominięcia idempotentnych/kosztownych migracji przy kolejnych
   * otwarciach. Zapisywane z powrotem do pliku przy `serializeProjectFileContent`.
   */
  appliedMigrations?: string[];
};

type RawProjectFileData = {
  metadata?: ProjectMetadata | null;
  symbols?: Partial<SymbolItem>[];
  connections?: Partial<ConnectionItem>[];
  version?: string;
  schemaVersion?: number;
  appliedMigrations?: string[];
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

function resolveVisualPath(rawVisualPath: unknown, rawModuleRef: unknown): string {
  if (typeof rawVisualPath === "string" && rawVisualPath.trim().length > 0) {
    let path = rawVisualPath;
    if (
      !path.startsWith("/") &&
      !path.startsWith("http") &&
      !path.toLowerCase().startsWith("assets/modules/") &&
      !path.toLowerCase().startsWith("assets\\modules\\")
    ) {
      path = "assets/modules/" + path;
    }
    return path;
  }

  if (typeof rawModuleRef !== "string" || rawModuleRef.trim().length === 0) {
    return "";
  }

  return getModuleAssetUrl(rawModuleRef);
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

function extractProjectSymbols(raw: RawProjectFileData): SymbolItem[] | null {
  if (Array.isArray(raw.symbols)) {
    return normalizeSymbolItems(
      normalizeNullableObject(raw.symbols).map((item) => {
        const rawModuleRef = typeof item?.moduleRef === "string" ? item.moduleRef : "";

        return {
          ...item,
          type: typeof item?.type === "string" ? item.type : "",
          label: typeof item?.label === "string" ? item.label : "",
          visualPath: resolveVisualPath(item?.visualPath, rawModuleRef),
          moduleRef: rawModuleRef,
          moduleSourceType: resolveModuleSourceType(item?.moduleSourceType, rawModuleRef),
          phase: typeof item?.phase === "string" ? item?.phase : "L1",
        };
      }),
    );
  }

  return null;
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

export function parseProjectFileContent(content: string, fileName?: string): ProjectFileData {
  let parsed = normalizeNullableObject(JSON.parse(content) as RawProjectFileData);

  // Schema-version migration chain (no-op when registry is empty for this version).
  if (parsed.schemaVersion !== undefined && parsed.schemaVersion < WEB_PROJECT_SCHEMA_VERSION) {
    parsed = migrateProjectData(parsed, parsed.schemaVersion, WEB_PROJECT_SCHEMA_VERSION);
  }

  validateWebProjectShape(parsed);

  const symbols = extractProjectSymbols(parsed);

  if (symbols === null) {
    throw new Error("Nieprawidlowy format pliku zlecenia");
  }

  // Run registry-based migrations against the symbols. Legacy reference designation
  // migration operates on `data.symbols`; we run it via a wrapper shape so the registry
  // sees a uniform Record<string, unknown> interface, then pick the migrated symbols back.
  const inputAppliedMigrations = Array.isArray(parsed.appliedMigrations)
    ? parsed.appliedMigrations.filter((entry): entry is string => typeof entry === "string")
    : [];
  const migrationResult = runMigrations(
    { symbols } as unknown as Record<string, unknown>,
    inputAppliedMigrations,
  );
  const migratedSymbols = (migrationResult.data.symbols as SymbolItem[] | undefined) ?? symbols;

  let connections: ConnectionItem[] = [];
  if (Array.isArray(parsed.connections)) {
    connections = parsed.connections
      .filter((conn): conn is Record<string, unknown> =>
        conn !== null && typeof conn === "object" && !Array.isArray(conn),
      )
      .map((conn) => createDefaultConnection(filterConnectionOverrides(conn)));
  }

  // Drop connections referencing symbols that don't exist (data integrity).
  // WHY: routing engine uses `symbols.find(s => s.id === connection.fromSymbolId)`
  // which returns `undefined` for orphans → tulejka renders with default 150px
  // length in random position. This was the cause of "tulejka w nieodpowiednim
  // miejscu" edge case observed in testProject.dinboard (2026-06-20).
  const symbolIds = new Set(migratedSymbols.map((s) => s.id));
  const validConnections = connections.filter((c) => {
    const hasFrom = symbolIds.has(c.fromSymbolId);
    const hasTo = symbolIds.has(c.toSymbolId);
    if (!hasFrom || !hasTo) {
      console.warn(
        `[projectFile] Dropping orphan connection ${c.id}: ` +
        `fromSymbolId=${c.fromSymbolId} (${hasFrom ? "OK" : "MISSING"}), ` +
        `toSymbolId=${c.toSymbolId} (${hasTo ? "OK" : "MISSING"})`,
      );
      return false;
    }
    return true;
  });
  const droppedCount = connections.length - validConnections.length;
  if (droppedCount > 0) {
    console.warn(
      `[projectFile] Dropped ${droppedCount} orphan connection(s) — references symbols that don't exist in this project file`,
    );
  }

  return {
    metadata: parsed.metadata ?? null,
    symbols: migratedSymbols,
    connections: validConnections,
    version: parsed.version ?? String(parsed.schemaVersion ?? "1.0"),
    path: fileName,
    rail: toRailFromWeb(parsed),
    appliedMigrations: migrationResult.appliedMigrations,
  };
}

export function serializeProjectFileContent(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  rail: ProjectFileData["rail"],
  connections?: ConnectionItem[],
  appliedMigrations?: string[],
): string {
  const data: ProjectFileData = {
    metadata,
    symbols,
    connections: connections ?? [],
    version: "2.0",
    rail: rail?.isVisible ? rail : null,
    appliedMigrations: appliedMigrations && appliedMigrations.length > 0 ? appliedMigrations : undefined,
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
      throw new Error(`Nie można otworzyć pliku: ${message}`, { cause: error });
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
    throw new Error(`Nie można otworzyć pliku: ${message}`, { cause: error });
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
    throw new Error(`Nie można zapisać pliku: ${message}`, { cause: error });
  }
}

