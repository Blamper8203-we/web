import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateNoRcdProtection } from "./val-006-no-rcd";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateNoRcdProtection", () => {
  it("warns when an MCB has no RCD assigned", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "Gniazdo salon",
    });
    const result = emptyResult();
    validateNoRcdProtection([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-006")).toBe(true);
  });

  it("does not warn when the MCB points to a known RCD", () => {
    const rcd = createDefaultSymbolItem({ id: "rcd-1", deviceKind: "rcd", type: "RCD" });
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      rcdSymbolId: "rcd-1",
    });
    const result = emptyResult();
    validateNoRcdProtection([mcb, rcd], result);

    expect(result.warnings.some((w) => w.code === "VAL-006")).toBe(false);
  });

  it("does not warn for RCBOs (they have their own RCD)", () => {
    const rcbo = createDefaultSymbolItem({ deviceKind: "rcbo", type: "RCBO 1P" });
    const result = emptyResult();
    validateNoRcdProtection([rcbo], result);

    expect(result.warnings.some((w) => w.code === "VAL-006")).toBe(false);
  });

  it("pomija MCB z dangling reference (rcdSymbolId wskazuje na nieistniejacy RCD) - H-4 audit fix", () => {
    // WHY: dangling reference ma wlasny kanal walidacji (SEM-007 w
    // projectFileSemantics.ts). VAL-006 dotyczy tylko "MCB bez RCD",
    // nie "MCB wskazujacy na nieistniejacy RCD". Wcześniej testowalismy
    // zle zachowanie - warning emitowany dla dangling reference.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      rcdSymbolId: "ghost-rcd",
    });
    const result = emptyResult();
    validateNoRcdProtection([mcb], result);

    expect(result.warnings.some((w) => w.code === "VAL-006")).toBe(false);
  });
});
