/**
 * VAL-002 — cable overload (current > cable ampacity).
 * VAL-003 — protection rating > cable ampacity (mismatch, not trip-coordinated).
 * VAL-004 — voltage drop exceeds the per-circuit-type limit.
 *
 * All three checks share the same per-symbol loop because they need the
 * same intermediate values (current, protection rating, cable capacity,
 * voltage drop) and short-circuit on the same "no data" conditions.
 *
 * WHY grouped: extracting just one of them would force recomputing the
 * cable capacity and current per circuit three times. The shared
 * short-circuit on `powerW <= 0` or unknown cross-section keeps the
 * fast path in one place.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import {
  calculateCurrent,
} from "../../phaseDistribution/phaseDistributionCalculator";
import {
  VOLTAGE_DROP_LIMIT_LIGHTING,
  VOLTAGE_DROP_LIMIT_OTHER,
} from "../validationConstants";
import {
  calculateVoltageDrop,
} from "../circuitPhaseCurrents";
import {
  getCableCapacity,
  parseProtectionRating,
} from "../validationHelpers";
import type { ValidationResult } from "../electricalValidationService";

export function validateCableSafety(
  symbols: SymbolItem[],
  result: ValidationResult,
  phaseVoltage: number,
  powerFactor: number = 0.9,
): void {
  for (const symbol of symbols) {
    if (symbol.powerW <= 0) continue;
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const current = calculateCurrent(symbol.powerW, symbol.phase, phaseVoltage, powerFactor);
    const protectionRating = parseProtectionRating(symbol.protectionType);

    if (protectionRating <= 0) continue;

    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (maxCableCurrent <= 0 || symbol.cableLength <= 0) continue;

    if (current > maxCableCurrent) {
      result.errors.push({
        code: "VAL-002",
        message: `Przeciążenie przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Prąd: ${current.toFixed(1)}A, maksymalny prąd przewodu ${symbol.cableCrossSection}mm2: ${maxCableCurrent}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (protectionRating > maxCableCurrent) {
      result.warnings.push({
        code: "VAL-003",
        message: `Niedopasowanie zabezpieczenia do przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm2: ${maxCableCurrent}A`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    const voltageDrop = calculateVoltageDrop(current, symbol.cableCrossSection, symbol.cableLength, symbol.phase);
    const voltageDropPercent = (voltageDrop / phaseVoltage) * 100;
    const limit = symbol.circuitType === "Oswietlenie" ? VOLTAGE_DROP_LIMIT_LIGHTING : VOLTAGE_DROP_LIMIT_OTHER;

    if (voltageDropPercent > limit) {
      result.warnings.push({
        code: "VAL-004",
        message: `Zbyt duży spadek napięcia w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Spadek: ${voltageDropPercent.toFixed(1)}%, limit: ${limit}% (długość: ${symbol.cableLength}m, przekrój: ${symbol.cableCrossSection}mm2)`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}
