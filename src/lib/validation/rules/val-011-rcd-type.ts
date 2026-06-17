/**
 * VAL-011 — RCD type recommendation vs actual.
 *
 * Suggests type A / F / B based on the load description (see
 * `rcdTypeRecommendation.ts`). Emits a Warning if the actual RCD is
 * less capable than recommended.
 *
 * RCBOs carry their own RCD type; otherwise the RCD is the one assigned
 * to the circuit via `rcdSymbolId`.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";
import { getRcdTypeRecommendation } from "../rcdTypeRecommendation";
import { isRcdTypeAllowed, normalizeRcdType } from "../validationHelpers";

export function validateRcdTypeCompatibility(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcdMap = new Map(
    symbols
      .filter((symbol) => symbol.deviceKind === "rcd")
      .map((symbol) => [symbol.id, symbol]),
  );

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const recommendation = getRcdTypeRecommendation(symbol);
    if (!recommendation) continue;

    const protectingRcd = symbol.deviceKind === "rcbo" ? symbol : rcdMap.get(symbol.rcdSymbolId);
    if (!protectingRcd) continue;

    const actualType = normalizeRcdType(protectingRcd.rcdType);
    if (isRcdTypeAllowed(actualType, recommendation.allowedTypes)) {
      continue;
    }

    result.warnings.push({
      code: "VAL-011",
      message: `Typ RCD może być niedopasowany do odbiornika "${symbol.circuitName || symbol.label || symbol.id}"`,
      details: `${recommendation.reason} Aktualny typ: ${actualType || "brak"}, zalecany: ${recommendation.allowedTypes.join(" lub ")}.`,
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}
