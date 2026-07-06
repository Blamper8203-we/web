import { type PaletteTemplate } from './modules/moduleCatalog';
import { DinRailConfig } from './schematic/dinRailGenerator';

export type { PaletteTemplate };

export type SheetType = "sheet1" | "sheet1_connections" | "sheet2" | "sheet3" | "sheet4" | "sheet5_smarthome";
export type RightTab = "config" | "balance" | "validation" | "circuitEdit" | "pages";

export const DEFAULT_DIN_RAIL_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
export const HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY = "dinboard.hiddenPaletteTemplateIds";
export const SYMBOLS_STORAGE_KEY = "dinboard-web.symbols.v1";
export const LEGACY_SYMBOLS_STORAGE_KEY = "dinboard-tauri.symbols.v1";
export const CONNECTIONS_STORAGE_KEY = "dinboard.connections";
export const DEFAULT_WIRE_SETTINGS_STORAGE_KEY = "dinboard.default_wire_settings";

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

// WHY: The native setDragImage API always applies browser-imposed opacity
// (~70% in Chrome, ~80% Firefox), making the drag preview look faded.
// A custom drag layer creates a fixed-position overlay that follows the
// cursor via document dragover events, giving full control over appearance.
// The native drag ghost is hidden by a 1×1 transparent canvas.

let activeDragLayer: HTMLDivElement | null = null;

function cloneVisualContent(visualNode: HTMLElement): HTMLElement | null {
  const canvas = visualNode.querySelector("canvas");
  if (canvas instanceof HTMLCanvasElement) {
    try {
      const newCanvas = document.createElement("canvas");
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      const ctx = newCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
      }
      return newCanvas;
    } catch {
      // Fall through
    }
  }

  const img = visualNode.querySelector("img");
  if (img instanceof HTMLImageElement) {
    return img.cloneNode(true) as HTMLImageElement;
  }

  const svg = visualNode.querySelector("svg");
  if (svg instanceof SVGElement) {
    return svg.cloneNode(true) as HTMLElement;
  }

  return null;
}

export function startCustomDragLayer(
  event: DragEvent,
  visualNode: HTMLElement | null,
  width: number,
  height: number,
): void {
  cleanupCustomDragLayer();

  if (!visualNode) return;

  const clonedContent = cloneVisualContent(visualNode);
  if (!clonedContent) return;

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);

  const layer = document.createElement("div");
  layer.style.position = "fixed";
  layer.style.left = `${event.clientX - halfW}px`;
  layer.style.top = `${event.clientY - halfH}px`;
  layer.style.width = `${w}px`;
  layer.style.height = `${h}px`;
  layer.style.display = "grid";
  layer.style.placeItems = "center";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9999";
  layer.style.opacity = "0.9";

  clonedContent.style.display = "block";
  clonedContent.style.width = "100%";
  clonedContent.style.height = "100%";
  clonedContent.style.objectFit = "contain";
  clonedContent.style.pointerEvents = "none";
  if ("draggable" in clonedContent) {
    (clonedContent as HTMLImageElement).draggable = false;
  }

  layer.appendChild(clonedContent);
  document.body.appendChild(layer);
  activeDragLayer = layer;

  // Track cursor position
  const onDragOver = (e: DragEvent) => {
    if (activeDragLayer && e.clientX > 0 && e.clientY > 0) {
      activeDragLayer.style.left = `${e.clientX - halfW}px`;
      activeDragLayer.style.top = `${e.clientY - halfH}px`;
    }
  };

  const cleanup = () => {
    cleanupCustomDragLayer();
    document.removeEventListener("dragover", onDragOver);
    document.removeEventListener("dragend", cleanup);
    document.removeEventListener("drop", cleanup);
  };

  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragend", cleanup);
  document.addEventListener("drop", cleanup);

  // Hide native drag ghost: setDragImage requires the element in the DOM
  const emptyGhost = document.createElement("canvas");
  emptyGhost.width = 1;
  emptyGhost.height = 1;
  emptyGhost.style.position = "fixed";
  emptyGhost.style.left = "-10000px";
  emptyGhost.style.top = "-10000px";
  emptyGhost.style.opacity = "0.01";
  document.body.appendChild(emptyGhost);
  if (event.dataTransfer) {
    event.dataTransfer.setDragImage(emptyGhost, 0, 0);
  }
  window.setTimeout(() => emptyGhost.remove(), 0);
}

export function cleanupCustomDragLayer(): void {
  if (activeDragLayer) {
    activeDragLayer.remove();
    activeDragLayer = null;
  }
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
