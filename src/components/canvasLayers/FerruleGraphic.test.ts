import { describe, expect, it } from "vitest";
import { getFerruleRenderInset, getFerruleRenderInsetForSymbol } from "./FerruleGraphic";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("getFerruleRenderInset — legacy (non-distribution)", () => {
  it("returns visualInset as offset and undefined length when not a distribution block", () => {
    const result = getFerruleRenderInset(150, false);
    expect(result).toEqual({ customOffset: 150, customLength: undefined });
  });

  it("falls back to offset=10 when visualInset is undefined and not a distribution block", () => {
    const result = getFerruleRenderInset(undefined, false);
    expect(result).toEqual({ customOffset: 10, customLength: undefined });
  });

  it("uses offset=0 when visualInset=0 and not a distribution block (edge case)", () => {
    const result = getFerruleRenderInset(0, false);
    expect(result).toEqual({ customOffset: 0, customLength: undefined });
  });
});

describe("getFerruleRenderInset — distribution block (new behaviour)", () => {
  it("splits visualInset into (offset=10, length=visualInset-10) for distribution blocks", () => {
    const result = getFerruleRenderInset(920, true);
    expect(result.customOffset).toBe(10);
    expect(result.customLength).toBe(910);
  });

  it("clamps customLength to a minimum of 20 when visualInset is very small", () => {
    const result = getFerruleRenderInset(15, true);
    expect(result.customOffset).toBe(10);
    expect(result.customLength).toBe(20); // would have been 5, clamped up
  });

  it("falls back to (offset=10, length=undefined) when visualInset is undefined", () => {
    const result = getFerruleRenderInset(undefined, true);
    expect(result).toEqual({ customOffset: 10, customLength: undefined });
  });
});

describe("getFerruleRenderInsetForSymbol — picks the right path automatically", () => {
  it("returns distribution-block split for a 'Blok rozdzielczy' symbol", () => {
    const symbol = createDefaultSymbolItem({
      type: "Blok rozdzielczy",
      moduleRef: "Blok rozdzielczy/blok rozdzielczy 4-7.svg",
    });
    const result = getFerruleRenderInsetForSymbol(symbol, { visualInset: 920 });
    expect(result.customOffset).toBe(10);
    expect(result.customLength).toBe(910);
  });

  it("returns legacy offset-only for an MCB symbol (preserves old rendering)", () => {
    const mcb = createDefaultSymbolItem({
      type: "MCB",
      deviceKind: "mcb",
      moduleRef: "MCB/some-mcb.svg",
    });
    const result = getFerruleRenderInsetForSymbol(mcb, { visualInset: 50 });
    expect(result).toEqual({ customOffset: 50, customLength: undefined });
  });

  it("returns legacy offset-only for a plain 'Złączka listwowa' (NOT a distribution block)", () => {
    const term = createDefaultSymbolItem({
      type: "Złączka listwowa",
      deviceKind: "terminalBlock",
      moduleRef: "Złączki/some.svg",
    });
    const result = getFerruleRenderInsetForSymbol(term, { visualInset: 80 });
    expect(result).toEqual({ customOffset: 80, customLength: undefined });
  });

  it("falls back to offset=10 when both symbol and visualInset are missing", () => {
    const result = getFerruleRenderInsetForSymbol(undefined, undefined);
    expect(result).toEqual({ customOffset: 10, customLength: undefined });
  });
});
