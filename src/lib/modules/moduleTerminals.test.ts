import { describe, expect, it, beforeEach } from "vitest";
import { getSymbolTerminals, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "./moduleTerminals";
import { svgTerminalCache } from "./svgTerminalCache";
import { createDefaultSymbolItem } from "../../types/symbolItem";

const DIST_BLOCK_REF = "Blok rozdzielczy/blok rozdzielczy 4-7.svg";

function seedDistributionBlockCache() {
  // Seed the cache with 4 groups (L1, L2, L3, N), 7 pins each.
  // yRatio values are mixed (some high, some low) to prove the override works
  // for ALL pins regardless of where the SVG put them.
  svgTerminalCache.set(DIST_BLOCK_REF, [
    {
      prefix: "L1",
      viewBoxWidth: 841,
      viewBoxHeight: 1148,
      terminals: [
        { name: "L1-1", xRatio: 0.10, yRatio: 0.21 }, // high (would normally be isTop:true)
        { name: "L1-2", xRatio: 0.22, yRatio: 0.21 },
        { name: "L1-7", xRatio: 0.90, yRatio: 0.79 }, // low (would normally be isTop:false)
      ],
    },
    {
      prefix: "L2",
      viewBoxWidth: 841,
      viewBoxHeight: 1148,
      terminals: [
        { name: "L2-1", xRatio: 0.10, yRatio: 0.21 },
      ],
    },
    {
      prefix: "L3",
      viewBoxWidth: 841,
      viewBoxHeight: 1148,
      terminals: [
        { name: "L3-1", xRatio: 0.10, yRatio: 0.21 },
      ],
    },
    {
      prefix: "N",
      viewBoxWidth: 841,
      viewBoxHeight: 1148,
      terminals: [
        { name: "N-1", xRatio: 0.10, yRatio: 0.21 },
        { name: "N-7", xRatio: 0.90, yRatio: 0.79 },
      ],
    },
  ]);
}

describe("getSymbolTerminals — distribution block routing override", () => {
  beforeEach(() => {
    seedDistributionBlockCache();
  });

  it("forces isTop:false for ALL pins of a distribution block, regardless of yRatio", () => {
    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: DIST_BLOCK_REF,
      width: 1395.48,
      height: 1170,
    });

    const terminals = getSymbolTerminals(symbol);

    // We seeded 3+1+1+2 = 7 terminals
    expect(terminals.length).toBe(7);

    // Every terminal — top, bottom, mixed prefix — must be isTop:false
    for (const t of terminals) {
      expect(t.isTop).toBe(false);
      expect(t.direction).toBe("bottom");
    }
  });

  it("does NOT force isTop:false for non-distribution block symbols (MCB)", () => {
    // MCB uses the standard yRatio<0.5 heuristic
    const mcbRef = "MCB/test-mcb.svg";
    svgTerminalCache.set(mcbRef, [
      {
        prefix: "L1",
        viewBoxWidth: 100,
        viewBoxHeight: 200,
        terminals: [
          { name: "1", xRatio: 0.5, yRatio: 0.2 },   // top
          { name: "2", xRatio: 0.5, yRatio: 0.8 },   // bottom
        ],
      },
    ]);

    const mcb = createDefaultSymbolItem({
      type: "MCB",
      deviceKind: "mcb",
      moduleRef: mcbRef,
      width: 200,
      height: 400,
    });

    const terminals = getSymbolTerminals(mcb);
    const t1 = terminals.find((t) => t.name === "1");
    const t2 = terminals.find((t) => t.name === "2");

    expect(t1?.isTop).toBe(true);
    expect(t1?.direction).toBe("top");
    expect(t2?.isTop).toBe(false);
    expect(t2?.direction).toBe("bottom");
  });

  it("does NOT force isTop:false for plain terminal strips (Złączka listwowa)", () => {
    // Złączka listwowa is a "terminalBlock" but NOT a distribution block
    const termRef = "Złączki/test-zlaczka.svg";
    svgTerminalCache.set(termRef, [
      {
        prefix: "L1",
        viewBoxWidth: 100,
        viewBoxHeight: 200,
        terminals: [
          { name: "1", xRatio: 0.5, yRatio: 0.2 },   // top
        ],
      },
    ]);

    const term = createDefaultSymbolItem({
      type: "Złączka listwowa",
      deviceKind: "terminalBlock",
      moduleRef: termRef,
      width: 200,
      height: 400,
    });

    const terminals = getSymbolTerminals(term);
    expect(terminals[0]?.isTop).toBe(true);
    expect(terminals[0]?.direction).toBe("top");
  });
});

describe("resolveConnectionIsFromTop / resolveConnectionIsToTop — distribution block override", () => {
  beforeEach(() => {
    seedDistributionBlockCache();
  });

  it("forces isFromTop=false for distribution block EVEN if stored connection says true", () => {
    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: DIST_BLOCK_REF,
    });
    const terminals = getSymbolTerminals(symbol);
    const hotspot = terminals[0]; // isTop:false after the override

    // Even if the saved project file says isFromTop:true (legacy data),
    // we must force false for distribution blocks.
    expect(resolveConnectionIsFromTop(symbol, true, hotspot)).toBe(false);
    expect(resolveConnectionIsFromTop(symbol, undefined, hotspot)).toBe(false);
    expect(resolveConnectionIsFromTop(symbol, false, hotspot)).toBe(false);
  });

  it("forces isToTop=false for distribution block EVEN if stored connection says true", () => {
    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: DIST_BLOCK_REF,
    });
    const terminals = getSymbolTerminals(symbol);
    const hotspot = terminals[0];

    expect(resolveConnectionIsToTop(symbol, true, hotspot)).toBe(false);
    expect(resolveConnectionIsToTop(symbol, undefined, hotspot)).toBe(false);
  });

  it("falls back to stored value for non-distribution blocks (MCB)", () => {
    // Plain MCB: no override, stored value wins, then hotspot, then true
    const mcbRef = "MCB/test-mcb.svg";
    svgTerminalCache.set(mcbRef, [
      {
        prefix: "L1",
        viewBoxWidth: 100,
        viewBoxHeight: 200,
        terminals: [{ name: "1", xRatio: 0.5, yRatio: 0.2 }],
      },
    ]);
    const mcb = createDefaultSymbolItem({
      type: "MCB",
      deviceKind: "mcb",
      moduleRef: mcbRef,
      width: 200,
      height: 400,
    });
    const terminals = getSymbolTerminals(mcb);

    expect(resolveConnectionIsFromTop(mcb, true, terminals[0])).toBe(true);
    expect(resolveConnectionIsFromTop(mcb, false, terminals[0])).toBe(false);
    expect(resolveConnectionIsFromTop(mcb, undefined, terminals[0])).toBe(true); // hotspot default
  });

  it("falls back gracefully when symbol is undefined (e.g. deleted during render)", () => {
    expect(resolveConnectionIsFromTop(undefined, true, undefined)).toBe(true);
    expect(resolveConnectionIsFromTop(undefined, false, undefined)).toBe(false);
    expect(resolveConnectionIsFromTop(undefined, undefined, undefined)).toBe(true);
  });
});
