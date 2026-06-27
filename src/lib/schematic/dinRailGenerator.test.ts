// WHY: generateDinRailSvg is a deterministic procedural renderer — given
// the same (rows, modulesPerRow) it must produce the same SVG output byte-
// for-byte across runs, machines and renderers. If non-determinism creeps
// in (e.g. someone adds Date.now() to a path-data generator), the
// rendered DIN-rail snapshot in PDF/PNG will be stable for one render
// and then shift on the next — breaking the snapshot equality contract
// that dinRailSnapshotService relies on.

import { describe, it, expect } from "vitest";
import { generateDinRailSvg } from "./dinRailGenerator";

describe("generateDinRailSvg - determinism", () => {
  it("produces identical SVG output for the same config across two calls", () => {
    const config = { rows: 3, modulesPerRow: 24 };

    const first = generateDinRailSvg(config);
    const second = generateDinRailSvg(config);

    expect(second).toBe(first);
  });

  it("produces identical SVG output for distinct config instances with the same values", () => {
    // Two different object identities — should still produce the same output.
    // Catches accidental use of object identity in any cache or memoization.
    const a = generateDinRailSvg({ rows: 2, modulesPerRow: 12 });
    const b = generateDinRailSvg({ rows: 2, modulesPerRow: 12 });

    expect(b).toBe(a);
  });

  it("differs when rows or modulesPerRow differ", () => {
    const oneRow = generateDinRailSvg({ rows: 1, modulesPerRow: 12 });
    const twoRows = generateDinRailSvg({ rows: 2, modulesPerRow: 12 });
    const oneRowMoreModules = generateDinRailSvg({ rows: 1, modulesPerRow: 24 });

    expect(twoRows).not.toBe(oneRow);
    expect(oneRowMoreModules).not.toBe(oneRow);
    // Sanity: a meaningful substring appears in both valid outputs.
    expect(oneRow).toContain("<svg");
    expect(twoRows).toContain("<svg");
  });

  it("returns an error placeholder when rows or modulesPerRow are below 1", () => {
    const invalidRows = generateDinRailSvg({ rows: 0, modulesPerRow: 12 });
    const invalidModules = generateDinRailSvg({ rows: 1, modulesPerRow: 0 });

    expect(invalidRows).toContain("Invalid dimensions");
    expect(invalidModules).toContain("Invalid dimensions");
  });
});