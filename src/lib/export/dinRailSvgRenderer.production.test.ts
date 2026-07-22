import { describe, it, expect } from "vitest";
// @ts-expect-error - @types/node not in tsconfig; Vitest provides Node globals at runtime
import { readFileSync } from "fs";
// @ts-expect-error - see above
import { dirname, join } from "path";
// @ts-expect-error - see above
import { fileURLToPath } from "url";
import { exportDinRailToSvg } from "./dinRailSvgRenderer";
import type { DinRailCanvasRail } from "../../components/DinRailCanvas";
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

const railStub: DinRailCanvasRail = {
  config: {} as DinRailCanvasRail["config"],
  svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"50\"><rect width=\"100\" height=\"50\" fill=\"blue\"/></svg>",
  width: 2000,
  height: 600,
  isVisible: true,
};

describe("PDF production smoke — fixture DIN rail", () => {
  const project = loadFixture();
  console.log("Fixture has", project.symbols.length, "symbols and", project.connections.length, "connections");

  it("renders DIN rail SVG with concrete width/height for PDF embed", async () => {
    const MAX_W = 535;
    const MAX_H = 740;

    const svgs = await exportDinRailToSvg(
      project.symbols,
      railStub,
      { drawConnections: true, maxEmbedWidth: MAX_W, maxEmbedHeight: MAX_H },
      project.connections,
    );

    console.log("Rendered SVG count:", svgs.length);

    expect(svgs.length).toBe(1);

    const svg = svgs[0];
    console.log("SVG length (chars):", svg.length);
    console.log("SVG first 500 chars:", svg.slice(0, 500));

    // Outer SVG must have width and height
    const outerMatch = svg.match(/<svg[^>]*>/);
    expect(outerMatch, "must have outer <svg> tag").not.toBeNull();
    const tag = outerMatch![0];
    console.log("Outer SVG tag:", tag);

    expect(tag).toMatch(/width="\d+(\.\d+)?"/);
    expect(tag).toMatch(/height="\d+(\.\d+)?"/);

    const widthMatch = tag.match(/width="([\d.]+)"/);
    const heightMatch = tag.match(/height="([\d.]+)"/);
    const w = parseFloat(widthMatch![1]);
    const h = parseFloat(heightMatch![1]);
    console.log("SVG dims:", w, "x", h);

    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);

    // Count content elements inside SVG
    const imageCount = (svg.match(/<image\b/g) || []).length;
    const rectCount = (svg.match(/<rect\b/g) || []).length;
    console.log("Content elements: images=" + imageCount + ", rects=" + rectCount);
    expect(imageCount + rectCount).toBeGreaterThan(0);
  });

  it("renders SVG without options as well", async () => {
    const svgs = await exportDinRailToSvg(
      project.symbols,
      railStub,
      {},
      project.connections,
    );

    console.log("No-options SVG count:", svgs.length);
    console.log("No-options SVG first 300 chars:", svgs[0]?.slice(0, 300));
    expect(svgs.length).toBe(1);
    expect(svgs[0].length).toBeGreaterThan(100);
  });
});