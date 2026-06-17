import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateCableDataCompleteness } from "./val-015-cable-data";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateCableDataCompleteness", () => {
  it("warns when cross-section is missing (VAL-015)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      cableCrossSection: 0,
    });
    const result = emptyResult();
    validateCableDataCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-015")).toBe(true);
  });

  it("warns when cross-section is not in the table (VAL-015)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      cableCrossSection: 0.75,
    });
    const result = emptyResult();
    validateCableDataCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-015")).toBe(true);
  });

  it("warns when length is missing (VAL-016)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      cableCrossSection: 2.5,
      cableLength: 0,
    });
    const result = emptyResult();
    validateCableDataCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-016")).toBe(true);
  });

  it("warns when socket circuit uses 1.5 mm² (below typical 2.5 mm² minimum, VAL-017)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitType: "Gniazdo",
      cableCrossSection: 1.5,
      cableLength: 10,
    });
    const result = emptyResult();
    validateCableDataCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-017")).toBe(true);
  });
});
