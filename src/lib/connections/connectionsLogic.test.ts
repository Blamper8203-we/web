import { describe, expect, it } from "vitest";
// @ts-expect-error - @types/node not in tsconfig; Vitest provides Node globals at runtime
import { readFileSync } from "fs";
// @ts-expect-error - see above
import { dirname, resolve } from "path";
// @ts-expect-error - see above
import { fileURLToPath } from "url";
import {
  DEFAULT_CUSTOM_RADIUS,
  getAutoFerruleColor,
  getFerruleLength,
  isTerminalZlaczka,
} from "./connectionsLogic";

describe("connectionsLogic - getAutoFerruleColor", () => {
  it("returns correct color for cross-sections <= 1.5", () => {
    expect(getAutoFerruleColor(0.5)).toBe("white");
    expect(getAutoFerruleColor(0.75)).toBe("grey");
    expect(getAutoFerruleColor(1.0)).toBe("red");
    expect(getAutoFerruleColor(1.5)).toBe("black");
  });

  it("returns 'blue' for 2.5mm2", () => {
    expect(getAutoFerruleColor(2.5)).toBe("blue");
  });

  it("returns 'grey' for 4.0mm2", () => {
    expect(getAutoFerruleColor(4.0)).toBe("grey");
  });

  it("returns 'yellow' for 6.0mm2", () => {
    expect(getAutoFerruleColor(6.0)).toBe("yellow");
  });

  it("returns 'red' for 10.0mm2", () => {
    expect(getAutoFerruleColor(10.0)).toBe("red");
  });

  it("returns 'blue' for >= 16.0mm2", () => {
    expect(getAutoFerruleColor(16.0)).toBe("blue");
    expect(getAutoFerruleColor(25.0)).toBe("blue");
  });
});

describe("connectionsLogic - isTerminalZlaczka", () => {
  it("returns true for 'zlacz-3pin'", () => {
    expect(isTerminalZlaczka("zlacz-3pin")).toBe(true);
  });

  it("returns true for 'zlaczka' (with Polish ł -> l normalisation)", () => {
    expect(isTerminalZlaczka("złączka-3pin")).toBe(true);
  });

  it("returns true for 'złaczka'", () => {
    expect(isTerminalZlaczka("złaczka")).toBe(true);
  });

  it("returns false for 'rozlacznik' (must not match MCB-style main breaker)", () => {
    expect(isTerminalZlaczka("rozlacznik-nadpradowy")).toBe(false);
  });

  it("returns false for 'mcb'", () => {
    expect(isTerminalZlaczka("mcb-1p")).toBe(false);
  });

  it("returns false for empty/null", () => {
    expect(isTerminalZlaczka("")).toBe(false);
    expect(isTerminalZlaczka(null)).toBe(false);
    expect(isTerminalZlaczka(undefined)).toBe(false);
  });
});

describe("connectionsLogic - getFerruleLength", () => {
  it("returns 90 for Złączka (short, just like other terminal blocks)", () => {
    expect(getFerruleLength("terminalBlock", "zlaczka-3pin")).toBe(90);
  });

  it("returns 90 for terminal block that is not a Złączka", () => {
    expect(getFerruleLength("terminalBlock", "listwa-n-12pin")).toBe(90);
  });

  it("returns 20 for phase indicator", () => {
    expect(getFerruleLength("phaseIndicator", null)).toBe(20);
  });

  it("returns 160 for regular devices (e.g. MCB)", () => {
    expect(getFerruleLength("mcb", "mcb-1p")).toBe(160);
  });

  it("returns 160 when deviceKind is undefined and moduleRef is not a Złączka", () => {
    expect(getFerruleLength(undefined, undefined)).toBe(160);
  });

  it("returns 90 even when deviceKind is unusual, if moduleRef marks it as Złączka", () => {
    // Złączka detection is based on moduleRef, not deviceKind
    expect(getFerruleLength("other", "złączka-5pin")).toBe(90);
  });

  it("returns 40 for AMPIO MSERV-4S module and 80 for other smart home modules", () => {
    expect(getFerruleLength("other", "Smart Home/AMPIO MSERV-4S.svg")).toBe(40);
    expect(getFerruleLength("other", "Smart Home/OTHER_MODULE.svg")).toBe(80);
  });
});

describe("connectionsLogic - DEFAULT_CUSTOM_RADIUS", () => {
  it("is 52 (view default, exported with the project as the visible default)", () => {
    // Single source of truth for wire bend radius default. Editor (Pixi) and
    // exports (snapshot raster, SVG, PDF) must read this same number.
    expect(DEFAULT_CUSTOM_RADIUS).toBe(52);
  });

  it("keeps view and export in sync (no stray `?? 0` or `?? 52` literals remain)", () => {
    // WHY regression: drift between editor and export shows as rounded corners
    // in the canvas but sharp corners in the PDF the electrician ships.
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(here, "..", "..", "..");
    const guardedFiles = [
      "src/lib/routing/wireRoutingEngine.ts",
      "src/lib/connections/wirePathGenerator.ts",
      "src/lib/export/dinRailSnapshotService.ts",
      "src/lib/export/dinRailSvgRenderer.ts",
      "src/components/canvasLayers/DinRailConnectionWires.tsx",
      "src/components/ConnectionsLeftPanel.tsx",
    ];

    const stalePattern = /\.customRadius\s*\?\?\s*(?:0|52)\b/g;

    for (const relPath of guardedFiles) {
      const absPath = resolve(repoRoot, relPath);
      const source = readFileSync(absPath, "utf8");
      const matches = source.match(stalePattern);
      expect(
        matches,
        `${relPath} still substitutes customRadius with a bare numeric literal ` +
          `(matches: ${matches ? matches.join(", ") : "none"}). ` +
          `Use DEFAULT_CUSTOM_RADIUS from connectionsLogic to keep view and export in sync.`,
      ).toBeNull();
    }
  });
});
