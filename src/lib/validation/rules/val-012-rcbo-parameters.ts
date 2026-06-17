/**
 * VAL-012 — RCBO has missing or incomplete parameters (overcurrent,
 *           residual current, RCD type).
 * VAL-013 — RCBO overcurrent rating exceeds its rated current.
 * VAL-014 — RCBO residual current is above 30 mA on additional-protection
 *           circuits (sockets, lighting).
 *
 * All three are RCBO-specific and share the same `deviceKind === "rcbo"`
 * loop, so they live in one file.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";
import {
  isAdditionalProtectionCircuit,
  normalizeRcdType,
  parseProtectionRating,
} from "../validationHelpers";

export function validateRcboParameters(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "rcbo") continue;

    const protectionRating = parseProtectionRating(symbol.protectionType);
    if (protectionRating <= 0) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak członu nadprądowego RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określoną charakterystykę i prąd zabezpieczenia, np. B16 albo C16.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.rcdResidualCurrent <= 0) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak prądu różnicowego RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określony prąd różnicowy, np. 30mA.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (!normalizeRcdType(symbol.rcdType)) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak typu RCD w RCBO dla obwodu "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określony typ części różnicowoprądowej, np. A, F albo B.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.rcdRatedCurrent > 0 && protectionRating > symbol.rcdRatedCurrent) {
      result.errors.push({
        code: "VAL-013",
        message: `Człon nadprądowy RCBO przekracza prąd znamionowy aparatu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Zabezpieczenie: ${protectionRating}A, prąd znamionowy RCBO: ${symbol.rcdRatedCurrent}A.`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (isAdditionalProtectionCircuit(symbol) && symbol.rcdResidualCurrent > 30) {
      result.warnings.push({
        code: "VAL-014",
        message: `Wysoki prąd różnicowy RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Dla obwodów gniazdowych i oświetleniowych typowo stosuje się ochronę dodatkową 30mA. Aktualnie: ${symbol.rcdResidualCurrent}mA.`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}
