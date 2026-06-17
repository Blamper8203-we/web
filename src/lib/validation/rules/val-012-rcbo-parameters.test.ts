import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcboParameters } from "./val-012-rcbo-parameters";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcboParameters", () => {
  it("emits one VAL-012 warning per missing RCBO field (overcurrent, residual, type)", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      protectionType: "",
      rcdResidualCurrent: 0,
      rcdType: "",
    });
    const result = emptyResult();
    validateRcboParameters([rcbo], result);

    // Exactly three VAL-012 warnings — one per missing field.
    const warnings = result.warnings.filter((w) => w.code === "VAL-012");
    expect(warnings).toHaveLength(3);
  });

  it("emits no VAL-012 warnings when all RCBO parameters are set", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      protectionType: "B16",
      rcdRatedCurrent: 25,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const result = emptyResult();
    validateRcboParameters([rcbo], result);

    expect(result.warnings.filter((w) => w.code === "VAL-012")).toHaveLength(0);
  });

  it("errors when overcurrent rating exceeds the RCBO rated current", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      protectionType: "B32",
      rcdRatedCurrent: 25,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const result = emptyResult();
    validateRcboParameters([rcbo], result);

    expect(result.errors.some((e) => e.code === "VAL-013")).toBe(true);
  });

  it("warns when a socket RCBO has residual current above 30 mA", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      circuitType: "Gniazdo",
      protectionType: "B16",
      rcdResidualCurrent: 300,
      rcdRatedCurrent: 25,
      rcdType: "A",
    });
    const result = emptyResult();
    validateRcboParameters([rcbo], result);

    expect(result.warnings.some((w) => w.code === "VAL-014")).toBe(true);
  });

  it("does not warn VAL-014 for Sila circuits (additional protection not required)", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      circuitType: "Sila",
      protectionType: "B16",
      rcdResidualCurrent: 300,
      rcdRatedCurrent: 25,
      rcdType: "A",
    });
    const result = emptyResult();
    validateRcboParameters([rcbo], result);

    expect(result.warnings.some((w) => w.code === "VAL-014")).toBe(false);
  });

  it("skips MCB/RCD/FR symbols (rule is RCBO-only)", () => {
    const mcb = createDefaultSymbolItem({ deviceKind: "mcb", type: "MCB 1P", protectionType: "" });
    const rcd = createDefaultSymbolItem({ deviceKind: "rcd", type: "RCD", rcdType: "" });
    const fr = createDefaultSymbolItem({ deviceKind: "fr", type: "FR" });
    const result = emptyResult();
    validateRcboParameters([mcb, rcd, fr], result);

    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
