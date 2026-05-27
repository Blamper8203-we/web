import { describe, expect, it } from "vitest";
import type { ValidationMessage } from "./electricalValidationService";
import { getValidationEditTargetForMessage } from "./validationEditTargets";

function makeMessage(code: string, message = "Test"): ValidationMessage {
  return {
    code,
    message,
    severity: "Warning",
    symbolId: "s1",
  };
}

describe("validationEditTargets", () => {
  it("maps documentation warnings to editable circuit fields", () => {
    expect(getValidationEditTargetForMessage(makeMessage("VAL-018"))).toEqual({
      fieldKey: "CircuitName",
      label: "Edytuj nazwę",
    });
    expect(getValidationEditTargetForMessage(makeMessage("VAL-019"))?.fieldKey).toBe("Location");
    expect(getValidationEditTargetForMessage(makeMessage("VAL-020"))?.fieldKey).toBe("PowerW");
    expect(getValidationEditTargetForMessage(makeMessage("VAL-021"))?.fieldKey).toBe("ProtectionType");
  });

  it("maps cable warnings to cable fields", () => {
    expect(getValidationEditTargetForMessage(makeMessage("VAL-015"))?.fieldKey).toBe("CableCrossSection");
    expect(getValidationEditTargetForMessage(makeMessage("VAL-016"))?.fieldKey).toBe("CableLength");
    expect(getValidationEditTargetForMessage(makeMessage("VAL-017"))?.fieldKey).toBe("CableCrossSection");
  });

  it("only maps RCBO parameter warning when the visible field exists", () => {
    expect(getValidationEditTargetForMessage(makeMessage("VAL-012", "Brak członu nadprądowego RCBO"))).toEqual({
      fieldKey: "ProtectionType",
      label: "Edytuj zabezpieczenie",
    });
    expect(getValidationEditTargetForMessage(makeMessage("VAL-012", "Brak prądu różnicowego RCBO"))).toBeNull();
  });
});
