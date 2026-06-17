import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateCableSafety } from "./val-002-cable-safety";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateCableSafety", () => {
  it("emits VAL-002 Error when current exceeds cable ampacity", () => {
    // 2.5 mm² = 21 A.  Power 6000W on L1 = 6000/207 ≈ 28.99A → overload.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 6000,
      phase: "L1",
      protectionType: "B16",
      cableCrossSection: 2.5,
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableSafety([mcb], result, 230);

    expect(result.errors.some((e) => e.code === "VAL-002")).toBe(true);
  });

  it("emits VAL-003 Warning when protection rating exceeds cable ampacity", () => {
    // 1.5 mm² = 16 A, but B32 → protection > cable.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 1000,
      phase: "L1",
      protectionType: "B32",
      cableCrossSection: 1.5,
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableSafety([mcb], result, 230);

    expect(result.warnings.some((w) => w.code === "VAL-003")).toBe(true);
  });

  it("emits VAL-004 Warning when voltage drop exceeds the lighting limit (3%)", () => {
    // Long, thin cable: 1.5 mm² × 50 m on a 2 kW L1 circuit.
    // I = 2000/207 = 9.66 A.  ΔU = 2*9.66*50*0.0175/1.5 = 11.27 V = 4.9% > 3%.
    const lighting = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 2000,
      phase: "L1",
      protectionType: "B10",
      cableCrossSection: 1.5,
      cableLength: 50,
      circuitType: "Oswietlenie",
    });
    const result = emptyResult();
    validateCableSafety([lighting], result, 230);

    expect(result.warnings.some((w) => w.code === "VAL-004")).toBe(true);
  });

  it("skips symbols with no power (cable capacity cannot be evaluated)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 0,
      protectionType: "B16",
      cableCrossSection: 2.5,
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableSafety([mcb], result, 230);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("skips FR/SPD/phaseIndicator (not a circuit with a load)", () => {
    const fr = createDefaultSymbolItem({
      deviceKind: "fr",
      type: "FR",
      powerW: 5000,
      protectionType: "B32",
      cableCrossSection: 1.5,
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableSafety([fr], result, 230);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("skips when cross-section is unknown (no capacity data)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 2000,
      phase: "L1",
      protectionType: "B16",
      cableCrossSection: 0.75, // not in the table
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableSafety([mcb], result, 230);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
