import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcdSelectivity } from "./val-022-rcd-selectivity";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcdSelectivity", () => {
  it("warns when parent residual current is less than 3× child", () => {
    // parent 30mA, child 30mA → 30 < 30*3 = 90 → warn
    const parent = createDefaultSymbolItem({
      id: "parent",
      deviceKind: "rcd",
      type: "RCD",
      rcdResidualCurrent: 30,
    });
    const child = createDefaultSymbolItem({
      id: "child",
      deviceKind: "rcd",
      type: "RCD",
      rcdResidualCurrent: 30,
      rcdSymbolId: "parent",
    });
    const result = emptyResult();
    validateRcdSelectivity([parent, child], result);

    expect(result.warnings.some((w) => w.code === "VAL-022")).toBe(true);
  });

  it("does not warn when parent is clearly higher (3× or more)", () => {
    // parent 300mA, child 30mA → 300 >= 30*3 = 90 → silent
    const parent = createDefaultSymbolItem({
      id: "parent",
      deviceKind: "rcd",
      type: "RCD",
      rcdResidualCurrent: 300,
    });
    const child = createDefaultSymbolItem({
      id: "child",
      deviceKind: "rcd",
      type: "RCD",
      rcdResidualCurrent: 30,
      rcdSymbolId: "parent",
    });
    const result = emptyResult();
    validateRcdSelectivity([parent, child], result);

    expect(result.warnings).toHaveLength(0);
  });
});
