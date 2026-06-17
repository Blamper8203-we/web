import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateRcdPhaseCompatibility } from "./val-010-rcd-phase";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateRcdPhaseCompatibility", () => {
  it("errors when a single-phase RCD (L1) is paired with an L2 circuit", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      phase: "L1",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      phase: "L2",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdPhaseCompatibility([rcd, mcb], result);

    expect(result.errors.some((e) => e.code === "VAL-010")).toBe(true);
  });

  it("does not error when phases match", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      phase: "L1",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      phase: "L1",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdPhaseCompatibility([rcd, mcb], result);

    expect(result.errors).toHaveLength(0);
  });

  it("does not error when the RCD is three-phase (covers any single phase)", () => {
    const rcd = createDefaultSymbolItem({
      id: "rcd-1",
      deviceKind: "rcd",
      type: "RCD",
      phase: "L1+L2+L3",
    });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      phase: "L2",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateRcdPhaseCompatibility([rcd, mcb], result);

    expect(result.errors).toHaveLength(0);
  });
});
