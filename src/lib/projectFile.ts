import type { ProjectMetadata } from "../types/projectMetadata";
import { normalizeSymbolItems, type SymbolItem } from "../types/symbolItem";

const DEFAULT_PROJECT_FILE_NAME = "projekt.dinboard";
const PROJECT_FILE_ACCEPT = ".dinboard,.json,application/json";

export type ProjectFileData = {
  metadata: ProjectMetadata | null;
  symbols: SymbolItem[];
  version: string;
  path?: string;
};

type RawProjectFileData = {
  metadata?: ProjectMetadata | null;
  symbols?: Partial<SymbolItem>[];
  circuitRows?: Partial<SymbolItem>[];
  version?: string;
};

function extractProjectSymbols(raw: RawProjectFileData): SymbolItem[] | null {
  if (Array.isArray(raw.symbols)) {
    return normalizeSymbolItems(raw.symbols);
  }

  if (Array.isArray(raw.circuitRows)) {
    return normalizeSymbolItems(raw.circuitRows);
  }

  return null;
}

function parseProjectFileContent(content: string, fileName?: string): ProjectFileData {
  const parsed = JSON.parse(content) as RawProjectFileData;
  const symbols = extractProjectSymbols(parsed);

  if (!parsed.metadata || symbols === null) {
    throw new Error("Nieprawidlowy format pliku projektu");
  }

  return {
    metadata: parsed.metadata,
    symbols,
    version: parsed.version ?? "1.0",
    path: fileName,
  };
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

export async function openProjectFile(): Promise<ProjectFileData | null> {
  const file = await selectProjectFile();

  if (!file) {
    return null;
  }

  try {
    return parseProjectFileContent(await file.text(), file.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany blad";
    throw new Error(`Nie mozna otworzyc pliku: ${message}`);
  }
}

export async function saveProjectFile(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  suggestedPath?: string,
): Promise<string | null> {
  const data: ProjectFileData = {
    metadata,
    symbols,
    version: "2.0",
  };

  const content = JSON.stringify(data, null, 2);
  const fileName = normalizeDownloadFileName(suggestedPath);

  try {
    downloadTextFile(content, fileName);

    return fileName;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany blad";
    throw new Error(`Nie mozna zapisac pliku: ${message}`);
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
    const message = error instanceof Error ? error.message : "Nieznany blad";
    throw new Error(`Nie mozna zaladowac pliku: ${message}`);
  }
}
