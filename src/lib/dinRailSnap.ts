import { DIN_RAIL_PADDING_X, MODULE_UNIT_WIDTH } from "./modules/moduleCatalog";
import type { SymbolItem } from "../types/symbolItem";

const DRAG_SNAP_IN = 50;
const DRAG_SNAP_OUT = 80;
const SAME_RAIL_TOLERANCE = 100;
const SNAP_THRESHOLD = 30;
const OVERLAP_TOLERANCE = 2;
const EDGE_GAP = 0;

export interface SnapModulePlacementOptions {
  forceSnapToRail?: boolean;
  isCurrentlySnapped?: boolean;
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
  const moduleHalfHeight = height / 2;
  const moduleCenterY = y + moduleHalfHeight;
  const closestRowCenter = findClosest(rowCenters, moduleCenterY) ?? moduleCenterY;
  const minDistance = Math.abs(moduleCenterY - closestRowCenter);
  const shouldSnap =
    options?.forceSnapToRail === true
      ? true
      : options?.isCurrentlySnapped
        ? minDistance < DRAG_SNAP_OUT
        : minDistance < DRAG_SNAP_IN;
  const targetY = shouldSnap ? closestRowCenter - moduleHalfHeight : y;

  const rowSymbols = snappedSymbols.filter(
    (symbol) =>
      symbol.id !== dragSymbolId
      && Math.abs(symbol.y + symbol.height / 2 - closestRowCenter) < SAME_RAIL_TOLERANCE,
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
  }

  if (shouldSnap && !isHorizontallySnapped) {
    const rawSlot = Math.round((x - DIN_RAIL_PADDING_X) / MODULE_UNIT_WIDTH);
    finalX = DIN_RAIL_PADDING_X + rawSlot * MODULE_UNIT_WIDTH;
  }

  const maxX = railWidth - width - DIN_RAIL_PADDING_X;

  return {
    x: clamp(finalX, DIN_RAIL_PADDING_X, maxX),
    y: targetY,
    shouldSnap,
  };
}
