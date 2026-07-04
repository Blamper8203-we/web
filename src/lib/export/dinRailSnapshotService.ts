import { devWarn } from "../runtimeDiagnostics";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem, MANUAL_REFERENCE_DESIGNATION_KEY, isDistributionBlockSymbol } from "../../types/symbolItem";
import { buildSchematicLayout } from "../schematic/schematicLayoutEngine";
import {
  DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_OFFSET_Y,
  DIN_RAIL_GROUP_FRAME_PADDING,
  buildDinRailGroupFrames,
  formatDinRailGroupLabel,
} from "../dinRailSelection";
import { loadPreparedSvgMarkup } from "../modules/svgAsset";
import { getSymbolRatingText } from "../appHelpers";
import type { ConnectionItem, FerruleColor } from "../../types/connectionItem";
import { computeGroupedWiredPaths } from "../connections/wirePathGenerator";
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../modules/moduleTerminals";
import { calculateWirePoints, type Point } from "../routing/wireRoutingEngine";
import { getFerruleLength, WIRE_THICKNESS_MAP, WIRE_COLORS_MAP, FERRULE_COLORS_MAP, getAutoFerruleColor, DEFAULT_CUSTOM_RADIUS } from "../connections/connectionsLogic";



export interface DinRailSnapshotExportOptions {
  includeDesignations?: boolean;
  includeGroupFrames?: boolean;
  scale?: number;
  drawConnections?: boolean;
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

  ctx.restore();
}

function drawFerruleOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical",
  color: FerruleColor,
  wireCrossSection: number | undefined,
  isDouble: boolean,
  isShort: boolean,
  isExtraLong: boolean,
  isSquare: boolean,
  customOffset: number | undefined,
  customLength: number | undefined,
): void {
  if (!color || color === "none") return;
  const actualColor = color === "auto" ? getAutoFerruleColor(wireCrossSection || 2.5) : color;
  const ferruleColorData = FERRULE_COLORS_MAP[actualColor];
  if (!ferruleColorData) return;

  const wireThickness = WIRE_THICKNESS_MAP[wireCrossSection || 2.5] || 40;
  const thickness = isDouble ? (wireThickness * 2 + 4) : (wireThickness + 6);
  const length = customLength !== undefined ? customLength : (isSquare ? thickness + 4 : isExtraLong ? 230 : isShort ? 80 : 150);
  const offset = customOffset !== undefined ? customOffset : (isSquare ? 0 : 10);

  let rx, ry, width, height;

  if (direction === "top" || direction === "auto-vertical") {
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y - length - offset;
  } else if (direction === "bottom") {
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y + offset;
  } else if (direction === "left") {
    width = length;
    height = thickness;
    rx = x - length - offset;
    ry = y - thickness / 2;
  } else if (direction === "right" || direction === "auto-horizontal") {
    width = length;
    height = thickness;
    rx = x + offset;
    ry = y - thickness / 2;
  } else {
    return;
  }

  ctx.save();
  ctx.fillStyle = ferruleColorData.dark;
  ctx.beginPath();
  ctx.roundRect(rx - 1, ry - 1, width + 2, height + 2, 2);
  ctx.fill();

  ctx.fillStyle = ferruleColorData.hex;
  ctx.beginPath();
  ctx.roundRect(rx, ry, width, height, 2);
  ctx.fill();

  const hx = direction === "left" || direction === "right" ? rx : rx + 2;
  const hy = direction === "top" || direction === "bottom" ? ry : ry + 2;
  const hw = direction === "left" || direction === "right" ? width : Math.max(1, width / 4);
  const hh = direction === "top" || direction === "bottom" ? height : Math.max(1, height / 4);

  ctx.fillStyle = ferruleColorData.highlight;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.roundRect(hx, hy, hw, hh, 1);
  ctx.fill();
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
      const customRadius = conn.customRadius ?? DEFAULT_CUSTOM_RADIUS;
      
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
  const MAX_DIMENSION = 8192; // 8K support
  const MAX_AREA = 16777216; // 16 Megapixels (iOS Safari limit)
  const requestedScale = clamp(optionsScale ?? 2, 1, 8);
  
  const maxDimension = Math.max(contentWidth, contentHeight);
  let safeScale = maxDimension * requestedScale > MAX_DIMENSION
    ? MAX_DIMENSION / maxDimension
    : requestedScale;
    
  const area = contentWidth * contentHeight;
  if (area * safeScale * safeScale > MAX_AREA) {
    safeScale = Math.sqrt(MAX_AREA / area);
  }
  
  // Obcinamy do 2 miejsc po przecinku w dół, żeby uniknąć problemów z precyzją
  safeScale = Math.floor(safeScale * 100) / 100;
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

type LayeredSymbolImage = {
  symbol: SymbolItem;
  baseImg: HTMLImageElement;
  fgImg: HTMLImageElement | null;
};

async function loadSymbolImages(snappedSymbols: SymbolItem[]): Promise<LayeredSymbolImage[]> {
  const drawPromises = snappedSymbols.map(async (symbol) => {
    if (!symbol.visualPath) return null;

    try {
      const rating = getSymbolRatingText(symbol);
      const parameters = rating
        ? { ...symbol.parameters, _DYNAMIC_RATING_: rating }
        : symbol.parameters;
        
      const rawMarkup = await loadPreparedSvgMarkup(symbol.visualPath, parameters);
      
      let baseMarkup = rawMarkup;
      let fgMarkup: string | null = null;

      if (symbol.deviceKind === "terminalBlock" || symbol.deviceKind === "other") {
        if (symbol.moduleRef && symbol.moduleRef.toLowerCase().includes("gsu/gsu.svg")) {
          // ── Base layer (under wires): show obudowa, hide listwa/terminals ──
          const baseStyle = `<style>
            #Listwa1, [id="Listwa1"], #Listwa, [id="Listwa"], #G1, [id="G1"], #G3, [id="G3"], #KLAMRA1, [id="KLAMRA1"], #KLAMRA2, [id="KLAMRA2"] { visibility: hidden; }
          </style>`;
          baseMarkup = rawMarkup.replace("</svg>", `${baseStyle}</svg>`);

          // ── Foreground layer (over wires): hide obudowa, show listwa/terminals ──
          const fgStyle = `<style>
            #obudowa, [id="obudowa"] { display: none !important; }
          </style>`;
          fgMarkup = rawMarkup.replace("</svg>", `${fgStyle}</svg>`);
        } else if (rawMarkup.includes('id="Oslona"') || rawMarkup.includes('id="Osłona"')) {
          const baseStyle = `<style>
            #Osłona, [id="Osłona"], #Oslona, [id="Oslona"],
            #Grupa-N, [id="Grupa N"], #Grupa-L3, [id="Grupa L3"],
            #Grupa-L2, [id="Grupa L2"], #Grupa-L1, [id="Grupa L1"] { visibility: hidden; }
          </style>`;
          baseMarkup = rawMarkup.replace("</svg>", `${baseStyle}</svg>`);

          const isCoverHidden = symbol.parameters?.BLUE_COVER_VISIBILITY === "hidden" || symbol.parameters?.BLUE_COVER_VISIBILITY === "none";
          const fgStyle = `<style>
            #Background, #Tył-obudowy, #Tył\\ obudowy, [id="Tył-obudowy"], [id="Tył obudowy"] { visibility: hidden; }
            ${isCoverHidden ? '#Osłona, [id="Osłona"], #Oslona, [id="Oslona"] { visibility: hidden; }' : ''}
          </style>`;
          fgMarkup = rawMarkup.replace("</svg>", `${fgStyle}</svg>`);
        } else if (rawMarkup.includes('id="niebieski1"')) {
          // WHY: listwy N/PE mają `id="niebieski1"` na CAŁYM niebieskim/zielonym korpusie.
          // Fizycznie przewody z tulejkami są WEWNĄTRZ obudowy (pod korpusem), więc
          // rysujemy listwę w dwóch warstwach:
          //   - base (Layer 1): pełna listwa z korpusem — POD przewodami
          //   - fg (Layer 5): ta sama lista z korpusem ukrytym (visibility: hidden) — NAD przewodami
          // Efekt: korpus widoczny tam gdzie nie ma przewodów, a przewody widoczne
          // "przez" korpus tam gdzie faktycznie są pod obudową. NIE dotyczy bloku
          // rozdzielczego 4x7 (tam `id="niebieski1"` nie istnieje; osłona ma `id="Osłona"`).
          const fgStyle = `<style>#niebieski1 { visibility: hidden; }</style>`;
          fgMarkup = rawMarkup.replace("</svg>", `${fgStyle}</svg>`);
        }
      }

      const baseDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(baseMarkup)}`;
      const baseImg = await loadImage(baseDataUri);

      let fgImg: HTMLImageElement | null = null;
      if (fgMarkup) {
        const fgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fgMarkup)}`;
        fgImg = await loadImage(fgDataUri);
      }

      return { symbol, baseImg, fgImg };
    } catch (err) {
      devWarn(`Nie udało się załadować grafiki dla modułu ${symbol.id}:`, err);
      return null;
    }
  });

  return (await Promise.all(drawPromises)).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function drawWiresConnections(
  ctx: CanvasRenderingContext2D,
  symbols: SymbolItem[],
  connections: ConnectionItem[] | undefined
): void {
  if (!connections || connections.length === 0) return;

  const groupedWiredPaths = computeGroupedWiredPaths(symbols, connections);

  for (const w of groupedWiredPaths) {
    if (!w || !w.pointsArr) continue;

    const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 40;
    const colors = WIRE_COLORS_MAP[w.connection.wireColor] || { hex: "#555", highlight: "#888", dark: "#1a1a1a" };

    const outlineColor = w.connection.wireColor === "black" ? "#888888" : colors.dark;
      
    // 1. Dark outline base (Outer Edge)
    drawWireOnCanvas(ctx, w.pointsArr, w.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS, outlineColor, wireThickness + 1.8);
    // 2. Main color (Midtone)
    const mainColor = w.connection.wireColor === "green-yellow" ? "#2e7d32" : colors.hex;
    drawWireOnCanvas(ctx, w.pointsArr, w.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS, mainColor, wireThickness);
    
    // 3. Yellow stripes overlay for PE
    if (w.connection.wireColor === "green-yellow") {
      drawWireOnCanvas(ctx, w.pointsArr, w.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS, "#FFD600", wireThickness * 0.45);
    }

    // 3.1. 3D Highlight (Cylindrical glossy sheen)
    drawWireOnCanvas(ctx, w.pointsArr, w.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS, "rgba(255, 255, 255, 0.08)", Math.max(2, wireThickness * 0.35));
    drawWireOnCanvas(ctx, w.pointsArr, w.connection.customRadius ?? DEFAULT_CUSTOM_RADIUS, "rgba(255, 255, 255, 0.18)", Math.max(1, wireThickness * 0.1));
  }
}

