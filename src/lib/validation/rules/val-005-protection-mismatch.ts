/**
 * VAL-005 — protection rating grossly exceeds cable ampacity.
 *
 * WHY 1.45: IEC 60364 allows the protection to be larger than the cable
 * ampacity as long as it's ≤ 1.45 × cable ampacity (because the
 * overcurrent device may not trip on continuous overload, but the
 * cable is allowed to operate up to 145% of its rated current for
 * short periods). Above that threshold the cable is unprotected.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";
import {
  getCableCapacity,
  parseProtectionRating,
} from "../validationHelpers";

export function validateProtectionMismatch(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const protectionRating = parseProtectionRating(symbol.protectionType);
    if (protectionRating <= 0) continue;

    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (maxCableCurrent <= 0) continue;

    if (protectionRating > maxCableCurrent * 1.45) {
      result.errors.push({
        code: "VAL-005",
        message: `Zabezpieczenie zbyt duże dla przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm2 nie zapewnia ochrony przy przeciążeniu >${(maxCableCurrent * 1.45).toFixed(0)}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}
