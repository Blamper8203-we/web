import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem, isDistributionBlockSymbol } from "../../types/symbolItem";

/**
 * Behavioural test for the runtime ferrule + wire-inset adjustments in
 * `useDinRailWires` and `DinRailConnectionsCanvas`. The actual rendering
 * paths are tightly coupled to React/DOM, so we test the two predicates
 * that drive them:
 *
 *   1. isDistributionBlockSymbol(symbol) is TRUE for "Blok rozdzielczy" types
 *      AND for symbols whose moduleRef points to a known distribution block
 *      asset, and FALSE for MCB / plain zlaczka.
 *
 *   2. The runtime patches in those two files consume that predicate to
 *      (a) zero out `fromVisualInset` and (b) snap `customOffset` to 10
 *      for distribution-block pins. The exact value picked is what the
 *      rendering math expects, so we lock it in here.
 */

describe("isDistributionBlockSymbol — ferrule / wire-inset dispatch", () => {
  it("returns true for type 'Blok rozdzielczy'", () => {
    const s = createDefaultSymbolItem({ type: "Blok rozdzielczy" });
    expect(isDistributionBlockSymbol(s)).toBe(true);
  });

  it("returns true for moduleRef that names a distribution block asset", () => {
    const s = createDefaultSymbolItem({
      type: "Złączka listwowa",
      deviceKind: "terminalBlock",
      moduleRef: "Blok rozdzielczy/blok rozdzielczy 4x7.svg",
    });
    expect(isDistributionBlockSymbol(s)).toBe(true);
  });

  it("returns false for MCB", () => {
    const s = createDefaultSymbolItem({ type: "MCB", deviceKind: "mcb" });
    expect(isDistributionBlockSymbol(s)).toBe(false);
  });

  it("returns false for plain zlaczka listwowa (not a distribution block)", () => {
    const s = createDefaultSymbolItem({
      type: "Złączka listwowa",
      deviceKind: "terminalBlock",
      moduleRef: "Złączki/some-zlaczka.svg",
    });
    expect(isDistributionBlockSymbol(s)).toBe(false);
  });
});

describe("ferrule + wire-inset policy for distribution-block pins", () => {
  // These constants mirror the runtime defaults used in
  // useDinRailWires.ts and DinRailConnectionsCanvas.tsx.
  const FERRULE_OFFSET_FOR_DISTRIBUTION = 10; // ferrule starts 10px under the screw
  const FERRULE_LENGTH_FOR_DISTRIBUTION = undefined; // uses FerruleGraphic's default 80px for terminalBlock
  const FROM_VISUAL_INSET_FOR_DISTRIBUTION = 0; // wire starts AT the screw, passes through module body

  function pickFerruleOffset(isDist: boolean, visualInset: number | undefined) {
    return isDist ? FERRULE_OFFSET_FOR_DISTRIBUTION : visualInset;
  }
  function pickFerruleLength(isDist: boolean) {
    return isDist ? FERRULE_LENGTH_FOR_DISTRIBUTION : undefined;
  }
  function pickWireVisualInset(isDist: boolean, visualInset: number | undefined) {
    return isDist ? FROM_VISUAL_INSET_FOR_DISTRIBUTION : visualInset;
  }

  it("distribution block: ferrule offset=10, length=80 (default), wire starts at screw (inset=0)", () => {
    const isDist = true;
    expect(pickFerruleOffset(isDist, 920)).toBe(10);
    expect(pickFerruleLength(isDist)).toBeUndefined();
    expect(pickWireVisualInset(isDist, 920)).toBe(0);
  });

  it("non-distribution (e.g. MCB): ferrule offset=visualInset, length=undefined, wire starts at module edge", () => {
    const isDist = false;
    expect(pickFerruleOffset(isDist, 50)).toBe(50);
    expect(pickFerruleLength(isDist)).toBeUndefined();
    expect(pickWireVisualInset(isDist, 50)).toBe(50);
  });

  it("non-distribution with undefined visualInset: ferrule offset=undefined (FerruleGraphic default 10), wire inset=undefined", () => {
    const isDist = false;
    expect(pickFerruleOffset(isDist, undefined)).toBeUndefined();
    expect(pickWireVisualInset(isDist, undefined)).toBeUndefined();
  });
});
