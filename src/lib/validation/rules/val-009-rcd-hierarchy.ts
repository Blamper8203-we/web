import { t } from "i18next";
/**
 * VAL-009 — child RCD has higher residual current than its parent.
 *
 * This is a hard error: a downstream 30 mA RCD under a 300 mA parent
 * is a normal setup. The reverse (downstream 300 mA, parent 30 mA)
 * would mean the child never trips before the parent, defeating the
 * point of cascading.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";

export function validateRcdHierarchy(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");
  const rcdMap = new Map(rcds.map((s) => [s.id, s]));

  for (const rcd of rcds) {
    if (!rcd.rcdSymbolId) continue;

    const parentRcd = rcdMap.get(rcd.rcdSymbolId);
    if (!parentRcd) continue;

    if (rcd.rcdResidualCurrent > parentRcd.rcdResidualCurrent) {
      result.errors.push({
        code: "VAL-009",
        message: t("auto.bdhierarchiircd_352", "Błąd hierarchii RCD"),
        details: `Wyłącznik RCD "${rcd.label || rcd.id}" ma większy prąd różnicowy (${rcd.rcdResidualCurrent}mA) niż wyłącznik nadrzędny (${parentRcd.rcdResidualCurrent}mA).`,
        severity: "Error",
        symbolId: rcd.id,
      });
    }
  }
}
