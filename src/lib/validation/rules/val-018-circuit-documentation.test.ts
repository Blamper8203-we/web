import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateCircuitDocumentationCompleteness } from "./val-018-circuit-documentation";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateCircuitDocumentationCompleteness", () => {
  it("escalates VAL-018 and VAL-019 to Warning for socket/lighting circuits (additional protection §415.1)", () => {
    // circuitType defaults to "Gniazdo" in createDefaultSymbolItem, so this
    // MCB is exactly the kind that PN-HD 60364 §415.1 expects to be named
    // and located in the formal documentation.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "",
      location: "",
    });
    const result = emptyResult();
    validateCircuitDocumentationCompleteness([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-018")).toBe(true);
    expect(result.warnings.some((w) => w.code === "VAL-019")).toBe(true);
    expect(result.info.some((i) => i.code === "VAL-018")).toBe(false);
    expect(result.info.some((i) => i.code === "VAL-019")).toBe(false);
  });

  it("keeps VAL-018 and VAL-019 as Info for non-additional-protection circuits (Sila)", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitType: "Sila",
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
