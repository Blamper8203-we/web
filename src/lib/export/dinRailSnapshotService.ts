import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem } from "../../types/symbolItem";
import { buildSchematicLayout } from "../schematic/schematicLayoutEngine";
import {
  DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_LABEL_GAP,
  DIN_RAIL_GROUP_BRACKET_LABEL_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_OFFSET_Y,
  DIN_RAIL_GROUP_FRAME_PADDING,
  buildDinRailGroupFrames,
  formatDinRailGroupLabel,
} from "../dinRailSelection";
import { loadPreparedSvgDataUri } from "../modules/svgAsset";

const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

export interface DinRailSnapshotExportOptions {
  includeDesignations?: boolean;
  includeGroupFrames?: boolean;
  scale?: number;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header?.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const binary = atob(data ?? "");
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function drawGroupFrame(
  ctx: CanvasRenderingContext2D,
  group: ReturnType<typeof buildDinRailGroupFrames>[number],
  railWidth: number,
): void {
  ctx.save();
  const isSingle = group.memberCount <= 1;
  const topY = Math.max(4, group.y - DIN_RAIL_GROUP_BRACKET_OFFSET_Y);
  const barHeight = DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT;
  const legHeight = DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT;
  const color = isSingle ? "rgba(82, 148, 255, 0.5)" : "rgba(82, 148, 255, 0.9)";

  ctx.fillStyle = color;
  ctx.fillRect(group.x, topY, group.width, barHeight);

  const legGradient = ctx.createLinearGradient(0, topY, 0, topY + legHeight);
  legGradient.addColorStop(0, isSingle ? "rgba(82, 148, 255, 0.5)" : "rgba(82, 148, 255, 0.95)");
  legGradient.addColorStop(1, "rgba(82, 148, 255, 0)");
  ctx.fillStyle = legGradient;
  ctx.fillRect(group.x, topY, barHeight, legHeight);
  ctx.fillRect(group.x + group.width - barHeight, topY, barHeight, legHeight);

  const label = formatDinRailGroupLabel(group.label, group.id);
  ctx.font = "600 12px 'Inter', 'Segoe UI', Arial, sans-serif";
  const labelWidth = clamp(Math.ceil(ctx.measureText(label).width) + 20, 44, 300);
  const labelHeight = DIN_RAIL_GROUP_BRACKET_LABEL_HEIGHT;
  const labelX = clamp(
    group.x + group.width / 2 - labelWidth / 2,
    4,
    Math.max(4, railWidth - labelWidth - 4),
  );
  const labelY = Math.max(
    4,
    topY - DIN_RAIL_GROUP_BRACKET_LABEL_GAP - DIN_RAIL_GROUP_BRACKET_LABEL_HEIGHT,
  );

  ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(82, 148, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2 + 1, labelWidth - 8);
  ctx.restore();
}

function buildAutomaticDesignationMap(symbols: SymbolItem[]): Map<string, string> {
  const layout = buildSchematicLayout(symbols);
  const map = new Map<string, string>();

  for (const node of layout.nodes) {
    const designation = node.designation.trim();
    if (designation.length > 0) {
      map.set(node.id, designation);
    }
  }

  return map;
}

function getSymbolDesignationLabel(
  symbol: SymbolItem,
  automaticDesignationBySymbolId: Map<string, string>,
): string {
  const manualDesignation = symbol.referenceDesignation.trim();
  const isManualDesignation =
    symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY]?.toLocaleLowerCase("pl-PL") === "true";

  if (isManualDesignation && manualDesignation.length > 0) {
    return manualDesignation;
  }

  if (isAuxiliaryNonCircuitSymbol(symbol) && manualDesignation.length > 0) {
    return manualDesignation;
  }

  return automaticDesignationBySymbolId.get(symbol.id) ?? "";
}

export async function exportDinRailToDataURL(symbols: SymbolItem[], rail: DinRailCanvasRail): Promise<string[]> {
  return exportDinRailToDataURLWithOptions(symbols, rail, {});
}

