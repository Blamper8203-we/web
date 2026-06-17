import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../../types/symbolItem";
import { validateMainOverload } from "./val-007-main-overload";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

describe("validateMainOverload", () => {
  it("emits Error when highest phase current exceeds the configured main breaker", () => {
    // 7000 W on L1 = 7000/207 = 33.8 A > 32 A configured.
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 7000,
      phase: "L1",
    });
    const result = emptyResult();
    validateMainOverload([mcb], result, 230, 32);

    expect(result.errors.some((e) => e.code === "VAL-007")).toBe(true);
  });

  it("does not error when highest phase current stays below configured", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 2000,
      phase: "L1",
    });
    const result = emptyResult();
    validateMainOverload([mcb], result, 230, 32);

    expect(result.errors).toHaveLength(0);
  });

  it("emits Error against the FR rating when an FR is present", () => {
    const fr = createDefaultSymbolItem({
      id: "fr-1",
      deviceKind: "fr",
      type: "FR",
      frRatedCurrent: "B63",
    });
    // 15000 W on L1+L2+L3 (balanced) = 5000 W per phase = ~24 A
    // on the breaker (not 65 A).  Below 63 A, should not trigger.
    const threePhase = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 3P",
      powerW: 15000,
      phase: "L1+L2+L3",
    });
    const result = emptyResult();
    validateMainOverload([fr, threePhase], result, 230);

    expect(result.errors).toHaveLength(0);
  });

  it("uses the highest single phase, not the sum of phases (real electrical case)", () => {
    const fr = createDefaultSymbolItem({
      id: "fr-1",
      deviceKind: "fr",
      type: "FR",
      frRatedCurrent: "B25",
    });
    // 6900 W on L1 only = 33.3 A on L1; other phases empty.  > 25 A FR.
    const heavyL1 = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 6900,
      phase: "L1",
    });
    const result = emptyResult();
    validateMainOverload([fr, heavyL1], result, 230);

    expect(result.errors.some((e) => e.code === "VAL-007")).toBe(true);
    expect(result.errors[0].symbolId).toBe("fr-1");
  });
});
