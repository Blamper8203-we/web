import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateMainProtectionCoordination } from "./val-023-main-coordination";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateMainProtectionCoordination", () => {
  it("warns when branch protection rating equals the configured main breaker", () => {
    const branch = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B32",
      circuitName: "Gniazdo",
    });
    const result = emptyResult();
    validateMainProtectionCoordination([branch], result, 32);

    expect(result.warnings.some((w) => w.code === "VAL-023")).toBe(true);
  });

  it("does not warn when branch protection is well below the main", () => {
    const branch = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      circuitName: "Gniazdo",
    });
    const result = emptyResult();
    validateMainProtectionCoordination([branch], result, 32);

    expect(result.warnings).toHaveLength(0);
  });

  it("does not warn when neither branch nor main has a rating", () => {
    const branch = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "",
    });
    const result = emptyResult();
    validateMainProtectionCoordination([branch], result);

    expect(result.warnings).toHaveLength(0);
  });
});
