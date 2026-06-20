import { describe, expect, it } from "vitest";
import {
  LISTWY_BOTTOM_ZONE_OFFSET,
  LISTWY_HORIZONTAL_GAP,
  LISTWY_HORIZONTAL_SNAP_DISTANCE,
  LISTWY_MAX_SLOT_WIDTH,
  LISTWY_SLOT_HEIGHT,
  LISTWY_SLOT_WIDTH_RATIO,
  LISTWY_TOP_ZONE_Y,
  LISTWY_ZONE_VERTICAL_TOLERANCE,
  computeListwyZoneLayout,
  snapListwaPlacement,
} from "./listwySnap";
import { LISTWY_ROW_SPACING } from "../schematic/dinRailGenerator";

const RAIL_WIDTH = 4000;
const RAIL_ROWS = 3;
const WIDTH = 200;
const HEIGHT = 240;

describe("listwySnap", () => {
  describe("computeListwyZoneLayout", () => {
    it("places top zone at the configured negative offset", () => {
      const layout = computeListwyZoneLayout(RAIL_WIDTH, RAIL_ROWS);
      expect(layout.topY).toBe(LISTWY_TOP_ZONE_Y);
    });

    it("places bottom zone relative to the last DIN row", () => {
      const layout = computeListwyZoneLayout(RAIL_WIDTH, RAIL_ROWS);
      const expected = (RAIL_ROWS - 1) * LISTWY_ROW_SPACING + LISTWY_BOTTOM_ZONE_OFFSET;
      expect(layout.bottomY).toBeCloseTo(expected, 5);
    });

    it("caps slot width by LISTWY_MAX_SLOT_WIDTH", () => {
      const layout = computeListwyZoneLayout(100_000, RAIL_ROWS);
      expect(layout.rectWidth).toBe(LISTWY_MAX_SLOT_WIDTH);
    });

    it("uses the rail-width ratio when rail is narrow enough", () => {
      const layout = computeListwyZoneLayout(2000, RAIL_ROWS);
      expect(layout.rectWidth).toBe(2000 * LISTWY_SLOT_WIDTH_RATIO);
    });

    it("separates the two horizontal slots by LISTWY_HORIZONTAL_GAP", () => {
      const layout = computeListwyZoneLayout(RAIL_WIDTH, RAIL_ROWS);
      expect(layout.rightRectX - (layout.leftRectX + layout.rectWidth)).toBeCloseTo(
        LISTWY_HORIZONTAL_GAP,
        5,
      );
    });

    it("uses the configured slot height", () => {
      const layout = computeListwyZoneLayout(RAIL_WIDTH, RAIL_ROWS);
      expect(layout.rectHeight).toBe(LISTWY_SLOT_HEIGHT);
    });
  });

  describe("snapListwaPlacement", () => {
    const layout = computeListwyZoneLayout(RAIL_WIDTH, RAIL_ROWS);

    it("snaps to the top zone center when cursor is well above the rail", () => {
      const result = snapListwaPlacement({
        x: layout.leftCenterX - WIDTH / 2 + 50,
        y: layout.topY - 5000,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.y).toBeCloseTo(layout.topY + LISTWY_SLOT_HEIGHT / 2 - HEIGHT / 2, 5);
      expect(result.x).toBeCloseTo(layout.leftCenterX - WIDTH / 2, 5);
    });

    it("snaps to the bottom zone when cursor is well below the rail", () => {
      const result = snapListwaPlacement({
        x: layout.leftCenterX - WIDTH / 2 + 50,
        y: layout.bottomY + 5000,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.y).toBeCloseTo(layout.bottomY + LISTWY_SLOT_HEIGHT / 2 - HEIGHT / 2, 5);
    });

    it("chooses the closer of the two slots within snap distance", () => {
      const result = snapListwaPlacement({
        x: layout.rightCenterX - WIDTH / 2,
        y: layout.topY - 5000,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.x).toBeCloseTo(layout.rightCenterX - WIDTH / 2, 5);
    });

    it("does not snap horizontally when cursor is far from both slots", () => {
      const farX = -10_000;
      const result = snapListwaPlacement({
        x: farX,
        y: layout.topY - 5000,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.x).toBe(farX);
    });

    it("stays inside the top zone when the cursor y falls within its tolerance", () => {
      const justInsideTop = layout.topY + LISTWY_ZONE_VERTICAL_TOLERANCE - 10;
      const result = snapListwaPlacement({
        x: layout.leftCenterX - WIDTH / 2,
        y: justInsideTop,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.y).toBeCloseTo(layout.topY + LISTWY_SLOT_HEIGHT / 2 - HEIGHT / 2, 5);
    });

    it("stays inside the bottom zone when the cursor y falls within its tolerance", () => {
      const justInsideBottom = layout.bottomY + LISTWY_SLOT_HEIGHT - LISTWY_ZONE_VERTICAL_TOLERANCE + 10;
      const result = snapListwaPlacement({
        x: layout.leftCenterX - WIDTH / 2,
        y: justInsideBottom,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      expect(result.y).toBeCloseTo(layout.bottomY + LISTWY_SLOT_HEIGHT / 2 - HEIGHT / 2, 5);
    });

    it("respects the horizontal snap distance threshold", () => {
      // Place cursor in a no-snap zone: at or before the left edge of the
      // left slot, far enough from the left slot's center to be outside the
      // snap distance. The right slot is too far to matter.
      const cursorX = layout.leftCenterX - WIDTH / 2 - LISTWY_HORIZONTAL_SNAP_DISTANCE - 50;
      const result = snapListwaPlacement({
        x: cursorX,
        y: layout.topY - 5000,
        width: WIDTH,
        height: HEIGHT,
        railWidth: RAIL_WIDTH,
        railRows: RAIL_ROWS,
      });

      // x must not have been snapped toward either slot.
      expect(result.x).toBe(cursorX);
    });
  });
});