async function renderDinRailSnapshotCanvas(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSnapshotExportOptions,
): Promise<HTMLCanvasElement | null> {
  if (!rail.isVisible || rail.width <= 0 || rail.height <= 0) {
    return null;
  }

  const includeDesignations = options.includeDesignations !== false;
  const includeGroupFrames = options.includeGroupFrames !== false;

  // Browsers enforce a hard canvas dimension limit (Chrome: 16384px, Firefox: 32767px).
  // A 24-module DIN rail is ~6120 logical units wide. At scale 4 that's 24480px — way over the limit.
  // We automatically clamp the scale so the largest dimension stays within safe bounds.
  const MAX_CANVAS_DIMENSION = 3840;
  const requestedScale = clamp(options.scale ?? 2, 1, 8);
  const maxDimension = Math.max(rail.width, rail.height);
  const safeScale = maxDimension * requestedScale > MAX_CANVAS_DIMENSION
    ? Math.floor((MAX_CANVAS_DIMENSION / maxDimension) * 100) / 100
    : requestedScale;
  const scale = Math.max(1, safeScale);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rail.width * scale);
  canvas.height = Math.round(rail.height * scale);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scale, scale);

  if (rail.svg) {
    const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rail.svg)}`;
    try {
      const railImg = await loadImage(svgDataUri);
      ctx.drawImage(railImg, 0, 0, rail.width, rail.height);
    } catch (err) {
      console.warn("Nie udalo sie narysowac tla szyny DIN:", err);
    }
  }

  const snappedSymbols = symbols.filter((symbol) => symbol.isSnappedToRail);
  const groupFrames = includeGroupFrames
    ? buildDinRailGroupFrames(snappedSymbols, DIN_RAIL_GROUP_FRAME_PADDING)
    : [];
  const automaticDesignationBySymbolId = includeDesignations
    ? buildAutomaticDesignationMap(symbols)
    : new Map<string, string>();

  const drawPromises = snappedSymbols.map(async (symbol) => {
    if (!symbol.visualPath) {
      return null;
    }

    try {
      const dataUri = await loadPreparedSvgDataUri(symbol.visualPath, symbol.parameters);
      const img = await loadImage(dataUri);
      return { img, symbol };
    } catch (err) {
      console.warn(`Nie udało się załadować grafiki dla modułu ${symbol.id}:`, err);
      return null;
    }
  });

  const loadedImages = (await Promise.all(drawPromises)).filter(Boolean) as {
    img: HTMLImageElement;
    symbol: SymbolItem;
  }[];

  loadedImages.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) {
      return a.symbol.y - b.symbol.y;
    }

    return a.symbol.x - b.symbol.x;
  });

  for (const { img, symbol } of loadedImages) {
    ctx.drawImage(img, symbol.x, symbol.y, symbol.width, symbol.height);
  }

  if (includeDesignations) {
    // Label sizes are in the same logical coordinate space as the DIN rail.
    // A single module is ~250px wide and ~1200px tall, so 36px font is well-proportioned.
    const fontSize = 36;
    const labelPadX = 14;
    const labelPadY = 6;
    const labelRadius = 8;
    const labelOffsetY = 44;

    ctx.font = `700 ${fontSize}px 'Inter', 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const symbol of snappedSymbols) {
      const label = getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId);
      if (label.length === 0) {
        continue;
      }

      const cx = symbol.x + Math.max(symbol.width, 48) / 2;
      const cy = symbol.y + symbol.height + labelOffsetY;
      const metrics = ctx.measureText(label);
      const textWidth = metrics.width;

      const bgX = cx - textWidth / 2 - labelPadX;
      const bgY = cy - fontSize / 2 - labelPadY;
      const bgW = textWidth + labelPadX * 2;
      const bgH = fontSize + labelPadY * 2;

      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, labelRadius);
      ctx.fill();

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.fillText(label, cx, cy);
    }
  }

  if (includeGroupFrames) {
    for (const group of groupFrames) {
      drawGroupFrame(ctx, group, rail.width);
    }
  }

  return canvas;
}

export async function exportDinRailToDataURLWithOptions(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSnapshotExportOptions,
): Promise<string[]> {
  const canvas = await renderDinRailSnapshotCanvas(symbols, rail, options);
  if (!canvas) {
    return [];
  }

  return [canvas.toDataURL("image/png", 1.0)];
}

export async function exportDinRailToBlobWithOptions(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSnapshotExportOptions,
): Promise<Blob | null> {
  const canvas = await renderDinRailSnapshotCanvas(symbols, rail, options);
  if (!canvas) {
    return null;
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (blob) {
    return blob;
  }

  return dataUrlToBlob(canvas.toDataURL("image/png", 1.0));
}
