/**
 * VAL-015 — cable cross-section missing or not in the capacity table.
 * VAL-016 — cable length missing.
 * VAL-017 — cable cross-section below the typical minimum for the
 *           circuit type.
 *
 * All three are cable-data completeness / sanity checks for MCB/RCBO
 * circuits. Grouped because they share the same per-symbol loop and
 * short-circuit conditions.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import { MIN_CABLE_CROSS_SECTION_BY_CIRCUIT_TYPE } from "../validationConstants";
import { getCableCapacity } from "../validationHelpers";
import type { ValidationResult } from "../electricalValidationService";

export function validateCableDataCompleteness(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    if (symbol.cableCrossSection <= 0) {
      result.warnings.push({
        code: "VAL-015",
        message: `Brak przekroju przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "Podaj przekrój przewodu, aby walidacja obciążalności i spadku napięcia była wiarygodna.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    } else if (getCableCapacity(symbol.cableCrossSection) <= 0) {
      result.warnings.push({
        code: "VAL-015",
        message: `Nietypowy przekrój przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Przekrój ${symbol.cableCrossSection}mm2 nie występuje w tabeli obciążalności używanej przez program.`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.cableLength <= 0) {
      result.warnings.push({
        code: "VAL-016",
        message: `Brak długości przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "Podaj długość przewodu, aby program mógł sprawdzić spadek napięcia.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    const minimumCrossSection = MIN_CABLE_CROSS_SECTION_BY_CIRCUIT_TYPE[symbol.circuitType];
    if (
      minimumCrossSection &&
      symbol.cableCrossSection > 0 &&
      symbol.cableCrossSection < minimumCrossSection
    ) {
      result.warnings.push({
        code: "VAL-017",
        message: `Przekrój przewodu może być zbyt mały dla obwodu "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Typ obwodu: ${symbol.circuitType}, przekrój: ${symbol.cableCrossSection}mm2, typowe minimum: ${minimumCrossSection}mm2.`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}
