import { detectExplicitPoleCount } from "./modules/importedModuleCatalog";
import {
  getModuleSnapAnchorRatioY,
  getPaletteTemplateDimensions,
  type PaletteTemplate,
} from './modules/moduleCatalog';
import { DinRailConfig } from './schematic/dinRailGenerator';
import {
  createDefaultSymbolItem,
  isAuxiliaryNonCircuitSymbol,
  isDistributionBlockSymbol,
  isTerminalOrConnectorSymbol,
  type PhaseAssignment,
  type SymbolItem,
} from '../types/symbolItem';
import { AppIconName } from '../components/AppIcon';

export type SheetType = "sheet1" | "sheet2" | "sheet3" | "sheet4";
export type RightTab = "config" | "balance" | "validation" | "circuitEdit";

export type { PaletteTemplate };

export const DEFAULT_DIN_RAIL_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
export const HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY = "dinboard.hiddenPaletteTemplateIds";
const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";
const MANUAL_PHASE_KEY = "ManualPhase";
const SINGLE_PHASES: PhaseAssignment[] = ["L1", "L2", "L3"];

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
    if (!symbol.moduleRef) {
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
    const sourceType = template.templateId.startsWith("imported-catalog-")
      ? "ImportedSvg"
      : symbol.moduleSourceType;
    const sourceTypeChanged = symbol.moduleSourceType !== sourceType;
    const visualPath = template.assetPath || symbol.visualPath;
    const visualPathChanged = symbol.visualPath !== visualPath;
    const deviceKind = template.deviceKind;
    const deviceKindChanged = symbol.deviceKind !== deviceKind;
    const isFixedThreePhase = isFixedThreePhaseTemplate(template);
    const rawPhase =
      !isFixedThreePhase
        ? (symbol.phase || template.phase)
        : template.phase;
    const phase = isSinglePhaseRcdTemplate(template)
      ? normalizeSinglePhaseAssignment(rawPhase, template.phase)
      : rawPhase;
    const phaseChanged = symbol.phase !== phase;
    const shouldClearManualPhase =
      symbol.parameters[MANUAL_PHASE_KEY] === "true"
      && (isFixedThreePhase || (isSinglePhaseRcdTemplate(template) && !isSinglePhaseAssignment(symbol.phase)));
    const parameters =
      shouldClearManualPhase
        ? { ...symbol.parameters, [MANUAL_PHASE_KEY]: "false" }
        : symbol.parameters;
    const parametersChanged = parameters !== symbol.parameters;
    const rcdRatedCurrent = template.rcdRatedCurrent ?? symbol.rcdRatedCurrent;
    const rcdRatedCurrentChanged = symbol.rcdRatedCurrent !== rcdRatedCurrent;
    const rcdResidualCurrent = template.rcdResidualCurrent ?? symbol.rcdResidualCurrent;
    const rcdResidualCurrentChanged = symbol.rcdResidualCurrent !== rcdResidualCurrent;
    const rcdType = template.rcdType ?? symbol.rcdType;
    const rcdTypeChanged = symbol.rcdType !== rcdType;
    const isBuiltInLikeSource =
      symbol.moduleSourceType === "BuiltInAsset" || symbol.moduleSourceType === "ImportedSvg";
    const widthRatio = dimensions.width > 0 ? symbol.width / dimensions.width : 1;
    const heightRatio = dimensions.height > 0 ? symbol.height / dimensions.height : 1;
    const isSeverelyUnderscaled =
      Number.isFinite(widthRatio)
      && Number.isFinite(heightRatio)
      && widthRatio > 0
      && heightRatio > 0
      && widthRatio < 0.55
      && heightRatio < 0.55;
    const shouldNormalizeDimensions =
      isBuiltInLikeSource
      ? (widthChanged || heightChanged)
      : isSeverelyUnderscaled;
    const shouldNormalize =
      shouldNormalizeDimensions ||
      sourceTypeChanged ||
      visualPathChanged ||
      deviceKindChanged ||
      phaseChanged ||
      parametersChanged ||
      rcdRatedCurrentChanged ||
      rcdResidualCurrentChanged ||
      rcdTypeChanged;

    if (!shouldNormalize) {
      return symbol;
    }

    changed = true;
    return createDefaultSymbolItem({
      ...symbol,
      deviceKind,
      moduleSourceType: sourceType,
      phase,
      parameters,
      rcdRatedCurrent,
      rcdResidualCurrent,
      rcdType,
      visualPath,
      width: shouldNormalizeDimensions ? dimensions.width : symbol.width,
      height: shouldNormalizeDimensions ? dimensions.height : symbol.height,
    });
  });

  return changed ? nextSymbols : symbols;
}

