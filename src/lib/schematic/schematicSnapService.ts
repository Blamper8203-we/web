import type { SymbolItem } from "../../types/symbolItem";
import { getModuleSnapAnchorRatioY } from "../modules/moduleCatalog";
import type { DinRailInfo, PageInfo, SchematicLayout } from "./schematicLayout";
import { MODULE_GAP } from "./schematicLayout";

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  snappedToRail: boolean;
  railIndex?: number;
  slotIndex?: number;
}

export interface SchematicSnapOptions {
  ignoreSymbolIds?: string[];
  moduleRef?: string;
  symbolHeight?: number;
  symbolWidth?: number;
  symbols?: SymbolItem[];
}

const VERTICAL_SNAP_THRESHOLD = 80;
const HORIZONTAL_SNAP_THRESHOLD = 30;
const SAME_RAIL_TOLERANCE = 100;
const OVERLAP_TOLERANCE = 2;
const OVERLAP_RESOLVE_THRESHOLD = 10;
const EDGE_GAP = 0;

export function snapToRail(
  worldX: number,
  worldY: number,
  layout: SchematicLayout,
  options: SchematicSnapOptions = {},
): SnapResult {
  const symbolWidth = options.symbolWidth ?? 18;
  const symbolHeight = options.symbolHeight ?? 40;
  const anchorRatioY = getModuleSnapAnchorRatioY(options.moduleRef);
  const ignoreSymbolIds = new Set(options.ignoreSymbolIds ?? []);
  const symbols = options.symbols ?? [];

  let bestDistance = VERTICAL_SNAP_THRESHOLD;
  let nearestRail: { page: PageInfo; rail: DinRailInfo; y: number } | null = null;
  const result: SnapResult = {
    snappedX: worldX,
    snappedY: worldY,
    snappedToRail: false,
  };

  for (const page of layout.pages) {
    for (const rail of page.dinRails) {
      const railY = rail.y + page.offsetY;
      const distance = Math.abs(worldY - railY);

      if (distance < bestDistance) {
        bestDistance = distance;
        nearestRail = { page, rail, y: railY };
        result.snappedY = railY;
        result.snappedToRail = true;
        result.railIndex = rail.railIndex;
      }
    }
  }

  if (!nearestRail) {
    return result;
  }

  const snappedAnchorY = result.snappedY + symbolHeight * anchorRatioY;
  const rowSymbols = symbols.filter((symbol) => {
    if (ignoreSymbolIds.has(symbol.id)) {
      return false;
    }

    const symbolAnchorY = symbol.y + symbol.height * getModuleSnapAnchorRatioY(symbol.moduleRef);
    return Math.abs(symbolAnchorY - snappedAnchorY) < SAME_RAIL_TOLERANCE;
  });

  if (rowSymbols.length > 0) {
    const neighborSnap = snapToNeighbor(
      worldX,
      symbolWidth,
      rowSymbols,
    );
    if (neighborSnap) {
      return {
        snappedX: neighborSnap.snappedX,
        snappedY: result.snappedY,
        snappedToRail: true,
        railIndex: nearestRail.rail.railIndex,
      };
    }
  }

  const slotResult = snapToSlot(worldX, nearestRail.rail, nearestRail.page.offsetY, symbolWidth);
  result.snappedX = slotResult.snappedX;

  return result;
}

function snapToNeighbor(
  worldX: number,
  symbolWidth: number,
  rowSymbols: SymbolItem[],
): { snappedX: number } | null {
  const isSpaceFree = (startX: number, width: number): boolean => {
    const endX = startX + width;
    for (const symbol of rowSymbols) {
      const symbolEndX = symbol.x + symbol.width;
      if (Math.max(startX, symbol.x) < Math.min(endX, symbolEndX) - OVERLAP_TOLERANCE) {
        return false;
      }
    }
    return true;
  };

  let bestDistance = HORIZONTAL_SNAP_THRESHOLD;
  let snappedX: number | null = null;

  for (const symbol of rowSymbols) {
    const rightTarget = symbol.x + symbol.width + EDGE_GAP;
    const rightDistance = Math.abs(worldX - rightTarget);
    if (rightDistance < bestDistance && isSpaceFree(rightTarget, symbolWidth)) {
      bestDistance = rightDistance;
      snappedX = rightTarget;
    }

    const leftTarget = symbol.x - EDGE_GAP - symbolWidth;
    const leftDistance = Math.abs(worldX - leftTarget);
    if (leftDistance < bestDistance && isSpaceFree(leftTarget, symbolWidth)) {
      bestDistance = leftDistance;
      snappedX = leftTarget;
    }
  }

  if (snappedX !== null) {
    return { snappedX };
  }

  for (const symbol of rowSymbols) {
    const overlapStart = Math.max(worldX, symbol.x);
    const overlapEnd = Math.min(worldX + symbolWidth, symbol.x + symbol.width);

    if (overlapEnd <= overlapStart + OVERLAP_RESOLVE_THRESHOLD) {
      continue;
    }

    const leftEdge = symbol.x - EDGE_GAP - symbolWidth;
    const rightEdge = symbol.x + symbol.width + EDGE_GAP;
    const rightFree = isSpaceFree(rightEdge, symbolWidth);
    const leftFree = isSpaceFree(leftEdge, symbolWidth);

    if (rightFree && !leftFree) {
      return { snappedX: rightEdge };
    }

    if (leftFree && !rightFree) {
      return { snappedX: leftEdge };
    }

    if (rightFree && leftFree) {
      return {
        snappedX:
          Math.abs(worldX - rightEdge) <= Math.abs(worldX - leftEdge)
            ? rightEdge
            : leftEdge,
      };
    }
  }

  return null;
}

function snapToSlot(
  worldX: number,
  rail: DinRailInfo,
  pageOffsetY: number,
  symbolWidth: number,
): SnapResult {
  const railY = rail.y + pageOffsetY;
  const slotWidth = symbolWidth + MODULE_GAP;

  // Calculate nearest slot
  const relativeX = worldX - rail.startX;
  const slotIndex = Math.round(relativeX / slotWidth);
  const slotX = rail.startX + slotIndex * slotWidth;

  return {
    snappedX: slotX,
    snappedY: railY,
    snappedToRail: true,
    railIndex: rail.railIndex,
    slotIndex,
  };
}

export function snapToNearestRail(
  _worldX: number,
  worldY: number,
  layout: SchematicLayout,
): { railY: number; railIndex: number; pageIndex: number } | null {
  let closest: { railY: number; railIndex: number; pageIndex: number; dist: number } | null = null;

  for (const page of layout.pages) {
    for (const rail of page.dinRails) {
      const railY = rail.y + page.offsetY;
      const dist = Math.abs(worldY - railY);

      if (!closest || dist < closest.dist) {
        closest = {
          railY,
          railIndex: rail.railIndex,
          pageIndex: page.pageIndex,
          dist,
        };
      }
    }
  }

  if (closest && closest.dist < VERTICAL_SNAP_THRESHOLD * 3) {
    return {
      railY: closest.railY,
      railIndex: closest.railIndex,
      pageIndex: closest.pageIndex,
    };
  }

  return null;
}