function drawAllFerrules(
  ctx: CanvasRenderingContext2D,
  symbols: SymbolItem[],
  connections: ConnectionItem[] | undefined
): void {
  if (!connections || connections.length === 0) return;

  const groupedWiredPaths = computeGroupedWiredPaths(symbols, connections);

  const ferruleCounts = new Map<string, number>();
  groupedWiredPaths.forEach((w) => {
    if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return;
    const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
    const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;
    ferruleCounts.set(fromKey, (ferruleCounts.get(fromKey) || 0) + 1);
    ferruleCounts.set(toKey, (ferruleCounts.get(toKey) || 0) + 1);
  });

  const renderedFerrules = new Set<string>();

  groupedWiredPaths.forEach((w) => {
    if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return;

    const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
    const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;

    if (!renderedFerrules.has(fromKey)) {
      renderedFerrules.add(fromKey);
      const fromIsDist = isDistributionBlockSymbol(w.fromSymbol);
      const isSquare = w.fromDeviceKind === "phaseIndicator" || (w.fromModuleRef || "").toLowerCase().includes("zabezpieczajacy") || (w.fromModuleRef || "").toLowerCase().includes("zabezpieczenia");
      const isShort = w.fromDeviceKind === "terminalBlock";
      
      drawFerruleOnCanvas(
        ctx,
        w.fromTerminalPt.x,
        w.fromTerminalPt.y,
        w.actualFromDir as any,
        w.connection.ferruleColor,
        w.connection.wireCrossSection,
        (ferruleCounts.get(fromKey) || 0) >= 2,
        isShort,
        fromIsDist,
        isSquare,
        fromIsDist ? 10 : w.fromHS.visualInset,
        fromIsDist ? 80 : undefined
      );
    }

    if (!renderedFerrules.has(toKey)) {
      renderedFerrules.add(toKey);
      const toIsDist = isDistributionBlockSymbol(w.toSymbol);
      const isSquare = w.toDeviceKind === "phaseIndicator" || (w.toModuleRef || "").toLowerCase().includes("zabezpieczajacy") || (w.toModuleRef || "").toLowerCase().includes("zabezpieczenia");
      const isShort = w.toDeviceKind === "terminalBlock";
      
      drawFerruleOnCanvas(
        ctx,
        w.toTerminalPt.x,
        w.toTerminalPt.y,
        w.actualToDir as any,
        w.connection.ferruleColor,
        w.connection.wireCrossSection,
        (ferruleCounts.get(toKey) || 0) >= 2,
        isShort,
        toIsDist,
        isSquare,
        toIsDist ? 10 : w.toHS.visualInset,
        toIsDist ? 80 : undefined
      );
    }
  });
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

  // Layer 1: Base Symbols (drawn UNDER wires)
  // Matching exactly DinRailConnectionsCanvas filter for Base Symbols
  const baseSymbols = loadedImages.filter(li => 
    isDistributionBlockSymbol(li.symbol) || 
    li.symbol.deviceKind === "phaseIndicator" || 
    !!li.fgImg || 
    (li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") || 
    (li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczenia")
  );
  
  // Sort base symbols to avoid z-index glitching
  baseSymbols.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) return a.symbol.y - b.symbol.y;
    return a.symbol.x - b.symbol.x;
  });

  for (const { baseImg, symbol } of baseSymbols) {
    ctx.drawImage(baseImg, symbol.x, symbol.y, symbol.width, symbol.height);
  }
  
  // Layer 2: Connections (Wires)
  if (options.drawConnections !== false) {
    drawWiresConnections(ctx, symbols, connections);
  }

  // Layer 3: Ferrules (drawn OVER wires but UNDER normal/foreground symbols)
  if (options.drawConnections !== false) {
    drawAllFerrules(ctx, symbols, connections);
  }

  // Layer 4: Normal Symbols (drawn OVER wires)
  const normalSymbols = loadedImages.filter(li => 
    li.symbol.deviceKind !== "phaseIndicator" && 
    !isDistributionBlockSymbol(li.symbol) && 
    !li.fgImg && 
    !(li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") && 
    !(li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczenia")
  );

  normalSymbols.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) return a.symbol.y - b.symbol.y;
    return a.symbol.x - b.symbol.x;
  });

  for (const { baseImg, symbol } of normalSymbols) {
    ctx.drawImage(baseImg, symbol.x, symbol.y, symbol.width, symbol.height);
  }

  // Layer 5: Terminal Blocks Foreground (plastic covers + brass drawn OVER wires)
  const fgSymbols = loadedImages.filter(li => li.fgImg !== null);
  for (const { fgImg, symbol } of fgSymbols) {
    if (fgImg) {
      ctx.drawImage(fgImg, symbol.x, symbol.y, symbol.width, symbol.height);
    }
  }

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
