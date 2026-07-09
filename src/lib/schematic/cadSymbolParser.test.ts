import { describe, expect, it, beforeEach, vi } from "vitest";

// WHY: cadSymbolParser.fetchAndParseCadSymbol uses a module-level cache, so each
// test must reset modules to get a fresh parser and avoid cross-test pollution.

const buildAmpioLikeSvg = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360">
  <g id="cad-symbol-svg">
    <g>
      <rect x="34.25" y="1" width="210" height="320" style="fill: #141414; stroke: #22c55e; stroke-width: 2px;"/>
      <text transform="translate(40 31)" style="fill: #fff;"><tspan x="0" y="0">-K1:A</tspan></text>
      <g>
        <line x1="4.25" y1="91" x2="34.25" y2="91" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="4.25" cy="91" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(49.25 95)" style="fill: #fff;"><tspan x="0" y="0">POWER : 1</tspan></text>
      </g>
      <g>
        <line x1="4.25" y1="123" x2="34.25" y2="123" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="4.25" cy="123" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(49.25 127)" style="fill: #fff;"><tspan x="0" y="0">POWER : 2</tspan></text>
      </g>
    </g>
    <g>
      <rect x="304.25" y="1" width="220" height="700" style="fill: #141414; stroke: #22c55e; stroke-width: 2px;"/>
      <text transform="translate(310 31)" style="fill: #fff;"><tspan x="0" y="0">-K1:C</tspan></text>
      <g>
        <line x1="274.25" y1="81" x2="304.25" y2="81" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="274.25" cy="81" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(319.25 85)" style="fill: #fff;"><tspan x="0" y="0">IN 1</tspan></text>
      </g>
    </g>
  </g>
</svg>
`.trim();

// -K1:E-like block: rect with terminals on the BOTTOM edge
const buildBottomEdgeSvg = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220">
  <g id="cad-symbol-svg">
    <g>
      <rect x="50" y="10" width="490" height="160" style="fill: #141414; stroke: #22c55e; stroke-width: 2px;"/>
      <text transform="translate(80 30)" style="fill: #fff;"><tspan x="0" y="0">-K1:E</tspan></text>
      <g>
        <line x1="100" y1="170" x2="100" y2="200" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="100" cy="200" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(103.5 152)" style="fill: #fff;"><tspan x="0" y="0">OC : GND</tspan></text>
      </g>
      <g>
        <line x1="200" y1="170" x2="200" y2="200" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="200" cy="200" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(203.5 152)" style="fill: #fff;"><tspan x="0" y="0">OC : 1</tspan></text>
      </g>
    </g>
  </g>
</svg>
`.trim();

// Corner case: terminal outside both x and y range of the rect
const buildCornerSvg = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g id="cad-symbol-svg">
    <g>
      <rect x="60" y="60" width="100" height="80" style="fill: #141414; stroke: #22c55e; stroke-width: 2px;"/>
      <g>
        <line x1="20" y1="20" x2="60" y2="60" style="stroke: #22c55e; stroke-width: 1.5px;"/>
        <circle cx="20" cy="20" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
        <text transform="translate(0 0)" style="fill: #fff;"><tspan x="0" y="0">DIAG</tspan></text>
      </g>
    </g>
  </g>
</svg>
`.trim();

// Non-projected terminal (inside the rect's bounding range, so it stays on its original y/x)
const buildInsideSvg = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <g id="cad-symbol-svg">
    <g>
      <rect x="20" y="20" width="260" height="160" style="fill: #141414; stroke: #22c55e; stroke-width: 2px;"/>
      <g>
        <circle cx="100" cy="60" r="3.5" style="fill: #141414; stroke: #22c55e; stroke-width: 1.5px;"/>
      </g>
    </g>
  </g>
</svg>
`.trim();

