/**
 * VAL-008 — RCD rated current exceeded by sum of downstream protection ratings.
 *
 * WHY "sum of protection ratings": the worst case is every downstream
 * breaker carrying its full rated current simultaneously. In practice
 * the diversity factor is much lower, so we only emit a Warning, not
 * an Error. The user can override by setting `rcdRatedCurrent = 0`
 * (treated as "unconfigured").
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";
import { parseProtectionRating } from "../validationHelpers";

export function validateRcdOverload(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");

  for (const rcd of rcds) {
    const mcbs = symbols.filter(
      (s) => s.rcdSymbolId === rcd.id && (s.deviceKind === "mcb" || s.deviceKind === "rcbo"),
    );

    if (mcbs.length === 0) continue;

    const totalCurrent = mcbs.reduce((sum, m) => sum + parseProtectionRating(m.protectionType), 0);

    if (rcd.rcdRatedCurrent > 0 && totalCurrent > rcd.rcdRatedCurrent) {
      result.warnings.push({
        code: "VAL-008",
        message: `Przeciążenie RCD "${rcd.label || rcd.id}"`,
        details: `Suma zabezpieczeń obwodów: ${totalCurrent}A, znamionowy prąd RCD: ${rcd.rcdRatedCurrent}A`,
        severity: "Warning",
        symbolId: rcd.id,
      });
    }
  }
}
