import { getPaletteTemplateDimensions } from './modules/moduleCatalog';
import { DinRailConfig } from './schematic/dinRailGenerator';
import { SymbolItem, DeviceKind, CircuitTypeValue, PhaseAssignment } from '../types/symbolItem';
import { AppIconName } from '../components/AppIcon';



export type SheetType = "sheet1" | "sheet2" | "sheet3" | "sheet4";
export type RightTab = "config" | "balance" | "validation" | "circuitEdit";

export interface PaletteTemplate {
  templateId: string;
  code: string;
  label: string;
  type: string;
  assetPath?: string;
  category?: string;
  deviceKind: DeviceKind;
  phase: PhaseAssignment;
  modules: number;
  moduleRef?: string;
  customWidth?: number;
  customHeight?: number;
  placeholderDefaults?: Record<string, string>;
  protectionType?: string;
  powerW?: number;
  circuitType?: CircuitTypeValue;
  rcdRatedCurrent?: number;
  rcdResidualCurrent?: number;
  rcdType?: string;
  spdType?: string;
  spdVoltage?: number;
  spdDischargeCurrent?: number;
  frRatedCurrent?: string;
}

export const DEFAULT_DIN_RAIL_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
export const HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY = "dinboard.hiddenPaletteTemplateIds";

export function buildPaletteTemplateMap(
  paletteGroups: Array<{ items: PaletteTemplate[] }>,
) {
  return new Map(
    paletteGroups.flatMap((group) => group.items.map((item) => [item.templateId, item] as const)),
  );
}

