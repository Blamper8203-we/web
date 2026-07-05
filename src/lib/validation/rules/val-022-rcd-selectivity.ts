/**
 * VAL-022 — possible lack of selectivity in cascaded RCDs.
 *
 * A 30 mA downstream RCD under a 30 mA parent is a selectivity problem
 * (both trip on the same fault). The 3× rule of thumb says the parent
 * should be at least 3× the child for clear selectivity.
 *
 * WHY only Warning: in some installations (medical, lab) a tighter
 * cascade is intentional, so we don't block — we just flag.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";

export function validateRcdSelectivity(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");
  const rcdMap = new Map(rcds.map((s) => [s.id, s]));

  for (const rcd of rcds) {
    if (!rcd.rcdSymbolId) continue;

    const parentRcd = rcdMap.get(rcd.rcdSymbolId);
    if (!parentRcd) continue;
    if (parentRcd.rcdResidualCurrent <= 0 || rcd.rcdResidualCurrent <= 0) continue;

    if (parentRcd.rcdResidualCurrent < rcd.rcdResidualCurrent * 3) {
      result.warnings.push({
        code: "VAL-022",
        message: "Możliwy brak selektywności RCD",
        details: `RCD nadrzędny "${parentRcd.label || parentRcd.id}" ma ${parentRcd.rcdResidualCurrent}mA, a podrzędny "${rcd.label || rcd.id}" ma ${rcd.rcdResidualCurrent}mA. Dla kaskady zwykle oczekuje się wyraźnie większego progu nadrzędnego.`,
        severity: "Warning",
        symbolId: rcd.id,
      });
    }
  }
}
