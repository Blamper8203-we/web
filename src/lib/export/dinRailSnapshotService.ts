import { devWarn } from "../runtimeDiagnostics";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem, MANUAL_REFERENCE_DESIGNATION_KEY } from "../../types/symbolItem";
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
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../modules/moduleTerminals";
import { calculateWirePoints, type Point } from "../routing/wireRoutingEngine";
import { getFerruleLength, WIRE_THICKNESS_MAP, WIRE_COLORS_MAP } from "../connections/connectionsLogic";



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

// ── Helpers for renderDinRailSnapshotCanvas ─────────────────────────────────

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function calculateSnapshotBounds(
  symbols: SymbolItem[],
  snappedSymbols: SymbolItem[],
  rail: DinRailCanvasRail,
  connections: ConnectionItem[] | undefined,
  includeDesignations: boolean,
  groupFrames: ReturnType<typeof buildDinRailGroupFrames>,
): BoundingBox {
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

  if (connections && connections.length > 0) {
    for (const conn of connections) {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      if (!fromSymbol || !toSymbol) continue;

      const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
      const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
      if (!fromHS || !toHS) continue;

      const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      const hasFerrule = conn.ferruleColor && conn.ferruleColor !== "none";
      const customRadius = conn.customRadius ?? 0;
      
      const fromFerruleLen = getFerruleLength(fromSymbol.deviceKind, fromSymbol.moduleRef);
      const toFerruleLen = getFerruleLength(toSymbol.deviceKind, toSymbol.moduleRef);

      const fromExitOffsetVal = hasFerrule ? Math.max(fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius : (fromHS.exitOffset ?? 40) + customRadius;
      const toExitOffsetVal = hasFerrule ? Math.max(toHS.exitOffset ?? 40, toFerruleLen) + customRadius : (toHS.exitOffset ?? 40) + customRadius;

      const routingOpts = {
        isFromTop: resolveConnectionIsFromTop(fromSymbol, conn.isFromTop, fromHS),
        isToTop: resolveConnectionIsToTop(toSymbol, conn.isToTop, toHS),
        points: conn.points,
        customOffset: conn.customOffset,
        customOffsetX: conn.customOffsetX,
        customOffsetY1: conn.customOffsetY1,
        customOffsetY2: conn.customOffsetY2,
        customRadius,
        fromExitOffset: fromExitOffsetVal,
        toExitOffset: toExitOffsetVal,
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

  if (groupFrames.length > 0) {
    for (const group of groupFrames) {
      minY = Math.min(minY, group.y - 120);
    }
  }

  const padding = 40;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return { minX, minY, maxX, maxY };
}

function getSafeScaleForCanvas(
  contentWidth: number,
  contentHeight: number,
  optionsScale: number | undefined
): number {
  const MAX_CANVAS_DIMENSION = 3840;
  const requestedScale = clamp(optionsScale ?? 2, 1, 8);
  const maxDimension = Math.max(contentWidth, contentHeight);
  const safeScale = maxDimension * requestedScale > MAX_CANVAS_DIMENSION
    ? Math.floor((MAX_CANVAS_DIMENSION / maxDimension) * 100) / 100
    : requestedScale;
  return Math.max(1, safeScale);
}

async function drawRailBackground(
  ctx: CanvasRenderingContext2D,
  rail: DinRailCanvasRail,
): Promise<void> {
  if (rail.svg) {
    const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rail.svg)}`;
    try {
      const railImg = await loadImage(svgDataUri);
      ctx.drawImage(railImg, 0, 0, rail.width, rail.height);
    } catch (err) {
      devWarn("Nie udalo sie narysowac tla szyny DIN:", err);
    }
  }
}

async function loadSymbolImages(snappedSymbols: SymbolItem[]): Promise<{ img: HTMLImageElement; symbol: SymbolItem }[]> {
  const drawPromises = snappedSymbols.map(async (symbol) => {
    if (!symbol.visualPath) return null;

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

  return (await Promise.all(drawPromises)).filter((item): item is { img: HTMLImageElement; symbol: SymbolItem } => Boolean(item));
}

function drawTerminalBlocksBackground(
  ctx: CanvasRenderingContext2D,
  loadedImages: { img: HTMLImageElement; symbol: SymbolItem }[]
): void {
  const bgImages = loadedImages.filter(li => li.symbol.deviceKind === "terminalBlock");
  for (const { img, symbol } of bgImages) {
    ctx.drawImage(img, symbol.x, symbol.y, symbol.width, symbol.height);
  }
}

function drawWiresConnections(
  ctx: CanvasRenderingContext2D,
  symbols: SymbolItem[],
  connections: ConnectionItem[] | undefined
): void {
  if (!connections || connections.length === 0) return;

  for (const conn of connections) {
    const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
    const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
    if (!fromSymbol || !toSymbol) continue;

    const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
    const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
    if (!fromHS || !toHS) continue;

    const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
    const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

    const hasFerrule = conn.ferruleColor && conn.ferruleColor !== "none";
    const customRadius = conn.customRadius ?? 0;
    
    const fromFerruleLen = getFerruleLength(fromSymbol.deviceKind, fromSymbol.moduleRef);
    const toFerruleLen = getFerruleLength(toSymbol.deviceKind, toSymbol.moduleRef);

    const fromExitOffsetVal = hasFerrule ? Math.max(fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius : (fromHS.exitOffset ?? 40) + customRadius;
    const toExitOffsetVal = hasFerrule ? Math.max(toHS.exitOffset ?? 40, toFerruleLen) + customRadius : (toHS.exitOffset ?? 40) + customRadius;

    const routingOpts = {
      isFromTop: resolveConnectionIsFromTop(fromSymbol, conn.isFromTop, fromHS),
      isToTop: resolveConnectionIsToTop(toSymbol, conn.isToTop, toHS),
      points: conn.points,
      customOffset: conn.customOffset,
      customOffsetX: conn.customOffsetX,
      customOffsetY1: conn.customOffsetY1,
      customOffsetY2: conn.customOffsetY2,
      customRadius,
      fromExitOffset: fromExitOffsetVal,
      toExitOffset: toExitOffsetVal,
    };

    const pointsArr = calculateWirePoints(fromPt, toPt, routingOpts);
    const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4.5;
    const colors = WIRE_COLORS_MAP[conn.wireColor] || { hex: "#555", highlight: "#888", dark: "#1a1a1a" };

    const outlineColor = conn.wireColor === "black" ? "#888888" : colors.dark;
    drawWireOnCanvas(ctx, pointsArr, conn.customRadius ?? 0, outlineColor, wireThickness + 1.8, "");
    drawWireOnCanvas(ctx, pointsArr, conn.customRadius ?? 0, colors.hex, wireThickness, conn.wireColor);
  }
}

function drawForegroundModules(
  ctx: CanvasRenderingContext2D,
  loadedImages: { img: HTMLImageElement; symbol: SymbolItem }[]
): void {
  const fgImages = loadedImages.filter(li => li.symbol.deviceKind !== "terminalBlock");
  fgImages.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) {
      return a.symbol.y - b.symbol.y;
    }
    return a.symbol.x - b.symbol.x;
  });

  for (const { img, symbol } of fgImages) {
    ctx.drawImage(img, symbol.x, symbol.y, symbol.width, symbol.height);
  }
}

function drawDesignationLabels(
  ctx: CanvasRenderingContext2D,
  snappedSymbols: SymbolItem[],
  automaticDesignationBySymbolId: Map<string, string>
): void {
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
    if (label.length === 0) continue;

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

  const { minX, minY, maxX, maxY } = calculateSnapshotBounds(
    symbols,
    snappedSymbols,
    rail,
    connections,
    includeDesignations,
    groupFrames
  );

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const offsetX = -minX;
  const offsetY = -minY;

  const scale = getSafeScaleForCanvas(contentWidth, contentHeight, options.scale);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(contentWidth * scale);
  canvas.height = Math.round(contentHeight * scale);
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);

  await drawRailBackground(ctx, rail);

  const automaticDesignationBySymbolId = includeDesignations
    ? buildAutomaticDesignationMap(symbols)
    : new Map<string, string>();

  const loadedImages = await loadSymbolImages(snappedSymbols);

  drawTerminalBlocksBackground(ctx, loadedImages);
  drawWiresConnections(ctx, symbols, connections);
  drawForegroundModules(ctx, loadedImages);

  if (includeDesignations) {
    drawDesignationLabels(ctx, snappedSymbols, automaticDesignationBySymbolId);
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
