import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcdHierarchy } from "./val-009-rcd-hierarchy";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcdHierarchy", () => {
  it("errors when child RCD has higher residual current than parent", () => {
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
      rcdResidualCurrent: 300,
      rcdSymbolId: "parent",
    });
    const result = emptyResult();
    validateRcdHierarchy([parent, child], result);

    expect(result.errors.some((e) => e.code === "VAL-009")).toBe(true);
  });

  it("does not error when child has lower or equal residual current", () => {
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
    validateRcdHierarchy([parent, child], result);

    expect(result.errors).toHaveLength(0);
  });
});
