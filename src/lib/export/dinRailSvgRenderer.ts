import type { ConnectionItem, FerruleColor } from "../../types/connectionItem";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import type { SymbolItem } from "../../types/symbolItem";
import {
  isAuxiliaryNonCircuitSymbol,
  isDistributionBlockSymbol,
  MANUAL_REFERENCE_DESIGNATION_KEY,
} from "../../types/symbolItem";
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
import {
  getSymbolTerminals,
  findTerminalByName,
  resolveConnectionIsFromTop,
  resolveConnectionIsToTop,
} from "../modules/moduleTerminals";
import { calculateWirePoints, type Point } from "../routing/wireRoutingEngine";
import {
  getFerruleLength,
  WIRE_THICKNESS_MAP,
  WIRE_COLORS_MAP,
  FERRULE_COLORS_MAP,
  getAutoFerruleColor,
} from "../connections/connectionsLogic";

// WHY: this renderer produces SVG (vector) instead of PNG (raster) so that the PDF page
// embeds vector graphics. @react-pdf/renderer's <Image> component supports SVG via data URL,
// and SVG rendering matches the live canvas (also SVG) byte-for-byte for paths, strokes,
// and text. The two previous differences between live canvas and PDF were:
//   1. PDF canvas API rasterised paths differently from live canvas SVG (different antialiasing)
//   2. PDF lacked the live canvas drop-shadow filter
// Both vanish when both surfaces render SVG primitives.
export interface DinRailSvgExportOptions {
  includeDesignations?: boolean;
  includeGroupFrames?: boolean;
  drawConnections?: boolean;
  // Caps the rendered SVG width/height so it fits the host (PDF page) without
  // overflow. Aspect ratio is preserved via viewBox. Pass both for tightest fit;
  // @react-pdf/renderer ignores style.width/height for embedded SVG, so the
  // SVG itself must declare the right intrinsic size.
  maxEmbedWidth?: number;
  maxEmbedHeight?: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface LoadedSvgImage {
  symbol: SymbolItem;
  baseDataUri: string;
  fgDataUri: string | null;
}

function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return "";
  const segments: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (i === 0) {
      segments.push(`M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
    } else {
      segments.push(`L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
    }
  }
  return segments.join(" ");
}

function ferruleDirection(actualDir: "top" | "bottom"): "top" | "bottom" {
  // Ferrule on a vertical terminal block extends in the direction the wire exits; the
  // live canvas dispatches the same way via the canvas API. For vertical listwy
  // N/PE this is always top or bottom.
  return actualDir;
}

function utf8ToBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function svgMarkupToDataUri(markup: string): string {
  return `data:image/svg+xml;base64,${utf8ToBase64(markup)}`;
}

