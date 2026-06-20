import { type PaletteTemplate } from './modules/moduleCatalog';
import { DinRailConfig } from './schematic/dinRailGenerator';

export type { PaletteTemplate };

export type SheetType = "sheet1" | "sheet1_connections" | "sheet2" | "sheet3" | "sheet4";
export type RightTab = "config" | "balance" | "validation" | "circuitEdit" | "pages";

export const DEFAULT_DIN_RAIL_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
export const HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY = "dinboard.hiddenPaletteTemplateIds";
export const SYMBOLS_STORAGE_KEY = "dinboard-web.symbols.v1";
export const LEGACY_SYMBOLS_STORAGE_KEY = "dinboard-tauri.symbols.v1";

// --- RE-EXPORTS FROM DOMAIN ---

export * from './domain/paletteFormatting';
export * from './domain/referenceDesignations';
export * from './domain/symbolGrouping';
export * from './domain/dinRailArrangement';
export * from './domain/snapshotUtils';

// --- UI HELPERS ---

export function createDragPreviewAssetSource(visualNode: HTMLElement | null): string | null {
  if (!visualNode) {
    return null;
  }

  const canvas = visualNode.querySelector("canvas");
  if (canvas instanceof HTMLCanvasElement) {
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  const image = visualNode.querySelector("img");
  if (image instanceof HTMLImageElement) {
    return image.currentSrc || image.src || null;
  }

  const svg = visualNode.querySelector("svg");
  if (svg instanceof SVGElement) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
  }

  return null;
}

export function createPaletteDragPreview(
  visualNode: HTMLElement | null,
  width: number,
  height: number,
): HTMLDivElement | null {
  const source = createDragPreviewAssetSource(visualNode);
  if (!source) {
    return null;
  }

  const preview = document.createElement("div");
  preview.style.position = "fixed";
  preview.style.left = "-10000px";
  preview.style.top = "-10000px";
  preview.style.width = `${Math.max(1, Math.round(width))}px`;
  preview.style.height = `${Math.max(1, Math.round(height))}px`;
  preview.style.display = "grid";
  preview.style.placeItems = "center";
  preview.style.pointerEvents = "none";
  preview.style.background = "transparent";
  preview.style.zIndex = "9999";

  const image = document.createElement("img");
  image.src = source;
  image.draggable = false;
  image.style.display = "block";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.pointerEvents = "none";

  preview.appendChild(image);
  document.body.appendChild(preview);
  return preview;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function getProjectFileName(filePath: string | null): string {
  if (!filePath) {
    return "Nowe zlecenie";
  }
  return filePath.split(/[/\\]/).pop() || "Nowe zlecenie";
}
