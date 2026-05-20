import {
  DIN_RAIL_PADDING_X,
  MODULE_UNIT_WIDTH,
  getModuleSnapAnchorRatioY,
} from "./modules/moduleCatalog";
import type { SymbolItem } from "../types/symbolItem";

const DRAG_SNAP_IN = 50;
const DRAG_SNAP_OUT = 80;
const SAME_RAIL_TOLERANCE = 100;
const SNAP_THRESHOLD = 30;
const OVERLAP_TOLERANCE = 2;
const EDGE_GAP = 0;

export interface SnapModulePlacementOptions {
  forceSnapToRail?: boolean;
  ignoreSymbolIds?: string[];
  isCurrentlySnapped?: boolean;
  moduleRef?: string;
}

export interface SnapModulePlacementResult {
  shouldSnap: boolean;
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function findClosest(values: number[], target: number): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((closest, value) =>
    Math.abs(value - target) < Math.abs(closest - target) ? value : closest,
  );
}

export function snapModulePlacementToDinRail(
  x: number,
  y: number,
  width: number,
  height: number,
  railWidth: number,
  rowCenters: number[],
  snappedSymbols: SymbolItem[],
  dragSymbolId?: string,
  options?: SnapModulePlacementOptions,
): SnapModulePlacementResult {
  const anchorRatioY = getModuleSnapAnchorRatioY(options?.moduleRef);
  const moduleCenterY = y + height * anchorRatioY;
  const closestRowCenter = findClosest(rowCenters, moduleCenterY) ?? moduleCenterY;
  const minDistance = Math.abs(moduleCenterY - closestRowCenter);
  const shouldSnap =
    options?.forceSnapToRail === true
      ? true
      : options?.isCurrentlySnapped
        ? minDistance < DRAG_SNAP_OUT
        : minDistance < DRAG_SNAP_IN;
  const targetY = shouldSnap ? closestRowCenter - height * anchorRatioY : y;

  const ignoredIds = new Set(options?.ignoreSymbolIds ?? []);
  if (dragSymbolId) {
    ignoredIds.add(dragSymbolId);
  }

  const rowSymbols = snappedSymbols.filter(
    (symbol) =>
      !ignoredIds.has(symbol.id)
      && Math.abs(
        symbol.y + symbol.height * getModuleSnapAnchorRatioY(symbol.moduleRef) - closestRowCenter,
      ) < SAME_RAIL_TOLERANCE,
  );

  const isSpaceFree = (startX: number, nextWidth: number) => {
    const endX = startX + nextWidth;
    for (const symbol of rowSymbols) {
      const symbolEndX = symbol.x + symbol.width;
      if (Math.max(startX, symbol.x) < Math.min(endX, symbolEndX) - OVERLAP_TOLERANCE) {
        return false;
      }
    }
    return true;
  };

  let bestDistX = SNAP_THRESHOLD;
  let finalX = x;
  let isHorizontallySnapped = false;

  if (shouldSnap) {
    for (const symbol of rowSymbols) {
      const rightTarget = symbol.x + symbol.width + EDGE_GAP;
      const distRight = Math.abs(x - rightTarget);
      if (distRight < bestDistX && isSpaceFree(rightTarget, width)) {
        bestDistX = distRight;
        finalX = rightTarget;
        isHorizontallySnapped = true;
      }

      const leftTarget = symbol.x - EDGE_GAP - width;
      const distLeft = Math.abs(x - leftTarget);
      if (distLeft < bestDistX && isSpaceFree(leftTarget, width)) {
        bestDistX = distLeft;
        finalX = leftTarget;
        isHorizontallySnapped = true;
      }
    }

    if (!isHorizontallySnapped) {
      for (const symbol of rowSymbols) {
        const overlapStart = Math.max(x, symbol.x);
        const overlapEnd = Math.min(x + width, symbol.x + symbol.width);

        if (overlapEnd > overlapStart + 10.0) {
          const leftEdge = symbol.x - EDGE_GAP - width;
          const rightEdge = symbol.x + symbol.width + EDGE_GAP;

          const rightFree = isSpaceFree(rightEdge, width);
          const leftFree = isSpaceFree(leftEdge, width);

          if (rightFree && !leftFree) {
            finalX = rightEdge;
            isHorizontallySnapped = true;
            break;
          }

          if (leftFree && !rightFree) {
            finalX = leftEdge;
            isHorizontallySnapped = true;
            break;
          }

          if (rightFree && leftFree) {
            const distToRight = Math.abs(x - rightEdge);
            const distToLeft = Math.abs(x - leftEdge);
            finalX = distToRight <= distToLeft ? rightEdge : leftEdge;
            isHorizontallySnapped = true;
            break;
          }
        }
      }
    }

    if (!isHorizontallySnapped) {
      const gridX =
        DIN_RAIL_PADDING_X
        + Math.round((x - DIN_RAIL_PADDING_X) / MODULE_UNIT_WIDTH) * MODULE_UNIT_WIDTH;
      if (isSpaceFree(gridX, width)) {
        finalX = gridX;
        isHorizontallySnapped = true;
      }
    }
  }

  const maxX = railWidth - width - DIN_RAIL_PADDING_X;

  return {
    x: clamp(finalX, DIN_RAIL_PADDING_X, maxX),
    y: targetY,
    shouldSnap,
  };
}