function calculateBounds(
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
      const fromExitOffsetVal = hasFerrule
        ? Math.max(fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius
        : (fromHS.exitOffset ?? 40) + customRadius;
      const toExitOffsetVal = hasFerrule
        ? Math.max(toHS.exitOffset ?? 40, toFerruleLen) + customRadius
        : (toHS.exitOffset ?? 40) + customRadius;

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

async function loadSymbolImages(snappedSymbols: SymbolItem[]): Promise<LoadedSvgImage[]> {
  const results = await Promise.all(
    snappedSymbols.map(async (symbol): Promise<LoadedSvgImage | null> => {
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
          if (rawMarkup.includes('id="Oslona"') || rawMarkup.includes('id="Osłona"')) {
            const baseStyle = `<style>
              #Osłona, [id="Osłona"], #Oslona, [id="Oslona"],
              #Grupa-N, [id="Grupa N"], #Grupa-L3, [id="Grupa L3"],
              #Grupa-L2, [id="Grupa L2"], #Grupa-L1, [id="Grupa L1"] { visibility: hidden; }
            </style>`;
            baseMarkup = rawMarkup.replace("</svg>", `${baseStyle}</svg>`);

            const isCoverHidden =
              symbol.parameters?.BLUE_COVER_VISIBILITY === "hidden" ||
              symbol.parameters?.BLUE_COVER_VISIBILITY === "none";
            const fgStyle = `<style>
              #Background, #Tył-obudowy, #Tył\\ obudowy, [id="Tył-obudowy"], [id="Tył obudowy"] { visibility: hidden; }
              ${isCoverHidden ? '#Osłona, [id="Osłona"], #Oslona, [id="Oslona"] { visibility: hidden; }' : ''}
            </style>`;
            fgMarkup = rawMarkup.replace("</svg>", `${fgStyle}</svg>`);
          } else if (rawMarkup.includes('id="niebieski1"')) {
            // WHY: listwy N/PE mają `id="niebleski1"` na CAŁYM niebieskim/zielonym korpusie.
            // Fizycznie przewody z tulejkami są WEWNĄTRZ obudowy (pod korpusem), więc
            // rysujemy listwę w dwóch warstwach:
            //   - base: pełna listwa z korpusem — POD przewodami
            //   - fg: ta sama lista z korpusem ukrytym (visibility: hidden) — NAD przewodami
            // Efekt: korpus widoczny tam gdzie nie ma przewodów, a przewody widoczne
            // "przez" korpus tam gdzie faktycznie są pod obudową.
            const fgStyle = `<style>#niebieski1 { visibility: hidden; }</style>`;
            fgMarkup = rawMarkup.replace("</svg>", `${fgStyle}</svg>`);
          }
        }

        return {
          symbol,
          baseDataUri: svgMarkupToDataUri(baseMarkup),
          fgDataUri: fgMarkup ? svgMarkupToDataUri(fgMarkup) : null,
        };
      } catch (err) {
        console.warn(`Nie udało się załadować SVG dla modułu ${symbol.id}:`, err);
        return null;
      }
    }),
  );

  return results.filter((x): x is LoadedSvgImage => x !== null);
}

