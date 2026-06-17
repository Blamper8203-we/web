/**
 * VAL-006 — circuit not covered by any RCD.
 *
 * WHY: PN-HD 60364 requires 30 mA additional protection for socket and
 * lighting circuits. We don't know the type from the symbol alone, so
 * we emit a Warning for every MCB that doesn't point to a known RCD.
 * The user can ignore it for circuits that are intentionally downstream
 * of the main switch.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";

export function validateNoRcdProtection(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcdIds = new Set(symbols.filter((s) => s.deviceKind === "rcd").map((s) => s.id));

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb") continue;
    if (symbol.rcdSymbolId && rcdIds.has(symbol.rcdSymbolId)) continue;

    result.warnings.push({
      code: "VAL-006",
      message: `Obwód "${symbol.circuitName || symbol.label}" bez ochrony RCD`,
      details: "Obwód nie jest chroniony przez wyłącznik RCD.",
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}
