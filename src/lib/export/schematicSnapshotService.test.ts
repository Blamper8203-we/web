import { describe, expect, it } from "vitest";
import type { PageInfo, SchematicLayout, SchematicNode } from "../schematic/schematicLayout";
import { filterEmptySchematicPages } from "./schematicSnapshotService";

/**
 * WHY: assignPagesAndPosition (in schematicGeometry.ts) emits a PageInfo for
 * every page index from 0..maxPage — even when a page has zero devices. These
 * blank pages used to leak into SchematicTab (workspace preview) AND the
 * exported PDF, producing a ghost A4 sheet that confused the user. The fix
 * lives in filterEmptySchematicPages; this test pins the behaviour.
 */

function makePage(pageIndex: number): PageInfo {
  return {
    pageIndex,
    pageLabel: `Strona ${pageIndex + 1}`,
    offsetX: 0,
    offsetY: pageIndex * 1122,
    yOffset: pageIndex * 1122,
    minCol: 0,
    busX1: 0,
    busX2: 100,
    busbarX: 0,
    busbarY: 0,
    dinRails: [],
  };
}

function makeNode(pageIndex: number, id: string): SchematicNode {
  return {
    id,
    nodeType: "MCB",
    designation: `Q${id}`,
    label: "",
    protection: "",
    distributionBlockLabel: "",
    circuitName: "",
    phase: "L1",
    phaseCount: 1,
    location: "",
    cableDesig: "",
    cableType: "",
    cableSpec: "",
    cableLength: "",
    powerInfo: "",
    isPhaseManual: false,
    fixedScenarioPhase: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pageIndex,
    cellWidth: 50,
    parentRcdId: "",
    children: [],
  };
}

function makeLayout(pages: PageInfo[], nodes: SchematicNode[]): SchematicLayout {
  return {
    pages,
    nodes,
    totalWidth: 1000,
    totalHeight: pages.length * 1122,
    frReference: "",
  };
}

describe("filterEmptySchematicPages", () => {
  it("drops pages whose pageIndex has no matching node", () => {
    // Page 0 (with FR+main breaker) and page 2 (with circuits) survive.
    // Page 1 is the empty artifact between them and must be dropped.
    const layout = makeLayout(
      [makePage(0), makePage(1), makePage(2)],
      [makeNode(0, "fr"), makeNode(2, "circuit-1")],
    );

    const result = filterEmptySchematicPages(layout);

    expect(result.map((p) => p.pageIndex)).toEqual([0, 2]);
  });

  it("preserves the original page order so the rendered output stays stable", () => {
    const layout = makeLayout(
      [makePage(0), makePage(1), makePage(2), makePage(3)],
      [makeNode(0, "a"), makeNode(2, "b")],
    );

    const result = filterEmptySchematicPages(layout);

    expect(result.map((p) => p.pageIndex)).toEqual([0, 2]);
  });

  it("returns an empty array when every page is empty (defensive — should not happen in practice)", () => {
    const layout = makeLayout([makePage(0), makePage(1)], []);

    const result = filterEmptySchematicPages(layout);

    expect(result).toEqual([]);
  });

  it("returns the original list when every page has at least one device", () => {
    const layout = makeLayout(
      [makePage(0), makePage(1)],
      [makeNode(0, "a"), makeNode(1, "b")],
    );

    const result = filterEmptySchematicPages(layout);

    expect(result.map((p) => p.pageIndex)).toEqual([0, 1]);
  });
});
