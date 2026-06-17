import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateProtectionMismatch } from "./val-005-protection-mismatch";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateProtectionMismatch", () => {
  it("emits Error when protection rating exceeds 1.45 × cable ampacity", () => {
    // 1.5 mm² = 16 A → 1.45 × 16 = 23.2 A.  B25 (25 A) is above the threshold.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B25",
      cableCrossSection: 1.5,
    });
    const result = emptyResult();
    validateProtectionMismatch([mcb], result);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("VAL-005");
  });

  it("does not emit when protection is ≤ 1.45 × cable ampacity", () => {
    // 2.5 mm² = 21 A → 1.45 × 21 = 30.45 A.  B16 is well below.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      cableCrossSection: 2.5,
    });
    const result = emptyResult();
    validateProtectionMismatch([mcb], result);

    expect(result.errors).toHaveLength(0);
  });

  it("skips circuits without protection rating", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "",
      cableCrossSection: 2.5,
    });
    const result = emptyResult();
    validateProtectionMismatch([mcb], result);

    expect(result.errors).toHaveLength(0);
  });

  it("skips RCDs and FRs (not protection-rated cables)", () => {
    const rcd = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      protectionType: "B25",
      cableCrossSection: 1.5,
    });
    const result = emptyResult();
    validateProtectionMismatch([rcd], result);

    expect(result.errors).toHaveLength(0);
  });
});
