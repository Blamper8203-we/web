import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import type { SchematicLayout } from "./schematicLayout";
import { snapToRail } from "./schematicSnapService";

function createLayout(): SchematicLayout {
  return {
    pages: [
      {
        pageIndex: 0,
        pageLabel: "Strona 1",
        offsetX: 0,
        offsetY: 0,
        yOffset: 0,
        minCol: 0,
        busX1: 0,
        busX2: 500,
        busbarX: 0,
        busbarY: 0,
        dinRails: [
          {
            railIndex: 0,
            y: 100,
            startX: 40,
            endX: 460,
            modulePositions: [],
          },
        ],
      },
    ],
    nodes: [],
    totalWidth: 500,
    totalHeight: 300,
    frReference: "",
  };
}

describe("schematicSnapService", () => {
  it("snaps vertically to the nearest schematic rail", () => {
    const result = snapToRail(120, 118, createLayout(), {
      symbolWidth: 20,
    });

    expect(result.snappedToRail).toBe(true);
    expect(result.snappedY).toBe(100);
  });

  it("snaps horizontally to a neighboring symbol on the same rail", () => {
    const layout = createLayout();
    const existing = createDefaultSymbolItem({
      id: "mcb-1",
      x: 100,
      y: 100,
      width: 36,
      height: 40,
      isSnappedToRail: true,
    });

    const result = snapToRail(138, 104, layout, {
      ignoreSymbolIds: ["dragged"],
      symbolHeight: 40,
      symbolWidth: 20,
      symbols: [existing],
    });

    expect(result.snappedToRail).toBe(true);
    expect(result.snappedX).toBe(136);
    expect(result.snappedY).toBe(100);
  });

  it("falls back to the free side when overlap blocks the preferred placement", () => {
    const layout = createLayout();
    const main = createDefaultSymbolItem({
      id: "mcb-main",
      x: 100,
      y: 100,
      width: 36,
      height: 40,
      isSnappedToRail: true,
    });
    const blockerOnRight = createDefaultSymbolItem({
      id: "mcb-right",
      x: 150,
      y: 100,
      width: 20,
      height: 40,
      isSnappedToRail: true,
    });

    const result = snapToRail(120, 102, layout, {
      ignoreSymbolIds: ["dragged"],
      symbolHeight: 40,
      symbolWidth: 30,
      symbols: [main, blockerOnRight],
    });

    expect(result.snappedToRail).toBe(true);
    expect(result.snappedX).toBe(70);
    expect(result.snappedY).toBe(100);
  });
});