function isFixedThreePhaseTemplate(template: PaletteTemplate): boolean {
  if (template.deviceKind !== "rcd") {
    return template.phase === "L1+L2+L3" || template.phase === "3F";
  }

  return isFixedThreePhaseRcdTemplate(template);
}

function isSinglePhaseRcdTemplate(template: PaletteTemplate): boolean {
  return template.deviceKind === "rcd" && !isFixedThreePhaseRcdTemplate(template);
}

function isFixedThreePhaseRcdTemplate(template: PaletteTemplate): boolean {
  if (template.deviceKind !== "rcd") {
    return false;
  }

  const identity = `${template.type} ${template.label} ${template.code} ${template.moduleRef}`
    .toLocaleUpperCase("pl-PL");
  if (identity.includes("2P") || identity.includes("1P")) {
    return false;
  }

  return template.modules >= 3 || identity.includes("4P") || identity.includes("3P") || template.phase === "L1+L2+L3";
}

function isFixedThreePhaseRcdSymbol(symbol: SymbolItem): boolean {
  if (symbol.deviceKind !== "rcd") {
    return false;
  }

  const identity = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`
    .toLocaleUpperCase("pl-PL");
  if (identity.includes("2P") || identity.includes("1P")) {
    return false;
  }

  return identity.includes("4P") || identity.includes("3P") || symbol.phase === "L1+L2+L3";
}

function isSinglePhaseAssignment(phase: string | null | undefined): phase is PhaseAssignment {
  return SINGLE_PHASES.includes((phase || "").toUpperCase() as PhaseAssignment);
}

function normalizeSinglePhaseAssignment(
  phase: string | null | undefined,
  fallback: string | null | undefined = "L1",
): PhaseAssignment {
  const normalizedPhase = (phase || "").toUpperCase();
  if (isSinglePhaseAssignment(normalizedPhase)) {
    return normalizedPhase;
  }

  const normalizedFallback = (fallback || "").toUpperCase();
  return isSinglePhaseAssignment(normalizedFallback) ? normalizedFallback : "L1";
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
  if (template.deviceKind === "terminalBlock") {
    return "";
  }

  let phaseText: string = template.phase;
  if (template.deviceKind === "mcb" || template.deviceKind === "rcd") {
    const poleCount = detectExplicitPoleCount(template.label) || template.modules;
    phaseText = `${poleCount}P`;
  } else if (
    template.category === "Blok rozdzielczy" ||
    template.deviceKind === "fr" ||
    template.deviceKind === "spd" ||
    template.deviceKind === "phaseIndicator"
  ) {
    phaseText = "";
  }

  const parts = [`${template.modules}M`];
  if (phaseText) {
    parts.push(phaseText);
  }
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

  return parts.filter(Boolean).join(" · ");
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
      return "QS";
    case "rcd":
      return "Q";
    case "spd":
      return "FA";
    case "phaseIndicator":
      return "H";
    case "mcb":
    case "rcbo":
      return "F";
    case "terminalBlock":
      return "X";
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
  return symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo";
}

export function shouldExcludeFromAutoGrouping(symbol: SymbolItem): boolean {
  return (
    symbol.deviceKind === "fr" ||
    symbol.deviceKind === "spd" ||
    symbol.deviceKind === "phaseIndicator" ||
    symbol.deviceKind === "rcd" ||
    isAuxiliaryNonCircuitSymbol(symbol)
  );
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
  moduleRef?: string,
): SymbolItem | null {
  const sameRailTolerance = 100;
  const snapThreshold = 30;
  const centerY = y + height * getModuleSnapAnchorRatioY(moduleRef);
  const candidates = symbols.filter(
    (symbol) =>
      symbol.isSnappedToRail &&
      Math.abs(
        symbol.y + symbol.height * getModuleSnapAnchorRatioY(symbol.moduleRef) - centerY,
      ) < sameRailTolerance,
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
  const yDiff = left.y - right.y;
  if (Math.abs(yDiff) > 50) {
    return yDiff;
  }

  return left.x - right.x;
}

export function canAutoJoinExistingGroup(symbol: SymbolItem, snapTarget: SymbolItem): boolean {
  void snapTarget;
  return !shouldExcludeFromAutoGrouping(symbol);
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
  const movedAnchorCenterY =
    targetTopY + anchorSymbol.height * getModuleSnapAnchorRatioY(anchorSymbol.moduleRef);
  let bestSnapDeltaX = Number.POSITIVE_INFINITY;

  for (const existing of allSymbols) {
    if (movedSymbols.some((symbol) => symbol.id === existing.id)) {
      continue;
    }

    const existingCenterY =
      existing.y + existing.height * getModuleSnapAnchorRatioY(existing.moduleRef);
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
  if (isTerminalOrConnectorSymbol(symbol)) {
    return `X${symbol.moduleNumber}`;
  }

  if (symbol.deviceKind === "rcd" || symbol.type.toLocaleUpperCase("pl-PL").includes("RCD")) {
    return "#0";
  }

  return `#${symbol.moduleNumber}`;
}

