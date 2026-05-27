import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import type { ValidationMessage } from "./electricalValidationService";
import { applyValidationQuickFix, getValidationQuickFixesForMessage } from "./validationQuickFixes";

function makeMessage(code: string, symbolId = "s1"): ValidationMessage {
  return {
    code,
    message: "Test",
    severity: "Warning",
    symbolId,
  };
}

describe("validationQuickFixes", () => {
  it("offers and applies B16 for missing MCB protection", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      deviceKind: "mcb",
      protectionType: "Brak",
    });

    const fixes = getValidationQuickFixesForMessage(makeMessage("VAL-021"), symbol);
    expect(fixes).toEqual([{ id: "set-protection-b16", label: "Ustaw B16", symbolId: "s1" }]);

    const next = applyValidationQuickFix(symbol, "set-protection-b16");
    expect(next.protectionType).toBe("B16");
    expect(next.displayProtection).toBe("B16");
  });

  it("offers RCBO parameter fixes only for missing RCBO data", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      deviceKind: "rcbo",
      protectionType: "",
      rcdRatedCurrent: 0,
      rcdResidualCurrent: 0,
      rcdType: "",
    });

    const fixes = getValidationQuickFixesForMessage(makeMessage("VAL-012"), symbol);
    expect(fixes.map((fix) => fix.id)).toEqual([
      "set-protection-b16",
      "set-rcbo-rated-40a",
      "set-rcbo-residual-30ma",
      "set-rcbo-type-a",
    ]);

    expect(applyValidationQuickFix(symbol, "set-rcbo-rated-40a").rcdRatedCurrent).toBe(40);
    expect(applyValidationQuickFix(symbol, "set-rcbo-residual-30ma").rcdResidualCurrent).toBe(30);
    expect(applyValidationQuickFix(symbol, "set-rcbo-type-a").rcdType).toBe("A");
  });

  it("does not offer quick fixes for project data that must be entered manually", () => {
    const symbol = createDefaultSymbolItem({
      id: "s1",
      deviceKind: "mcb",
      powerW: 0,
    });

    expect(getValidationQuickFixesForMessage(makeMessage("VAL-020"), symbol)).toEqual([]);
    expect(getValidationQuickFixesForMessage(makeMessage("VAL-019"), symbol)).toEqual([]);
    expect(getValidationQuickFixesForMessage(makeMessage("VAL-018"), symbol)).toEqual([]);
  });
});