export function normalizePaletteAssetDimensions(
  symbols: SymbolItem[],
  paletteTemplateMap: Map<string, PaletteTemplate>,
): SymbolItem[] {
  let changed = false;

  const nextSymbols = symbols.map((symbol) => {
    if (
      (symbol.moduleSourceType !== "BuiltInAsset" && symbol.moduleSourceType !== "ImportedSvg")
      || !symbol.moduleRef
    ) {
      return symbol;
    }

    const template = Array.from(paletteTemplateMap.values()).find(
      (item) => item.moduleRef === symbol.moduleRef,
    );

    if (!template) {
      return symbol;
    }

    const dimensions = getPaletteTemplateDimensions(template);
    const widthChanged = Math.abs(symbol.width - dimensions.width) > 0.01;
    const heightChanged = Math.abs(symbol.height - dimensions.height) > 0.01;

    if (!widthChanged && !heightChanged) {
      return symbol;
    }

    changed = true;
    return {
      ...symbol,
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  return changed ? nextSymbols : symbols;
}

export function getPaletteIconName(template: PaletteTemplate): AppIconName {
  switch (template.deviceKind) {
    case "fr":
      return "busbar";
    case "rcd":
    case "rcbo":
      return "validation";
    case "mcb":
      return "fileTree";
    case "spd":
      return "balance";
    case "terminalBlock":
      return "list";
    case "phaseIndicator":
      return "theme";
    default:
      return "palette";
  }
}

export function getPaletteDescription(template: PaletteTemplate): string {
  const parts = [`${template.modules}M`, template.phase];
  const normalizedLabel = template.label.trim().toLocaleLowerCase("pl");
  const normalizedCode = template.code.trim().toLocaleLowerCase("pl");

  if (template.protectionType) {
    parts.push(template.protectionType);
  }

  if (template.rcdRatedCurrent && template.rcdResidualCurrent) {
    parts.push(`${template.rcdRatedCurrent}A / ${template.rcdResidualCurrent}mA`);
  }

  if (
    template.frRatedCurrent
    && !normalizedLabel.includes(template.frRatedCurrent.toLocaleLowerCase("pl"))
    && !normalizedCode.includes(template.frRatedCurrent.toLocaleLowerCase("pl"))
  ) {
    parts.push(template.frRatedCurrent);
  }

  if (
    template.spdType
    && !normalizedLabel.includes(template.spdType.toLocaleLowerCase("pl"))
    && !normalizedCode.includes(template.spdType.toLocaleLowerCase("pl"))
  ) {
    parts.push(template.spdType);
  }

  return parts.join(" · ");
}

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

export const SYMBOLS_STORAGE_KEY = "dinboard-web.symbols.v1";
export const LEGACY_SYMBOLS_STORAGE_KEY = "dinboard-tauri.symbols.v1";

export function getReferencePrefix(template: PaletteTemplate): string {
  switch (template.deviceKind) {
    case "fr":
    case "rcd":
      return "Q";
    case "spd":
      return "FA";
    case "phaseIndicator":
      return "H";
    case "mcb":
    case "rcbo":
      return "F";
    default:
      return "X";
  }
}

export function getNextReferenceDesignation(symbols: SymbolItem[], prefix: string): string {
  const matcher = new RegExp(`^${prefix}(\\d+)$`, "i");
  let highest = 0;

  for (const symbol of symbols) {
    const match = symbol.referenceDesignation.match(matcher);
    if (!match) {
      continue;
    }

    const numeric = Number.parseInt(match[1], 10);
    if (Number.isFinite(numeric)) {
      highest = Math.max(highest, numeric);
    }
  }

  return `${prefix}${highest + 1}`;
}

export function isGroupHeadSymbol(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "rcd";
}

export function isDistributionSymbol(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo" || symbol.isTerminalBlock;
}

export function shouldExcludeFromAutoGrouping(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "fr" || symbol.deviceKind === "spd" || symbol.deviceKind === "phaseIndicator";
}

export function getNextGroupName(symbols: SymbolItem[]): string {
  const usedOrders = symbols
    .map((symbol) => {
      const match = symbol.groupName.match(/^Grupa-(\d+)$/i);
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  const nextOrder = usedOrders.length > 0 ? Math.max(...usedOrders) + 1 : 1;
  return `Grupa-${nextOrder}`;
}

export function findDinRailSnapTarget(
  symbols: SymbolItem[],
  x: number,
  y: number,
  width: number,
  height: number,
): SymbolItem | null {
  const sameRailTolerance = 100;
  const snapThreshold = 30;
  const centerY = y + height / 2;
  const candidates = symbols.filter(
    (symbol) =>
      symbol.isSnappedToRail &&
      Math.abs(symbol.y + symbol.height / 2 - centerY) < sameRailTolerance,
  );

  let best: { symbol: SymbolItem; distance: number } | null = null;
  for (const symbol of candidates) {
    const rightDistance = Math.abs(x - (symbol.x + symbol.width));
    const leftDistance = Math.abs(x + width - symbol.x);
    const overlap = Math.min(x + width, symbol.x + symbol.width) - Math.max(x, symbol.x);
    const distance = overlap > 10 ? 0 : Math.min(rightDistance, leftDistance);

    if (!best || distance < best.distance) {
      best = { symbol, distance };
    }
  }

  return best && best.distance < snapThreshold ? best.symbol : null;
}

export function compareDinPosition(left: SymbolItem, right: SymbolItem): number {
  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.x - right.x;
}

export function canAutoJoinExistingGroup(symbol: SymbolItem, snapTarget: SymbolItem): boolean {
  void snapTarget;
  return !(symbol.deviceKind === "fr" || symbol.deviceKind === "spd" || symbol.deviceKind === "phaseIndicator");
}

export function resolveRcdSource(symbols: SymbolItem[], snapTarget: SymbolItem): SymbolItem | null {
  if (snapTarget.deviceKind === "rcd") {
    return snapTarget;
  }

  if (snapTarget.rcdSymbolId) {
    const explicitRcd = symbols.find((symbol) => symbol.id === snapTarget.rcdSymbolId);
    if (explicitRcd) {
      return explicitRcd;
    }
  }

  if (snapTarget.group) {
    return symbols.find((symbol) => symbol.group === snapTarget.group && symbol.deviceKind === "rcd") ?? null;
  }

  return null;
}

export function applyInheritedRcdInfo(symbols: SymbolItem[], symbol: SymbolItem, snapTarget: SymbolItem): void {
  if (isGroupHeadSymbol(symbol)) {
    return;
  }

  const rcdSource = resolveRcdSource(symbols, snapTarget);
  if (!rcdSource || rcdSource.id === symbol.id) {
    symbol.rcdSymbolId = "";
    symbol.rcdRatedCurrent = 0;
    symbol.rcdResidualCurrent = 0;
    symbol.rcdType = "";
    return;
  }

  symbol.rcdSymbolId = rcdSource.id;
  symbol.rcdRatedCurrent = rcdSource.rcdRatedCurrent;
  symbol.rcdResidualCurrent = rcdSource.rcdResidualCurrent;
  symbol.rcdType = rcdSource.rcdType;
}

export function snapDraggedGroupToNeighborModules(
  movedSymbols: SymbolItem[],
  allSymbols: SymbolItem[],
  initialDeltaX: number,
  anchorSymbol: SymbolItem,
  targetTopY: number,
): number {
  if (movedSymbols.length === 0) {
    return initialDeltaX;
  }

  const sameRailTolerance = 100;
  const snapThreshold = 30;
  const gap = 0;
  const movedGroupLeft = Math.min(...movedSymbols.map((symbol) => symbol.x)) + initialDeltaX;
  const movedGroupRight = Math.max(...movedSymbols.map((symbol) => symbol.x + symbol.width)) + initialDeltaX;
  const movedAnchorCenterY = targetTopY + anchorSymbol.height / 2;
  let bestSnapDeltaX = Number.POSITIVE_INFINITY;

  for (const existing of allSymbols) {
    if (movedSymbols.some((symbol) => symbol.id === existing.id)) {
      continue;
    }

    const existingCenterY = existing.y + existing.height / 2;
    if (Math.abs(existingCenterY - movedAnchorCenterY) > sameRailTolerance) {
      continue;
    }

    const rightEdge = existing.x + existing.width + gap;
    const distToRight = Math.abs(movedGroupLeft - rightEdge);
    if (distToRight < snapThreshold && distToRight < Math.abs(bestSnapDeltaX)) {
      bestSnapDeltaX = rightEdge - movedGroupLeft;
    }

    const leftEdge = existing.x - gap;
    const distToLeft = Math.abs(movedGroupRight - leftEdge);
    if (distToLeft < snapThreshold && distToLeft < Math.abs(bestSnapDeltaX)) {
      bestSnapDeltaX = leftEdge - movedGroupRight;
    }
  }

  return Number.isFinite(bestSnapDeltaX) ? initialDeltaX + bestSnapDeltaX : initialDeltaX;
}

export function toDisplayModuleNumber(symbol: SymbolItem): string {
  if (symbol.isTerminalBlock) {
    return `LW${symbol.moduleNumber}`;
  }

  if (symbol.deviceKind === "rcd") {
    return "#0";
  }

  return `#${symbol.moduleNumber}`;
}

export function normalizeDinRailModuleOrdering(symbols: SymbolItem[]): SymbolItem[] {
  const nextSymbols = symbols.map((symbol) => ({
    ...symbol,
    parameters: { ...symbol.parameters },
  }));
  const snappedSymbols = nextSymbols.filter((symbol) => symbol.isSnappedToRail);
  const grouped = new Map<string, SymbolItem[]>();

  for (const symbol of snappedSymbols) {
    if (!symbol.group) {
      continue;
    }

    const bucket = grouped.get(symbol.group) ?? [];
    bucket.push(symbol);
    grouped.set(symbol.group, bucket);
  }

  const orderedGroups = Array.from(grouped.entries())
    .map(([groupId, groupSymbols]) => ({
      groupId,
      symbols: groupSymbols,
      minY: Math.min(...groupSymbols.map((symbol) => symbol.y)),
      minX: Math.min(...groupSymbols.map((symbol) => symbol.x)),
    }))
    .sort((left, right) => left.minY - right.minY || left.minX - right.minX || left.groupId.localeCompare(right.groupId, "pl"));

  let terminalCounter = 1;

  for (const group of orderedGroups) {
    const modules = group.symbols.slice().sort(compareDinPosition);
    const rcds = modules.filter((symbol) => symbol.deviceKind === "rcd");
    const referenceX = rcds[0]?.x ?? 0;
    const others = modules
      .filter((symbol) => symbol.deviceKind !== "rcd")
      .sort((left, right) =>
        rcds.length > 0
          ? Math.abs(left.x - referenceX) - Math.abs(right.x - referenceX) || compareDinPosition(left, right)
          : compareDinPosition(left, right),
      );

    for (const rcd of rcds) {
      rcd.moduleNumber = 0;
      rcd.displayModuleNumber = "#0";
    }

    let groupCounter = 1;
    for (const symbol of others) {
      if (symbol.isTerminalBlock) {
        symbol.moduleNumber = terminalCounter++;
      } else {
        symbol.moduleNumber = groupCounter++;
      }
      symbol.displayModuleNumber = toDisplayModuleNumber(symbol);
    }
  }

  for (const symbol of snappedSymbols.filter((item) => !item.group)) {
    if (symbol.deviceKind === "rcd") {
      symbol.moduleNumber = 0;
      symbol.displayModuleNumber = "#0";
      continue;
    }

    if (symbol.moduleNumber <= 0) {
      symbol.moduleNumber = 1;
    }
    symbol.displayModuleNumber = toDisplayModuleNumber(symbol);
  }

  return nextSymbols;
}

export interface SymbolHistorySnapshot {
  symbols: SymbolItem[];
  selectedSymbolId: string | null;
  selectedSymbolIds?: string[];
}

export function cloneSymbolsSnapshot(symbols: SymbolItem[]): SymbolItem[] {
  return symbols.map((symbol) => ({ ...symbol, parameters: { ...symbol.parameters } }));
}

export function areSymbolSnapshotsEqual(first: SymbolItem[], second: SymbolItem[]): boolean {
  if (first.length !== second.length) return false;

  for (let i = 0; i < first.length; i++) {
    const a = first[i];
    const b = second[i];
    
    if (a === b) continue;

    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.x !== b.x ||
      a.y !== b.y ||
      a.width !== b.width ||
      a.height !== b.height ||
      a.label !== b.label ||
      a.phase !== b.phase ||
      a.group !== b.group ||
      a.groupName !== b.groupName ||
      a.isSnappedToRail !== b.isSnappedToRail ||
      a.protectionType !== b.protectionType ||
      a.powerW !== b.powerW ||
      a.referenceDesignation !== b.referenceDesignation ||
      a.circuitName !== b.circuitName ||
      a.circuitDescription !== b.circuitDescription ||
      a.circuitType !== b.circuitType ||
      a.location !== b.location ||
      a.rcdSymbolId !== b.rcdSymbolId ||
      a.rcdRatedCurrent !== b.rcdRatedCurrent ||
      a.rcdResidualCurrent !== b.rcdResidualCurrent ||
      a.rcdType !== b.rcdType ||
      a.spdType !== b.spdType ||
      a.spdVoltage !== b.spdVoltage ||
      a.spdDischargeCurrent !== b.spdDischargeCurrent ||
      a.frRatedCurrent !== b.frRatedCurrent ||
      a.cableCrossSection !== b.cableCrossSection ||
      a.cableLength !== b.cableLength ||
      a.deviceKind !== b.deviceKind ||
      a.isPhaseLocked !== b.isPhaseLocked ||
      a.visualPath !== b.visualPath ||
      a.moduleSourceType !== b.moduleSourceType ||
      a.moduleRef !== b.moduleRef
    ) {
      return false;
    }

    if (a.parameters || b.parameters) {
      if (!a.parameters || !b.parameters) return false;
      const keysA = Object.keys(a.parameters);
      const keysB = Object.keys(b.parameters);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (a.parameters[key] !== b.parameters[key]) return false;
      }
    }
  }

  return true;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}
