import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcdTypeCompatibility } from "./val-011-rcd-type";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcdTypeCompatibility", () => {
  it("warns when an induction circuit is protected by type AC RCD", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdType: "AC",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Płyta indukcyjna",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdTypeCompatibility([rcd, mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-011")).toBe(true);
  });

  it("does not warn when the RCD type is in the recommended list", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdType: "A",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Płyta indukcyjna",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdTypeCompatibility([rcd, mcb], result);

    expect(result.warnings).toHaveLength(0);
  });

  it("does not warn when no keyword matches (generic circuit name)", () => {
    // "Obwód 1" doesn't match any of the load-type keywords.
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      rcdType: "AC",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Obwód 1",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdTypeCompatibility([rcd, mcb], result);

    expect(result.warnings).toHaveLength(0);
  });

  it("uses the RCBOs own RCD type when the circuit is RCBO-protected", () => {
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      circuitName: "Płyta indukcyjna",
      rcdType: "AC", // wrong type for induction
    });
    const result = emptyResult();
    validateRcdTypeCompatibility([rcbo], result);

    expect(result.warnings.some((w) => w.code === "VAL-011")).toBe(true);
  });

  it("does not warn when an MCB has no RCD assigned (no RCD to mismatch)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Płyta indukcyjna",
    });
    const result = emptyResult();
    validateRcdTypeCompatibility([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-011")).toBe(false);
  });
});
