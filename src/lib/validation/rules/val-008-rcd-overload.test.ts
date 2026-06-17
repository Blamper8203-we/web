import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcdOverload } from "./val-008-rcd-overload";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcdOverload", () => {
  it("warns when the sum of branch protection ratings exceeds the RCD rating", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 25,
    });
    const mcb1 = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      rcdSymbolId: "rcd-1",
    });
    const mcb2 = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdOverload([rcd, mcb1, mcb2], result);

    expect(result.warnings.some((w) => w.code === "VAL-008")).toBe(true);
  });

  it("skips when the RCD has no rated current (unconfigured)", () => {
    const rcd = createDefaultSymbolItem({ id: "rcd-1", deviceKind: "rcd", type: "RCD", rcdRatedCurrent: 0 });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdOverload([rcd, mcb], result);

    expect(result.warnings).toHaveLength(0);
  });

  it("skips an RCD with no MCBs assigned to it", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 25,
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      rcdSymbolId: "rcd-2", // different RCD
    });
    const result = emptyResult();
    validateRcdOverload([rcd, mcb], result);

    expect(result.warnings).toHaveLength(0);
  });

  it("skips an MCB with a non-numeric protection rating", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 25,
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "Manual",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdOverload([rcd, mcb], result);

    // Manual = 0, so sum = 0, no warning.
    expect(result.warnings.some((w) => w.code === "VAL-008")).toBe(false);
  });

  it("also counts RCBOs (devices with their own RCD) toward the sum", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 20,
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B10",
      rcdSymbolId: "rcd-1",
    });
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      protectionType: "B16",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdOverload([rcd, mcb, rcbo], result);

    // 10 + 16 = 26 > 20 → warn
    expect(result.warnings.some((w) => w.code === "VAL-008")).toBe(true);
  });
});
