import { getModuleSnapAnchorRatioY } from "../modules/moduleCatalog";
import type { SymbolItem } from "../../types/symbolItem";
import {
  assignAuxiliaryReferenceDesignations,
  hasManualReferenceDesignation,
  resolveGroupReferenceNumber,
  shouldAutoAssignGroupCircuitDesignation,
  toDisplayModuleNumber,
} from "./referenceDesignations";

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
