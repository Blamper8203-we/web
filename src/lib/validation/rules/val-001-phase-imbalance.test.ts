import { describe, expect, it } from "vitest";
import type { PhaseDistributionResult } from "../../phaseDistribution/phaseDistributionCalculator";
import { validatePhaseImbalance } from "./val-001-phase-imbalance";
import type { ValidationResult } from "../electricalValidationService";

function emptyResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

function phaseLoads(overrides: Partial<PhaseDistributionResult>): PhaseDistributionResult {
  return {
    l1PowerW: 0,
    l2PowerW: 0,
    l3PowerW: 0,
    l1CurrentA: 0,
    l2CurrentA: 0,
    l3CurrentA: 0,
    imbalancePercent: 0,
    ...overrides,
  };
}

describe("validatePhaseImbalance", () => {
  it("emits a Warning when imbalance exceeds the threshold", () => {
    const result = emptyResult();
    validatePhaseImbalance(
      phaseLoads({ l1PowerW: 6000, l2PowerW: 2000, l3PowerW: 2000, imbalancePercent: 50 }),
      result,
      30,
    );

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe("VAL-001");
    expect(result.warnings[0].details).toContain("L1: 6000W");
    expect(result.warnings[0].details).toContain("L2: 2000W");
    expect(result.warnings[0].details).toContain("L3: 2000W");
  });

  it("stays silent when imbalance is at or below the threshold", () => {
    const result = emptyResult();
    validatePhaseImbalance(
      phaseLoads({ l1PowerW: 4000, l2PowerW: 3000, l3PowerW: 3000, imbalancePercent: 14 }),
      result,
      30,
    );

    expect(result.warnings).toHaveLength(0);
  });

  it("treats the threshold as strict-greater (equal does NOT trigger)", () => {
    // 30% imbalance, 30% threshold → not greater → silent
    const result = emptyResult();
    validatePhaseImbalance(
      phaseLoads({ l1PowerW: 4000, l2PowerW: 2000, l3PowerW: 4000, imbalancePercent: 30 }),
      result,
      30,
    );

    expect(result.warnings).toHaveLength(0);
  });

  it("uses the user-supplied threshold (caller overrides the default)", () => {
    const loads = phaseLoads({ l1PowerW: 5000, l2PowerW: 2500, l3PowerW: 2500, imbalancePercent: 33 });

    // 33% > 40% threshold → silent
    const strict = emptyResult();
    validatePhaseImbalance(loads, strict, 40);
    expect(strict.warnings).toHaveLength(0);

    // 33% > 30% threshold → warn
    const loose = emptyResult();
    validatePhaseImbalance(loads, loose, 30);
    expect(loose.warnings).toHaveLength(1);
  });
});