function hasManualReferenceDesignation(symbol: SymbolItem): boolean {
  return symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] === "true"
    && symbol.referenceDesignation.trim().length > 0;
}

function resolveGroupReferenceNumber(head: SymbolItem | undefined, fallbackNumber: number): string {
  if (!head) {
    return String(fallbackNumber);
  }

  const match = head.referenceDesignation.trim().match(/(\d+)\s*$/);
  if (!match) {
    return String(fallbackNumber);
  }

  const numeric = Number.parseInt(match[1], 10);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric)
    : String(fallbackNumber);
}

function shouldAutoAssignGroupCircuitDesignation(symbol: SymbolItem): boolean {
  return symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo";
}

function shouldUseAuxiliaryReferenceDesignation(symbol: SymbolItem): boolean {
  return isTerminalOrConnectorSymbol(symbol) || isDistributionBlockSymbol(symbol);
}

function assignAuxiliaryReferenceDesignations(symbols: SymbolItem[]): void {
  const auxiliarySymbols = symbols
    .filter(shouldUseAuxiliaryReferenceDesignation)
    .sort(compareDinPosition);
  const reservedDesignations = new Set(
    auxiliarySymbols
      .filter(hasManualReferenceDesignation)
      .map((symbol) => symbol.referenceDesignation.trim().toLocaleUpperCase("pl-PL")),
  );
  let auxiliaryCounter = 1;

  for (const symbol of auxiliarySymbols) {
    if (!hasManualReferenceDesignation(symbol)) {
      while (reservedDesignations.has(`X${auxiliaryCounter}`)) {
        auxiliaryCounter++;
      }

      symbol.referenceDesignation = `X${auxiliaryCounter}`;
      auxiliaryCounter++;
    }

    const referenceNumber = symbol.referenceDesignation.match(/^X(\d+)$/i);
    if (referenceNumber) {
      const moduleNumber = Number.parseInt(referenceNumber[1], 10);
      if (Number.isFinite(moduleNumber) && moduleNumber > 0) {
        symbol.moduleNumber = moduleNumber;
      }
    }

    symbol.displayModuleNumber = toDisplayModuleNumber(symbol);
  }
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

  for (const [groupIndex, group] of orderedGroups.entries()) {
    const modules = group.symbols.slice().sort(compareDinPosition);
    const rcds = modules.filter((symbol) => symbol.deviceKind === "rcd");
    const headRcd = rcds[0];
    const groupReferenceNumber = resolveGroupReferenceNumber(headRcd, groupIndex + 1);
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
    let groupedCircuitCounter = 1;
    for (const symbol of others) {
      symbol.moduleNumber = groupCounter++;

      if (
        headRcd
        && shouldAutoAssignGroupCircuitDesignation(symbol)
        && !hasManualReferenceDesignation(symbol)
      ) {
        symbol.referenceDesignation = `F${groupReferenceNumber}.${groupedCircuitCounter}`;
      }
      if (shouldAutoAssignGroupCircuitDesignation(symbol)) {
        groupedCircuitCounter++;
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

  assignAuxiliaryReferenceDesignations(nextSymbols);

  return nextSymbols;
}

export function normalizeGroupConsistency(symbols: SymbolItem[]): SymbolItem[] {
  const nextSymbols = symbols.map((symbol) => ({
    ...symbol,
    parameters: { ...symbol.parameters },
  }));
  const byId = new Map(nextSymbols.map((symbol) => [symbol.id, symbol] as const));

  for (const symbol of nextSymbols) {
    if (symbol.rcdSymbolId && !byId.has(symbol.rcdSymbolId)) {
      symbol.rcdSymbolId = "";
      if (symbol.deviceKind !== "rcd") {
        symbol.rcdRatedCurrent = 0;
        symbol.rcdResidualCurrent = 0;
        symbol.rcdType = "";
      }
    }
  }

  for (const symbol of nextSymbols) {
    if (!isAuxiliaryNonCircuitSymbol(symbol)) {
      continue;
    }

    symbol.group = "";
    symbol.groupName = "";
    symbol.rcdSymbolId = "";
    if (symbol.deviceKind !== "rcd") {
      symbol.rcdRatedCurrent = 0;
      symbol.rcdResidualCurrent = 0;
      symbol.rcdType = "";
    }
  }

  const grouped = new Map<string, SymbolItem[]>();
  for (const symbol of nextSymbols) {
    if (!symbol.group) {
      continue;
    }

    const bucket = grouped.get(symbol.group) ?? [];
    bucket.push(symbol);
    grouped.set(symbol.group, bucket);
  }

  let autoSinglePhaseRcdIndex = 0;

  for (const [groupId, groupSymbols] of grouped.entries()) {
    const rcds = groupSymbols.filter((symbol) => symbol.deviceKind === "rcd");
    const fixedThreePhaseRcds = rcds.slice(1).filter(isFixedThreePhaseRcdSymbol);
    for (const [index, rcd] of fixedThreePhaseRcds.entries()) {
      rcd.group = `${groupId}:${rcd.id}`;
      rcd.groupName = rcd.groupName
        ? `${rcd.groupName} RCD ${index + 2}`
        : `RCD ${index + 2}`;
      rcd.rcdSymbolId = "";
    }

    const activeGroupSymbols = groupSymbols.filter((symbol) => symbol.group === groupId);
    const groupLabel =
      activeGroupSymbols.find((symbol) => symbol.groupName.trim().length > 0)?.groupName ?? "";
    const headRcd = activeGroupSymbols.find((symbol) => symbol.deviceKind === "rcd") ?? null;

    if (!headRcd) {
      for (const symbol of activeGroupSymbols) {
        symbol.group = "";
        symbol.groupName = "";
        if (symbol.deviceKind !== "rcd") {
          symbol.rcdSymbolId = "";
          symbol.rcdRatedCurrent = 0;
          symbol.rcdResidualCurrent = 0;
          symbol.rcdType = "";
        }
      }
      continue;
    }

    const isSinglePhaseRcd = !isFixedThreePhaseRcdSymbol(headRcd);
    const autoPhase = SINGLE_PHASES[autoSinglePhaseRcdIndex % SINGLE_PHASES.length] ?? "L1";
    const shouldAutoAssignHeadPhase =
      isSinglePhaseRcd && headRcd.parameters[MANUAL_PHASE_KEY] !== "true" && !headRcd.isPhaseLocked;
    const headRcdPhase = isSinglePhaseRcd
      ? (shouldAutoAssignHeadPhase
          ? autoPhase
          : normalizeSinglePhaseAssignment(headRcd.phase, autoPhase))
      : headRcd.phase;

    if (isSinglePhaseRcd) {
      autoSinglePhaseRcdIndex++;
      if (headRcd.phase !== headRcdPhase) {
        headRcd.phase = headRcdPhase;
      }
    }

    for (const symbol of activeGroupSymbols) {
      if (!symbol.groupName && groupLabel) {
        symbol.groupName = groupLabel;
      }

      if (symbol.id === headRcd.id) {
        if (symbol.rcdSymbolId === symbol.id) {
          symbol.rcdSymbolId = "";
        }
        continue;
      }

      if (symbol.deviceKind === "rcd") {
        if (!symbol.rcdSymbolId) {
          symbol.rcdSymbolId = headRcd.id;
          symbol.rcdRatedCurrent = headRcd.rcdRatedCurrent;
          symbol.rcdResidualCurrent = headRcd.rcdResidualCurrent;
          symbol.rcdType = headRcd.rcdType;
          if (isSinglePhaseRcd) {
            symbol.phase = headRcdPhase;
          }
        }
        continue;
      }

      symbol.rcdSymbolId = headRcd.id;
      symbol.rcdRatedCurrent = headRcd.rcdRatedCurrent;
      symbol.rcdResidualCurrent = headRcd.rcdResidualCurrent;
      symbol.rcdType = headRcd.rcdType;
      if (isSinglePhaseRcd) {
        symbol.phase = headRcdPhase;
      }
    }

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
