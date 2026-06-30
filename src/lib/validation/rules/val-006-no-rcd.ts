/**
 * VAL-006 — circuit not covered by any RCD.
 *
 * WHY: PN-HD 60364 requires 30 mA additional protection for socket and
 * lighting circuits. We don't know the type from the symbol alone, so
 * we emit a Warning for every MCB that doesn't point to a known RCD.
 * The user can ignore it for circuits that are intentionally downstream
 * of the main switch.
 *
 * Dangling reference (rcdSymbolId ustawione, ale RCD o tym id nie istnieje
 * w projekcie) jest pomijany — to osobny kanał walidacji (SEM-007 w
 * projectFileSemantics.ts). Wcześniej VAL-006 emitowało "bez ochrony RCD"
 * dla dangling reference, co bylo mylące (prawdziwy problem to
 * "wskazuje na nieistniejacy RCD", nie "nie ma RCD").
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";

export function validateNoRcdProtection(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb") continue;
    if (symbol.rcdSymbolId) {
      // rcdSymbolId ustawione — pomijamy niezaleznie od tego czy RCD istnieje:
      // - dangling reference: SEM-007 z osobna walidacja
      // - valid reference: MCB jest chroniony
      continue;
    }

    result.warnings.push({
      code: "VAL-006",
      message: `Obwód "${symbol.circuitName || symbol.label}" bez ochrony RCD`,
      details: "Obwód nie jest chroniony przez wyłącznik RCD.",
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}