function renderWireSvg(
  conn: ConnectionItem,
  symbols: SymbolItem[],
  pathD: string,
): string {
  const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
  const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
  if (!fromSymbol || !toSymbol) return "";

  const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
  const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
  if (!fromHS || !toHS) return "";

  const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4;
  const colors = WIRE_COLORS_MAP[conn.wireColor] || { hex: "#555", highlight: "#888", dark: "#1a1a1a" };
  const outlineColor = conn.wireColor === "black" ? "#888888" : colors.dark;
  const mainColor = conn.wireColor === "green-yellow" ? "#2e7d32" : colors.hex;

  let svg = "";

  // 0. Drop shadow (matches DinRailConnectionWires.tsx filter translate(1,4)+blur)
  svg += `<path d="${pathD}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="${wireThickness}" stroke-linecap="butt" stroke-linejoin="round" transform="translate(1,4)" filter="url(#din-shadow)"/>`;

  // 1. Dark outline base (Outer Edge)
  svg += `<path d="${pathD}" fill="none" stroke="${outlineColor}" stroke-width="${wireThickness + 1.8}" stroke-linecap="butt" stroke-linejoin="round"/>`;

  // 2. Main color (Midtone)
  svg += `<path d="${pathD}" fill="none" stroke="${mainColor}" stroke-width="${wireThickness}" stroke-linecap="butt" stroke-linejoin="round"/>`;

  // 3. Yellow stripes overlay for PE
  if (conn.wireColor === "green-yellow") {
    svg += `<path d="${pathD}" fill="none" stroke="#FFD600" stroke-width="${wireThickness * 0.45}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  }

  // 3.1. 3D Highlight (Cylindrical glossy sheen)
  svg += `<path d="${pathD}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${Math.max(2, wireThickness * 0.35)}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  svg += `<path d="${pathD}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="${Math.max(1, wireThickness * 0.1)}" stroke-linecap="butt" stroke-linejoin="round"/>`;

  return svg;
}

function renderFerruleSvg(
  x: number,
  y: number,
  direction: "top" | "bottom" | "auto-vertical",
  color: FerruleColor,
  wireCrossSection: number | undefined,
  isDouble: boolean,
  isShort: boolean,
  isExtraLong: boolean,
  isSquare: boolean,
  customOffset: number | undefined,
  customLength: number | undefined,
): string {
  if (!color || color === "none") return "";
  const actualColor = color === "auto" ? getAutoFerruleColor(wireCrossSection || 2.5) : color;
  const ferruleColorData = FERRULE_COLORS_MAP[actualColor];
  if (!ferruleColorData) return "";

  const wireThickness = WIRE_THICKNESS_MAP[wireCrossSection || 2.5] || 40;
  const thickness = isDouble ? wireThickness * 2 + 4 : wireThickness + 6;
  const length = customLength !== undefined ? customLength : isSquare ? thickness + 4 : isExtraLong ? 230 : isShort ? 80 : 150;
  const offset = customOffset !== undefined ? customOffset : isSquare ? 0 : 10;

  let rx: number;
  let ry: number;
  let width: number;
  let height: number;

  if (direction === "top" || direction === "auto-vertical") {
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y - length - offset;
  } else {
    // bottom (we don't draw left/right ferrule here; live canvas uses auto-vertical for listwy)
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y + offset;
  }

  let svg = "";

  // Outer dark stroke
  svg += `<rect x="${(rx - 1).toFixed(2)}" y="${(ry - 1).toFixed(2)}" width="${(width + 2).toFixed(2)}" height="${(height + 2).toFixed(2)}" rx="2" ry="2" fill="${ferruleColorData.dark}"/>`;

  // Body
  svg += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="2" ry="2" fill="${ferruleColorData.hex}"/>`;

  // Highlight band
  const hx = rx + 2;
  const hy = direction === "bottom" ? ry + 2 : ry + 2;
  const hw = Math.max(1, width / 4);
  const hh = Math.max(1, height / 4);
  svg += `<rect x="${hx.toFixed(2)}" y="${hy.toFixed(2)}" width="${hw.toFixed(2)}" height="${hh.toFixed(2)}" fill="${ferruleColorData.highlight}" opacity="0.5"/>`;

  return svg;
}

function renderGroupFrameSvg(
  group: ReturnType<typeof buildDinRailGroupFrames>[number],
  railWidth: number,
): string {
  const isSingle = group.memberCount <= 1;
  const topY = Math.max(4, group.y - DIN_RAIL_GROUP_BRACKET_OFFSET_Y);
  const barHeight = DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT;
  const legHeight = DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT;
  const color = isSingle ? "rgba(82, 148, 255, 0.5)" : "rgba(82, 148, 255, 0.9)";

  let svg = "";

  // Top bar
  svg += `<rect x="${group.x.toFixed(2)}" y="${topY.toFixed(2)}" width="${group.width.toFixed(2)}" height="${barHeight}" fill="${color}"/>`;

  // Side legs with linear gradient
  const gradientId = `group-leg-grad-${group.id}`;
  svg += `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="1" stop-color="rgba(82, 148, 255, 0)"/></linearGradient></defs>`;
  svg += `<rect x="${group.x.toFixed(2)}" y="${topY.toFixed(2)}" width="${barHeight}" height="${legHeight}" fill="url(#${gradientId})"/>`;
  svg += `<rect x="${(group.x + group.width - barHeight).toFixed(2)}" y="${topY.toFixed(2)}" width="${barHeight}" height="${legHeight}" fill="url(#${gradientId})"/>`;

  // Label
  const label = formatDinRailGroupLabel(group.label, group.id);
  const fontSize = 32;
  const labelPadX = 36;
  const labelHeight = 60;
  const labelRadius = 8;
  const labelWidth = Math.max(120, Math.min(800, label.length * 18 + labelPadX * 2));
  const labelX = Math.max(4, Math.min(railWidth - labelWidth - 4, group.x + group.width / 2 - labelWidth / 2));
  const labelY = Math.max(4, topY - 20 - labelHeight);

  svg += `<rect x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" width="${labelWidth}" height="${labelHeight}" rx="${labelRadius}" ry="${labelRadius}" fill="rgba(10, 15, 25, 0.9)" stroke="rgba(82, 148, 255, 0.6)" stroke-width="2"/>`;
  svg += `<text x="${(labelX + labelWidth / 2).toFixed(2)}" y="${(labelY + labelHeight / 2 + 1).toFixed(2)}" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>`;

  return svg;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function renderDesignationLabel(
  symbol: SymbolItem,
  automaticDesignationBySymbolId: Map<string, string>,
): string {
  const label = getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId);
  if (label.length === 0) return "";

  const fontSize = 36;
  const labelPadX = 14;
  const labelPadY = 6;
  const labelRadius = 8;
  const labelOffsetY = 44;
  const cx = symbol.x + Math.max(symbol.width, 48) / 2;
  const cy = symbol.y + symbol.height + labelOffsetY;
  // Approximate text width (no actual measure available without DOM)
  const textWidth = label.length * fontSize * 0.55;

  const bgX = cx - textWidth / 2 - labelPadX;
  const bgY = cy - fontSize / 2 - labelPadY;
  const bgW = textWidth + labelPadX * 2;
  const bgH = fontSize + labelPadY * 2;

  let svg = `<rect x="${bgX.toFixed(2)}" y="${bgY.toFixed(2)}" width="${bgW.toFixed(2)}" height="${bgH.toFixed(2)}" rx="${labelRadius}" ry="${labelRadius}" fill="rgba(255,255,255,0.96)" stroke="#94a3b8" stroke-width="1.5"/>`;
  svg += `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#0f172a" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>`;
  return svg;
}

export async function exportDinRailToSvg(
  symbols: SymbolItem[],
  rail: DinRailCanvasRail,
  options: DinRailSvgExportOptions = {},
  connections?: ConnectionItem[],
): Promise<string[]> {
  const includeDesignations = options.includeDesignations !== false;
  const includeGroupFrames = options.includeGroupFrames !== false;
  const drawConnections = options.drawConnections !== false;

  if (!rail.isVisible || rail.width <= 0 || rail.height <= 0) {
    return [];
  }

  const snappedSymbols = symbols.filter((symbol) => symbol.isSnappedToRail);
  const groupFrames = includeGroupFrames
    ? buildDinRailGroupFrames(snappedSymbols, DIN_RAIL_GROUP_FRAME_PADDING)
    : [];

  const bounds = calculateBounds(symbols, snappedSymbols, rail, connections, includeDesignations, groupFrames);
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;

  // WHY: @react-pdf/renderer's <Image> ignores style.width/height for SVG sources
  // and renders at the SVG's intrinsic dimensions. The renderer itself must
  // therefore declare a fitting size while preserving the content's aspect
  // ratio through viewBox. We take the tighter of the two caps so the SVG
  // always fits within the available page area.
  let embedWidth = contentWidth;
  let embedHeight = contentHeight;
  let fitScale = 1;
  if (options.maxEmbedWidth || options.maxEmbedHeight) {
    const scaleW = options.maxEmbedWidth ? options.maxEmbedWidth / contentWidth : Number.POSITIVE_INFINITY;
    const scaleH = options.maxEmbedHeight ? options.maxEmbedHeight / contentHeight : Number.POSITIVE_INFINITY;
    fitScale = Math.min(scaleW, scaleH);
    if (Number.isFinite(fitScale) && fitScale < 1) {
      embedWidth = contentWidth * fitScale;
      embedHeight = contentHeight * fitScale;
    } else {
      fitScale = 1;
    }
  }

  const automaticDesignationBySymbolId = includeDesignations
    ? buildAutomaticDesignationMap(symbols)
    : new Map<string, string>();

  const loadedImages = await loadSymbolImages(snappedSymbols);

  const parts: string[] = [];

  // SVG header. The viewBox matches the final output size, so the browser /
  // react-pdf renders the SVG at 1:1 with no implicit scaling — all scaling
  // happens explicitly inside the inner <g> below.
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${embedWidth} ${embedHeight}" width="${embedWidth}" height="${embedHeight}">`);
  parts.push(`<defs><filter id="din-shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter></defs>`);

  // Background fills the swapped viewport
  parts.push(`<rect x="0" y="0" width="${embedWidth}" height="${embedHeight}" fill="#ffffff"/>`);

  // Inner transform: scale the content to fit the embed box, then translate so
  // the raw content's top-left sits at (0,0). Read right-to-left for a point.
  const innerTransform = `scale(${fitScale}) translate(${offsetX} ${offsetY})`;
  parts.push(`<g transform="${innerTransform}">`);

  // Rail background SVG
  if (rail.svg) {
    const railDataUri = svgMarkupToDataUri(rail.svg);
    parts.push(`<image href="${railDataUri}" x="0" y="0" width="${rail.width}" height="${rail.height}"/>`);
  }

  // Layer 1: Base symbols (drawn UNDER wires)
  const baseSymbols = loadedImages.filter(
    (li) =>
      isDistributionBlockSymbol(li.symbol) ||
      li.symbol.deviceKind === "phaseIndicator" ||
      !!li.fgDataUri ||
      (li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") ||
      (li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczenia"),
  );

  baseSymbols.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) return a.symbol.y - b.symbol.y;
    return a.symbol.x - b.symbol.x;
  });

  for (const { symbol, baseDataUri } of baseSymbols) {
    parts.push(`<image href="${baseDataUri}" x="${symbol.x}" y="${symbol.y}" width="${symbol.width}" height="${symbol.height}"/>`);
  }

  // Layer 2: Wires
  if (drawConnections && connections && connections.length > 0) {
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

      const fromExitOffsetVal = hasFerrule
        ? Math.max(fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius
        : (fromHS.exitOffset ?? 40) + customRadius;
      const toExitOffsetVal = hasFerrule
        ? Math.max(toHS.exitOffset ?? 40, toFerruleLen) + customRadius
        : (toHS.exitOffset ?? 40) + customRadius;

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
      const pathD = pointsToPathD(pointsArr);
      parts.push(renderWireSvg(conn, symbols, pathD));
    }
  }

  // Layer 3: Ferrules (drawn OVER wires but UNDER normal symbols)
  if (drawConnections && connections && connections.length > 0) {
    const ferruleCounts = new Map<string, number>();

    const prepared = connections
      .map((conn) => {
        const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
        const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
        if (!fromSymbol || !toSymbol) return null;

        const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
        const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
        if (!fromHS || !toHS) return null;

        const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
        const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

        const actualFromDir = resolveConnectionIsFromTop(fromSymbol, conn.isFromTop, fromHS) ? "top" : "bottom";
        const actualToDir = resolveConnectionIsToTop(toSymbol, conn.isToTop, toHS) ? "top" : "bottom";

        return { conn, fromSymbol, toSymbol, fromHS, toHS, fromPt, toPt, actualFromDir, actualToDir };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    prepared.forEach((w) => {
      if (!w.conn.ferruleColor || w.conn.ferruleColor === "none") return;
      const fromKey = `${w.conn.fromSymbolId}:${w.conn.fromTerminal}:${w.fromHS.isTop ? "T" : "B"}:${w.actualFromDir}`;
      const toKey = `${w.conn.toSymbolId}:${w.conn.toTerminal}:${w.toHS.isTop ? "T" : "B"}:${w.actualToDir}`;
      ferruleCounts.set(fromKey, (ferruleCounts.get(fromKey) || 0) + 1);
      ferruleCounts.set(toKey, (ferruleCounts.get(toKey) || 0) + 1);
    });

    const renderedFerrules = new Set<string>();

    prepared.forEach((w) => {
      if (!w.conn.ferruleColor || w.conn.ferruleColor === "none") return;

      const fromKey = `${w.conn.fromSymbolId}:${w.conn.fromTerminal}:${w.fromHS.isTop ? "T" : "B"}:${w.actualFromDir}`;
      const toKey = `${w.conn.toSymbolId}:${w.conn.toTerminal}:${w.toHS.isTop ? "T" : "B"}:${w.actualToDir}`;

      if (!renderedFerrules.has(fromKey)) {
        renderedFerrules.add(fromKey);
        const fromIsDist = isDistributionBlockSymbol(w.fromSymbol);
        const isSquare =
          w.fromSymbol.deviceKind === "phaseIndicator" ||
          (w.fromSymbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") ||
          (w.fromSymbol.moduleRef || "").toLowerCase().includes("zabezpieczenia");
        const isShort = w.fromSymbol.deviceKind === "terminalBlock";

        parts.push(
          renderFerruleSvg(
            w.fromPt.x,
            w.fromPt.y,
            ferruleDirection(w.actualFromDir as "top" | "bottom"),
            w.conn.ferruleColor,
            w.conn.wireCrossSection,
            (ferruleCounts.get(fromKey) || 0) >= 2,
            isShort,
            fromIsDist,
            isSquare,
            fromIsDist ? 10 : w.fromHS.visualInset,
            fromIsDist ? 80 : undefined,
          ),
        );
      }

      if (!renderedFerrules.has(toKey)) {
        renderedFerrules.add(toKey);
        const toIsDist = isDistributionBlockSymbol(w.toSymbol);
        const isSquare =
          w.toSymbol.deviceKind === "phaseIndicator" ||
          (w.toSymbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") ||
          (w.toSymbol.moduleRef || "").toLowerCase().includes("zabezpieczenia");
        const isShort = w.toSymbol.deviceKind === "terminalBlock";

        parts.push(
          renderFerruleSvg(
            w.toPt.x,
            w.toPt.y,
            ferruleDirection(w.actualToDir as "top" | "bottom"),
            w.conn.ferruleColor,
            w.conn.wireCrossSection,
            (ferruleCounts.get(toKey) || 0) >= 2,
            isShort,
            toIsDist,
            isSquare,
            toIsDist ? 10 : w.toHS.visualInset,
            toIsDist ? 80 : undefined,
          ),
        );
      }
    });
  }

  // Layer 4: Normal symbols (drawn OVER wires)
  const normalSymbols = loadedImages.filter(
    (li) =>
      li.symbol.deviceKind !== "phaseIndicator" &&
      !isDistributionBlockSymbol(li.symbol) &&
      !li.fgDataUri &&
      !(li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczajacy") &&
      !(li.symbol.moduleRef || "").toLowerCase().includes("zabezpieczenia"),
  );

  normalSymbols.sort((a, b) => {
    if (Math.abs(a.symbol.y - b.symbol.y) > 5) return a.symbol.y - b.symbol.y;
    return a.symbol.x - b.symbol.x;
  });

  for (const { symbol, baseDataUri } of normalSymbols) {
    parts.push(`<image href="${baseDataUri}" x="${symbol.x}" y="${symbol.y}" width="${symbol.width}" height="${symbol.height}"/>`);
  }

  // Layer 5: Foreground (cover for distribution block, terminals for listwa)
  const fgSymbols = loadedImages.filter((li) => li.fgDataUri !== null);
  for (const { symbol, fgDataUri } of fgSymbols) {
    if (fgDataUri) {
      parts.push(`<image href="${fgDataUri}" x="${symbol.x}" y="${symbol.y}" width="${symbol.width}" height="${symbol.height}"/>`);
    }
  }

  // Designation labels
  if (includeDesignations) {
    for (const symbol of snappedSymbols) {
      const labelSvg = renderDesignationLabel(symbol, automaticDesignationBySymbolId);
      if (labelSvg) parts.push(labelSvg);
    }
  }

  // Group frames
  if (includeGroupFrames) {
    for (const group of groupFrames) {
      parts.push(renderGroupFrameSvg(group, rail.width));
    }
  }

  parts.push(`</g>`);
  parts.push(`</svg>`);

  return [parts.join("")];
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
