import { describe, expect, it } from "vitest";
// @ts-expect-error - @types/node not in tsconfig; Vitest provides Node globals at runtime
import { readFileSync } from "fs";
// @ts-expect-error - see above
import { dirname, join } from "path";
// @ts-expect-error - see above
import { fileURLToPath } from "url";
import { exportDinRailToSvg } from "./dinRailSvgRenderer";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";
import type { ConnectionItem } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";

interface DinboardProject {
  schemaVersion: number;
  symbols: SymbolItem[];
  connections: ConnectionItem[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = join(__dirname, "..", "..", "fixtures", "testProject.dinboard");

function loadFixture(): DinboardProject {
  const raw = readFileSync(FIXTURE_PATH, "utf8");
  return JSON.parse(raw);
}

function parseSvgDimensions(svg: string): { width: number; height: number; viewBox: string } | null {
  const outerMatch = svg.match(/<svg[^>]*>/);
  if (!outerMatch) return null;
  const tag = outerMatch[0];
  const widthMatch = tag.match(/\bwidth=["']([\d.\-eE]+)["']/);
  const heightMatch = tag.match(/\bheight=["']([\d.\-eE]+)["']/);
  const viewBoxMatch = tag.match(/\bviewBox=["']([^"']+)["']/);
  if (!widthMatch || !heightMatch || !viewBoxMatch) return null;
  return {
    width: parseFloat(widthMatch[1]),
    height: parseFloat(heightMatch[1]),
    viewBox: viewBoxMatch[1],
  };
}

// WHY (rail stub): the SVG renderer uses rail.width/height for the background
// rect only — config is unused. We supply a minimal stub so the test can
// exercise the fit logic without spinning up a real DinRailConfig.
const railStub: DinRailCanvasRail = {
  config: {} as DinRailCanvasRail["config"],
  svg: "",
  width: 2000,
  height: 600,
  isVisible: true,
};

describe("dinRailSvgRenderer — fit-to-A4", () => {
  const project = loadFixture();

  it("renderer produces SVG that fits within maxEmbedWidth/Height caps", async () => {
    const MAX_W = 535;
    const MAX_H = 740;

    const [svg] = await exportDinRailToSvg(
      project.symbols,
      railStub,
      { drawConnections: true, maxEmbedWidth: MAX_W, maxEmbedHeight: MAX_H },
      project.connections,
    );

    const dims = parseSvgDimensions(svg);
    expect(dims, "outer <svg> must declare width/height/viewBox").not.toBeNull();
    expect(dims!.width).toBeLessThanOrEqual(MAX_W);
    expect(dims!.height).toBeLessThanOrEqual(MAX_H);
  });

  it("renderer without caps produces SVG at natural content size", async () => {
    const [svg] = await exportDinRailToSvg(
      project.symbols,
      railStub,
      { drawConnections: false },
      project.connections,
    );
    const dims = parseSvgDimensions(svg);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBeGreaterThan(0);
    expect(dims!.height).toBeGreaterThan(0);
  });
});