/**
 * VAL-001 — phase-load imbalance.
 *
 * WHY: an unbalanced three-phase distribution is the most common
 * failure mode in single-phase-fed projects. The user-tunable threshold
 * (default 30%) is conservative — see `IMBALANCE_THRESHOLD_PERCENT`.
 *
 * Pure function on a `PhaseDistributionResult`. The dispatcher calls
 * this with the output of `calculateTotalDistribution`; tests call it
 * with a hand-built object.
 */
import type { PhaseDistributionResult } from "../../phaseDistribution/phaseDistributionCalculator";
import type { ValidationResult } from "../electricalValidationService";

export function validatePhaseImbalance(
  phaseLoads: PhaseDistributionResult,
  result: ValidationResult,
  threshold: number,
): void {
  if (phaseLoads.imbalancePercent > threshold) {
    result.warnings.push({
      code: "VAL-001",
      message: `Asymetria obciążenia faz: ${phaseLoads.imbalancePercent.toFixed(1)}%`,
      details: `L1: ${phaseLoads.l1PowerW.toFixed(0)}W, L2: ${phaseLoads.l2PowerW.toFixed(0)}W, L3: ${phaseLoads.l3PowerW.toFixed(0)}W`,
      severity: "Warning",
    });
  }
}
