import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../types/symbolItem";
import { snapModulePlacementToDinRail } from "./dinRailSnap";

function makeSymbol(overrides?: Parameters<typeof createDefaultSymbolItem>[0]) {
  return createDefaultSymbolItem({
    width: 100,
    height: 80,
    isSnappedToRail: true,
    ...overrides,
  });
}

describe("snapModulePlacementToDinRail", () => {
  const railWidth = 2000;
  const rowCenters = [500];

  it("snapuje do najblizszego rzedu i siatki modulowej gdy nie ma sasiadow", () => {
    const result = snapModulePlacementToDinRail(
      112,
      455,
      100,
      80,
      railWidth,
      rowCenters,
      [],
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.y).toBe(460);
    expect(result.x).toBe(55);
  });

  it("dosuwa modul idealnie do prawej krawedzi sasiada bez szczeliny", () => {
    const leftNeighbor = makeSymbol({ id: "left", x: 300, y: 460 });

    const result = snapModulePlacementToDinRail(
      392,
      458,
      100,
      80,
      railWidth,
      rowCenters,
      [leftNeighbor],
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.x).toBe(400);
    expect(result.y).toBe(460);
  });

  it("utrzymuje snap przy wiekszym odchyleniu gdy modul byl juz przypiety do szyny", () => {
    const result = snapModulePlacementToDinRail(
      112,
      530,
      100,
      80,
      railWidth,
      rowCenters,
      [],
      undefined,
      { isCurrentlySnapped: true },
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.y).toBe(460);
  });

  it("nie snapuje pionowo gdy nowy modul jest za daleko od szyny", () => {
    const result = snapModulePlacementToDinRail(
      112,
      541,
      100,
      80,
      railWidth,
      rowCenters,
      [],
    );

    expect(result.shouldSnap).toBe(false);
    expect(result.y).toBe(541);
  });

  it("wybiera wolna strone przy nachodzeniu na istniejacy modul", () => {
    const blockedNeighbor = makeSymbol({ id: "blocked", x: 300, y: 460 });

    const result = snapModulePlacementToDinRail(
      325,
      460,
      100,
      80,
      railWidth,
      rowCenters,
      [blockedNeighbor],
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.x).toBe(400);
  });

  it("ignoruje przeciagniety symbol przy liczeniu kolizji", () => {
    const draggedSymbol = makeSymbol({ id: "dragged", x: 300, y: 460 });

    const result = snapModulePlacementToDinRail(
      304,
      460,
      100,
      80,
      railWidth,
      rowCenters,
      [draggedSymbol],
      "dragged",
      { isCurrentlySnapped: true },
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.x).toBeCloseTo(287.58, 2);
  });

  it("clampuje pozycje do szerokosci szyny", () => {
    const result = snapModulePlacementToDinRail(
      5000,
      460,
      100,
      80,
      600,
      rowCenters,
      [],
      undefined,
      { forceSnapToRail: true },
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.x).toBe(445);
  });
});
