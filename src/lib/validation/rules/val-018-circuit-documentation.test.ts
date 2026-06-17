import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateCircuitDocumentationCompleteness } from "./val-018-circuit-documentation";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateCircuitDocumentationCompleteness", () => {
  it("emits Info for missing circuit name (VAL-018) and location (VAL-019)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "",
      location: "",
    });
    const result = emptyResult();
    validateCircuitDocumentationCompleteness([mcb], result);

    expect(result.info.some((i) => i.code === "VAL-018")).toBe(true);
    expect(result.info.some((i) => i.code === "VAL-019")).toBe(true);
  });

  it("emits Warning for missing power (VAL-020) and protection (VAL-021)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Gniazdo",
      location: "Salon",
      powerW: 0,
      protectionType: "",
    });
    const result = emptyResult();
    validateCircuitDocumentationCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-020")).toBe(true);
    expect(result.warnings.some((w) => w.code === "VAL-021")).toBe(true);
  });
});
