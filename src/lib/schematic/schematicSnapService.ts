import type { SchematicLayout, DinRailInfo } from "./schematicLayout";
import { MODULE_GAP } from "./schematicLayout";

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  snappedToRail: boolean;
  railIndex?: number;
  slotIndex?: number;
}

const SNAP_THRESHOLD = 12; // pixels

export function snapToRail(
  worldX: number,
  worldY: number,
  layout: SchematicLayout,
  symbolWidth: number = 18,
): SnapResult {
  let bestDistance = SNAP_THRESHOLD;
  let result: SnapResult = {
    snappedX: worldX,
    snappedY: worldY,
    snappedToRail: false,
  };

  for (const page of layout.pages) {
    for (const rail of page.dinRails) {
      const pageOffsetY = page.offsetY;
      const railY = rail.y + pageOffsetY;

      // Snap Y to rail
      const yDist = Math.abs(worldY - railY);
      if (yDist < bestDistance) {
        bestDistance = yDist;
        result.snappedY = railY;
        result.snappedToRail = true;
        result.railIndex = rail.railIndex;
      }

      // Snap X to module slots on this rail
      const slotResult = snapToSlot(worldX, worldY, rail, pageOffsetY, symbolWidth);
      const totalDist = Math.abs(worldX - slotResult.snappedX) + Math.abs(worldY - slotResult.snappedY);
      if (totalDist < bestDistance * 2) {
        bestDistance = totalDist;
        result = slotResult;
        result.snappedToRail = true;
      }
    }
  }

  return result;
}

function snapToSlot(
  worldX: number,
  _worldY: number,
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

  if (closest && closest.dist < SNAP_THRESHOLD * 3) {
    return {
      railY: closest.railY,
      railIndex: closest.railIndex,
      pageIndex: closest.pageIndex,
    };
  }

  return null;
}
