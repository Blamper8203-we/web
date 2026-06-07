import { devWarn } from "../runtimeDiagnostics";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem } from "../../types/symbolItem";
import { buildSchematicLayout } from "../schematic/schematicLayoutEngine";
import {
  DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_OFFSET_Y,
  DIN_RAIL_GROUP_FRAME_PADDING,
  buildDinRailGroupFrames,
  formatDinRailGroupLabel,
} from "../dinRailSelection";
import { loadPreparedSvgDataUri } from "../modules/svgAsset";
import { getSymbolRatingText } from "../appHelpers";
import type { ConnectionItem } from "../../types/connectionItem";
import { getSymbolTerminals } from "../modules/moduleTerminals";
import { calculateWirePoints, type Point } from "../routing/wireRoutingEngine";

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
  const fontSize = 32;
  const labelGap = 20;
  const labelHeight = 60;
  const labelPaddingX = 36;
  const labelRadius = 8;

  ctx.font = `600 ${fontSize}px 'Inter', 'Segoe UI', Arial, sans-serif`;
  const measuredWidth = Math.ceil(ctx.measureText(label).width);
  const labelWidth = clamp(measuredWidth + labelPaddingX * 2, 120, 800);
  const labelX = clamp(
    group.x + group.width / 2 - labelWidth / 2,
    4,
    Math.max(4, railWidth - labelWidth - 4),
  );
  const labelY = Math.max(
    4,
    topY - labelGap - labelHeight,
  );

  ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, labelRadius);
  ctx.fill();
  ctx.strokeStyle = "rgba(82, 148, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2 + 1, labelWidth - 16);
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

const WIRE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  black: { hex: "#333333", highlight: "#666666", dark: "#000000" }, // L2
  brown: { hex: "#8B4513", highlight: "#c4763a", dark: "#4a2007" }, // L1
  grey: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  gray: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  blue: { hex: "#1565C0", highlight: "#4a9ed6", dark: "#0a2f6b" },  // N
  "green-yellow": { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  pe: { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  red: { hex: "#ef4444", highlight: "#f87171", dark: "#991b1b" },
  other: { hex: "#a855f7", highlight: "#c084fc", dark: "#6b21a8" },
};

const WIRE_THICKNESS_MAP: Record<number, number> = {
  1.5: 24.0,
  2.5: 30.0,
  4.0: 36.0,
  6.0: 42.0,
  10.0: 48.0,
  16.0: 54.0,
};

function drawWireOnCanvas(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  radius: number,
  colorHex: string,
  thickness: number,
  wireColor: string,
): void {
  const noDups = points.filter((pt, i, arr) => {
    if (i === 0) return true;
    return Math.abs(pt.x - arr[i - 1].x) > 0.5 || Math.abs(pt.y - arr[i - 1].y) > 0.5;
  });

  const cleanPoints = noDups.filter((pt, i, arr) => {
    if (i === 0 || i === arr.length - 1) return true;
    const prev = arr[i - 1];
    const next = arr[i + 1];

    const isCollinearX = Math.abs(prev.x - pt.x) < 0.5 && Math.abs(pt.x - next.x) < 0.5;
    const isCollinearY = Math.abs(prev.y - pt.y) < 0.5 && Math.abs(pt.y - next.y) < 0.5;

    return !(isCollinearX || isCollinearY);
  });

  if (cleanPoints.length < 2) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cleanPoints[0].x, cleanPoints[0].y);

  if (radius <= 0 || cleanPoints.length < 3) {
    for (let i = 1; i < cleanPoints.length; i++) {
      ctx.lineTo(cleanPoints[i].x, cleanPoints[i].y);
    }
  } else {
    for (let i = 1; i < cleanPoints.length - 1; i++) {
      const prev = cleanPoints[i - 1];
      const curr = cleanPoints[i];
      const next = cleanPoints[i + 1];

      const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

      const maxRPrev = i === 1 ? dPrev : dPrev / 2;
      const maxRNext = i === cleanPoints.length - 2 ? dNext : dNext / 2;
      const maxR = Math.min(maxRPrev, maxRNext, radius);

      if (maxR < 1) {
        ctx.lineTo(curr.x, curr.y);
        continue;
      }

      const uPrev = { x: (prev.x - curr.x) / dPrev, y: (prev.y - curr.y) / dPrev };
      const uNext = { x: (next.x - curr.x) / dNext, y: (next.y - curr.y) / dNext };

      const ptA = { x: curr.x + uPrev.x * maxR, y: curr.y + uPrev.y * maxR };
      const ptB = { x: curr.x + uNext.x * maxR, y: curr.y + uNext.y * maxR };

      ctx.lineTo(ptA.x, ptA.y);
      ctx.quadraticCurveTo(curr.x, curr.y, ptB.x, ptB.y);
    }
    ctx.lineTo(cleanPoints[cleanPoints.length - 1].x, cleanPoints[cleanPoints.length - 1].y);
  }

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  if (wireColor === "green-yellow") {
    ctx.beginPath();
    ctx.moveTo(cleanPoints[0].x, cleanPoints[0].y);
    if (radius <= 0 || cleanPoints.length < 3) {
      for (let i = 1; i < cleanPoints.length; i++) {
        ctx.lineTo(cleanPoints[i].x, cleanPoints[i].y);
      }
    } else {
      for (let i = 1; i < cleanPoints.length - 1; i++) {
        const prev = cleanPoints[i - 1];
        const curr = cleanPoints[i];
        const next = cleanPoints[i + 1];

        const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

        const maxRPrev = i === 1 ? dPrev : dPrev / 2;
        const maxRNext = i === cleanPoints.length - 2 ? dNext : dNext / 2;
        const maxR = Math.min(maxRPrev, maxRNext, radius);

        if (maxR < 1) {
          ctx.lineTo(curr.x, curr.y);
          continue;
        }

        const uPrev = { x: (prev.x - curr.x) / dPrev, y: (prev.y - curr.y) / dPrev };
        const uNext = { x: (next.x - curr.x) / dNext, y: (next.y - curr.y) / dNext };

        const ptA = { x: curr.x + uPrev.x * maxR, y: curr.y + uPrev.y * maxR };
        const ptB = { x: curr.x + uNext.x * maxR, y: curr.y + uNext.y * maxR };

        ctx.lineTo(ptA.x, ptA.y);
        ctx.quadraticCurveTo(curr.x, curr.y, ptB.x, ptB.y);
      }
      ctx.lineTo(cleanPoints[cleanPoints.length - 1].x, cleanPoints[cleanPoints.length - 1].y);
    }

    ctx.strokeStyle = "#FFD600";
    ctx.lineWidth = thickness;
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.setLineDash([thickness * 1.2, thickness * 1.2]);
    ctx.stroke();
  }

  ctx.restore();
}

