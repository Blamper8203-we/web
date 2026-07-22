// Geometry constants for "Listwy do rozdzielnicy" (terminal block) snap zones.
// These zones live above and below the DIN rail stack; the rail itself sits
// between `topY` (negative offset above) and `bottomY` (offset below the last
// row). Two horizontal slots per zone (left + right) keep terminals aligned
// with the rail center.

/** Vertical offset of the top zone above the rail origin. */
export const LISTWY_TOP_ZONE_Y = -1200;
/** Vertical size of a single terminal-block slot. */
export const LISTWY_SLOT_HEIGHT = 300;
import { LISTWY_ROW_SPACING } from '../schematic/dinRailGenerator';

/** Vertical distance between two consecutive DIN rows. */
/** Vertical offset below the last DIN row to the bottom zone. */
export const LISTWY_BOTTOM_ZONE_OFFSET = 2400;
/** Horizontal gap between the left and right slot in a zone. */
export const LISTWY_HORIZONTAL_GAP = 300;
/** Maximum width of a single slot. */
export const LISTWY_MAX_SLOT_WIDTH = 2000;
/** Width of a slot as a fraction of the rail width (capped by MAX_SLOT_WIDTH). */
export const LISTWY_SLOT_WIDTH_RATIO = 0.35;
/** Snap-to-slot horizontal tolerance (in world units). */
export const LISTWY_HORIZONTAL_SNAP_DISTANCE = 1500;
/** Snap-to-zone vertical tolerance for the "in zone" check. */
export const LISTWY_ZONE_VERTICAL_TOLERANCE = 200;

export interface ListwyZoneLayout {
  topY: number;
  bottomY: number;
  rectWidth: number;
  rectHeight: number;
  leftRectX: number;
  rightRectX: number;
  leftCenterX: number;
  rightCenterX: number;
}

export interface SnapListwaArgs {
  x: number;
  y: number;
  width: number;
  height: number;
  railWidth: number;
  railRows: number;
}

export interface SnapListwaResult {
  x: number;
  y: number;
}

/**
 * Computes the layout (4 slots: top-left, top-right, bottom-left, bottom-right)
 * for a given rail configuration. Useful for placeholder rendering and
 * collision tests independent of the actual drag interaction.
 */
export function computeListwyZoneLayout(
  railWidth: number,
  railRows: number,
): ListwyZoneLayout {
  const rectWidth = Math.min(LISTWY_MAX_SLOT_WIDTH, railWidth * LISTWY_SLOT_WIDTH_RATIO);
  const rectHeight = LISTWY_SLOT_HEIGHT;
  const centerX = railWidth / 2;
  const leftRectX = centerX - rectWidth - LISTWY_HORIZONTAL_GAP / 2;
  const rightRectX = centerX + LISTWY_HORIZONTAL_GAP / 2;
  const topY = LISTWY_TOP_ZONE_Y;
  const bottomY = (railRows - 1) * LISTWY_ROW_SPACING + LISTWY_BOTTOM_ZONE_OFFSET;

  return {
    topY,
    bottomY,
    rectWidth,
    rectHeight,
    leftRectX,
    rightRectX,
    leftCenterX: leftRectX + rectWidth / 2,
    rightCenterX: rightRectX + rectWidth / 2,
  };
}

/**
 * Snaps a terminal-block placement to the nearest of the four listwy zones.
 * Behaviour matches the original inline implementation in DinRailCanvas:
 *   - horizontal snap chooses the closer of the two slots in a row when
 *     the cursor is within LISTWY_HORIZONTAL_SNAP_DISTANCE of its center;
 *   - vertical snap picks the top or bottom zone by closest center, unless
 *     the cursor is already inside one of the zones (with a tolerance), in
 *     which case that zone wins regardless of distance.
 */
export function snapListwaPlacement({
  x,
  y,
  width,
  height,
  railWidth,
  railRows,
}: SnapListwaArgs): SnapListwaResult {
  const layout = computeListwyZoneLayout(railWidth, railRows);

  let snapX = x;
  const cursorCenterX = x + width / 2;
  const distLeft = Math.abs(cursorCenterX - layout.leftCenterX);
  const distRight = Math.abs(cursorCenterX - layout.rightCenterX);

  if (distLeft < distRight && distLeft < LISTWY_HORIZONTAL_SNAP_DISTANCE) {
    snapX = layout.leftCenterX - width / 2;
  } else if (distRight <= distLeft && distRight < LISTWY_HORIZONTAL_SNAP_DISTANCE) {
    snapX = layout.rightCenterX - width / 2;
  }

  const inTopZone =
    y >= layout.topY - LISTWY_ZONE_VERTICAL_TOLERANCE
    && y <= layout.topY + layout.rectHeight + LISTWY_ZONE_VERTICAL_TOLERANCE;
  const inBottomZone =
    y >= layout.bottomY - LISTWY_ZONE_VERTICAL_TOLERANCE
    && y <= layout.bottomY + layout.rectHeight + LISTWY_ZONE_VERTICAL_TOLERANCE;

  if (inTopZone) {
    return { x: snapX, y: layout.topY + layout.rectHeight / 2 - height / 2 };
  }
  if (inBottomZone) {
    return { x: snapX, y: layout.bottomY + layout.rectHeight / 2 - height / 2 };
  }

  const distTop = Math.abs(y - layout.topY);
  const distBottom = Math.abs(y - layout.bottomY);
  const snapY =
    distTop < distBottom
      ? layout.topY + layout.rectHeight / 2 - height / 2
      : layout.bottomY + layout.rectHeight / 2 - height / 2;

  return { x: snapX, y: snapY };
}
