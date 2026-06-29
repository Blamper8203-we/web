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
      const safeLimit = (maxCableCurrent * 1.45).toFixed(0);
      result.errors.push({
        code: "VAL-005",
        message: `Zabezpieczenie ${protectionRating}A przekracza ochronę kabla ${symbol.cableCrossSection}mm² w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Dopuszczalne maksimum dla kabla ${symbol.cableCrossSection}mm² to ${safeLimit}A (1,45 × ${maxCableCurrent}A). Zmniejsz zabezpieczenie lub zwiększ przekrój.`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}
