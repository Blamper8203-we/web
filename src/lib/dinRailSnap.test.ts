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

  it("snaps to nearest rail row and module grid when no neighbors exist", () => {
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

  it("snaps to the right edge of a neighbor without gap", () => {
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

  it("keeps vertical snap with larger offset when module was already snapped", () => {
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

  it("does not vertically snap when a new module is too far from the rail", () => {
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

  it("chooses a free side when candidate overlaps an existing module", () => {
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

  it("ignores the currently dragged symbol when checking collisions", () => {
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

  it("ignores dragged group members when evaluating horizontal snap targets", () => {
    const draggedPeer = makeSymbol({ id: "peer", x: 400, y: 460 });

    const result = snapModulePlacementToDinRail(
      487,
      460,
      100,
      80,
      railWidth,
      rowCenters,
      [draggedPeer],
      "anchor",
      {
        ignoreSymbolIds: ["anchor", "peer"],
        isCurrentlySnapped: true,
      },
    );

    expect(result.shouldSnap).toBe(true);
    expect(result.x).toBeCloseTo(520.16, 2);
  });

  it("clamps X to rail width bounds", () => {
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
