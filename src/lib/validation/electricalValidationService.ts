// =============================================================================
// electricalValidationService — structural map
// =============================================================================
//
// WHY a 130-line file for the dispatcher: this is the entry point only.
// All rules live in `./rules/val-XXX-*.ts`, helpers in `./validationHelpers.ts`
// and `./circuitPhaseCurrents.ts`, RCD-type inference in
// `./rcdTypeRecommendation.ts`, and engineering constants in
// `./validationConstants.ts`. The dispatcher's only job is to run them in
// the right order and aggregate results.
//
// REGIONS:
//   imports ............. ~L17-L33   (cheap, alphabetical per group)
//   public types ........ ~L51-L67   (Severity, Message, Result, Config)
//   validateProject ..... ~L80-L122  (single export, runs all rules)
//
// RULE ORDER (intentional, do not reshuffle without thought):
//   1. Phase-level (whole project)        — cheapest, surfaces global issues
//   2. Per-circuit data completeness      — surfaces "fill in the form" first
//   3. Per-circuit electrical safety      — needs the data from step 2
//   4. RCD-related and coordination       — last, may need the same RCD map
// =============================================================================

import type { SymbolItem } from "../../types/symbolItem";
import { calculateTotalDistribution } from "../phaseDistribution/phaseDistributionCalculator";
import { IMBALANCE_THRESHOLD_PERCENT, PHASE_VOLTAGE } from "./validationConstants";
import { validatePhaseImbalance } from "./rules/val-001-phase-imbalance";
import { validateCableSafety } from "./rules/val-002-cable-safety";
import { validateProtectionMismatch } from "./rules/val-005-protection-mismatch";
import { validateNoRcdProtection } from "./rules/val-006-no-rcd";
import { validateMainOverload } from "./rules/val-007-main-overload";
import { validateRcdOverload } from "./rules/val-008-rcd-overload";
import { validateRcdHierarchy } from "./rules/val-009-rcd-hierarchy";
import { validateRcdPhaseCompatibility } from "./rules/val-010-rcd-phase";
import { validateRcdTypeCompatibility } from "./rules/val-011-rcd-type";
import { validateRcboParameters } from "./rules/val-012-rcbo-parameters";
import { validateCableDataCompleteness } from "./rules/val-015-cable-data";
import { validateCircuitDocumentationCompleteness } from "./rules/val-018-circuit-documentation";
import { validateRcdSelectivity } from "./rules/val-022-rcd-selectivity";
import { validateMainProtectionCoordination } from "./rules/val-023-main-coordination";

/** Severity of a single validation finding. Errors block `isValid`; the
 *  other two are advisory. */
export type ValidationSeverity = "Error" | "Warning" | "Info";

/** A single finding from a validation rule. `code` is a stable identifier
 *  (e.g. `"VAL-001"`) used by `validationQuickFixes` and the PDF exporter
 *  to look up remediation hints. `symbolId` is set when the finding is
 *  tied to a specific module; otherwise the rule is project-wide. */
export interface ValidationMessage {
  code: string;
  message: string;
  details?: string;
  severity: ValidationSeverity;
  symbolId?: string;
}

/** Aggregated result of `validateProject`. `isValid` is `true` iff
 *  `errors` is empty. The three buckets correspond to the three
 *  severities and are presented separately in the validation panel. */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
}

/** User-tunable thresholds and project parameters. Every field is
 *  optional; missing values fall back to the engineering defaults in
 *  `./validationConstants.ts`. */
export interface ValidationConfig {
  /** Phase-to-neutral voltage in V. Default: 230. */
  supplyVoltageV?: number;
  /** Main breaker rating in A, used when no FR is present. */
  mainBreakerA?: number;
  /** Imbalance threshold percent. Default: 30. */
  imbalanceThresholdPercent?: number;
}

/**
 * Run every electrical validation rule in a deterministic order and
 * return the aggregated result. The order is meaningful — see the
 * structural map at the top of this file.
 *
 * @param symbols The project's full symbol list. Rules iterate over it;
 *                callers don't need to pre-filter by deviceKind.
 * @param configOrImbalanceThreshold
 *   - `ValidationConfig` (preferred): supply voltage, main breaker A,
 *     imbalance threshold percent.
 *   - `number` (legacy): a single imbalance-threshold percent. Kept for
 *     backward compatibility with the pre-2026 API; new code should pass
 *     a `ValidationConfig` object.
 */
export function validateProject(
  symbols: SymbolItem[],
  configOrImbalanceThreshold: ValidationConfig | number = IMBALANCE_THRESHOLD_PERCENT,
): ValidationResult {
  const config: ValidationConfig =
    typeof configOrImbalanceThreshold === "number"
      ? { imbalanceThresholdPercent: configOrImbalanceThreshold }
      : configOrImbalanceThreshold ?? {};
  const phaseVoltage = config.supplyVoltageV ?? PHASE_VOLTAGE;
  const imbalanceThresholdPercent = config.imbalanceThresholdPercent ?? IMBALANCE_THRESHOLD_PERCENT;

  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  const phaseLoads = calculateTotalDistribution(symbols);

  // 1. Phase-level (whole project)
  validatePhaseImbalance(phaseLoads, result, imbalanceThresholdPercent);

  // 2. Per-circuit data completeness (cheap, surfaces "fill in the form" issues first)
  validateCircuitDocumentationCompleteness(symbols, result);
  validateCableDataCompleteness(symbols, result);

  // 3. Per-circuit electrical safety
  validateCableSafety(symbols, result, phaseVoltage);
  validateProtectionMismatch(symbols, result);
  validateNoRcdProtection(symbols, result);

  // 4. RCD-related and coordination (heavier, may need the same RCD map)
  validateMainOverload(symbols, result, phaseVoltage, config.mainBreakerA);
  validateRcdOverload(symbols, result);
  validateRcdHierarchy(symbols, result);
  validateRcdSelectivity(symbols, result);
  validateRcdPhaseCompatibility(symbols, result);
  validateRcdTypeCompatibility(symbols, result);
  validateRcboParameters(symbols, result);
  validateMainProtectionCoordination(symbols, result, config.mainBreakerA);

  result.isValid = result.errors.length === 0;
  return result;
}