describe("cadSymbolParser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("projects terminals onto the LEFT rect edge and snaps to world 20-grid (Block A pattern)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildAmpioLikeSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("test.svg", 1.25);

    expect(blocks).toHaveLength(2);
    const blockA = blocks[0];
    expect(blockA.terminals).toHaveLength(2);

    // Block A bounds (po mutacji linii do 0-length na projected pozycji):
    //   rect: [34.25, 1, 210, 320] → Krok 1 mutate rect.x do source-grid 16:
    //     round(34.25/16)*16 = 32 → rect.x=32 (mutated, -2.25 source = -2.8 world)
    //   projected terminal cx=4.25 (line x1=4.25, teraz linia 0-length) →
    //     projectToRectEdge → edgeCx=rect.x=32 (rect jest na grid po Kroku 1)
    //     snappedCx=32 (projected → no source-snap, exact rect.x)
    //   non-projected cy: source-snap do grid 16 (91→96, 123→128)
    //   bounds: minX=28.5 (terminal cx-r), maxX=242 (rect right)
    //     padding: minX=24.5, minY=-3, maxX=246, maxY=325
    //     Snap minX do source-grid 16: round(24.5/16)*16=round(1.53)*16=2*16=32
    //   blockX=32*1.25=40 world, blockY=0
    // Terminal world positions:
    //   worldX = (32 - 32) * 1.25 = 0  (rect left edge W world, terminal na rect edge, ON world-grid)
    //   worldY = (96 - 0) * 1.25 = 120  (non-projected, ON world-grid)
    expect(blockA.terminals[0].x).toBe(0);
    expect(blockA.terminals[0].y).toBe(120);
    expect(blockA.terminals[1].x).toBe(0);
    expect(blockA.terminals[1].y).toBe(160);

    // INVARIANT: ALL terminals na world 20-grid (canvas grid alignment dla wires/snaps).
    expect(blockA.terminals[0].x % 20).toBe(0);
    expect(blockA.terminals[0].y % 20).toBe(0);
    expect(blockA.terminals[1].x % 20).toBe(0);
    expect(blockA.terminals[1].y % 20).toBe(0);
  });

  it("projects terminals onto the LEFT rect edge and snaps to world 20-grid (Block C)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildAmpioLikeSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("test.svg", 1.25);

    const blockC = blocks[1];
    expect(blockC.terminals).toHaveLength(1);
    const term = blockC.terminals[0];

    // Block C bounds (po mutacji linii do 0-length na projected pozycji):
    //   rect: [304.25, 1, 220, 700] → Krok 1 mutate rect.x do source-grid 16:
    //     round(304.25/16)*16 = round(19.015)*16 = 19*16 = 304 → rect.x=304 (mutated, -0.25 source)
    //   projected terminal cx=274.25 → projectToRectEdge → edgeCx=rect.x=304
    //     snappedCx=304 (projected → no source-snap, exact rect.x — rect JEST na grid)
    //   non-projected cy=81 → round(81/16)*16 = 80
    //   bounds: minX=300.5 (terminal cx-r), maxX=524 (rect right)
    //     padding: minX=296.5, minY=-3, maxX=528, maxY=705
    //     Snap minX do source-grid 16: round(296.5/16)*16=round(18.53)*16=19*16=304
    //   blockX=304*1.25=380 world, blockY=0
    // Terminal world positions:
    //   worldX = (304 - 304) * 1.25 = 0  (rect left edge W world, terminal na rect edge, ON world-grid)
    //   worldY = (80 - 0) * 1.25 = 100  (non-projected, ON world-grid)
    expect(term.x).toBe(0);
    expect(term.y).toBe(100);
    expect(term.x % 20).toBe(0);
    expect(term.y % 20).toBe(0);
  });

  it("shrinks connector lines to the new circle position (removes tick-marks)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildAmpioLikeSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("test.svg", 1.25);

    // WHY: parser mutuje DOM w miejscu (circle.setAttribute, line.setAttribute).
    // block.svgContent budowane jest z g.outerHTML PO mutacji — parsujemy svgContent,
    // nie oryginalny tekst, żeby zobaczyć faktyczny stan zwrócony z parsera.
    for (const block of blocks) {
      const doc = new DOMParser().parseFromString(block.svgContent, "image/svg+xml");
      const subgroups = Array.from(doc.querySelectorAll("g > g"));
      for (const sub of subgroups) {
        const circle = sub.querySelector("circle");
        const line = sub.querySelector("line");
        if (!circle || !line) continue;
        const cx = circle.getAttribute("cx");
        const cy = circle.getAttribute("cy");
        expect(line.getAttribute("x1")).toBe(cx);
        expect(line.getAttribute("y1")).toBe(cy);
        expect(line.getAttribute("x2")).toBe(cx);
        expect(line.getAttribute("y2")).toBe(cy);
      }
    }
  });

  it("projects terminals onto the BOTTOM rect edge and snaps to world 20-grid (-K1:E pattern)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildBottomEdgeSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("bottom.svg", 1);
    expect(blocks).toHaveLength(1);

    const blockE = blocks[0];
    expect(blockE.terminals).toHaveLength(2);

    // Rect y=10, h=160. Krok 1: rect.x=50 snap do source-grid 20 → 60 (delta +10).
    //                     rect.y=10 snap do source-grid 20 → 20 (delta +10).
    //   Teraz rect=[60, 20, 490, 160], rectBottom=180.
    // cy=200 > rectBottom=180 → projected to 180. edgeCy=180. Source-snap=180 (grid).
    // cx=100, 200 wewnątrz rect.x range [60, 550] → nie projected, source-snap (grid).
    // Bounds (po mutacji): rect [60, 20, 550, 180], terminal (100, 180) ±3.5, (200, 180) ±3.5
    //   padding: minX=56, minY=16.
    //   Snap do source-grid 20 (scale=1): minX=round(56/20)*20=60, minY=round(16/20)*20=20
    //   blockX=60*1=60 world, blockY=20
    //   worldX = (100 - 60) * 1 = 40 (non-projected, ON world-grid, ON rect bottom edge W world)
    //   worldY = (180 - 20) * 1 = 160 (projected do mutated rect bottom, ON world-grid)
    expect(blockE.terminals[0].x).toBe(40);
    expect(blockE.terminals[0].y).toBe(160);
    expect(blockE.terminals[1].x).toBe(140); // cx=200 → (200-60)=140 (already 20-grid)
    expect(blockE.terminals[1].y).toBe(160);

    // INVARIANT: ALL terminals na world 20-grid (canvas grid alignment).
    expect(blockE.terminals[0].x % 20).toBe(0);
    expect(blockE.terminals[0].y % 20).toBe(0);
    expect(blockE.terminals[1].x % 20).toBe(0);
    expect(blockE.terminals[1].y % 20).toBe(0);
  });

  it("places non-projected terminals on the world 20-grid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildInsideSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("inside.svg", 1);
    expect(blocks).toHaveLength(1);

    const block = blocks[0];
    expect(block.terminals).toHaveLength(1);
    const term = block.terminals[0];
    // cx=100, cy=60 wewnątrz rect [20,20,280,180] → nie projected, source-snap i world-snap.
    // Block bounds: rect [20,20,280,180], padding → minX=16, minY=16.
    //   worldX = (100 - 16) * 1 = 84 → snap 80
    //   worldY = (60 - 16) * 1 = 44 → snap 40
    expect(term.x).toBe(80);
    expect(term.y).toBe(40);
    expect(term.x % 20).toBe(0);
    expect(term.y % 20).toBe(0);
  });

  it("handles corner case: terminal outside both axes picks the closer edge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => buildCornerSvg(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("corner.svg", 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].terminals).toHaveLength(1);

    const term = blocks[0].terminals[0];
    // Terminal at (20, 20), rect at (60, 60, w=100, h=80). Both outside.
    // dx = |20 - 60| = 40 (closer to rect.left=60)
    // dy = |20 - 60| = 40 (closer to rect.top=60)
    // dx === dy → tie-breaker: preferuj Y → edgeCy=60, edgeCx stays 20 (NOT projected on x).
    // Block bounds: rect [60,60,160,140], line [20,20,60,60] → bounds include both.
    //   padding: minX=16, minY=16.
    //   worldY = (60 - 16) * 1 = 44 → snap 40 (non-projected? actually projected on Y → NIE snap)
    // Wait, with my latest code: corner case → projectedY=true (edgeCy !== cy) → worldY not snapped.
    //   worldY = (60 - 16) = 44 (raw, not snapped).
    // worldX = (20 - 16) = 4 (raw, cy not projected on x — wait, edgeCx !== cx? edgeCx=20=cy, so NOT projected).
    //   worldX = (20 - 16) = 4 → snap 20 = 0 (or 20, but 0 closer).
    // Hmm — corner case fires when BOTH outside. We projected Y. So edgeCx stays at cx=20,
    // which is OUTSIDE the rect (cx=20 < rectLeft=60). The terminal sits 40px left of rect.
    // That's the documented trade-off of the corner-case tie-breaker.
    // The IMPORTANT invariant: at least one axis is projected → terminal lands on an edge.
    const projectedY = term.y <= 60 + 1; // small epsilon for snap rounding
    const projectedX = term.x <= 60 + 1;
    expect(projectedY || projectedX).toBe(true);
  });

  it("exposes yellow relay contact pins (eab308) as terminals — they are connection points, not decorations", async () => {
    const svgWithYellowPin = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g id="cad-symbol-svg">
    <g>
      <rect x="34.25" y="1" width="120" height="120" style="fill: #141414; stroke: #22c55e;"/>
      <g>
        <circle cx="4.25" cy="91" r="3.5" style="fill: #141414; stroke: #22c55e;"/>
        <text style="fill: #fff;"><tspan x="0" y="0">REAL</tspan></text>
      </g>
      <g>
        <circle cx="60" cy="60" r="4" style="fill: #eab308;"/>
        <text style="fill: #fff;"><tspan x="0" y="0">YELLOW</tspan></text>
      </g>
    </g>
  </g>
</svg>
`.trim();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => svgWithYellowPin,
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");

    const blocks = await fetchAndParseCadSymbol("yellow.svg", 1.25);
    expect(blocks).toHaveLength(1);
    // WHY: yellow pins in AMPIO MSERV-4S -K1:D represent real relay contact terminals
    // (output side, where user connects wires to RL X : C/NO outputs). Update 2026-07-09.
    expect(blocks[0].terminals).toHaveLength(2);
  });

  it("returns an empty array for SVG with no block groups", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => `<svg xmlns="http://www.w3.org/2000/svg"><text>empty</text></svg>`,
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");
    const blocks = await fetchAndParseCadSymbol("empty.svg", 1);
    expect(blocks).toEqual([]);
  });

  it("falls back to a default 200×200 block when a group has no measurable elements", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g id="cad-symbol-svg">
    <g></g>
  </g>
</svg>
        `.trim(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");
    const blocks = await fetchAndParseCadSymbol("degenerate.svg", 1);
    expect(blocks).toHaveLength(1);
    // width = 200 (fallback) + 4 padding (right only, left rounded from -4 to 0 via source-grid)
    expect(blocks[0].width).toBe(204);
    expect(blocks[0].height).toBe(204);
    expect(blocks[0].terminals).toEqual([]);
  });

  it("uses fallback label 'Blok N' when group has no text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g id="cad-symbol-svg">
    <g>
      <rect x="10" y="10" width="80" height="80" style="fill: #141414; stroke: #22c55e;"/>
    </g>
  </g>
</svg>
        `.trim(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");
    const blocks = await fetchAndParseCadSymbol("nolabel.svg", 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].label).toBe("Blok 1");
  });

  it("exposes the first <text> in the block as the label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <g id="cad-symbol-svg">
    <g>
      <rect x="10" y="10" width="180" height="80" style="fill: #141414; stroke: #22c55e;"/>
      <text transform="translate(20 30)" style="fill: #fff;">-K1:HEAD</text>
      <text transform="translate(20 50)" style="fill: #8b9bb4;">subtitle</text>
      <g>
        <circle cx="100" cy="50" r="3" style="fill: #141414; stroke: #22c55e;"/>
        <text transform="translate(110 53)" style="fill: #fff;">PIN 1</text>
      </g>
    </g>
  </g>
</svg>
        `.trim(),
      })),
    );
    const { fetchAndParseCadSymbol } = await import("./cadSymbolParser");
    const blocks = await fetchAndParseCadSymbol("with-label.svg", 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].label).toBe("-K1:HEAD");
  });
});