/**
 * VAL-007 — main breaker overload.
 *
 * Compares the highest single-phase current against:
 *  - the configured main breaker (if no FR is present in the project), or
 *  - the FR's rated current (if an FR is present).
 *
 * WHY: the main breaker must be sized for the highest phase current,
 * not the sum of all three phases. A balanced 3×10A load is 10A on
 * the breaker, not 30A.
 *
 * If multiple FRs are present, every FR is checked independently.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import { isMainBreaker } from "../../deviceIdentification";
import { calculateCircuitPhaseCurrents } from "../circuitPhaseCurrents";
import { parseProtectionRating } from "../validationHelpers";
import type { ValidationResult } from "../electricalValidationService";

export function validateMainOverload(
  symbols: SymbolItem[],
  result: ValidationResult,
  phaseVoltage: number,
  configuredMainBreakerA?: number,
): void {
  const mainBreakers = symbols.filter(isMainBreaker);

  const phaseCurrents = calculateCircuitPhaseCurrents(symbols, phaseVoltage);
  const maxPhaseCurrent = Math.max(
    phaseCurrents.l1CurrentA,
    phaseCurrents.l2CurrentA,
    phaseCurrents.l3CurrentA,
  );
  const currentDetails = `L1: ${phaseCurrents.l1CurrentA.toFixed(1)}A, L2: ${phaseCurrents.l2CurrentA.toFixed(1)}A, L3: ${phaseCurrents.l3CurrentA.toFixed(1)}A`;

  if (mainBreakers.length === 0) {
    if (configuredMainBreakerA && configuredMainBreakerA > 0 && maxPhaseCurrent > configuredMainBreakerA) {
      result.errors.push({
        code: "VAL-007",
        message: "Przeciążenie zabezpieczenia głównego",
        details: `Największy prąd fazowy: ${maxPhaseCurrent.toFixed(1)}A, znamionowy prąd główny (konfiguracja): ${configuredMainBreakerA}A. ${currentDetails}`,
        severity: "Error",
      });
    }
    return;
  }

  for (const mainBreaker of mainBreakers) {
    const mainRating = parseProtectionRating(mainBreaker.frRatedCurrent);
    if (mainRating <= 0) continue;

    if (maxPhaseCurrent > mainRating) {
      result.errors.push({
        code: "VAL-007",
        message: "Przeciążenie wyłącznika głównego",
        details: `Największy prąd fazowy: ${maxPhaseCurrent.toFixed(1)}A, znamionowy prąd FR: ${mainRating}A. ${currentDetails}`,
        severity: "Error",
        symbolId: mainBreaker.id,
      });
    }
  }
}