export async function exportDinRailToDataURL(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  connections?: ConnectionItem[],
): Promise<string[]> {
  return exportDinRailToDataURLWithOptions(symbols, rail, {}, connections);
}

async function renderDinRailSnapshotCanvas(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSnapshotExportOptions,
  connections?: ConnectionItem[],
): Promise<HTMLCanvasElement | null> {
  if (!rail.isVisible || rail.width <= 0 || rail.height <= 0) {
    return null;
  }

  const includeDesignations = options.includeDesignations !== false;
  const includeGroupFrames = options.includeGroupFrames !== false;

  const snappedSymbols = symbols.filter((symbol) => symbol.isSnappedToRail);
  const groupFrames = includeGroupFrames
    ? buildDinRailGroupFrames(snappedSymbols, DIN_RAIL_GROUP_FRAME_PADDING)
    : [];

  // Calculate bounding box of everything (rail, symbols, labels, groups, wires)
  let minX = 0;
  let minY = 0;
  let maxX = rail.width;
  let maxY = rail.height;

  for (const symbol of snappedSymbols) {
    minX = Math.min(minX, symbol.x);
    minY = Math.min(minY, symbol.y);
    maxX = Math.max(maxX, symbol.x + symbol.width);
    maxY = Math.max(maxY, symbol.y + symbol.height);

    if (includeDesignations) {
      maxY = Math.max(maxY, symbol.y + symbol.height + 100);
    }
  }

  // Include wire points in bounding box
  if (connections && connections.length > 0) {
    for (const conn of connections) {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      if (!fromSymbol || !toSymbol) continue;

      const fromHS = getSymbolTerminals(fromSymbol).find((h) => h.name === conn.fromTerminal);
      const toHS = getSymbolTerminals(toSymbol).find((h) => h.name === conn.toTerminal);
      if (!fromHS || !toHS) continue;

      const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      const routingOpts = {
        isFromTop: conn.isFromTop ?? fromHS.isTop,
        isToTop: conn.isToTop ?? toHS.isTop,
        points: conn.points,
        customOffset: conn.customOffset,
        customOffsetX: conn.customOffsetX,
        customOffsetY1: conn.customOffsetY1,
        customOffsetY2: conn.customOffsetY2,
        customRadius: conn.customRadius ?? 0,
      };

      const pointsArr = calculateWirePoints(fromPt, toPt, routingOpts);
      for (const pt of pointsArr) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }

  if (includeGroupFrames && groupFrames.length > 0) {
    for (const group of groupFrames) {
      minY = Math.min(minY, group.y - 120);
    }
  }

  // Add a nice padding margin
  const padding = 40;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const offsetX = -minX;
  const offsetY = -minY;

  // Browsers enforce a hard canvas dimension limit (Chrome: 16384px, Firefox: 32767px).
  // A 24-module DIN rail is ~6120 logical units wide. At scale 4 that's 24480px — way over the limit.
  // We automatically clamp the scale so the largest dimension stays within safe bounds.
  const MAX_CANVAS_DIMENSION = 3840;
  const requestedScale = clamp(options.scale ?? 2, 1, 8);
  const maxDimension = Math.max(contentWidth, contentHeight);
  const safeScale = maxDimension * requestedScale > MAX_CANVAS_DIMENSION
    ? Math.floor((MAX_CANVAS_DIMENSION / maxDimension) * 100) / 100
    : requestedScale;
  const scale = Math.max(1, safeScale);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(contentWidth * scale);
  canvas.height = Math.round(contentHeight * scale);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);

  if (rail.svg) {
    const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rail.svg)}`;
    try {
      const railImg = await loadImage(svgDataUri);
      ctx.drawImage(railImg, 0, 0, rail.width, rail.height);
    } catch (err) {
      devWarn("Nie udalo sie narysowac tla szyny DIN:", err);
    }
  }
  const automaticDesignationBySymbolId = includeDesignations
    ? buildAutomaticDesignationMap(symbols)
    : new Map<string, string>();

  const drawPromises = snappedSymbols.map(async (symbol) => {
    if (!symbol.visualPath) {
      return null;
    }

    try {
      const rating = getSymbolRatingText(symbol);
      const parameters = rating
        ? { ...symbol.parameters, _DYNAMIC_RATING_: rating }
        : symbol.parameters;
        
      const dataUri = await loadPreparedSvgDataUri(symbol.visualPath, parameters);
      const img = await loadImage(dataUri);
      return { img, symbol };
    } catch (err) {
      devWarn(`Nie udało się załadować grafiki dla modułu ${symbol.id}:`, err);
      return null;
    }
  });

  const loadedImages = (await Promise.all(drawPromises)).filter(Boolean) as {
    img: HTMLImageElement;
    symbol: SymbolItem;
  }[];

  // Draw wires/connections FIRST (so they appear behind modules)
  if (connections && connections.length > 0) {
    for (const conn of connections) {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      if (!fromSymbol || !toSymbol) continue;

      const fromHS = getSymbolTerminals(fromSymbol).find((h) => h.name === conn.fromTerminal);
      const toHS = getSymbolTerminals(toSymbol).find((h) => h.name === conn.toTerminal);
      if (!fromHS || !toHS) continue;

      const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      const routingOpts = {
        isFromTop: conn.isFromTop ?? fromHS.isTop,
        isToTop: conn.isToTop ?? toHS.isTop,
        points: conn.points,
        customOffset: conn.customOffset,
        customOffsetX: conn.customOffsetX,
        customOffsetY1: conn.customOffsetY1,
        customOffsetY2: conn.customOffsetY2,
        customRadius: conn.customRadius ?? 0,
      };

      const pointsArr = calculateWirePoints(fromPt, toPt, routingOpts);
      const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4.5;
      const colors = WIRE_COLORS_MAP[conn.wireColor] || { hex: "#555", highlight: "#888", dark: "#1a1a1a" };

      // 1. Dark outline (gray for black wires to prevent blending with dark background)
      const outlineColor = conn.wireColor === "black" ? "#888888" : colors.dark;
      drawWireOnCanvas(ctx, pointsArr, conn.customRadius ?? 0, outlineColor, wireThickness + 1.8, "");

      // 2. Main color
      drawWireOnCanvas(ctx, pointsArr, conn.customRadius ?? 0, colors.hex, wireThickness, conn.wireColor);
    }
  }

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
  connections?: ConnectionItem[],
): Promise<string[]> {
  const canvas = await renderDinRailSnapshotCanvas(symbols, rail, options, connections);
  if (!canvas) {
    return [];
  }

  return [canvas.toDataURL("image/png", 1.0)];
}

export async function exportDinRailToBlobWithOptions(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSnapshotExportOptions,
  connections?: ConnectionItem[],
): Promise<Blob | null> {
  const canvas = await renderDinRailSnapshotCanvas(symbols, rail, options, connections);
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
